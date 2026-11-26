"""Verify saved-run 3D data and stateless Python preview through the real proxy."""
import json
import urllib.request
import urllib.error

BASE = __import__("os").environ.get("RESCUE_API_BASE", "http://127.0.0.1:8000/api")


def request(path, data=None):
    req = urllib.request.Request(BASE+path,
        data=json.dumps(data).encode() if data is not None else None,
        headers={"Content-Type":"application/json"} if data is not None else {})
    with urllib.request.urlopen(req, timeout=60) as response:
        return json.load(response)


def main():
    summary = request("/summary")
    run = request("/runs/"+summary["latest_run_id"])
    view = request("/runs/"+run["id"]+"/visualization")
    assert view["run_id"] == run["id"]
    assert len(view["frames"]) == len(run["traces"])
    assert view["geometry"]["channels"] == run["config"]["channels"]
    before = summary["total_runs"]
    config = {**run["config"], "pressure_pa":1200, "name":"Unsaved 3D live preview check"}
    result = request("/preview",config)
    assert result["run"]["id"].startswith("preview-")
    assert result["run"]["config"]["pressure_pa"] == 1200
    assert result["visualization"]["run_id"] == result["run"]["id"]
    assert request("/summary")["total_runs"] == before, "Live preview must never create stored runs"
    assert request("/runs/"+run["id"]) == run, "Original numerical output must be untouched"
    for path,data in [("/preview",{**config,"radius_um":-5}),
                      ("/runs/not-a-real-run/visualization",None)]:
        try:
            request(path,data)
            raise AssertionError("Expected invalid request to fail")
        except urllib.error.HTTPError as exc:
            assert exc.code in (404,422)
    print(json.dumps({"status":"passed","checks":["saved 3D field data","trace correspondence",
        "live Python recalculation","stateless preview","original output preservation",
        "invalid parameter rejection","missing run rejection"],
        "frames":len(view["frames"]),"visualization_version":view["visualization_version"]},indent=2))


if __name__ == "__main__":
    main()
