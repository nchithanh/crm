# Changelog

## 2026-10-08

- Menu đáy mobile: Tổng quan, Lịch, Điểm danh, Đăng ký, Support (Zalo founder). Bỏ hàng CTA trùng dưới menu. Máy tính: icon Support cố định góc dưới phải (headset + chat). CTA header giữ nguyên.
- Lịch mẫu thêm hai khóa sáng: 07:00–08:30 (thứ 2, thứ 4, thứ 7) và 08:00–09:30 (thứ 3, thứ 5, chủ nhật). Seed `8`.
- Khóa học có nút Xem: chi nhánh, giáo viên, phòng, thứ, giờ và danh sách buổi. Lớp học có nút Xem tới trang sĩ số.
- Quản lý khóa, lớp, phòng và giáo viên: tạo và sửa trên máy. Khóa mới sinh một lớp và 8 buổi. Giáo viên đăng nhập chỉ xem. Giáo viên mới không có PIN.
- Header: logo chỉ trong sidebar và menu mobile. Chi nhánh và VI/EN nằm trên header. Ba nút chính trên mobile nằm dưới menu đáy; trên máy tính vẫn ở header. Lựa chọn ngôn ngữ được nhớ trên máy.
- Logo Dolphin trên login, chọn lĩnh vực, sidebar và menu mobile. Favicon tab là icon Dolphin. Ảnh logo giữ màu gốc.
- Nhãn giao diện theo ngôn ngữ máy: tiếng Việt nếu `navigator.language` bắt đầu bằng `vi`, còn lại tiếng Anh. Tên học viên, khóa, chi nhánh trong JSON giữ nguyên. Không có nút đổi ngôn ngữ.
- Chọn lĩnh vực trước login: Edu Dance, Edu English, Edu Music, Edu Swim. Mỗi lĩnh vực một folder JSON.
- Mỗi lĩnh vực một màu: cam, xanh dương, tím, xanh nước. Nút chính và sidebar đang mở đi theo màu đó.
- Siết mật độ giao diện: nút cao 40px bo 10px, card bóng nhẹ, lịch và điểm danh rõ trạng thái hơn.
- Sidebar có lại logo Dolphin CRM và mục Tổng quan, phía trên Lịch.

## 2026-10-07

- Header và nút theo hệ POS: primary cam, secondary viền cam, ghost. Bỏ nút nền đen. Sidebar mục đang mở nền cam nhạt.

- Data mẫu dày hơn: 24 học viên, 20 lead, thêm phiếu thu, nợ, điểm danh, bảo lưu, tác vụ, đặt phòng. Seed `6`.
- Chăm sóc: pipeline kéo thả, lead lạnh, chuyển thành học viên. Thu học phí theo học viên, thu một phần và in phiếu.
- Bảo lưu: tab trạng thái, drawer duyệt, từ chối có lý do, kết thúc sớm. Học viên đã duyệt ra khỏi điểm danh.
- Ghi danh giữa khóa: wizard 4 bước, chỉ cộng buổi còn của khóa, giá theo tỷ lệ gói.
- Điểm danh tay: nút lớn, trừ buổi ngay, hoàn tác, khóa bảo lưu, tóm tắt cuối buổi.
- Lịch: lưới tuần 07:00–22:00, tháng, theo phòng / giáo viên / chi nhánh, kéo thả có chặn trùng.
- Học viên: bảng sắp xếp, lọc nợ / sắp hết buổi, thao tác hàng loạt, hồ sơ drawer 6 tab. Seed `5`.
- Deploy GitHub Pages: workflow `deploy-pages.yml`, static export khi `GITHUB_PAGES=true`, URL https://nchithanh.github.io/crm/.
- Tổng quan: KPI so kỳ, phễu bấm được, lớp hôm nay và việc theo mức khẩn.
- Dữ liệu mẫu đổi thành studio giả Edu Dance. Seed phiên bản `4`.
- Tổng quan: 6 KPI, biểu đồ doanh thu, phễu lead, lớp hôm nay và việc cần xử lý.
- Sidebar: Lịch, Quản lý, Tuyển sinh, Tài chính, Vận hành, AI vận hành. Seed `2` thêm khóa học, phòng, promotion, bảo lưu, đặt phòng.
- CI build: Node 24, `npm ci`, `npm run build` trên pull request.
- FE CRM local-first cho trung tâm dạy nhảy. JSON `data/nhay`, Dexie theo lĩnh vực.
