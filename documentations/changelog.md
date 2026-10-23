# Changelog

## 2026-10-23

- **Lĩnh vực beauty:** thêm `spa` · `nails` · `salon` · `massage` (seed `data/{id}/`, DB riêng, chọn trên `/login`).
- **Login gộp chọn lĩnh vực:** `/login` một trang — chọn lĩnh vực → loading Dolphin ~1s (logo + vòng progress) → form PIN. `/choose-vertical` redirect. AuthGate cho vào `/login` khi chưa có vertical; event `dolphin-crm-vertical` khi đổi lĩnh vực.

## 2026-10-19

- **Hướng dẫn `/guide`:** sơ đồ **một workflow** liên tục (không chia 3 section) + rẽ Có/Không: mua Sub → còn nợ? → còn hiệu lực? → học/điểm danh → hết buổi? → renew.
- **Link CTA static export:** `generateStaticParams` cho `/campaigns/[id]` + `/r/[slug]` (seed 17c) — fix Pages `output: export` build.
- **Link CTA UI:** `/campaigns` lưới ô kiểu Overview (`crm-card-elev` + `crm-kpi-*`) — desktop **3 ô/hàng**; tile kênh, Click/Lead/%, Copy / Pause.
- **Link CTA seed 17c:** 14 post; mỗi post sinh đúng `leadCount` lead gắn `postId`/`linkSlug`/`channel` (~127 lead CTA + 20 lead quầy). KPI list = số lead thật trên chi tiết / filter Chăm sóc.
- **Link CTA list densify:** `/campaigns` dạng 1 dòng (tên · kênh · slug · metric · copy); số click/lead/% nổi (tabular, brand cho lead/%). Seed **17b** — 8 post đa kênh (1 paused).
- **Link CTA / Social tracking (slice A):** tạo link tại `/campaigns` (Tuyển sinh), landing public `/r/[slug]` (không login, không shell), lead gắn `channel` / `postId` / `linkSlug`. Bảng Dexie `socialPosts` + `linkEvents` (v10), seed **17a** (2 post demo). Filter post trên Chăm sóc. Quyền: Boss / Quản lý / Marketing (`campaigns` trong ma trận).
- Semantic màu tách brand: bỏ remap `emerald→brand`; Badge `info` = sky; nav badge đếm = slate, nợ = rose, lead = amber; stage lead có tone riêng; modal thu thành công dùng green. Brand tím chỉ chrome (CTA/nav active).
- Command Palette AI-style (Ctrl+K): popup giữa màn + neon viền; desktop FAB trên Zalo; **mobile bỏ FAB** — vuốt lên từ đáy mở palette (hoặc ô tìm header); Gợi ý · Hành động · Gần đây.
- Tổng quan densify: hàng **3 cột** (task · HV mới · khóa sắp hết/khẩn); **6 KPI một hàng** `lg:grid-cols-6`. Typo KPI fluid `.crm-kpi-*` (`clamp` rem+svw — label~1rem / value~1.5rem max). Ask Dolphin thu gọn; bỏ search dưới greeting (Ctrl+K). Docs `design-language.md`.
- Lịch `/schedule` và lịch phòng (`room-calendar`): palette **xám–trắng** (`--cal-*` / `.crm-cal-*`) — bỏ mint/lavender/sky; ô trống gần trắng, buổi xám nhạt, thẻ buổi nền trắng + viền xám. Không dùng `emerald-*` (remap brand).
- Lịch: **vạch giờ hiện tại** trên cột hôm nay; thẻ buổi theo đồng hồ — đang diễn ra (đậm + chip), đã qua (mờ), sắp tới (trắng). Helper `sessionTimePhase` / `nowLineInHour` trong `lib/schedule.ts`.
- Tổng quan: KPI tách primary/secondary (trước đó từng gộp 6 metric một hàng; FeeRemind trong thẻ học phí chờ). List buổi hôm nay / cảnh báo / top khóa / hoạt động dạng hàng dày (badge, bar, avatar).
- Tổng quan: dưới lời chào hiện **task gần nhất** (ưu tiên việc của tôi → quá hạn → hạn sớm → priority) + CTA `/tasks`.
- Chăm sóc: CTA Zalo / Chia sẻ mã mở **popup preview** (sửa nội dung) rồi mới share sheet / Zalo (`SharePreviewDialog`).
- Điểm danh: hai luồng — `/attendance` lễ tân điểm hộ (UI gọn hơn + link QR); `/qr-attendance` tự check-in với geofence demo (`Branch.lat/lng/checkInRadiusM`, seed **16a**) + nút giả lập tại trung tâm.
- Popup/drawer detail: animation mở/đóng (`crm-drawer-*` / `crm-modal-*`, helper `CrmDrawerShell` / `CrmModalShell`) cho class / teacher / task / lead / filter / tạo khóa / summary điểm danh / care modals.
- Sidebar desktop nền `#030a12`, chữ sáng, hover `white/10`. Toggle ma trận Phân quyền có hover scale/sáng.
- **Phân quyền 5 vai trò:** Boss · Quản lý · Lễ tân · Giáo viên · Marketing. Dexie `roleAccess` (v9), mặc định `access-defaults.ts`, store hydrate lúc boot. Trang `/settings/access` (desktop bảng / mobile chọn role). Sidebar + `/menu` + guard path + tab hồ sơ HV / Phòng / hub Khóa theo ma trận. Seed v15a: Boss PIN `9999`, Marketing PIN `5555`. Docs: `context/access.md`.
- **Phiếu xác nhận học phí** (`/receipt?id={paymentId}`): trang A4 print-ready tiếng Việt theo mẫu MA Dance — đầu trang studio + chi nhánh + email, số phiếu `{MÃ}{yy}.{mm}.{seq}` (mã = 2 chữ cái đầu tên studio, sinh lúc thu tiền, lưu `Payment.receiptNo`), thông tin HV (hình thức/phương thức TT), bảng Gói · Học phí · Phải thu · Đã đóng · Còn lại, bằng chữ (`lib/number-words.ts`), note 4 mục, 3 chữ ký (Ngườờ tư vấn để trống — TODO). Nguồn: `lib/receipt.ts` buildReceipt từ Payment + Subscription + Installment; `Payment` thêm `receiptNo` + `actorId` (ngườI lập phiếu); settings seed thêm `email`.
- CTA xuất phiếu 3 nơi: success modal **Thu học phí** (thay popup in tối thiểu cũ — bỏ `printReceipt`), từng dòng **Lịch sử thu** (`/collections`), tab Thanh toán trong hồ sơ học viên. Nhãn `money.exportReceipt` (vi/en); bỏ key `money.print` + `money.receipt` không còn dùng.
- Drawer chi tiết bên phải (bộ lọc lịch, tạo buổi lẻ, hồ sơ buổi/học viên/giáo viên/khóa, bảo lưu, promotion, tác vụ, chăm sóc): mobile còn **80% chiều rộng** thay vì full màn; desktop giữ max-width cũ.
- Lịch `/schedule`: thay 4 dropdown lọc bằng nút **Bộ lọc** + drawer kiểu Google Calendar (`components/schedule-filter-drawer.tsx`). Multi-select theo giáo viên / phòng (nhóm subheader theo cơ sở) / khóa / trạng thái; không tick mục nào = tất cả; checkbox bo 8px tô màu palette gán theo hash id; nhóm >6 mục có Hiện thêm / Thu gọn; nút Bộ lọc có badge số nhóm đang lọc; footer đếm buổi đang hiển thị. i18n vi/en (`filter*` trong `lib/copy.ts`).
- Mobile: bỏ hamburger + drawer kéo trái. Bottom nav đổi tab Support thành **Menu** → mở trang `/menu` (giữ header + bottom nav). Desktop giữ sidebar và FAB support.
- Trang `/menu` kiểu SSI iBoard: thẻ người dùng, chọn cơ sở, segmented tab Quản lý / Hỗ trợ; nhóm nav là thẻ trắng lưới icon 3 cột (icon tile 48px). Giáo viên được vào `/menu` (TEACHER_PATHS).
- Tách SoT danh mục nav sang `lib/nav.ts`, badge sang `lib/nav-badges.ts` (dùng chung sidebar + `/menu`).

