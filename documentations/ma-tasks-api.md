# MA · Tasks API (FE)

Khi `authMode=ma` (login Ma Dance), trang `/tasks` không dùng Dexie — gọi Laravel CRM.

## Client

| File | Vai trò |
| --- | --- |
| `lib/api/config.ts` | `NEXT_PUBLIC_CRM_API_URL` |
| `lib/api/crm-session.ts` | JWT + org id |
| `lib/api/crm-client.ts` | `crmFetch` / `crmUpload` → `/crm/{orgId}/…` · thiếu JWT / HTTP 401 → logout + redirect `/login` |
| `lib/api/crm-tasks.ts` | parents / tasks / comments / staff / branches / **media** + map → types FE |
| `lib/api/crm-access.ts` | Ma trận phân quyền `GET/PUT /access` — xem `ma-access.md` |
| `lib/hooks/use-ma-tasks-data.ts` | Load song song 4 list; `reload` sau mutate |
| `lib/actions.ts` | Nhánh `isMaStudioMode()` cho create/update/move/comment/parent |

SoT endpoint BE: `products/saas/backend/context/crm/tasks.md` (+ `access.md`, `branches.md`, `auth.md`).

## Hành vi UI

- **Unauthorized:** JWT hết hạn / mất session → `crmFetch` xóa session + user, `window.location` → `/login` (không để chữ `unauthorized` trên `/tasks`).
- List/board + drawer: data từ hook; **mở drawer** MA `GET /tasks/{id}` để lấy `comments` + `activity` (list không embed). Tab Tất cả / Comment / Lịch sử. Sau save/comment/drag status → `reload`; gửi comment → fetch lại detail.
- **Mô tả task:** field `note` = mô tả (textarea); `note_image_urls` ≤10 ảnh (upload `/media` lúc lưu).
- **Comment ảnh (MA):** chọn nhiều file (≤10) → lần lượt `POST /media` (R2 bucket `crm`, folder = slug tên org) → `POST /comments` kèm `image_urls` (+ text tùy chọn). Timeline hiện lưới ảnh.
- **Nhóm việc:** `TaskParentDrawer` — POST/PATCH/DELETE `/task-parents`. Quyền `manageParents` từ ma trận (+ Boss luôn).
- **Done:** Boss · verifier (cố định) · hoặc `markDone` trên ma trận.
- Media: `apiUploadMedia` nén ảnh client trước upload (`lib/compress-image.ts`).
- Demo vertical (`authMode=demo`): vẫn IndexedDB như cũ.
- Boss thêm menu tạo TK: xem `ma-staff.md`. Phân quyền MA: `ma-access.md`.
- Task có **nhiều người phụ trách** (`assignee_ids`) + `verifier_id`. Scope list: Boss/`visibility=all` = all; còn lại = assignee ∪ verifier.
- Role `accountant` (Kế toán) tạo được qua `/staff`.
