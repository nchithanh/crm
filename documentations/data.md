# Data

Mỗi lĩnh vực một thư mục `fe/data/{id}/`.

Hiện có `nhay`:

- `settings.json` `users.json` `demo-accounts.json`
- `leads.json` `students.json` `classes.json` `packages.json`
- `enrollments.json` `payments.json` `receivables.json` `attendance.json` `tasks.json`

Ngày trong JSON là `offset` so với hôm nay (0 = hôm nay, âm = ngày trước). Lúc seed mới đổi thành `YYYY-MM-DD`.

IndexedDB: `dolphin_crm_{id}`. Đổi lĩnh vực là đổi database, không trộn dữ liệu.

Thêm lĩnh vực sau: copy folder, sửa `lib/vertical.ts` và `lib/seed.ts`.