## 2026-10-16

- Redesign UI theo phong cách SSI iBoard: nền app tint lavender `#f6f5fc`, khối trắng bo 12–16px + bóng mềm (`crm-card-elev`), badge pill, nút primary có bóng brand.
- Đổi màu chủ đạo sang `#5d5cc4` (hover `#4948a4`, nền nhấn `#f1f1f9`); cập nhật `themeColor`, `manifest.webmanifest`, `lib/vertical.ts`.
- Sidebar desktop và menu hamburger đổi sang nền sáng: item active nền `--nav-active` bo 12px, icon `--brand-600`; bỏ nền tối `#1c1c2a`.
- Thêm utility `.crm-icon-tile` / `.crm-gradient` / `.crm-card-elev`; banner Dolphin AI trên Tổng quan dùng gradient brand.
- Sweep toàn bộ `rounded-[5px]` → `rounded-xl` (12px); drawer, dialog, input đồng bộ.

## 2026-10-14

- Màu chủ đạo `#5b42eb` cho nút, tab, link và vòng Ghi danh.
- Thanh dưới mobile: bỏ Tài chính và nút + cố định. Ghi danh nằm giữa và luôn nhô lên. Giáo viên giữ Điểm danh ở giữa.
- Màu chủ đạo `#6d35ca`. Thanh dưới mobile là viên trắng nổi: mục đang chọn là vòng tròn tím nhô lên, icon trắng.
- Đăng nhập: không tự mở popup tải app. Nút đáy là Download App. Chỉ máy không cài được mới mở ảnh hướng dẫn khi bấm.
- Đăng nhập: nút đáy “Thêm vào Màn hình chính”. Chrome mở hộp thoại cài. Máy không hỗ trợ thì mở ảnh hướng dẫn. Đã mở từ icon thì ẩn nút.
- Một màu chủ đạo `#9f16f9` cho nút, tab, link và FAB. Đổi lĩnh vực không đổi màu chrome.
- Tổng quan desktop: popup Nhắc Zalo phủ cả màn, không còn kẹt trong thẻ học phí. Link QR xuống dòng.
- Đăng nhập: popup hướng dẫn tải app mở sẵn. Đóng được; vào lại trang thì mở lại.
- Tổng quan mobile: lời chào và ô tìm đứng đầu, biểu đồ doanh thu nằm ngay dưới.
- Tổng quan mobile: biểu đồ doanh thu đứng đầu và mở sẵn. Phễu vẫn thu gọn.
- Học viên mobile: nút tròn cam ghi danh, phía trên thanh dưới. Chỉ quản lý và lễ tân. Desktop giữ nút header.

