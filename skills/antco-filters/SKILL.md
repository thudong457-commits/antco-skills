---
name: antco-filters
description: "Tạo và chia sẻ bộ lọc nâng cao (saved filter / view) cho danh sách đối tượng Antco qua Public API: điều kiện AND/OR/Tùy chỉnh '1 AND (2 OR 3)', biến $currentUser/$today, sắp xếp, cột hiển thị + ghim + thống kê, bố cục List/Kanban/Split/Lịch, số bản ghi mỗi trang, chia sẻ Xem/Sửa cho nhân sự/phòng ban/vị trí/vai trò (bao gồm/ngoại trừ). Dùng khi người dùng cần view như 'Phiếu của tôi', 'Chờ duyệt', 'Quá hạn' hoặc bảng Kanban theo trạng thái trên Antco."
license: MIT
metadata:
  author: Antco
  version: "1.0.0"
---

# Antco Filters (Bộ lọc nâng cao)

- **Phiên bản:** `1.0.0` - **Ngày phát hành:** `2026-10-02`
- Xác thực: [../antco-api-auth/SKILL.md](../antco-api-auth/SKILL.md). Toán tử + biến: [references/operators.md](references/operators.md).

## Khái niệm

- Bộ lọc lưu và lọc **ở máy chủ** (danh sách nhận `?filterId=`). Bộ lọc **hệ thống** (`views`) do Antco khai báo - agent không sửa. Agent tạo bộ lọc **người dùng**, thuộc về **người chạy API**; người khác chỉ thấy khi được chia sẻ. Yêu thích / mặc định là lựa chọn riêng từng người - agent không đặt thay.
- Đối tượng lọc xác định bằng cặp `module` + `object`: `module` = `crm | scm | fin | cobj | obj`; `object` = khoá trong nhóm (VD `account`, `product`, `phieu_khao_sat`, `hrm:staff`). Lấy đúng cặp từ `GET /filters/targets`.
- Quản lý tập trung ở **Cài đặt > Dữ liệu > Bộ lọc** (`/settings/filter`).

## Quyền

Quyền xem đối tượng (VD `cobj:<slug>:read`). `GET /filters/targets` cần `settings:list_filters:read`. Sửa: người tạo hoặc được chia sẻ quyền Sửa; xoá: chỉ người tạo.

## Endpoint

| Method | Đường dẫn |
|---|---|
| GET | `/api/public/v1/filters/targets` -> `[{ module, objectKey, label, ref, group? }]` |
| GET | `/api/public/v1/filters?module=&object=` -> `{ views[], filters[], prefs }` |
| POST | `/api/public/v1/filters?module=&object=&dryRun=1` |
| PUT | `/api/public/v1/filters/{id}?module=&object=&dryRun=1` (**thay toàn bộ**, kể cả chia sẻ) |
| DELETE | `/api/public/v1/filters/{id}?module=&object=` (xoá mềm, chỉ người tạo - cổng hẹp) |
| GET | `/api/public/v1/records/{ref}?filterId={id}&limit=1` -> `data.total` để kiểm |

## Ví dụ

```json
POST /api/public/v1/filters?module=cobj&object=phieu_khao_sat&dryRun=1
{
  "name": "Phiếu của tôi đang mở",
  "description": "Phiếu kỹ thuật viên được giao, chưa khảo sát",
  "logic": "AND",
  "expression": null,
  "conditions": [
    { "id": "c1", "field": "ky_thuat_vien", "operator": "equals", "value": "$currentUser" },
    { "id": "c2", "field": "trang_thai", "operator": "equals", "value": "moi" }
  ],
  "sorts": [ { "field": "ngay_khao_sat", "dir": "asc" } ],
  "pageSize": 20,
  "columns": [
    { "key": "name", "width": 160, "visible": true, "pinned": "left" },
    { "key": "khach_hang", "width": 200, "visible": true, "pinned": null },
    { "key": "ngay_khao_sat", "width": 140, "visible": true, "pinned": null },
    { "key": "trang_thai", "width": 140, "visible": true, "pinned": null },
    { "key": "so_khu_vuc", "width": 120, "visible": true, "pinned": null, "stats": ["sum"] }
  ],
  "layout": { "view": "list" },
  "shares": [ { "targetType": "position", "targetId": "<id vị trí do người dùng cung cấp>", "permission": "view", "mode": "include" } ]
}
```

- `pageSize`: 20 | 50 | 100. `sorts` <= 5 (khuyên <= 3).
- `columns[]`: `{ key, width 60-1200, visible (phải ghi rõ `true`), pinned: "left" | "right" | null, stats? }`; `stats` chỉ cho cột số (`sum`, `count`, `avg`, `max`, `min`). Cột từ đối tượng liên quan dạng `<slug tra cứu>.<trường>` (<= 20, chỉ hiển thị).
- `layout`: `{ "view": "list" | "kanban" | "split" | "calendar", ... }`. Kanban: `"kanban": { "columnField": "<slug Lựa chọn đơn>" }`; Lịch: `"calendar": { "timeField": "<slug ngày>" }`. Khoá chi tiết theo `openapi.json`; sai thì máy chủ đưa về `list` - đọc lại để phát hiện.
- `shares[]`: `{ targetType: all | user | department | position | role, targetId, permission: view | edit, mode: include | exclude | all }`. `exclude` = mọi người **không** khớp dòng đó. Id phòng ban / vị trí / vai trò không có API tra cứu - hỏi người dùng; không chắc thì chưa chia sẻ.

## Thiết kế bảng (nghĩ trước khi tạo)

1. Câu nghiệp vụ: "**<vai trò>** cần thấy **<bản ghi nào>** để **<quyết định gì>**". Mỗi câu = một bộ lọc.
2. 5-10 cột: tên / mã (ghim trái) -> trạng thái -> người phụ trách -> trường quyết định -> số (thống kê) -> ngày.
3. Việc cần làm: sắp hạn gần nhất trước; danh mục: mới nhất trước.
4. Chia sẻ đúng nhóm, quyền **Xem** (Sửa chỉ khi người dùng yêu cầu).

## Quy trình

1. `GET /filters/targets` -> cặp `module` / `object`; `GET /filters?...` - có bộ lọc tương tự (kể cả hệ thống) thì đề xuất dùng lại.
2. `--server-dry-run` -> sửa lỗi ("Không xác định được điều kiện N", "Biểu thức logic không hợp lệ"...).
3. Ghi thật -> đọc lại -> `GET /records/{ref}?filterId=` so `total` với số đếm tay trên dữ liệu demo.

## Bẫy

- `CUSTOM` mà `expression` tham chiếu số điều kiện không có -> lỗi.
- Giá trị tra cứu phải là id thật; lựa chọn phải là `value`.
- Trường nhạy cảm không lọc / không làm cột được.
- Người không có quyền xem đối tượng không thấy bộ lọc dù được chia sẻ.

## Báo kết quả

Bảng: tên | id | đối tượng | điều kiện tóm tắt | chia sẻ | số bản ghi khớp (demo). Đường dẫn: `/settings/filter`.
