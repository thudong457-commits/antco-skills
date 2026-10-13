---
name: antco-app-menus
description: "Cấu hình menu trái từng phân hệ Antco qua Public API: sắp xếp / ẩn / đổi tên mục có sẵn, thêm tiêu đề nhóm, mục mở danh sách đối tượng theo bộ lọc (có đếm số), mục đường dẫn; giới hạn theo nền tảng (web / mobile) và gán cho nhân sự / phòng ban / vị trí / vai trò; về menu gốc. Dùng khi vừa tạo đối tượng / bộ lọc mới cần đưa lên menu, hoặc gọn menu theo vai trò."
license: MIT
metadata:
  author: Antco
  version: "1.2.0"
---

# Antco App Menus (menu ứng dụng)

- **Phiên bản:** `1.2.0` - **Ngày phát hành:** `2026-10-13`
- Xác thực: [../antco-api-auth/SKILL.md](../antco-api-auth/SKILL.md). Bộ lọc để gắn vào mục menu: [../antco-filters/SKILL.md](../antco-filters/SKILL.md).

## Mô hình

- Menu gốc mỗi phân hệ (`crm`, `fsm`, `scm`, `fin`, `hrm`...) nằm trong code. Cấu hình **chỉ** sắp xếp / ẩn / đổi tên mục có sẵn và thêm mục mới; không cấu hình = menu gốc.
- Cấu hình **không mở thêm quyền**: mục trỏ tới trang / đối tượng người xem không có quyền vẫn bị ẩn với người đó.
- Mục gốc **không có** trong cấu hình vẫn hiện ở cuối menu. Muốn ẩn: thêm `{ "kind": "code", "to": "...", "hidden": true }`.
- Menu Thuê bao (`saas`) không cấu hình qua token.

## Quyền

`settings:app_menus:read` (đọc), `settings:app_menus:write` (lưu / về gốc).

## Endpoint

| Method | Đường dẫn | Ghi chú |
|---|---|---|
| GET | `/api/public/v1/app-menus` | `[{ key, codeItems[{ to, title }], config: { items[], updatedAt } \| null }]` |
| PUT | `/api/public/v1/app-menus/{key}?dryRun=1` | `{ items: [...] }` **thay toàn bộ** (<= 120 mục) hoặc `{ reset: true }` = về menu gốc |

## Mục menu

| `kind` | Trường riêng | Ghi chú |
|---|---|---|
| `code` | `to` (phải thuộc `codeItems` của phân hệ), `title` (null = tên gốc), `hidden` | mục có sẵn |
| `header` | `title` (bắt buộc) | tiêu đề nhóm |
| `object` | `objectRef`, `filterId` (id bộ lọc đã lưu hoặc `sys:<khoá>` bộ lọc hệ thống), `showCount` | mở danh sách đối tượng; đếm theo bộ lọc + phạm vi của người xem |
| `url` | `url` (`/...` trong hệ thống hoặc `https://...`), `newTab` | `javascript:` / `data:` bị chặn |

Chung: `id` (giữ nguyên id cũ khi sửa), `platform` (`all` / `web` / `mobile`), `assign[]` (rỗng = mọi người; `{ type: user | department | position | role, all, ids[] }`), `titleTranslations` (`{ "en-US": "..." }`).

## Quy trình

1. `GET /app-menus` -> lấy `codeItems` + `config` hiện tại của phân hệ. Có `config` -> **dựng từ đó** (giữ mục, id, gán của công ty); chưa có -> dựng từ `codeItems` theo đúng thứ tự gốc.
2. Thêm / sửa mục theo thiết kế đã duyệt (VD đối tượng mới vừa tạo -> mục `object` dưới tiêu đề nhóm của nó). Id nhân sự / phòng ban / vai trò cho `assign`: đọc từ `GET /filters/targets` hoặc skill tổ chức; không đoán.
3. `PUT /app-menus/{key}?dryRun=1` -> `--apply --run-id`.
4. Đọc lại `GET /app-menus` -> so số mục, thứ tự, ẩn / hiện. Báo người dùng tải lại trang để thấy menu mới.

```json
PUT /api/public/v1/app-menus/fsm?dryRun=1
{ "items": [
  { "id": "m_ks", "kind": "header", "title": "Khảo sát", "platform": "all", "assign": [] },
  { "id": "m_ks_list", "kind": "object", "objectRef": "cobj:phieu_khao_sat", "filterId": null, "showCount": true, "title": "Phiếu khảo sát", "platform": "all", "assign": [] },
  { "id": "m_old", "kind": "code", "to": "/fsm/reports", "hidden": true, "platform": "all", "assign": [] }
] }
```

## Bẫy

- PUT thay toàn bộ: gửi danh sách thiếu mục `object` / `url` / `header` công ty đã thêm = **xoá** chúng. Luôn bắt đầu từ `config` hiện tại.
- `{ reset: true }` xoá toàn bộ cấu hình của phân hệ - chỉ khi người dùng yêu cầu rõ.
- `to` sai (không thuộc menu gốc phân hệ) -> 400; mục `code` lặp -> 400.

## Báo kết quả

Phân hệ | mục thêm / ẩn / đổi tên | gán cho ai | nền tảng. Giao diện: Cài đặt > Ứng dụng & Menu.