## 2026-10-13

- Tổng quan mobile: phòng trống, biểu đồ, phễu, top khóa và hoạt động gần đây thu gọn. Bấm tiêu đề để mở. Desktop vẫn mở.
- Tổng quan: biểu đồ doanh thu là số cố định T1–T12, không còn nút 7 ngày / 30 ngày.
- Tổng quan mobile: biểu đồ doanh thu lên đầu trang. Desktop giữ thứ tự cũ.
- Tổng quan mobile: so sánh cơ sở là thẻ dọc, không kéo ngang. Desktop giữ bảng.
- Học viên mobile: nút X cùng hàng với tên, góc phải panel. Bấm X đóng và về danh sách.
- Thu học phí mobile: hai ô ngày xếp dọc, không tràn thẻ. Lịch mở drawer buổi học đầy đủ. Thanh dưới cao hơn, ẩn khi cuộn xuống và hiện khi cuộn lên. Tổng quan khóa trên mobile: một hàng 3 thông số, một hàng 2 thông số.
- Thu học phí: ô tìm học viên đứng trước. Lọc ngày và hình thức nằm trong Lịch sử thu. Ô ngày trống hiện `mm/dd/yyyy`.
- Tác vụ: thanh lọc gồm ô tìm, avatar người nhận, nút Lọc (có số điều kiện) và nút Nhóm. List và board theo trạng thái, người nhận hoặc nhóm việc.
- Header desktop hiện Điểm danh, Đăng ký và Báo cáo. Tổng quan thêm danh sách buổi chuyên cần thấp và giáo viên dạy từ 3 buổi hôm nay.
- Buổi học hiện giáo viên phụ. Khóa và buổi học phân trang 20/50/100. Ghi chú học viên lưu tên người viết.
- Cổng vào không kẹt “Đang mở studio…”. Chưa đăng nhập thì vào chọn lĩnh vực hoặc đăng nhập ngay. Quá 3 giây có Thử lại và Về đăng nhập. Quá 5 giây vẫn vào app.
- Tổng quan: bảng so sánh cơ sở (buổi hôm nay, chuyên cần, doanh thu, còn nợ).
- Học viên: drawer rộng 420px. Header có mã, số bấm để copy, Thu phí, Ghi danh lại và menu. Công nợ mở đúng tab Thanh toán.
- Công nợ: tuổi nợ 0–30, 31–60, 61–90, trên 90 ngày.
- Danh sách học viên chọn 20 / 50 / 100 mỗi trang. Hủy buổi không trừ buổi.
- Tổng quan mobile: biểu đồ doanh thu luôn hiện, mặc định 7 ngày, có vùng tô dưới đường. Phễu tuyển sinh vẫn bấm Hiện để mở.
- Thanh dưới mobile: bỏ Thêm. Ô thứ năm là Support, mở Zalo founder. Menu đầy đủ vẫn ở hamburger.
- Menu hamburger trên mobile trượt từ mép trái ra khi mở và trượt vào khi đóng.
- Mua / gia hạn: nút tạo nằm cùng hàng Học viên, SKU và Khóa.
- Chăm sóc: thẻ sinh nhật có Chia sẻ mã. Trạng thái Chưa chăm sóc, Đã gửi Zalo, Đã gửi mã giảm giá.
- Chăm sóc: đóng popup mã sinh nhật thì thẻ học viên vẫn hiện tên chương trình và mã vừa tạo.
- Chăm sóc: sinh nhật tách Hôm nay và Sắp tới. Lưu mã xong popup hiện chương trình vừa tạo và nút Chia sẻ Zalo.
- Chăm sóc: khối Việc cần nhắc hiện sinh nhật trong 7 ngày. Tạo mã nhanh mở preview để sửa rồi lưu (chỉ quản lý). Lễ tân sao chép mã. Cùng thẻ có Gọi, Zalo và Mở học viên.
- Menu: trang Điểm danh QR chỉ làm sáng mục QR. Sheet Thêm trên mobile không lặp Tổng quan, Học viên, Điểm danh và Tài chính đã có ở thanh dưới.
- Danh sách học viên desktop bỏ nút Hồ sơ. Bấm dòng vẫn mở drawer.
- Mua / gia hạn subscription: hiện học phí SKU, khuyến mãi và số còn lại. Tiền mặt hoặc chuyển khoản thu ngay. Nợ chỉ ghi công nợ. Ghi danh giữa khóa vẫn thu sau, qua Thu học phí.
- SKU: plan mẫu đổi tên thành SKU. Form tạo có thời lượng (tháng) và số buổi trong thời lượng đó. Tháng không còn tự tính từ số buổi.
- Promotion seed: đủ case tự áp dụng (phần trăm, số tiền, buổi, thứ, ngưỡng), mã OR, mã AND, sắp tới và đã tắt. Học phí trong mẫu là của studio.
- Promotion: danh sách và form chương trình. Điều kiện cùng lúc. Mã không, mã OR, hoặc mã AND. Ghi danh và thu phí chọn một chương trình, hiện học phí gốc và số còn lại. Kỳ đã thu không tính lại.
- Tổng quan mobile: Việc hôm nay lên trước biểu đồ doanh thu. Biểu đồ thu gọn, bấm Hiện để mở. Desktop giữ thứ tự cũ và biểu đồ mở.
- Học viên mobile: vuốt trái một hàng để Gọi, Zalo hoặc Điểm danh. Giáo viên chỉ thấy Điểm danh.

