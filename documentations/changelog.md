# Changelog

## 2026-10-09

- Pages export: `generateStaticParams` trên mọi `/[id]` (seed ids + class `{courseId}-cN`) — fix CI `output: export`.
- Mobile bottom: bỏ Support; owner/lễ tân **Học phí** ở giữa → `/finance/collect`; giáo viên 4 tab (không Support).
- Thu học phí: lưới Tiền mặt / CK / QR / Nợ; QR demo + Chia sẻ / Gửi Zalo; dialog xác nhận + success kiểu POS.
- Ghi danh: bỏ thu ngay ở bước 4; sau xác nhận CTA **Thu học phí** → `/finance/collect?student=` (+ xem HV / ghi danh tiếp).
- **Tài chính** (align POS, domain học phí): hub `/finance` + collect / debts / revenue / ledger; KPI, date range, aging, chart tiền vào (semantic green); nav nhóm Tài chính; Bảo lưu → Ops; redirect `/fees` `/revenue` `/cong-no` `/doanh-thu`.
- Lịch: filter select dùng `inputClassInline` (không `w-full`) — hết full-bleed trên desktop.
- Dashboard / nav: **Dolphin AI** (+ icon Sparkles) thay “Việc cần xử lý” / AI vận hành.
- Seed **14c** (`nhay`): denser relationships — HV lớp sáng, assistant, class-overrides GV/phòng, installment≈sub active, attendance+GV, sub expired/history.
- Detail Overview: course hub + student/teacher drawer — tab Tổng quan đầu tiên stack toàn bộ data các tab còn lại.
- Attendance: thanh Đã điểm danh/Xong `fixed` sát đáy (trên bottom nav) — hết treo giữa list vì `sticky`.
- Vertical emoji (kiểu POS): 💃📘🎵🏊 chỉ trên thẻ `/choose-vertical` (không gắn tên studio/login).
- Shell menu: chữ **14px**; inactive bỏ `slate-500` → `slate-700` (sidebar + bottom tab).
- Shell nav align POS: active bar trái + slate bg, `min-h-11`, group label bold, VI/EN pill, bottom tab gap/icon 20, FAB trắng; wordmark DOLPHIN CRM.
- Design language (align POS): stack Geist→Inter→Be Vietnam; body 14/400; utilities `.crm-page-title` / `.crm-section-title` / `.crm-kpi` / `.crm-lead` / `.crm-meta`; SoT `context/design-language.md`.
- Fix `/enroll`: chỗ trống dùng `course.capacity` + đếm HV theo `courseId` (trước đó luôn 0); confirm truyền `courseId`.
- Seed **14b** (`nhay`): HV test ghi danh `s-enroll-*` (chưa Sub) + khóa `k-test-begin|inter|adv` (`startOffset: 0`).
- Context: thêm `context/flows.md` — sync đầy đủ nghiệp vụ (enroll side-effect, gate Sub, thu phí, hold, lịch…) mirror code; cập nhật `domain` / `AGENTS` / product·scope·constraints.
- Course: list + hub hiện **HV hiện tại** và **HV tối đa** (`capacity`); fix hooks order trên `/classes/[id]`.
- Subscription: route `/subscriptions` (thay plans/gói buổi); `isSubscriptionValid` gate điểm danh (hạn + buổi còn + đúng course).
- Migrate seed **v14** / Dexie **v7**: Class = buổi (bỏ Session); Subscription + installments; courseTeachers/Rooms; slug EN (`/courses`…); hub `/courses/[id]` quan hệ clickable; redirect path VI.
- Domain SoT: `context/domain.md`.

## 2026-10-08

- Học viên: list production (click hàng → drawer, buổi còn đỏ/amber, hover Xem/Thu, empty CTA, bulk bar). Drawer denser: copy SĐT, Esc, progress điểm danh, Xin bảo lưu, timeline relative.
- Login: CTA Download App mở popup hướng dẫn thêm app vào màn hình chính (ảnh 5 bước).
- Bỏ select lọc chi nhánh trên tab (Thu học phí, Điểm danh, Học viên, Lịch, Tác vụ) — theo chi nhánh sidebar/menu.
- Phân quyền nav: giáo viên chỉ thấy tab liên quan (Tổng quan, Lịch, Học viên, Khóa, Lớp, Điểm danh, Tác vụ). Mobile đổi Đăng ký → Tác vụ. Chặn URL ngoài quyền.
- Login: layout kiểu card (logo giữa, label PIN, demo dạng hàng card, đổi lĩnh vực). Giữ màu brand lĩnh vực và nút bo 10px.
- Mobile: input/select/textarea cố định 16px (hết zoom iOS); `type=time` xếp dọc trên mobile và `min-w-0` chống tràn.
- Tác vụ: 5 stage Board — Todo, In progress, Verify, Feedback, Done. Remap nhóm việc seed. Seed `12`.
- Tác vụ: nhóm việc (parent/campaign) — lọc, badge, gán trong drawer, tạo nhóm mới. Seed `11`.
- Tác vụ: drawer có lịch sử comment và nút Gọi / Zalo tới người nhận. Seed `10`.
- Tác vụ: quản lý việc nhân sự kiểu Jira — List và Board, gán người, hạn, ưu tiên, kéo cột. Seed `9`.
- Chọn chi nhánh chỉ còn trong sidebar / menu drawer. Bỏ khỏi header.
- Form khóa/lớp trên mobile: giờ bắt đầu và kết thúc xếp dọc; input 16px để Safari không zoom khi focus.
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
