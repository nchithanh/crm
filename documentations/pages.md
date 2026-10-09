# Routes

Slug **EN** (canonical). Path VI / legacy redirect → EN (dev: `next.config`; Pages: client `RouteRedirect`).

| Path | Ghi chú |
| --- | --- |
| `/choose-vertical` | Chọn lĩnh vực trước login |
| `/login` | PIN + Download App |
| `/` | Tổng quan |
| `/schedule` | Lịch = **Classes** (buổi). Kéo thả / điểm danh / đổi GV·phòng / hủy buổi |
| `/students` · `/students/[id]` | Học viên · detail (Course, Sub, Classes) |
| `/courses` · `/courses/[id]` | Khóa · tạo qua drawer + preview sinh buổi; hub Overview + Classes / Students / Teachers / Subscriptions |
| `/classes` · `/classes/[id]` | Buổi học · filter (khóa/GV/phòng/status/ngày) + session drawer (roster / điểm danh / đổi GV·phòng / hủy / conflict) |
| `/teachers` · `/teachers/[id]` | Giáo viên · courses + upcoming classes |
| `/rooms` | Phòng — tab **Lịch phòng** + **Danh sách** CRUD |
| `/subscriptions` | Plan mẫu + list Subscription. Gate điểm danh |
| `/mid-course-enroll` | Ghi danh giữa khóa → Sub + installment + roster |
| `/promotion` | Promotion mẫu |
| `/follow-up` | Pipeline lead / chăm sóc |
| `/finance` | Tài chính — tổng quan |
| `/collect-fees` | Thu học phí (POS). Mobile tab giữa = Học phí |
| `/receivables` | Công nợ HV |
| `/finance/revenue` | Doanh thu |
| `/finance/ledger` | Lịch sử thu |
| `/holds` | Bảo lưu (Ops) |
| `/attendance` · `/qr-attendance` | Điểm danh tay · QR giả lập |
| `/tasks` | Tác vụ |
| `/room-bookings` · `/ai` | Đặt phòng · Dolphin AI |

Redirect legacy → canonical: `/enroll` → `/mid-course-enroll`; `/leads` → `/follow-up`; `/finance/collect` `/fees` `/thu-hoc-phi` → `/collect-fees`; `/finance/debts` `/cong-no` → `/receivables`; `/diem-danh-qr` → `/qr-attendance`; `/dat-phong` → `/room-bookings`; VI khác → EN như trước.
