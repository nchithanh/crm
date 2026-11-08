# MA · Courses API (FE)

Khi `authMode=ma`, `/courses` dùng Laravel thay Dexie.

## Client

| File | Vai trò |
| --- | --- |
| `lib/api/crm-courses.ts` | CRUD courses · activate/deactivate · `GET …/classes` · `POST …/generate-classes` `{ sessions }` |
| `lib/course-generate-preview.ts` | Preview tuần + session (day/start/end/enabled) |
| `components/course-generate-classes-drawer.tsx` | Lịch + bulk tuần + list buổi (giờ riêng) → gửi `sessions` |
| `lib/actions.ts` → `createCourse` | MA: gọi API — **không** sinh classes |
| `app/courses/page.tsx` | List + tạo drawer |
| `app/courses/view/page.tsx` | Hub MA detail theo `?code=` (1 HTML static; không `/courses/{id}`) |
| `lib/course-href.ts` | `courseDetailHref` — MA → view?code= |

SoT BE: `products/saas/backend/context/crm/courses.md`.

## Hành vi

- Tạo khóa chỉ lưu khung + lịch mẫu (`weekdays`, giờ, `session_count`).
- Detail MA: `/courses/view/?code={code}` + `GET /courses/by-code/{code}` (tránh 404 Pages với id số).
- Sinh buổi = CTA trên detail → drawer → `POST /courses/{id}/generate-classes` với:

```json
{ "sessions": [{ "day": "YYYY-MM-DD", "start": "HH:mm", "end": "HH:mm" }] }
```

- Thiếu giờ trên session → BE dùng giờ mẫu khóa.
- Phòng: buổi đang nhận `room_id` copy từ khóa — **TODO liên kết room** (chọn phòng theo buổi lúc sinh / sau sinh; chưa có trên payload `sessions`).
- Phân quyền: xem = nav `courses`; tạo/sinh = `courses.actions` (`canCourseAction` / BE `hasCourseAction`).
- Lần đầu only (`classes_generated`); sinh thêm tuần = TODO.
- Deactivate / activate endpoint riêng. DELETE chỉ khi chưa start + chưa generate.
- Students / subscriptions tab ẩn trên MA (chưa API).

## TODO

- **Liên kết room** trên generate-classes (`sessions[].room_id` hoặc tương đương) + UI chọn phòng
- Sinh thêm tuần sau lần đầu
- PATCH giờ / phòng buổi sau generate
- Rooms catalog · roster / enroll / điểm danh