## 2026-10-12

- Nhóm Tài chính: mục Tổng quan chỉ sáng khi đang ở trang Tổng quan. Lịch sử thu, Doanh thu và các trang khác không kéo theo mục đó.
- Menu hamburger trên mobile rộng 80% màn hình, bám trái. Bấm vùng mờ bên phải để đóng.
- Đổi trang: menu, header và thanh dưới đứng yên. Chỉ vùng nội dung hiện dần. Không còn màn “Đang mở studio…” mỗi lần bấm menu.
- Đổi tab: hàng tab đứng yên. Chỉ nội dung hiện dần và nhích lên nhẹ. Áp cho hồ sơ học viên, hồ sơ giáo viên, chi tiết khóa, phòng và bảo lưu.
- Hồ sơ học viên: khối Thông tin cá nhân trên tab Tổng quan. Quản lý và lễ tân sửa họ tên, ngày sinh, điện thoại, email, phụ huynh. Giáo viên không thấy số và không sửa.
- Ẩn thanh cuộn ngang. Thanh dọc vẫn 4px, màu brand pha 35%.
- Footer căn giữa. Menu hamburger trên mobile rộng hết màn hình.
- Footer đi sau hết nội dung trang, không còn nằm giữa danh sách khi cuộn.
- Thanh dưới: tab đang chọn nền brand nhạt. Badge Học viên và Tài chính. Tab Thêm mở sheet từ dưới.
- Sidebar: mục đang chọn nền trắng, viền trái brand. Nhãn nhóm sáng hơn.
- Header desktop: chỉ Thu học phí và Điểm danh. Đăng ký và Báo cáo vào menu ⋯.
- Tổng quan mobile: phễu tuyển sinh thu gọn, bấm để mở.
- Học viên trống: “Chưa có học viên nào” và nút Thêm học viên.
- Header mobile một hàng 56px: hamburger, ô tìm “Tìm học viên, buổi…”, pill VI/EN. Đăng xuất chuyển vào menu. Desktop giữ CTA và nút đăng xuất trên header.
- Footer cuối vùng cuộn: Dolphin Software, motto tiếng Anh, link dolphin-software.io.vn. Thanh dưới mobile vẫn giữ. Màn đăng nhập không có footer.
- PWA giống POS: `manifest.webmanifest` (`display: standalone`) và `appleWebApp`. Mở từ icon Màn hình chính thì không còn thanh Safari. Không gắn service worker — POS cũng tắt plugin đó khi build Pages.
- Thu học phí: nút Chia sẻ trên QR chuyển khoản mở share sheet ngay (QR demo kèm ảnh; QR SePay kèm link trong nội dung). Không share được thì copy. Gửi Zalo vẫn là nút riêng.
- Vận hành hôm nay: nút Nhắc Zalo trên thẻ Học phí chờ thu, kèm số học viên. Tin nhóm theo tài khoản nhận. Chia sẻ theo kiểu POS (share sheet, không được thì copy và mở Zalo).
- Thu học phí: bỏ hình thức QR. Nút CK đổi thành Chuyển khoản. Ảnh QR SePay vẫn hiện khi chọn Chuyển khoản.
- Header desktop: nút Thu học phí (brand) đứng trước Điểm danh, mở `/collect-fees`. Giáo viên không thấy.
- Seed 14d: ba tài khoản SePay mẫu (MBBank, ACB, Vietcombank) và luật theo giá gói 1 tháng, 3 tháng, 6–12 tháng. Số tài khoản là số giả.
- Bỏ nút sáng/tối. Sidebar desktop và menu Thêm trên mobile nền `#1c1c2a`. Trang và thanh dưới vẫn sáng.
- Sidebar: Học viên, Khóa học, Buổi học và Giáo viên hiện số đang hoạt động bên phải, theo chi nhánh đang chọn. Buổi học đếm upcoming và ongoing.
- Tài chính: trang Tài khoản thanh toán. Owner cấu hình tài khoản SePay và luật theo số tiền. Thu chuyển khoản / QR dùng tài khoản khớp số tiền; chưa có tài khoản thì QR demo. Đối soát webhook: TODO.
- Tổng quan: bỏ dropdown kỳ trên khối Doanh thu. Thẻ doanh thu cố định theo tháng này. Nút 7 ngày / 30 ngày của biểu đồ vẫn giữ.
- Header bỏ nút Ask Dolphin. Mục sidebar và banner Tổng quan vẫn mở `/dolphin-ai`.
- Tab hồ sơ học viên, giáo viên và khóa: chữ đen, hàng có gạch dưới, tab đang chọn gạch màu brand. Icon Gọi / Zalo / Thu phí / Thêm nền trắng có viền.
- Lịch mobile: select lọc thành lưới 2 cột; Tuần trước/sau một hàng, Theo phòng/giáo viên/chi nhánh một hàng. Nút ngày khi đang nhóm thì kéo ngang riêng.
- Thẻ số `--panel` là `#f7f7f8a1`. Thanh cuộn dày 4px, màu brand pha 35%.
- Ô tìm nền `#F7F7F8`. Khối danh sách, biểu đồ và form nền trắng. Chỉ thẻ số overview nền xám trắng. Mỗi hàng overview 4 thẻ: Tổng quan bỏ Phòng trống; Học viên bỏ thẻ Đang bảo lưu (chip lọc còn); Tài chính bỏ Quá hạn và Sắp đến hạn.
- Nền app trắng. Thẻ, nút, ô nhập và chip bo 5px. Bỏ box-shadow; khối nội dung dùng nền xám `#F5F5F5` (`--panel`). Avatar, icon tròn, thanh tiến độ và FAB giữ hình tròn.
- Học viên: thêm thẻ Mới (30 ngày) và Đang bảo lưu. Bấm thẻ lọc danh sách. Desktop năm thẻ một hàng.
- Chrome theo lĩnh vực: nhảy cam, Anh xanh dương, nhạc tím, bơi xanh nước. Nút, tab đang chọn, link và FAB dùng `--brand-*`. Icon KPI và avatar học viên giữ màu riêng.
- Học viên, hồ sơ (tab Tổng quan), tài chính và Vận hành hôm nay dùng cùng thẻ KPI: hai cột, icon tròn nhiều màu, số lớn.
- Tổng quan: mobile hai KPI một hàng; icon tím / xanh / đỏ / vàng; nền trang trắng, ô tìm xám, tím chỉ ở banner Ask Dolphin và nút đang chọn.
- Skin PeopleHub: nền lavender, nút pill và active tím `#6D4AFF`. Login, tổng quan (KPI icon tròn), danh sách học viên (chip tím) và hồ sơ học viên theo mock. Avatar học viên giữ màu dữ liệu.
- Học viên: danh sách trống tách “chưa có học viên” (lời dẫn + ghi danh) và “lọc không khớp” (Xóa lọc). Sidebar: nhãn nhóm đậm hơn; badge số lead đang mở (Chăm sóc) và học viên còn nợ theo chi nhánh (Thu học phí).
- Khóa: desktop thêm giáo viên, chi nhánh, phòng, sĩ số, số buổi, level, trạng thái. Buổi học: cột Học viên có thanh tiến độ (đen / vàng từ 80% / đỏ từ 95%). Giáo viên: buổi trong tuần, số học viên đang dạy, bộ môn; SĐT chỉ với quản lý và lễ tân.

