---
name: antco-access
description: "Quản lý tổ chức và phân quyền Antco qua Public API: phòng ban, chức vụ, danh sách người dùng (chỉ đọc), danh mục mã quyền, vai trò + bộ mã quyền + phạm vi dữ liệu, cấp / thu hồi vai trò kiêm nhiệm và quyền tạm thời cho người dùng - có chốt chống leo thang của máy chủ. Dùng khi đối tượng / quy trình / báo cáo mới cần cấp quyền cho đúng người, hoặc cần mã phòng ban / chức vụ / người dùng cho người duyệt, chia sẻ, menu."
license: MIT
metadata:
  author: Antco
  version: "1.1.0"
---

# Antco Access (tổ chức + phân quyền)

- **Phiên bản:** `1.1.0` - **Ngày phát hành:** `2026-10-13`
- Xác thực: [../antco-api-auth/SKILL.md](../antco-api-auth/SKILL.md). Quyền dữ liệu từng bản ghi (chia sẻ theo điều kiện): quy tắc bảo mật ở [../antco-rules/SKILL.md](../antco-rules/SKILL.md).

## Chốt của máy chủ (không vượt được, kể cả người chạy là quản trị)

- Không tự cấp vai trò / quyền cho **chính người chạy API**.
- Không tạo / sửa / cấp vai trò **Toàn quyền**; không có route gán Toàn quyền (`super-admin` bị cấm với token).
- Chỉ đưa vào vai trò / cấp cho người khác những **mã quyền và phạm vi dữ liệu người chạy API đang có**; người nhận phải trong phạm vi quản lý.
- Chức vụ mới phải có cấp bậc (rankLevel) NHỎ hơn chức vụ của người chạy.
- Tài khoản người dùng **chỉ đọc**: tạo / sửa / khoá tài khoản, mật khẩu, 2FA, token, quy tắc vai trò tự động -> người dùng làm ở giao diện (Cài đặt > Người dùng / Phân quyền).

## Quyền

`settings:departments:read|write`, `settings:positions:read|write`, `settings:users:read`, `settings:roles:read|write`, `settings:user_roles:read|write`.

## Endpoint (tiền tố `/api/public/v1`)

| Method | Đường dẫn | Ghi chú |
|---|---|---|
| GET / POST | `/org/departments` | tạo: `{ name, description, regionId }` (`regionId` lấy từ phòng ban có sẵn) |
| PUT | `/org/departments/{id}` | gửi đủ như khi tạo |
| GET / POST | `/org/positions` | `{ title, rankLevel }` (1-100, số càng LỚN càng cao: Nhân viên 40, Trưởng nhóm 50, Trưởng phòng 60) |
| PUT | `/org/positions/{id}` | |
| GET | `/org/users?q=` | `id`, `fullName`, `email`, phòng ban, chức vụ, `roleId` (không lương / dữ liệu nhạy cảm) |
| GET | `/access/permissions` | danh mục mã quyền: `id`, phân hệ, nhóm, tính năng, hành động |
| GET / POST | `/access/roles` | tạo: `{ name, description, scopeLevel, copyFromRoleId }` |
| PUT | `/access/roles/{id}` | tên / mô tả / phạm vi |
| PUT | `/access/roles/{id}/permissions` | `{ permissionIds[], previousIds[] }` **thay toàn bộ** -> `{ added, removed }`; mã không có trong danh mục / đã ngừng **bị bỏ qua không báo lỗi** -> luôn đối chiếu `added` (lấy mã từ `GET /access/permissions`, VD khách hàng là `crm:customers:*`, không phải `crm:accounts:*`) |
| GET | `/access/roles/{id}/users` | người đang giữ vai trò |
| GET | `/access/grants?q=` | vai trò kiêm nhiệm + quyền tạm thời đang cấp (id để thu hồi) |
| POST / DELETE | `/access/user-roles`, `/access/user-roles/{id}` | `{ userId, roleId, expiresAt (YYYY-MM-DD \| null), reason }` / `{ reason }` |
| POST / DELETE | `/access/user-permissions`, `/access/user-permissions/{id}` | `{ userId, permissionCode, expiresAt (bắt buộc, <= 365 ngày), reason }` |

Không có `dryRun` cho nhóm này -> mỗi lệnh ghi: trình bày rõ (ai / được gì / đến bao giờ / lý do), **chờ người dùng đồng ý riêng từng lần**, rồi mới gửi.

## Quy trình

1. **Khảo sát:** `GET /access/roles` (vai trò hiện có + mã quyền), `GET /access/permissions` (mã chính xác - không đoán), `GET /org/users?q=` (đúng người).
2. **Ưu tiên ít thay đổi nhất:** thêm mã quyền vào vai trò đúng nhóm người dùng đã có > tạo vai trò mới > cấp kiêm nhiệm / quyền tạm thời cho từng người (có hạn).
3. Đối tượng tự tạo mới: quyền `cobj:<slug>:read|write|delete` chỉ vai trò Toàn quyền có ngay -> thêm vào vai trò nghiệp vụ bằng `PUT /access/roles/{id}/permissions` (dựng từ bộ hiện tại + `previousIds` = bộ vừa đọc).
4. Ghi -> đọc lại (`GET /access/roles`, `/access/grants`) -> nhắc người dùng: quyền nạp lại tối đa 60 giây; kiểm bằng tài khoản persona thật trên giao diện.

## Bẫy

- `PUT .../permissions` gửi thiếu mã = **thu hồi** mã đó khỏi mọi người giữ vai trò. Luôn dựng từ bộ hiện tại.
- `403` khi cấp: thường do chốt chống leo thang (mã người chạy không có, người nhận ngoài phạm vi) - báo người dùng làm bằng tài khoản có đủ quyền, không tìm cách vòng.
- Vai trò hệ thống / Toàn quyền: không sửa qua API.

## Báo kết quả

Bảng: thay đổi | đối tượng (vai trò / người) | mã quyền thêm / bớt | hạn | lý do | trạng thái. Đường dẫn: `/settings/roles`.
