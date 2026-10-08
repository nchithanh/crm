# Routes

| Path | Ghi chú |
| --- | --- |
| `/chon-linh-vuc` | Chọn lĩnh vực trước login: Edu Dance, Edu English, Edu Music, Edu Swim. Mỗi mục một IndexedDB |
| `/login` | PIN: card logo giữa, demo dạng hàng, đổi lĩnh vực, CTA Download App (popup hướng dẫn PWA) |
| `/` | Tổng quan: KPI, doanh thu, phễu, lớp hôm nay, việc cần xử lý. Chi nhánh chọn trong sidebar / menu. Mobile owner/lễ tân: Tổng quan · Lịch · Điểm danh · Đăng ký · Support. Giáo viên: Tác vụ thay Đăng ký. Máy tính: Support FAB + CTA theo role |
| `/lich` | Lịch tuần (lưới 07:00–22:00), tháng, theo phòng / giáo viên / chi nhánh. Kéo thả có chặn trùng. Drawer điểm danh, đổi giáo viên, đổi phòng, hủy buổi |
| `/hoc-vien` | Bảng sticky, lọc theo sidebar chi nhánh + Level/Status/Lớp/Nợ/Buổi. Click hàng mở drawer ~520px (6 tab). Bulk Zalo/Excel/Đánh dấu. GV ẩn SĐT/tiền |
| `/hoc-vien/[id]` | Mở lại danh sách và drawer của học viên đó |
| `/khoa-hoc` | Khóa học. Nút Xem mở danh sách buổi. Quản lý và lễ tân tạo khóa (kèm lớp và 8 buổi) và sửa tên, giờ, giáo viên, phòng, mở/tạm dừng |
| `/lop-hoc` | Danh sách lớp. Nút Xem mở sĩ số. Sửa sĩ số, giáo viên, phòng, giờ |
| `/lop-hoc/[id]` | Sĩ số |
| `/giao-vien` | Giáo viên. Thêm và sửa tên, số điện thoại. Không tạo PIN |
| `/phong` | Phòng. Tạo và sửa tên, tầng, sức chứa, ghi chú |
| `/goi-buoi` | Gói buổi, tạo gói, ghi danh thêm buổi |
| `/ghi-danh` | Wizard ghi danh giữa khóa: luật level, buổi còn của khóa, giá theo tỷ lệ gói, vẫn vào lớp khi nợ |
| `/promotion` | Chương trình mẫu của studio |
| `/cham-soc` | Pipeline lead: kanban kéo thả, lead lạnh, drawer, bảng lọc, gán hàng loạt, Zalo mẫu |
| `/thu-hoc-phi` | Thu theo học viên: một phần, ảnh bill, lọc ngày/hình thức (chi nhánh theo sidebar), phiếu in |
| `/bao-luu` | Bảo lưu theo tab chờ duyệt, đang giữ, đã hết. Drawer duyệt cho Quản lý. Học viên đã duyệt ra khỏi điểm danh, vẫn giữ chỗ |
| `/doanh-thu` | Tiền đã thu |
| `/diem-danh` | Điểm danh tay: chọn buổi, nút lớn, trừ buổi ngay, hoàn tác, bảo lưu bị khóa, tóm tắt cuối buổi |
| `/diem-danh-qr` | Mã giả lập + nút giả lập quét |
| `/tac-vu` | Tác vụ nhân sự: List + Board (Todo → In progress → Verify → Feedback → Done). Nhóm việc (parent/campaign), lọc nhóm, gán người, hạn, ưu tiên. Drawer: chọn/tạo nhóm, comment + Gọi/Zalo người nhận. Giáo viên chỉ việc của mình |
| `/dat-phong` | Đặt phòng thuê |
| `/ai` | Gợi ý từ dữ liệu mẫu, chưa nối mô hình |

Redirect: `/khach-tiem-nang` → `/cham-soc`, `/goi` → `/goi-buoi`, `/cong-no` → `/thu-hoc-phi`, `/lich/:id` → `/lop-hoc/:id`. Dev dùng redirect của Next. Bản GitHub Pages chuyển trên trình duyệt vì site tĩnh không chạy redirect server.
