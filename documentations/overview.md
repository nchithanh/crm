# Dolphin CRM FE

Local-first (demo vertical + Dexie). **MA Dance:** login API + `/tasks` qua CRM Laravel (`ma-tasks-api.md`); boss thêm `/staff` tạo TK (`ma-staff.md`). Accent `#5d5cc4` cho mọi lĩnh vực. Thanh dưới mobile là viên nổi.

Product: **Dolphin Edu CRM**. Terminology: **Khóa** / **Buổi**. Nền app tint lavender `#f6f5fc`, khối trắng bo 12–16px + bóng mềm, badge pill, bottom nav 5 mục. SoT: `context/design-language.md` (mục **Loading / API**: mọi thao tác gọi API phải `Button busy` / spinner ngay lúc bấm). `/tasks` bộ lọc drawer kiểu Google Calendar như `/schedule`. Students = chip + hàng avatar + drawer; Overview = lời chào + KPI + buổi sắp tới. **Ctrl+K / ⌘K** = Command Palette AI-style (giữa màn; Gợi ý nhanh / Hành động / Gần đây). Canonical: `/overview` `/revenue` `/collections` `/dolphin-ai`.

`npm run dev` → http://127.0.0.1:3014

Live custom domain: https://crm.dolphin-software.io.vn/ (Pages root, không `basePath`). CI: `.github/workflows/deploy-pages.yml`.

**Cache / app ghim màn hình chính:** GitHub Pages không cho set `Cache-Control` HTML. Build ghi `public/build-id.json` (SHA); client `BuildUpdateGuard` fetch `cache: no-store` khi mở/focus — đổi id thì `location.reload()`. Lần đầu ghim sau deploy mới có thể cần mở app 1 lần (hoặc xóa icon rồi Add to Home Screen lại).

PIN: Boss `9999` · quản lý `1234` · lễ tân `1111` · giáo viên `2222` · Marketing `5555`. Phân quyền: `/settings/access` (`context/access.md`).
