# PumpGTM workspace REST API

**Read and control one PumpGTM workspace over plain HTTPS.** Leads, sequences, LinkedIn pacing, the activity ledger, pending replies and the funnel report, for dashboards, reporting and automations that are not MCP clients. Everything here is also on the [MCP server](https://github.com/pumpgtm/pumpgtm-mcp), which is the richer surface.

- Website: https://pumpgtm.com
- Live docs: https://pumpgtm.com/docs/api
- Machine-readable spec: [`openapi.json`](openapi.json) (OpenAPI 3.1)
- Examples: [`examples/`](examples)

Machine-readable: [openapi.json](https://pumpgtm.com/openapi.json) (OpenAPI 3.1, validates clean, generate a client from it). Plain Markdown of this page: [/markdown/pages/docs/api.md](https://pumpgtm.com/markdown/pages/docs/api.md). New here? Start with the [quickstart](https://pumpgtm.com/docs/quickstart).

## Authentication

Base URL: `https://app.pumpgtm.com`

Every request sends the workspace key: `Authorization: Bearer eve_mcp_...`. Sign in at [app.pumpgtm.com](https://app.pumpgtm.com), open **MCP** in the left nav, and copy the key. It is the same key the MCP server takes.

The key's database row fixes the workspace. One key reads exactly one workspace and nothing else. A missing or unknown key returns `401 {"error":"unauthorized"}`.

Keep the key server side. Never ship it to a browser or an end user's device.

```bash
curl https://app.pumpgtm.com/api/v1/progress?sinceDays=7 \
  -H "Authorization: Bearer $PUMPGTM_KEY"
```

## Endpoints

| Method and path | What it returns |
|---|---|
| `GET /api/v1/progress?sinceDays=7` | Funnel totals for the period, queued count, per LinkedIn account pacing (invites sent today, cap, ramp phase, account score). |
| `GET /api/v1/reports/funnel?group_by=sequence` or `account` | The funnel per sequence or per account, plus A/B variant arms. |
| `GET /api/v1/sequences` | Every sequence with steps, status, approval state and exact enrolled lead count. |
| `PATCH /api/v1/sequences/{id}/status` | Body `{"status":"active" / "paused" / "draft"}`. Start, pause or reopen a sequence. |
| `GET /api/v1/leads` | Leads with stage, timestamps and sequence progress. Exact `count` plus a page. |
| `GET /api/v1/activity` | The append-only ledger of every connection, message, engagement and email an account sent. |
| `GET /api/v1/replies` | Inbound replies waiting for a human, each with the drafted answer and the decisions allowed. |
| `POST /api/v1/replies/{id}/decide` | Apply one decision to a pending reply. This is the only call that contacts a prospect. |
| `GET` `POST /api/v1/webhooks`, `DELETE /api/v1/webhooks/{id}`, `POST /api/v1/webhooks/{id}/test` | Signed webhooks for replies, connections, messages and meetings. See Webhooks below. |
| `GET /api/v1/energy` | This month's Energy: people found against the workspace allowance. `{"enabled": false}` for workspaces that are not metered. |

All responses are JSON. Timestamps are ISO 8601 in UTC. Ids are UUIDs, except LinkedIn account ids which look like `onb_...`.

### GET /api/v1/progress

Query: `sinceDays` 1 to 90, default 7.

```json
{
  "asOf": "2026-09-23T18:50:52.542Z",
  "period": { "since": "2026-09-16T18:50:52.542Z", "days": 7 },
  "funnel": { "leads": 3125, "invited": 3037, "accepted": 763, "messaged": 722, "replied": 196,
              "meetingsBooked": 42, "meetingsQualifying": 42, "meetingsNoShowOrCancelled": 0,
              "repliesPositive": 57, "repliesNegative": 15, "acceptRate": 0.251, "replyRate": 0.271 },
  "queued": 1486,
  "recentActions": 3821,
  "recentFailures": 161,
  "accounts": [{
    "id": "onb_b9a7f029-...", "name": "Namanyay Goel", "mode": "outreach", "storedStatus": "connected",
    "connectedAt": "2026-08-11T03:35:25.954+00:00", "warmupStartedAt": "2026-08-11T03:35:25.954+00:00",
    "pacingTimeZone": "America/Los_Angeles", "invitesSentToday": 0, "inviteCapToday": 30,
    "rampPhase": "full", "accountScore": 28, "relationsCount": null
  }]
}
```

`funnel` counts are lifetime for the workspace's accounts; `recentActions` and `recentFailures` are for the period. `rampPhase` is the warm-up stage of the account; `inviteCapToday` is today's connection request budget in the account's own time zone.

### GET /api/v1/reports/funnel

Query: `group_by` = `sequence` (default) or `account`.

```json
{
  "groupBy": "account",
  "total": { "leads": 3125, "invited": 3037, "accepted": 763, "messaged": 722, "replied": 196,
             "meetingsBooked": 42, "repliesPositive": 57, "repliesNegative": 15, "acceptRate": 0.251, "replyRate": 0.271 },
  "groups": [{ "id": "onb_b9a7f029-...", "name": "Namanyay Goel", "funnel": { "...": "same shape as total" } }],
  "experimentArms": [{ "sequenceId": "d2ff89e4-...", "variantKey": "casual", "sent": 63, "accepted": 63, "replied": 9, "meetingsBooked": 0 }]
}
```

`excludedWarmupAccounts` is also present and always an empty array; it is kept for older clients.

### GET /api/v1/sequences

```json
{
  "sequences": [{
    "id": "bbbbbbbb-cccc-dddd-eeee-ffffffff0002",
    "name": "Warm-up · Neelam Yadav",
    "status": "paused",
    "revision": 1,
    "approvedAt": null,
    "approvedRevision": null,
    "executionBlockReason": null,
    "leadCount": 934,
    "channels": ["linkedin"],
    "steps": [
      { "index": 0, "kind": "connect", "delayDays": 0, "subject": null, "message": null, "actions": [], "variants": null, "tool": null },
      { "index": 1, "kind": "message", "delayDays": 1, "subject": null, "message": "", "actions": [],
        "variants": [{ "key": "A", "weight": 50, "messageTmpl": "Hey, ..." }, { "key": "B", "weight": 50, "messageTmpl": "Hey {first_name}, ..." }], "tool": null },
      { "index": 2, "kind": "engage", "delayDays": 1, "subject": null, "message": null,
        "actions": [{ "type": "like_last_post", "count": 1, "reaction": "like" }], "variants": null, "tool": null }
    ]
  }]
}
```

`status` is `draft`, `active`, `paused` or `archived`. `kind` is `connect`, `message`, `engage`, `email`, `x_dm`, `x_engage` or `instagram_dm`. `delayDays` counts from the previous step. A `message` step carries either `message` or weighted `variants`. `executionBlockReason` is non-null when the sequence cannot run, for example `sequence_approval_required`.

### PATCH /api/v1/sequences/{id}/status

```bash
curl -X PATCH https://app.pumpgtm.com/api/v1/sequences/505ef60c-.../status \
  -H "Authorization: Bearer $PUMPGTM_KEY" -H "content-type: application/json" \
  -d '{"status":"paused"}'
```

```json
{ "ok": true, "sequenceId": "505ef60c-...", "previousStatus": "active", "status": "paused" }
```

- `400` when `status` is not `active`, `paused` or `draft`.
- `404 {"error":"sequence not found"}` when the id is not in this workspace.
- `409 {"ok":false,"error":"sequence_approval_required"}` when activating a draft nobody has approved. Approve it with the MCP tool `set_sequence_status` `approved` (it records the exact revision), or in the app.
- `409 {"ok":false,"error":"archived_sequence_is_read_only"}`.

Editing steps is MCP-only today: `save_sequence_draft` on a sequence in `draft` status. Move an active sequence to `draft` first.

### GET /api/v1/leads

Query, all optional: `stage` (cumulative: the lead reached this milestone or beyond), `q` (name, company or title search), `engaged=1` (only leads with any LinkedIn activity), `booked=1`, `sinceDays` (engaged within the last N days; implies `engaged=1`), `limit` (default 200, max 500).

Stages, in order: `queued`, `resolving`, `invited`, `accepted`, `messaged`, `followed_up`, `replied`, `failed`, `skipped`.

```json
{
  "count": 5661,
  "returned": 2,
  "leads": [{
    "id": "ad976120-...", "person": "Siyam Al Shahriar", "company": "kerniva.app", "title": null,
    "email": "siyam@kerniva.app", "linkedinUrl": "https://www.linkedin.com/in/siyam-al-shahriar",
    "account": "onb_b9a7f029-...", "sequenceId": "39fa39b7-...", "strategyId": null, "strategyRunId": null,
    "invitePriority": 0, "stage": "messaged", "currentStep": 2, "nextActionAt": null, "sequenceDone": true,
    "invitedAt": "2026-09-22T16:31:24.376+00:00", "connectedAt": "2026-09-22T22:55:23.393+00:00",
    "messagedAt": "2026-09-22T23:19:02.695+00:00", "repliedAt": null, "meetingBookedAt": null,
    "meetingOutcome": null, "snoozedUntil": null, "optedOutAt": null, "replySentiment": null, "lastError": null
  }]
}
```

`count` is exact even when the page is limited. Page by narrowing the filter (a stage, a sequence, a day range); there is no cursor yet.

### GET /api/v1/activity

Query, all optional: `account` (an `onb_...` id), `action` (comma separated), `outcome` (`ok`, `skipped`, `failed`), `sinceDays`, `limit` (default 200, max 500).

Actions: `resolve`, `invite`, `accepted`, `like`, `message`, `followup`, `reply_detected`, `view_profile`, `endorse`, `comment`, `enrich`, `meeting_invited`, `reply_drafted`, `reply_sent`, `reply_dismissed`, `reply_snoozed`, `sequence_started`, `meeting_booked`, `meeting_no_show`, `meeting_synced`, `manual_override`, `email_sent`, `x_dm`, `x_follow`, `x_like`, `x_follow_back`, `error`.

```json
{
  "count": 3821,
  "returned": 1,
  "actions": [{
    "id": "85d5d216-...", "createdAt": "2026-09-23T18:50:43.031002+00:00",
    "action": "email_sent", "outcome": "ok", "units": 1,
    "detail": "{\"actor\":\"cron\",\"sequence_id\":\"37a8d9d3-...\",\"step_index\":0}",
    "account": null,
    "lead": { "id": "aaee1f44-...", "person": "Lewis Carhart", "company": "Comp AI", "linkedinUrl": "https://www.linkedin.com/in/lewiscarhart" }
  }]
}
```

`detail` is a free text or JSON string with what the step did. Connections sent in a period: `action=invite&outcome=ok&sinceDays=7` and read `count`.

### GET /api/v1/replies

Query: `limit` default 50, max 200.

```json
{
  "replies": [{
    "id": "5cd3fbdd-...",
    "lead": { "id": "487e06af-...", "person": "Neel Samanta", "company": "Twenty Two by 7 Solutions", "title": "Sr. Manager",
              "linkedinUrl": "https://www.linkedin.com/in/neelsamanta", "email": "neel@22by7.tech" },
    "account": "onb_b9a7f029-...",
    "sequenceId": "39fa39b7-...",
    "classification": "meeting_intent",
    "theirMessage": "LinkedIn outreach for now. We want to scale outbound further from here.",
    "draft": "Sandboxing the outreach makes sense ... grab a time here: https://cal.com/...",
    "repliedAt": "2026-09-23T16:16:29.680+00:00",
    "allowedDecisions": ["send", "invite", "booking_link", "snooze", "start_sequence", "meeting_booked", "dismiss", "opt_out"]
  }]
}
```

`id` is the draft id that `decide` takes. `allowedDecisions` already applies our rules, for example `invite` appears only when the lead has an email. A reply stays in this list until someone decides; the workspace's Slack channel gets the same item if Slack is connected.

### POST /api/v1/replies/{id}/decide

```bash
curl -X POST https://app.pumpgtm.com/api/v1/replies/5cd3fbdd-.../decide \
  -H "Authorization: Bearer $PUMPGTM_KEY" -H "content-type: application/json" \
  -d '{"decision":"send","text":"Happy to. Does Tuesday 10am PT work?","by":"gtme-dashboard"}'
```

Body: `decision` (required) is `send`, `invite`, `booking_link`, `snooze`, `start_sequence`, `meeting_booked`, `dismiss` or `opt_out`. `text` replaces the draft on `send`. `days` is the snooze length. `by` is a label for the audit trail, default `api`.

`send`, `invite` and `booking_link` message the prospect from their LinkedIn account. `opt_out` is permanent. Response is `{"ok": true, ...}`, `404 {"error":"reply not found"}`, or `409 {"ok": false, "error": "..."}` when the decision no longer applies. The same code runs behind the Slack buttons, so a human and an integration can pick up where the other left off.

## Webhooks

Get an HTTPS POST the moment something happens, instead of polling. Up to 10 webhooks per workspace, each with its own signing secret and its own list of events.

### Events

| Event | When | `data` |
|---|---|---|
| `reply.received` | A prospect replied on LinkedIn and the sequence froze. Carries the drafted answer, so your agent can decide it with `POST /api/v1/replies/{replyId}/decide`. | `replyId`, `lead`, `classification`, `theirMessage`, `draft` |
| `lead.invited` | A connection request went out. | `lead` |
| `lead.accepted` | The prospect accepted the connection. | `lead` |
| `lead.messaged` | A LinkedIn message or follow-up was sent. | `lead` |
| `lead.emailed` | An email step was sent. | `lead` |
| `lead.meeting_booked` | A meeting was recorded for the lead. | `lead` |
| `ping` | You called the test endpoint. | `webhookId`, `message` |

`lead` is `{ id, person, company, title, email, linkedinUrl, account, sequenceId, stage }`.

### Manage webhooks

```bash
# Create. The secret is returned once; store it.
curl -X POST https://app.pumpgtm.com/api/v1/webhooks \
  -H "Authorization: Bearer $PUMPGTM_KEY" -H "content-type: application/json" \
  -d '{"url":"https://example.com/pumpgtm","events":["reply.received","lead.accepted"]}'
```

```json
{ "id": "982e0604-...", "url": "https://example.com/pumpgtm", "events": ["reply.received", "lead.accepted"], "secret": "whsec_..." }
```

`GET /api/v1/webhooks` lists them without secrets and includes the full `events` catalog. `DELETE /api/v1/webhooks/{id}` removes one. `POST /api/v1/webhooks/{id}/test` sends a `ping` to that URL right away (202), whatever its event list, so you can check your receiver and signature code before anything real happens. Errors: `400` for a non-HTTPS URL or an unknown event, `404 {"error":"webhook not found"}`, `409 {"error":"webhook_limit_reached"}`.

### Delivery and signature

Every delivery is a JSON POST with `User-Agent: PumpGTM-Webhooks/1` and these headers:

- `X-PumpGTM-Event`: the event name.
- `X-PumpGTM-Delivery`: a UUID, the same for every attempt of one event. Deduplicate on it.
- `X-PumpGTM-Signature`: `t=<unix seconds>,v1=<hex HMAC-SHA256>` where the signed string is `<t>.<raw body>` and the key is the webhook's secret.

```json
{
  "id": "2c327ba6-...",
  "event": "reply.received",
  "createdAt": "2026-09-23T20:47:02.810Z",
  "data": {
    "replyId": "5cd3fbdd-...",
    "lead": { "id": "487e06af-...", "person": "Neel Samanta", "company": "Twenty Two by 7 Solutions", "title": "Sr. Manager",
              "email": "neel@22by7.tech", "linkedinUrl": "https://www.linkedin.com/in/neelsamanta", "account": "onb_b9a7f029-...",
              "sequenceId": "39fa39b7-...", "stage": "replied" },
    "classification": "meeting_intent",
    "theirMessage": "LinkedIn outreach for now. We want to scale outbound further from here.",
    "draft": "Sandboxing the outreach makes sense ... grab a time here: https://cal.com/..."
  }
}
```

Verify before trusting the body. Node:

```js
import { createHmac, timingSafeEqual } from "node:crypto";

export function verifyPumpGtm(rawBody, signatureHeader, secret, toleranceSeconds = 300) {
  const parts = Object.fromEntries(signatureHeader.split(",").map((kv) => kv.split("=")));
  if (Math.abs(Date.now() / 1000 - Number(parts.t)) > toleranceSeconds) return false;
  const expected = createHmac("sha256", secret).update(`${parts.t}.${rawBody}`).digest("hex");
  return timingSafeEqual(Buffer.from(expected), Buffer.from(parts.v1));
}
```

Python:

```python
import hmac, hashlib, time

def verify_pumpgtm(raw_body: bytes, signature_header: str, secret: str, tolerance=300) -> bool:
    parts = dict(kv.split("=", 1) for kv in signature_header.split(","))
    if abs(time.time() - int(parts["t"])) > tolerance:
        return False
    expected = hmac.new(secret.encode(), f"{parts['t']}.".encode() + raw_body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, parts["v1"])
```

Answer with any 2xx within 10 seconds. A timeout, network error, 429 or 5xx is retried twice, 1 and 4 seconds later, with the same delivery id. Any other 4xx is not retried. Delivery is at least once; a delivery log is not exposed yet.


## Energy

Energy is the unit for discovery. One Energy is one person found and returned to review by `find_people`. Nothing else spends it: sequences, messages, replies and webhooks are free. Most workspaces are not metered and see `{"enabled": false}`. Agency and platform workspaces carry a monthly allowance that resets on the first of each month, UTC, plus any Energy added on top.

```bash
curl https://app.pumpgtm.com/api/v1/energy -H "Authorization: Bearer $PUMPGTM_KEY"
```

```json
{ "enabled": true, "monthlyAllowance": 1500, "extra": 0, "used": 30, "remaining": 1470,
  "periodStart": "2026-09-01T00:00:00.000Z", "resetsAt": "2026-10-01T00:00:00.000Z" }
```

When a `find_people` run would return more people than `remaining`, it is refused with the structured error `energy_exhausted` and nobody is contacted. Lower the count or add Energy. The same numbers appear under `energy` in the MCP `get_workspace` summary and on the Overview page of the app. To add Energy, write to hello@pumpgtm.com; self-serve top-ups are not live yet.

## Errors

| Status | Body | Meaning |
|---|---|---|
| 400 | `{"error":"..."}` | A bad enum value or body. |
| 401 | `{"error":"unauthorized"}` | Missing, unknown, revoked or expired key. |
| 404 | `{"error":"... not found"}` | The id is not in this workspace. |
| 409 | `{"ok":false,"error":"code"}` | The change is not allowed in the current state. |
| 429 | `Retry-After` header | Not applied today; if a limit is added, a 429 will carry `Retry-After`. |

## Versioning

The path carries the major version (`/api/v1`). Existing v1 responses stay compatible; new fields may be added, existing ones are not removed or renamed. A breaking change ships under a new major path while v1 keeps working. Anything scheduled for removal answers with `Deprecation: true` and a `Sunset` header at least 90 days ahead, and is announced on this page with its replacement.

## Not in the REST API yet

- Creating or editing sequence steps, adding leads (manual, CSV, Sales Navigator), finding people, and the account universe and CRM tools. All of these are MCP tools, see [/docs/mcp](https://pumpgtm.com/docs/mcp).
- Key rotation by API or in the app. Write to hello@pumpgtm.com to rotate a key.
- One key for many client workspaces. The agency layer (create and manage workspaces by API) is in progress; write to hello@pumpgtm.com to join the first cohort.

Questions: hello@pumpgtm.com.

## Learn more

- Quickstart, five minutes from key to first call: https://pumpgtm.com/docs/quickstart
- Watch it: [How to run an entire LinkedIn sales team with Claude](https://pumpgtm.com/blog/run-a-linkedin-sales-team-with-claude) and the [PumpGTM YouTube channel](https://www.youtube.com/@pumpgtm)
- Founders and creators using it, on their own channels: https://pumpgtm.com/customers/videos
- Guides: [LinkedIn outbound playbook, 30+ enterprise meetings a week](https://pumpgtm.com/blog/linkedin-outbound-playbook-enterprise-meetings), [LinkedIn outreach tools with an MCP server](https://pumpgtm.com/best/linkedin-outreach-tools-with-mcp-server), [AI GTM engine: the closed-loop system we run for YC startups](https://pumpgtm.com/blog/ai-gtm-engine-closed-loop-system)
- Agencies and platforms with many client workspaces: https://pumpgtm.com/mcp/platforms
- Everything an agent needs in one file: https://pumpgtm.com/llms.txt

Built by [Giga Next Inc.](https://pumpgtm.com/about), San Francisco. Questions: hello@pumpgtm.com.
