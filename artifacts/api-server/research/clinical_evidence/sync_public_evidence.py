#!/usr/bin/env python3
"""Fetch limited public research evidence for a named compound into SQLite.

This is a source-ingestion example, NOT a clinical prediction model.
Requires internet access when executed. Does not use controlled-access patient data.
"""
import argparse
import hashlib
import json
import sqlite3
import sys
import time
from contextlib import closing
from datetime import datetime, timezone
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

BASE = Path(__file__).resolve().parent
HEADERS = {'User-Agent': 'RescueOnChip-Research-Evidence/0.1 (research-only; contact project owner)'}


def stamp():
    return datetime.now(timezone.utc).isoformat()


def checksum(payload):
    return hashlib.sha256(json.dumps(payload, ensure_ascii=False, sort_keys=True).encode()).hexdigest()


def ensure_schema(db):
    """Apply additive SQLite migrations without replacing the supplied database."""
    columns = {row[1] for row in db.execute('PRAGMA table_info(fetch_log)')}
    if not columns:
        raise RuntimeError('Evidence database is missing the fetch_log table.')
    if 'response_sha256' not in columns:
        db.execute('ALTER TABLE fetch_log ADD COLUMN response_sha256 TEXT')
    db.execute('PRAGMA user_version = 1')
    db.commit()


def download_json(url, timeout=25):
    request = Request(url, headers=HEADERS)
    with urlopen(request, timeout=timeout) as response:
        body = response.read(32 * 1024 * 1024 + 1)
        if len(body) > 32 * 1024 * 1024:
            raise ValueError('API response exceeded the 32 MiB safety limit.')
        return json.loads(body), response.status, hashlib.sha256(body).hexdigest()


def record_fetch(db, source, url, code, count, status, detail='', response_sha256=None):
    db.execute('''INSERT INTO fetch_log
                  (source_id, request_url, fetched_at, http_status, count_records,
                   response_sha256, outcome, detail)
                  VALUES(?,?,?,?,?,?,?,?)''',
               (source, url, stamp(), code, count, response_sha256, status, detail[:1000]))
    db.commit()


def api_fetch(db, source, url):
    try:
        payload, code, response_sha256 = download_json(url)
        return payload, code, response_sha256
    except HTTPError as e:
        error_body = e.read()
        response_sha256 = hashlib.sha256(error_body).hexdigest() if error_body else None
        record_fetch(db, source, url, e.code, 0, 'API_ERROR', str(e), response_sha256)
        print(f'[{source}] HTTP {e.code}: {e.reason}', file=sys.stderr)
    except (URLError, TimeoutError, ValueError, json.JSONDecodeError) as e:
        record_fetch(db, source, url, None, 0, 'API_ERROR', str(e))
        print(f'[{source}] Network/parse error: {e}', file=sys.stderr)
    return None, None, None


def extract_trial(study):
    p = study.get('protocolSection') or {}
    ident = p.get('identificationModule') or {}
    st = p.get('statusModule') or {}
    des = p.get('designModule') or {}
    interventions = (p.get('armsInterventionsModule') or {}).get('interventions', [])
    conditions = (p.get('conditionsModule') or {}).get('conditions', [])
    results = study.get('resultsSection') or {}
    outcomes = (results.get('outcomeMeasuresModule') or {}).get('outcomeMeasures', [])
    return {
        'nct_id': ident.get('nctId'),
        'title': ident.get('briefTitle'),
        'status': st.get('overallStatus'),
        'phase': ', '.join(des.get('phases') or []),
        'enrollment': (des.get('enrollmentInfo') or {}).get('count'),
        'interventions': [x.get('name') for x in interventions if x.get('name')],
        'conditions': conditions,
        'has_results': bool(results or study.get('hasResults')),
        'outcomes': outcomes,
        'source_version_date': st.get('lastUpdatePostDateStruct', {}).get('date'),
    }


def sync_trials(db, compound, max_results):
    params = {'query.intr': compound, 'pageSize': min(max_results, 100), 'format': 'json'}
    url = 'https://clinicaltrials.gov/api/v2/studies?' + urlencode(params)
    payload, code, response_sha256 = api_fetch(db, 'CTG', url)
    if payload is None:
        return 0
    inserted = 0
    for study in payload.get('studies', []):
        item = extract_trial(study)
        if not item['nct_id']:
            continue
        ident = item['nct_id']
        db.execute('''INSERT OR REPLACE INTO clinical_trials
           (nct_id,query_compound,study_title,overall_status,phase,enrollment,intervention_names_json,
            condition_names_json,has_posted_results,record_url,source_version_date,fetched_at,raw_sha256)
           VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)''',
           (ident,compound,item['title'],item['status'],item['phase'],item['enrollment'],
            json.dumps(item['interventions'],ensure_ascii=False),json.dumps(item['conditions'],ensure_ascii=False),
            int(item['has_results']),f'https://clinicaltrials.gov/study/{ident}',
            item['source_version_date'],stamp(),checksum(study)))
        db.execute('DELETE FROM clinical_outcomes WHERE nct_id=?', (ident,))
        for outcome in item['outcomes']:
            db.execute('''INSERT INTO clinical_outcomes
               (nct_id,outcome_type,endpoint_title,description,timeframe,results_json,raw_sha256)
               VALUES(?,?,?,?,?,?,?)''',
               (ident, str(outcome.get('type') or 'UNSPECIFIED'), outcome.get('title'),
                outcome.get('description'), outcome.get('timeFrame'),
                json.dumps(outcome,ensure_ascii=False), checksum(outcome)))
        inserted += 1
    record_fetch(db,'CTG',url,code,inserted,'SUCCESS',response_sha256=response_sha256)
    print(f'[CTG] Imported {inserted} study summaries (not patient-level records).')
    return inserted


