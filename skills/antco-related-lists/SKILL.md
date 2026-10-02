---
name: antco-related-lists
description: "Cấu hình danh sách liên quan (related lists) của đối tượng Antco qua Public API: bảng bản ghi trỏ về hiện trên trang chi tiết (VD Khu vực khảo sát trong Phiếu khảo sát, Liên hệ trong Tài khoản) - hiện/ẩn/chỉ khi có dữ liệu, nhãn, cột, thứ tự, số bản ghi tối thiểu/tối đa, và đặt vào giao diện. Dùng khi cần hiển thị dữ liệu liên kết giữa các đối tượng trên trang bản ghi Antco."
license: MIT
metadata:
  author: Antco
  version: "1.0.0"
---

# Antco Related Lists

- **Phiên bản:** `1.0.0` - **Ngày phát hành:** `2026-10-02`
- Xác thực: [../antco-api-auth/SKILL.md](../antco-api-auth/SKILL.md). Đặt vào giao diện: [../antco-layouts/references/layout-v2-tree.md](../antco-layouts/references/layout-v2-tree.md) (lá `related`).

## Khái niệm

- Antco **tự dò** danh sách liên quan: mọi đối tượng có trường Tra cứu (thường hoặc phụ thuộc, một giá trị) trỏ về đối tượng này. Khoá = `<ref nguồn>.<slug trường tra cứu>` (VD `cobj:khu_vuc_khao_sat.phieu_khao_sat`).
- Không "tạo" danh sách liên quan trực tiếp: tạo **trường tra cứu** ở đối tượng nguồn (`antco-fields`) hoặc đối tượng Con (`antco-objects`), rồi cấu hình ở đây.
- Mặc định: đối tượng có sẵn = **Ẩn**; đối tượng tự tạo = **Hiện**. Danh sách từ đối tượng tự tạo cho thêm / sửa dòng ngay trên trang cha.

## Quyền

`settings:custom_fields:read / write`. Người xem trang chỉ thấy danh sách của đối tượng mình được đọc.

## Endpoint

| Method | Đường dẫn |
|---|---|
| GET | `/api/public/v1/objects/{ref}/related-lists` -> `[{ key, label, visibility, columns, minRecords, maxRecords, columnChoices }]` |
| PUT | `/api/public/v1/objects/{ref}/related-lists/{key}?dryRun=1` (`key` mã hoá URL; **chỉ khoá gửi lên**) |
| PUT | `/api/public/v1/objects/{ref}/related-lists/order?dryRun=1` - `{ "keys": [...] }` (khoá không gửi xếp sau cùng) |

```json
PUT /api/public/v1/objects/cobj%3Aphieu_khao_sat/related-lists/cobj%3Akhu_vuc_khao_sat.phieu_khao_sat?dryRun=1
{
  "label": "Khu vực khảo sát",
  "visibility": "visible",
  "columns": [
    { "key": "name", "visible": true, "pinned": "left" },
    { "key": "khu_vuc", "visible": true, "pinned": null },
    { "key": "muc_do", "visible": true, "pinned": null },
    { "key": "dien_tich", "visible": true, "pinned": null }
  ],
  "minRecords": 1,
  "maxRecords": 50
}
```

- `visibility`: `hidden` | `visible` | `has_data` (chỉ hiện khi có dữ liệu).
- `columns[].key` chọn trong `columnChoices`.
- `maxRecords` chỉ cưỡng chế với nguồn là đối tượng tự tạo; `minRecords` hiện chỉ lưu thông tin.

## Quy trình

1. Đảm bảo trường tra cứu đã có -> `GET .../related-lists` lấy `key` thật.
2. `PUT` (dry-run trước) hiển thị / nhãn / cột.
3. Nếu đối tượng dùng giao diện tuỳ chỉnh màn Xem/Sửa: thêm lá `related` (`ref` nguồn, `link` slug trường tra cứu) vào Tab-Section phù hợp qua `antco-layouts`.
4. Đọc lại; với demo data, `GET /records/{ref nguồn}?adhoc=` lọc theo cha để đối chiếu số dòng.

## Bẫy

- Trường tra cứu **nhiều giá trị**, trường hệ thống, trường nhạy cảm không tạo danh sách liên quan.
- Bật danh sách trên đối tượng có sẵn (VD Liên hệ trong Tài khoản) đổi trang mọi người đang dùng -> cần duyệt (cổng hẹp).
- Cột chỉ chọn trong trường của đối tượng nguồn; không chọn trường nhạy cảm.
