// Usage: PUMPGTM_KEY=eve_mcp_... node examples/node.mjs
const base = "https://app.pumpgtm.com";
const headers = { Authorization: `Bearer ${process.env.PUMPGTM_KEY}` };

const get = async (path) => {
  const res = await fetch(base + path, { headers });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.json();
};

const progress = await get("/api/v1/progress?sinceDays=7");
console.log("accepted:", progress.funnel.accepted, "replied:", progress.funnel.replied);

const { sequences } = await get("/api/v1/sequences");
for (const s of sequences) console.log(s.status.padEnd(8), s.leadCount, s.name);

const { replies } = await get("/api/v1/replies?limit=5");
for (const r of replies) console.log("reply from", r.lead.person, "->", r.draft.slice(0, 80));