## 2026-10-11

- Theme trắng / đen: nút và active `#111111`, nền trắng. Tổng quan thêm thẻ Học viên mới kèm `% so với tháng trước`. Danh sách học viên: cột Tỷ lệ có mặt; 3 cột đầu hẹp hơn.
- Học viên: drawer trượt vào/ra; tab chi tiết kéo ngang nhưng ẩn thanh cuộn. Danh sách desktop thêm khóa, giáo viên, chuyên cần, buổi còn, thanh toán, liên hệ và nút Hồ sơ.
- Tổng quan: Vận hành hôm nay ngay dưới 3 thông số; Hoạt động gần đây còn 5 dòng cho ngang Top 5 khóa. Học viên: drawer cố định như giáo viên; desktop thêm cột khóa, giáo viên, buổi còn, điểm danh, trạng thái (công nợ nếu được xem). Ẩn nút ghi danh tròn trên desktop.
- Tổng quan: biểu đồ ngay dưới 3 thông số. Lịch tuần: lưới giờ × ngày giống lịch phòng. Học viên: 3 KPI nằm trong cột danh sách để hồ sơ lên cùng hàng. Thanh cuộn mỏng hơn. Nút ghi danh desktop không đè nút hỗ trợ.
- Bố cục PeopleHub (không chỉ đổi màu): Học viên là hàng avatar + chip + FAB, hồ sơ có header icon; Tổng quan là lời chào + tìm + 3 KPI + buổi sắp tới; Điểm danh chọn buổi bằng thẻ; Khóa / giáo viên / bảo lưu là danh sách thẻ.
- Skin: primary tím `#7C3AED`, nền `#F8F7FC`, thẻ bo 18px, badge pill. Mobile bottom: Tổng quan · Học viên · Điểm danh · Tài chính (giáo viên: Tác vụ) · Thêm. Quy tắc: `context/design-language.md`.

