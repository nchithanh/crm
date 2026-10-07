# Routes

| Path | Ghi chú |
| --- | --- |
| `/chon-linh-vuc` | Chọn lĩnh vực. Hiện một mục: dạy nhảy |
| `/login` | PIN |
| `/` | Tổng quan: KPI, phễu, doanh thu 30 ngày, việc hôm nay. Logo sidebar trỏ về đây |
| `/lich` | Lịch tuần + danh sách. Ô lớp mở `/lop-hoc/[id]` |
| `/hoc-vien` | Bảng lọc + drawer hồ sơ |
| `/hoc-vien/[id]` | Tab thông tin, lịch sử, thanh toán, ghi chú, phụ huynh |
| `/khoa-hoc` | Khóa học |
| `/lop-hoc` | Danh sách lớp |
| `/lop-hoc/[id]` | Sĩ số |
| `/giao-vien` | Giáo viên |
| `/phong` | Phòng |
| `/goi-buoi` | Gói buổi, tạo gói, ghi danh thêm buổi |
| `/ghi-danh` | Ghi danh giữa khóa |
| `/promotion` | Chương trình mẫu của studio |
| `/cham-soc` | Kanban lead |
| `/thu-hoc-phi` | Phải thu, thu một phần |
| `/bao-luu` | Bảo lưu |
| `/doanh-thu` | Tiền đã thu |
| `/diem-danh` | Điểm danh tay |
| `/diem-danh-qr` | Mã giả lập + nút giả lập quét |
| `/tac-vu` | Việc trong ngày |
| `/dat-phong` | Đặt phòng thuê |
| `/ai` | Gợi ý từ dữ liệu mẫu, chưa nối mô hình |

Redirect: `/khach-tiem-nang` → `/cham-soc`, `/goi` → `/goi-buoi`, `/cong-no` → `/thu-hoc-phi`, `/lich/:id` → `/lop-hoc/:id`.
