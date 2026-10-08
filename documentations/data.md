# Data

Mỗi lĩnh vực một thư mục `data/{id}/`.

Hiện có `nhay` (Edu Dance), `anh` (Edu English), `nhac` (Edu Music), `boi` (Edu Swim). Cùng schema. Khác tên cơ sở, khóa và gói.

- `settings.json` `users.json` `demo-accounts.json`
- `branches.json` `courses.json` `rooms.json` `classes.json` `packages.json`
- `leads.json` `students.json` `enrollments.json`
- `payments.json` `receivables.json` `attendance.json` `tasks.json`
- `promotions.json` `holds.json` `bookings.json`

Ngày trong JSON là `offset` so với hôm nay (0 = hôm nay, âm = ngày trước). Lúc seed mới đổi thành `YYYY-MM-DD`. Học viên có `email`, `birthYears` (tuổi, seed đổi thành ngày sinh) và `flagged`.

Seed `8`: 24 học viên, 20 lead, phiếu thu / nợ / ghi danh / điểm danh / bảo lưu / tác vụ / đặt phòng đi kèm. Giữ 3 chi nhánh và giá gói mẫu. 6 khóa: bốn khóa cũ cộng hai lớp sáng 07:00 và 08:00.

IndexedDB: `dolphin_crm_{id}`. Đổi lĩnh vực là đổi database, không trộn dữ liệu.

Thêm lĩnh vực sau: copy folder, sửa `lib/vertical.ts` và `lib/seed-data.ts`.
