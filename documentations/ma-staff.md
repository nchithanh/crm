# MA · Tài khoản (Boss)

Chỉ khi `authMode=ma` và `role=boss`.

## UI `/staff`

- Tạo: name, username, password, role (`owner`·`reception`·`teacher`·`marketing`·**`accountant`**), chi nhánh (0 = mọi chi nhánh)
- List: role · status · chi nhánh
- Sửa name/role/branch · Đổi mật khẩu · Khóa/Mở (`inactive`/`active`)
- **Chia sẻ:** `navigator.share` (fallback clipboard) — sau tạo hoặc đổi mật khẩu

Không khóa / xóa boss; không khóa chính mình. “Xóa” = `status=inactive`.

## API

| | |
| --- | --- |
| List (+ inactive) | `GET /staff?all=1` |
| Create | `POST /staff` |
| Update | `PATCH /staff/{id}` |
| Password | `PATCH /staff/{id}/password` |
| Lock | `DELETE /staff/{id}` → inactive |

SoT BE: `products/saas/backend/context/crm/staff.md`.