## 2026-10-10

- Phòng: select lịch có **Tất cả**; option ghi `[chi nhánh] tên phòng` (lịch phòng, lịch, buổi học).
- Tác vụ: giáo viên xem mọi việc (chỉ sửa việc của mình); lọc **Người phụ trách** (mọi người / của tôi / từng nhân sự kèm vai trò); avatar trên bảng; tiến độ nhóm (Done/tổng, hạn sớm nhất); hạn đỏ nếu quá hạn, vàng nếu trong 2 ngày.
- Học viên: KPI bấm lọc (Tổng / Mới / Đang học / Cần chăm sóc / Còn nợ), preset buổi còn, thêm lọc, bulk nhắn + giao follow-up, bảng GV / % điểm danh / số dư / menu ⋮, panel tab không cắt chữ (Tổng quan · Khóa · Điểm danh · Thanh toán · Bảo lưu · Ghi chú). Giáo viên không thấy SĐT và học phí.
- Tổng quan: việc đến hạn hôm nay theo ưu tiên + phòng trống theo khung giờ.

## 2026-10-09

- E1 Shell Edu craft: Ctrl+K command palette · breadcrumb · Ask Dolphin · Light/Dark · gray pill nav + orange accent bar · wordmark **Dolphin Edu CRM** · header densify (search / theme / VI·EN / bell / avatar). CTA vẫn cam POS.
- Phase C+D UX: Overview KPI/đường dẫn `/attendance` `/receivables` + sĩ số buổi qua `classStudents`; điểm danh roster theo buổi + bulk/undo/summary (giữ); Teacher backup tự mở khi tạm nghỉ; Holds i18n + rule check; Enroll rule banner + chỗ trống; Finance KPI clickable; Follow-up filter i18n + cold badge.
- Phase A+B UX: terminology Khóa/Buổi; nav active soft orange; Students cột Course (`courses.find`); slug EN mới `/mid-course-enroll` `/follow-up` `/collect-fees` `/receivables` `/qr-attendance` `/room-bookings` (+ redirect legacy); Course create drawer + preview `sessionDates`; Classes filter đầy đủ + session drawer (roster/điểm danh/đổi GV·phòng/hủy/conflict).
- Phòng: tab **Lịch phòng** (tuần / ngày / tháng) — trống vs lớp vs thuê ngoài từ Class + bookings; danh sách CRUD giữ nguyên.
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
- Vertical emoji (kiểu POS): 💃📘🎵🏊 trên thẻ chọn lĩnh vực trong `/login` (không gắn tên studio).
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
