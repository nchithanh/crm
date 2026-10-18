# Dolphin CRM FE

Local-first. Dữ liệu mẫu: **Edu Dance** (studio giả, 3 cơ sở). Accent `#5d5cc4` cho mọi lĩnh vực. Thanh dưới mobile là viên nổi.

Product: **Dolphin Edu CRM**. Terminology: **Khóa** / **Buổi**. Nền app tint lavender `#f6f5fc`, khối trắng bo 12–16px + bóng mềm, badge pill, bottom nav 5 mục. SoT: `context/design-language.md`. Students = chip + hàng avatar + drawer; Overview = lời chào + KPI + buổi sắp tới. **Ctrl+K / ⌘K** = Command Palette AI-style (giữa màn; Gợi ý nhanh / Hành động / Gần đây). Canonical: `/overview` `/revenue` `/collections` `/dolphin-ai`.

`npm run dev` → http://127.0.0.1:3014

Live custom domain: https://crm.dolphin-software.io.vn/ (Pages root, không `basePath`). CI: `.github/workflows/deploy-pages.yml`.

PIN: Boss `9999` · quản lý `1234` · lễ tân `1111` · giáo viên `2222` · Marketing `5555`. Phân quyền: `/settings/access` (`context/access.md`).
