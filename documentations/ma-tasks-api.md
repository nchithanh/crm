# MA · Tasks API (FE)

Khi `authMode=ma` (login Ma Dance), trang `/tasks` không dùng Dexie — gọi Laravel CRM.

## Client

| File | Vai trò |
| --- | --- |
| `lib/api/config.ts` | `NEXT_PUBLIC_CRM_API_URL` |
| `lib/api/crm-session.ts` | JWT + org id |
| `lib/api/crm-client.ts` | `crmFetch` → `/crm/{orgId}/…` |
| `lib/api/crm-tasks.ts` | parents / tasks / comments / staff / branches + map → types FE |
| `lib/hooks/use-ma-tasks-data.ts` | Load song song 4 list; `reload` sau mutate |
| `lib/actions.ts` | Nhánh `isMaStudioMode()` cho create/update/move/comment/parent |

SoT endpoint BE: `products/saas/backend/context/crm/tasks.md` (+ `branches.md`, `auth.md`).

## Hành vi UI

- List/board + drawer: data từ hook; **mở drawer** MA `GET /tasks/{id}` để lấy comments (list không embed). Sau save/comment/drag status → `reload`; gửi comment → fetch lại detail.
- **Nhóm việc:** `TaskParentDrawer` — POST/PATCH/DELETE `/task-parents`. Comment: textarea (ảnh R2 TODO).
- Demo vertical (`authMode=demo`): vẫn IndexedDB như cũ.
- Boss thêm menu tạo TK: xem `ma-staff.md`.
- Task có `verifier_id` (Người kiểm tra). Scope list: boss/owner = all; role khác = assignee hoặc verifier = mình.
- Role `accountant` (Kế toán) tạo được qua `/staff`.
