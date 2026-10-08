# Routes

Slug **EN** (canonical). Path VI redirect → EN (dev: `next.config`; Pages: client `RouteRedirect`).

| Path | Ghi chú |
| --- | --- |
| `/choose-vertical` | Chọn lĩnh vực trước login |
| `/login` | PIN + Download App |
| `/` | Tổng quan |
| `/schedule` | Lịch = **Classes** (buổi). Kéo thả / điểm danh / đổi GV·phòng / hủy buổi |
| `/students` · `/students/[id]` | Học viên · detail (Course, Sub, Classes) |
| `/courses` · `/courses/[id]` | Khóa · hub: **Overview** (gom hết) + Classes / Students / Teachers / Subscriptions; sĩ số hiện tại + tối đa |
| `/classes` · `/classes/[id]` | Buổi học · roster + điểm danh HV/GV |
| `/teachers` · `/teachers/[id]` | Giáo viên · courses + upcoming classes |
| `/rooms` | Phòng |
| `/subscriptions` | Plan mẫu + list Subscription (valid = start/end + buổi còn). Gate điểm danh |
| `/enroll` | Ghi danh → Sub + installment + roster (chi tiết `context/flows.md`) |
| `/promotion` | Promotion mẫu |
| `/leads` | Pipeline lead |
| `/finance` | Tài chính — tổng quan (KPI, chart thu, tuổi nợ, watch list) |
| `/finance/collect` | Thu học phí (POS-style: method grid, QR/CK share·Zalo, confirm, phiếu in). Mobile tab giữa = Học phí |
| `/finance/debts` | Công nợ HV — aging / bảng / lịch sử thanh toán |
| `/finance/revenue` | Doanh thu theo kỳ · method · khóa · chi nhánh |
| `/finance/ledger` | Lịch sử thu (mọi phiếu) |
| `/holds` | Bảo lưu (nhóm Ops) |
| `/attendance` · `/diem-danh-qr` | Điểm danh tay · QR giả lập |
| `/tasks` | Tác vụ |
| `/dat-phong` · `/ai` | Đặt phòng · Dolphin AI |

Redirect: `/fees` `/thu-hoc-phi` → `/finance/collect`; `/revenue` `/doanh-thu` → `/finance/revenue`; `/cong-no` → `/finance/debts`; `/goi-buoi` `/goi` `/plans` → `/subscriptions`; VI khác → EN như trước.
