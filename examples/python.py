# Usage: PUMPGTM_KEY=eve_mcp_... python examples/python.py
import os, requests

BASE = "https://app.pumpgtm.com"
H = {"Authorization": f"Bearer {os.environ['PUMPGTM_KEY']}"}

def get(path):
    r = requests.get(BASE + path, headers=H, timeout=30)
    r.raise_for_status()
    return r.json()

funnel = get("/api/v1/reports/funnel?group_by=account")
for g in funnel["groups"]:
    f = g["funnel"]
    print(g["name"], "invited", f["invited"], "accepted", f["accepted"], "replied", f["replied"])

leads = get("/api/v1/leads?stage=replied&limit=20")
print(leads["count"], "leads have replied; showing", leads["returned"])
