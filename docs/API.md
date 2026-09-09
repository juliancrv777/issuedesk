# HTTP API

All responses are JSON. There is no app-level authentication in this single-workspace version; protect the deployment with an access gateway. JSON writes reject a foreign Origin header. Missing Origin is permitted for non-browser API clients.

## Endpoints

| Method | Path | Behavior |
| --- | --- | --- |
| GET | `/api/health` | Check database/schema availability |
| GET | `/api/tickets` | List tickets and workspace status totals |
| POST | `/api/tickets` | Create a ticket |
| GET | `/api/tickets/{id}` | Read a ticket and ordered activity |
| PATCH | `/api/tickets/{id}` | Update ticket fields with a version check |
| PATCH | `/api/tickets/{id}/status` | Change workflow status with a version check |
| POST | `/api/tickets/{id}/comments` | Add a comment |
| POST | `/api/examples` | Add six fictional examples to an empty workspace |

List parameters: `q` (up to 120 characters), `status` (`all`, `open`, `in_progress`, `resolved`), `priority` (`all`, `low`, `medium`, `high`, `urgent`) and `page` (1–10000). The response is `{ data, total, page, page_size, stats }`.

Create body:

```json
{
  "creation_key": "1d2691b3-9b14-49f1-b988-16738ce50789",
  "title": "Não consigo acessar o painel",
  "description": "O painel apresenta uma mensagem de erro ao carregar.",
  "requester": "Equipe comercial",
  "assignee": "",
  "priority": "high"
}
```

Generate a new UUID for each new ticket. Reuse it only to retry the same submission. Field limits: title 5–120, description 10–5000, requester 2–80 and assignee 0–80 characters. Input is trimmed and validated on both client and server.

Editing uses the same fields without `creation_key`, plus `version`. Status changes use `{ "status": "in_progress", "version": 1 }`. Comments use `{ "id": "<new UUID>", "body": "<2–2000 characters>" }`. Unknown fields are rejected.

Errors return `{ "error": "human-readable message" }`: 400 for invalid fields/JSON, 403 for a foreign origin, 404 for missing tickets, 409 for stale versions or conflicting retry IDs, 413 above 20000 request-body bytes, 415 for unsupported content type, 422 for an invalid status transition and 503 for storage failures.
