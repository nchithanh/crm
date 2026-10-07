# Data

Mỗi lĩnh vực một thư mục `data/{id}/`.

Hiện có `nhay`:

- `settings.json` `users.json` `demo-accounts.json`
- `courses.json` `rooms.json` `classes.json` `packages.json`
- `leads.json` `students.json` `enrollments.json`
- `payments.json` `receivables.json` `attendance.json` `tasks.json`
- `promotions.json` `holds.json` `bookings.json`

Ngày trong JSON là `offset` so với hôm nay (0 = hôm nay, âm = ngày trước). Lúc seed mới đổi thành `YYYY-MM-DD`.

IndexedDB: `dolphin_crm_{id}`. Đổi lĩnh vực là đổi database, không trộn dữ liệu.

Thêm lĩnh vực sau: copy folder, sửa `lib/vertical.ts` và `lib/seed.ts`.
