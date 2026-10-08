# Routes

Slug **EN** (canonical). Path VI redirect → EN (dev: `next.config`; Pages: client `RouteRedirect`).

| Path | Ghi chú |
| --- | --- |
| `/choose-vertical` | Chọn lĩnh vực trước login |
| `/login` | PIN + Download App |
| `/` | Tổng quan |
| `/schedule` | Lịch = **Classes** (buổi). Kéo thả / điểm danh / đổi GV·phòng / hủy buổi |
| `/students` · `/students/[id]` | Học viên · detail (Course, Sub, Classes) |
| `/courses` · `/courses/[id]` | Khóa · **hub quan hệ**: Classes / Students / Teachers / Subscriptions; sĩ số: hiện tại + tối đa (`capacity`) |
| `/classes` · `/classes/[id]` | Buổi học · roster + điểm danh HV/GV |
| `/teachers` · `/teachers/[id]` | Giáo viên · courses + upcoming classes |
| `/rooms` | Phòng |
| `/subscriptions` | Plan mẫu + list Subscription (valid = start/end + buổi còn). Gate điểm danh |
| `/enroll` | Ghi danh → Sub + installment + roster (chi tiết `context/flows.md`) |
| `/promotion` | Promotion mẫu |
| `/leads` | Pipeline lead |
| `/fees` | Thu theo installment / sub |
| `/holds` | Bảo lưu |
| `/revenue` | Doanh thu |
| `/attendance` · `/diem-danh-qr` | Điểm danh tay · QR giả lập |
| `/tasks` | Tác vụ |
| `/dat-phong` · `/ai` | Đặt phòng · AI gợi ý |

Redirect: `/goi-buoi` `/goi` `/plans` → `/subscriptions`; VI khác → EN như trước.