def fields_text(item, field):
    vals = item.get(field) or []
    if not isinstance(vals, list):
        vals = [str(vals)]
    return '\n'.join(str(x) for x in vals)[:30000]


def sync_labels(db, compound, max_results):
    # Ingredient search is approximate; verify label's products and indication before use.
    params = {'search': f'openfda.generic_name:"{compound}"', 'limit': min(max_results, 100)}
    url = 'https://api.fda.gov/drug/label.json?' + urlencode(params)
    payload, code, response_sha256 = api_fetch(db,'OPENFDA_LABEL',url)
    if payload is None:
        return 0
    count = 0
    for rec in payload.get('results',[]):
        fda = rec.get('openfda') or {}
        key = rec.get('id') or checksum(rec)
        names = fda.get('generic_name',[])+fda.get('brand_name',[])
        db.execute('''INSERT OR REPLACE INTO fda_labels
          (label_key,query_compound,effective_time,drug_names_json,indications_text,warnings_text,
           contraindications_text,adverse_reactions_text,clinical_studies_text,source_url,fetched_at,raw_sha256)
          VALUES(?,?,?,?,?,?,?,?,?,?,?,?)''',
          (key,compound,rec.get('effective_time'),json.dumps(names,ensure_ascii=False),
           fields_text(rec,'indications_and_usage'),fields_text(rec,'warnings'),
           fields_text(rec,'contraindications'),fields_text(rec,'adverse_reactions'),
           fields_text(rec,'clinical_studies'),
           'https://open.fda.gov/apis/drug/label/',stamp(),checksum(rec)))
        count += 1
    record_fetch(db,'OPENFDA_LABEL',url,code,count,'SUCCESS',response_sha256=response_sha256)
    print(f'[OPENFDA_LABEL] Imported {count} public labeling records.')
    return count


def sync_faers(db, compound, max_signals):
    # These are counts of voluntary reports only. Never estimate incidence, risk, or causality.
    params = {'search': f'patient.drug.medicinalproduct:"{compound}"',
              'count': 'patient.reaction.reactionmeddrapt.exact', 'limit': min(max_signals, 100)}
    url = 'https://api.fda.gov/drug/event.json?' + urlencode(params)
    payload, code, response_sha256 = api_fetch(db,'OPENFDA_FAERS',url)
    if payload is None:
        return 0
    count = 0
    for row in payload.get('results',[]):
        name = row.get('term')
        reports = row.get('count')
        if not isinstance(name,str) or not isinstance(reports,int):
            continue
        db.execute('''INSERT OR REPLACE INTO safety_signals
                     (query_compound,signal_name,report_count,source,fetched_at,search_query)
                     VALUES(?,?,?,?,?,?)''',
                   (compound,name,reports,'OPENFDA_FAERS',stamp(),params['search']))
        count += 1
    record_fetch(db,'OPENFDA_FAERS',url,code,count,'SUCCESS',
                 'Spontaneous report counts are NOT adverse-event incidence or causal evidence.',
                 response_sha256=response_sha256)
    print(f'[OPENFDA_FAERS] Imported {count} reaction reporting-count categories (not risk estimates).')
    return count


def main():
    ap=argparse.ArgumentParser(description='Fetch public trial, labeling and safety signal records into evidence database.')
    ap.add_argument('--compound',required=True,help='Drug ingredient/name to search, e.g. aspirin')
    ap.add_argument('--db',default=str(BASE/'clinical_evidence_sources.sqlite'))
    ap.add_argument('--max-studies',type=int,default=20)
    ap.add_argument('--max-labels',type=int,default=5)
    ap.add_argument('--max-signals',type=int,default=10)
    args=ap.parse_args()
    if not args.compound.strip() or len(args.compound)>150:
        ap.error('Compound name must be 1–150 characters.')
    with closing(sqlite3.connect(args.db)) as db:  # sqlite3's context manager alone never closes
        db.execute('PRAGMA foreign_keys=ON')
        ensure_schema(db)
        sync_trials(db,args.compound,args.max_studies)
        sync_labels(db,args.compound,args.max_labels)
        sync_faers(db,args.compound,args.max_signals)
        db.commit()
        for row in db.execute('''SELECT source_id,request_url,fetched_at,http_status,count_records,
                                        response_sha256,outcome,detail
                                 FROM fetch_log ORDER BY fetch_id DESC LIMIT 3'''):
            print('[FETCH]', json.dumps({
                'source_id':row[0], 'url':row[1], 'retrieved_at_utc':row[2],
                'http_status':row[3], 'records':row[4], 'response_sha256':row[5],
                'outcome':row[6], 'detail':row[7],
            },ensure_ascii=False))
        for src in ['CTG','OPENFDA_LABEL','OPENFDA_FAERS']:
            ok=db.execute('SELECT COUNT(*) FROM fetch_log WHERE source_id=? AND outcome="SUCCESS"',(src,)).fetchone()[0]
            if ok:
                db.execute('UPDATE source_catalog SET integration_state="LIVE_FETCH_CONFIRMED" WHERE source_id=?',(src,))
        db.commit()
    print('\nRESEARCH ONLY. Clinical efficacy/safety cannot be concluded from this data import.')

if __name__=='__main__':
    main()
