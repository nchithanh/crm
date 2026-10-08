# Changelog

## 2026-10-08

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
