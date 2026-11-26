"""Offline software/parser tests using explicitly fabricated *test fixtures* only."""
import hashlib
import json
import sqlite3
import tempfile
import unittest
from contextlib import closing
from pathlib import Path
from unittest.mock import patch

from database import _connect, evidence_overview, search_evidence
from sync_public_evidence import download_json, ensure_schema, extract_trial

HERE=Path(__file__).parent
class TestTemplate(unittest.TestCase):
    def test_database_template_is_research_only(self):
        db=sqlite3.connect(HERE/'clinical_evidence_sources.sqlite')
        self.assertEqual(db.execute('SELECT classification FROM clinical_use_policy').fetchone()[0],'RESEARCH_ONLY')
        self.assertEqual(db.execute('SELECT COUNT(*) FROM source_catalog').fetchone()[0],21)
        db.close()
    def test_trial_parser(self):
        fixture={'protocolSection':{'identificationModule':{'nctId':'NCT_TEST_ONLY','briefTitle':'Fixture'},
                  'statusModule':{'overallStatus':'COMPLETED'},
                  'designModule':{'phases':['PHASE3'],'enrollmentInfo':{'count':123}},
                  'armsInterventionsModule':{'interventions':[{'name':'test medicine'}]},
                  'conditionsModule':{'conditions':['test condition']}},
                  'resultsSection':{'outcomeMeasuresModule':{'outcomeMeasures':[{'type':'PRIMARY','title':'test outcome'}]}}}
        a=extract_trial(fixture)
        self.assertEqual(a['nct_id'],'NCT_TEST_ONLY')
        self.assertEqual(a['enrollment'],123)
        self.assertEqual(len(a['outcomes']),1)
        self.assertTrue(a['has_results'])

    def test_additive_fetch_hash_migration_preserves_template(self):
        with tempfile.TemporaryDirectory() as directory:
            db_path=Path(directory)/'evidence.sqlite'
            # closing(): sqlite3's own context manager only commits; an open handle blocks
            # TemporaryDirectory cleanup on Windows.
            with closing(sqlite3.connect(db_path)) as db:
                db.execute('''CREATE TABLE fetch_log (
                    fetch_id INTEGER PRIMARY KEY AUTOINCREMENT, source_id TEXT NOT NULL,
                    request_url TEXT NOT NULL, fetched_at TEXT NOT NULL, http_status INTEGER,
                    count_records INTEGER DEFAULT 0, outcome TEXT NOT NULL, detail TEXT)''')
                db.execute("INSERT INTO fetch_log(source_id,request_url,fetched_at,http_status,count_records,outcome) VALUES('CTG','https://example.test','before',200,1,'SUCCESS')")
                ensure_schema(db)
                ensure_schema(db)
                columns={row[1] for row in db.execute('PRAGMA table_info(fetch_log)')}
                self.assertIn('response_sha256',columns)
                self.assertEqual(db.execute('PRAGMA user_version').fetchone()[0],1)
                self.assertEqual(db.execute('SELECT source_id,request_url FROM fetch_log').fetchone(),('CTG','https://example.test'))

    def test_download_json_hashes_exact_response_body(self):
        body=b'{\"results\":[{\"id\":\"record\"}]}'
        class Response:
            status=200
            def __enter__(self): return self
            def __exit__(self,*args): return False
            def read(self,limit): return body
        with patch('sync_public_evidence.urlopen',return_value=Response()):
            payload,status,digest=download_json('https://example.invalid/public.json')
        self.assertEqual(payload,json.loads(body))
        self.assertEqual(status,200)
        self.assertEqual(digest,hashlib.sha256(body).hexdigest())

    def test_live_imported_public_records_and_source_states(self):
        overview=evidence_overview()
        self.assertEqual(len(overview['sources']),21)
        self.assertGreaterEqual(overview['table_counts']['clinical_trials'],10)
        self.assertGreaterEqual(overview['table_counts']['fda_labels'],3)
        self.assertGreaterEqual(overview['table_counts']['safety_signals'],5)
        states={row['source_id']:row['integration_state'] for row in overview['sources']}
        self.assertEqual(states['CTG'],'LIVE_FETCH_CONFIRMED')
        self.assertEqual(states['OPENFDA_LABEL'],'LIVE_FETCH_CONFIRMED')
        self.assertEqual(states['OPENFDA_FAERS'],'LIVE_FETCH_CONFIRMED')
        self.assertEqual(overview['clinical_use_classification'],'RESEARCH_ONLY')
        self.assertFalse(overview['patient_specific_recommendations_allowed'])
        self.assertFalse(overview['safety_efficacy_claims_allowed'])

    def test_search_returns_verified_aspirin_records_and_escapes_input(self):
        result=search_evidence('aspirin')
        study=next((row for row in result['trials'] if row['nct_id']=='NCT01813435'),None)
        self.assertIsNotNone(study)
        self.assertEqual(study['study_title'],'GLOBAL LEADERS: A Clinical Study Comparing Two Forms of Anti-platelet Therapy After Stent Implantation')
        self.assertTrue(study['has_posted_results'])
        self.assertGreaterEqual(study['outcome_count'],1)
        self.assertTrue(any('not an incidence rate' in signal['interpretation'] for signal in result['safety_signals']))
        self.assertEqual(search_evidence("' OR 1=1 --")['trials'],[])
        self.assertEqual(search_evidence('%')['trials'],[])

    def test_search_database_is_read_only(self):
        with _connect() as db:
            with self.assertRaises(sqlite3.OperationalError):
                db.execute("INSERT INTO fetch_log(source_id,request_url,fetched_at,outcome) VALUES('CTG','x','x','x')")
if __name__=='__main__': unittest.main()
