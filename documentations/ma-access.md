# MA · Access API (FE)

Khi `authMode=ma`, ma trận `/settings/access` sync Laravel thay Dexie.

## Client

| File | Vai trò |
| --- | --- |
| `lib/api/crm-access.ts` | `GET/PUT /crm/{org}/access` |
| `stores/access-store.ts` | `hydrate` / mutate → API khi MA; Dexie khi demo |
| `stores/auth-store.ts` | Sau login MA → `hydrate` access |

SoT BE: `products/saas/backend/context/crm/access.md` (+ enforce `tasks.md`).

## Hành vi

- **GET** mọi user đã login (đọc matrix + defaults).
- **PUT** chỉ Boss; FE `canEditMatrix` = boss.
- Mặc định: `visibility=mine`; `changeStatus` + `comment` bật.
- Verifier luôn sửa field / Done — rule FE+BE, không nằm matrix.
- Path MA: `/settings/access` (+ nav). Demo vẫn Dexie `roleAccess`.
- **Refresh session + matrix:** `syncMaSession` (`GET /me` → cập nhật `user.role`) rồi `refreshMa` khi focus/visibility + vào `/tasks` · `/settings/access` · `/staff`. Boss đổi role / khóa TK: BE đọc role từ DB mỗi request; FE sync UI; inactive → 401 logout.
