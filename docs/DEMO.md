# IssueDesk visual walkthrough

Captured on 2026-09-24 from a local instance of this repository. All records shown are fictional. No production records, credentials or private access URLs are included.

## Watch

- [35-second MP4](media/issuedesk-walkthrough.mp4)
- [Animated preview](media/issuedesk-preview.gif)

This is a captioned sequence of genuine UI screenshots, not a continuous recording. The creation form screenshot was recaptured after completing the flow; its background therefore includes the completed ticket. No interface or ticket state was fabricated for the images.

| Time | Step | What to look for |
| --- | --- | --- |
| 00–05 | Overview | Queue, priorities, assignees and status totals |
| 05–10 | Create | Subject, description, requester and assignee |
| 10–15 | Saved | New ticket and first history entry |
| 15–20 | Edit | Change the assignee from Ana to Lucas |
| 20–25 | Start | Transition from new to in progress |
| 25–30 | Resolve | Ticket marked resolved |
| 30–35 | History | Saved edit, transitions and solution comment |

## Reproduce locally

Follow the installation and database setup in the root README. Use a fresh local database, then:

1. Click **Carregar exemplos** to populate the empty queue with fictional tickets.
2. Click **Novo chamado**. Enter **Acesso ao relatório de vendas**, a fictional description, **Equipe comercial** as requester and **Ana** as assignee.
3. Click **Criar chamado** and confirm its status is **Novo**.
4. Click **Editar**, change the assignee to **Lucas**, and save.
5. Click **Iniciar atendimento**.
6. Add a fictional solution comment and click **Enviar comentário**.
7. Click **Resolver chamado**. Review the recorded history and the **Reabrir chamado** action.

The flow above was exercised through the real UI against local persistent storage. It is a manual demonstration, not an automated end-to-end test suite. The hosted app remains private; the media can be reviewed directly from the public repository.

## Validation for this update

- Manual UI flow: create → edit assignee → start → comment → resolve; checked the visible history.
- `npm run typecheck`: passed.
- `npm test`: 9 tests passed.
- `npm run build`: passed.
- MP4: H.264, 960 × 720, 24 fps, 35 seconds; no audio.

The local preview now uses Vite directly and permits its preview hostname. Client retry identifiers retain cryptographically random UUIDs even on local HTTP origins where `crypto.randomUUID` is unavailable; HTTPS continues to use the native method.
