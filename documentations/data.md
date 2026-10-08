# Data

Mỗi lĩnh vực một thư mục `data/{id}/` (`nhay`, `anh`, `nhac`, `boi`). Schema seed **v14** / version app **`14b`**.

### Test ghi danh (`nhay` only)

- HV chưa enroll: `s-enroll-begin|inter|adv|new` (`courseId`/`subscriptionId` rỗng).
- Khóa mở gate: `k-test-begin|inter|adv` (`startOffset: 0`, có `capacity`).
- Chi tiết: `context/flows.md` §3.

## Files

| File | Nội dung |
| --- | --- |
| `settings.json` `users.json` `demo-accounts.json` | Studio + PIN |
| `branches.json` `rooms.json` | Chi nhánh / phòng |
| `courses.json` | Khung khóa + lịch mẫu (`weekdays`, `start`/`end`, `sessionCount`, `capacity` = HV tối đa, `teacherId`, `roomId` optional) |
| `course-teachers.json` | `main` \| `assistant` |
| `course-rooms.json` | Room gắn khóa (optional) |
| `classes.json` | **[]** — buổi học sinh trong `seed.ts` từ Course |
| `legacy-class-map.json` | Map class cũ → courseId (remap attendance) |
| `subscription-plans.json` | Gói mẫu (ex-packages) |
| `subscriptions.json` | 1 sub = 1 HV trên Course |
| `installments.json` | Kỳ thu theo sub |
| `payments.json` | Lần thu (`subscriptionId`) |
| `students.json` | `courseId` + `subscriptionId` (không `classId`/`packageId`) |
| `attendance.json` | `legacyClassId` + `personId` + `subject` — seed map sang class buổi |
| `leads` `tasks` `holds` `bookings` `promotions` `teacher-absences` | Như trước |

Ngày JSON = `offset`. IndexedDB: `dolphin_crm_{id}`. Đổi lĩnh vực = đổi DB.

Dexie **v7**: bảng `classes` (buổi), `classStudents`, `courseTeachers`, `courseRooms`, `subscriptionPlans`, `subscriptions`, `installments`. Drop `sessions` / `packages` / `enrollments` / `receivables`.
