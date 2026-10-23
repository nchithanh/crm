# Routes

Slug **EN** (canonical). Path VI / legacy redirect → EN (dev: `next.config`; Pages: client `RouteRedirect`).

| Path | Ghi chú |
| --- | --- |
| `/login` | Chọn lĩnh vực → loading Dolphin 1s (logo + vòng tròn) → PIN + Download App |
| `/choose-vertical` | Redirect → `/login` (legacy) |
| `/` | Redirect → `/overview` |
| `/overview` | Tổng quan — chào + task gần nhất + KPI + ops strip + chart |
| `/schedule` | Lịch = **Classes** (buổi). Kéo thả / điểm danh / đổi GV·phòng / hủy buổi. Bộ lọc drawer kiểu Google Calendar: checkbox màu multi-select theo GV / phòng (nhóm theo cơ sở) / khóa / trạng thái — không tick = tất cả |
| `/students` · `/students/[id]` | Học viên · KPI lọc được + bảng vận hành + panel phải (tab Tổng quan / Khóa / Điểm danh / Thanh toán / Bảo lưu / Ghi chú). Tổng quan sửa được thông tin cá nhân (owner, lễ tân) |
| `/courses` · `/courses/[id]` | Khóa · tạo qua drawer + preview sinh buổi; hub Overview + Classes / Students / Teachers / Subscriptions |
| `/classes` · `/classes/[id]` | Buổi học · filter (khóa/GV/phòng/status/ngày) + session drawer (roster / điểm danh / đổi GV·phòng / hủy / conflict) |
| `/teachers` · `/teachers/[id]` | Giáo viên · courses + upcoming classes |
| `/rooms` | Phòng — tab **Lịch phòng** + **Danh sách** CRUD |
| `/subscriptions` | Plan mẫu + list Subscription. Gate điểm danh |
| `/mid-course-enroll` | Ghi danh giữa khóa → Sub + installment + roster |
| `/promotion` | Chương trình giảm học phí. Điều kiện AND. Mã không / OR / AND. Áp lúc ghi danh và thu phí |
| `/follow-up` | Pipeline lead / chăm sóc (lọc theo post CTA) |
| `/campaigns` · `/campaigns/[id]` | Link CTA social — tạo link, copy `/r/{slug}`, KPI click/lead, tạm dừng |
| `/r/[slug]` | Landing công khai (không login) — form SĐT/email → lead + attribution |
| `/finance` | Tài chính — tổng quan |
| `/collect-fees` | Thu học phí (POS). Mobile tab giữa = Học phí |
| `/payment-accounts` | Tài khoản SePay nhận tiền theo khoảng subscription. Owner sửa; lễ tân xem |
| `/receivables` | Công nợ HV |
| `/revenue` | Doanh thu |
| `/collections` | Lịch sử thu. Mỗi dòng có icon xuất **Phiếu xác nhận học phí** → `/receipt?id=` |
| `/receipt` | Phiếu xác nhận học phí A4 (tiếng Việt, print-ready, số phiếu `{MÃ}{yy}.{mm}.{seq}`). Nguồn: Payment + Subscription + Installment |
| `/holds` | Bảo lưu (Ops) |
| `/attendance` · `/qr-attendance` | Lễ tân điểm hộ · HV tự quét QR + geofence demo |
| `/tasks` | Tác vụ |
| `/room-bookings` · `/dolphin-ai` | Đặt phòng · Dolphin AI |
| `/guide` | Hướng dẫn sử dụng — Course / Class / SKU / Subscription / flow. Menu Hệ thống |
| `/settings/access` | Ma trận phân quyền (Boss / Quản lý). Menu Hệ thống |
| `/menu` | Menu mobile — lưới nav theo quyền |

Redirect legacy → canonical: `/` → `/overview`; `/enroll` → `/mid-course-enroll`; `/leads` → `/follow-up`; `/finance/collect` `/fees` `/thu-hoc-phi` → `/collect-fees`; `/finance/debts` `/cong-no` → `/receivables`; `/finance/revenue` `/doanh-thu` → `/revenue`; `/finance/ledger` → `/collections`; `/ai` → `/dolphin-ai`; `/diem-danh-qr` → `/qr-attendance`; `/dat-phong` → `/room-bookings`; VI khác → EN như trước.
