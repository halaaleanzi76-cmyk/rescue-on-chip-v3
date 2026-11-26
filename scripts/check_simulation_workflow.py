"""Exercise the real proxy, Python service, PostgreSQL storage and report outputs."""
import hashlib
import json
import urllib.request
import urllib.error

BASE = __import__("os").environ.get("RESCUE_API_BASE", "http://127.0.0.1:8000/api")


TOKEN = __import__("os").environ.get("RESCUE_API_TOKEN")  # a verified Supabase access token (optional)


def request(path,data=None,auth=True):
    headers = {"Content-Type":"application/json"} if data is not None else {}
    if TOKEN and auth:
        headers["Authorization"] = "Bearer " + TOKEN
    req = urllib.request.Request(BASE+path,data=json.dumps(data).encode() if data is not None else None,headers=headers)
    with urllib.request.urlopen(req,timeout=60) as response:
        return response.status,response.headers,response.read()


def main():
    assert json.loads(request("/healthz")[2])["status"]=="ok"
    metadata=json.loads(request("/model")[2])
    config=metadata["defaults"]
    config["name"]="Crossover bench · reproducibility check"
    # Saving is a private, authenticated action: anonymous creation must be refused.
    try:
        request("/runs",config,auth=False)
        raise AssertionError("anonymous run creation must be rejected")
    except urllib.error.HTTPError as e:
        assert e.code in (401, 503), e.code
    if TOKEN:
        status,_,body=request("/runs",config)
        assert status==201
        run=json.loads(body)
    else:
        # No account token supplied: verify reload/export on the public demonstration run instead.
        public=json.loads(request("/runs")[2])
        assert public, "the seeded public demonstration run must be listed"
        run=json.loads(request("/runs/"+public[0]["id"])[2])
    stored=json.loads(request("/runs/"+run["id"])[2])
    assert stored==run, "Reloaded result must be identical to the saved record"
    # Fingerprint must be reproducible from the exported config under the current model version.
    fp_run = run if (TOKEN or run["model_version"] == metadata["version"]) else json.loads(request("/preview", config)[2])["run"]
    expected=hashlib.sha256((fp_run["model_version"]+json.dumps(fp_run["config"],sort_keys=True,separators=(",",":"))).encode()).hexdigest()
    assert expected==fp_run["fingerprint"]
    assert len(run["replicates"])==run["config"]["replicates"]*4
    assert len(run["metrics"])==3
    for fmt in ["json","csv","html"]:
        status,headers,content=request("/runs/"+run["id"]+"/report?format="+fmt)
        assert status==200 and len(content)>200
        assert "attachment" in headers["Content-Disposition"]
        if fmt=="json":
            assert json.loads(content)==run
        elif fmt=="csv":
            assert b"pressure_pa" in content and run["fingerprint"].encode() in content
        else:
            assert b"UNVALIDATED" in content and run["fingerprint"].encode() in content
    try:
        request("/preview",{**config,"radius_um":-1})  # same ExperimentInput validation, public endpoint
        raise AssertionError("Invalid parameters were accepted")
    except urllib.error.HTTPError as exc:
        assert exc.code==422
    try:
        request("/runs/not-a-real-run")
        raise AssertionError("Missing run should return 404")
    except urllib.error.HTTPError as exc:
        assert exc.code==404
    assert request("/source")[2].startswith(b"%PDF")
    summary=json.loads(request("/summary")[2])
    assert summary["total_runs"]>=1
    print(json.dumps({"status":"passed","checks":["health","model defaults","anonymous save refused","create (with token) or public run","persist and reload",
          "fingerprint","three topologies","24 virtual chips","HTML report","trace CSV","full JSON",
          "parameter rejection","missing run","source PDF","summary"],
          "run_id":run["id"],"baseline_flow_ul_min":run["baseline_flow_ul_min"],
          "equalized_peak_pct":run["metrics"][2]["peak_deviation_pct"]},indent=2))


if __name__=="__main__":
    main()
