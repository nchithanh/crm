# Data

Mỗi lĩnh vực một thư mục `data/{id}/`.

Hiện có `nhay` (Edu Dance), `anh` (Edu English), `nhac` (Edu Music), `boi` (Edu Swim). Cùng schema. Khác tên cơ sở, khóa và gói.

- `settings.json` `users.json` `demo-accounts.json`
- `branches.json` `courses.json` `rooms.json` `classes.json` `packages.json`
- `leads.json` `students.json` `enrollments.json`
- `payments.json` `receivables.json` `attendance.json` `tasks.json` `task-parents.json`
- `promotions.json` `holds.json` `bookings.json`

Ngày trong JSON là `offset` so với hôm nay (0 = hôm nay, âm = ngày trước). Lúc seed mới đổi thành `YYYY-MM-DD`. Học viên có `email`, `birthYears` (tuổi, seed đổi thành ngày sinh) và `flagged`.

Seed `12`: như `11`, 5 stage tác vụ (`todo` / `inprogress` / `verify` / `feedback` / `done`), remap `parentId` theo nội dung việc. Dexie v5: bảng `taskParents`.

IndexedDB: `dolphin_crm_{id}`. Đổi lĩnh vực là đổi database, không trộn dữ liệu.

Thêm lĩnh vực sau: copy folder, sửa `lib/vertical.ts` và `lib/seed-data.ts`.
