---
name: antco-fields
description: "Thêm và sửa trường dữ liệu tự thêm của đối tượng Antco qua Public API: 23 kiểu trường (văn bản, số, tiền tệ, phần trăm, ngày, lựa chọn đơn/nhiều có màu, tra cứu thường, tra cứu phụ thuộc, đánh số tự động, công thức, tổng hợp, xếp hạng, regex...), lựa chọn, công thức kiểm bằng dryRun, tổng hợp từ đối tượng con, đánh dấu trường nhạy cảm. Dùng khi cần thêm hoặc chỉnh trường cho đối tượng Antco có sẵn hay tự tạo."
license: MIT
metadata:
  author: Antco
  version: "1.0.0"
---

# Antco Fields

- **Phiên bản:** `1.0.0` - **Ngày phát hành:** `2026-10-02`
- Xác thực: [../antco-api-auth/SKILL.md](../antco-api-auth/SKILL.md). 23 kiểu + cài đặt + định dạng giá trị: [references/field-types.md](references/field-types.md). Công thức / tổng hợp: [references/formula.md](references/formula.md).

## Khi nào dùng

- Thêm trường tự thêm vào đối tượng có sẵn (VD `crm:account`) hoặc tự tạo (`cobj:<slug>`).
- Sửa nhãn, lựa chọn, cài đặt, bật / tắt (`isActive`) trường tự thêm.

Không làm được qua API (-> `CHUA_HO_TRO`, người dùng làm ở Cài đặt > Dữ liệu > Đối tượng > Trường): ẩn / đổi nhãn / bắt buộc **trường có sẵn**, xoá trường, đổi kiểu trường, theo dõi lịch sử.

## Quyền

`settings:custom_fields:read` (đọc, `/meta/field-types`), `settings:custom_fields:write` (thêm / sửa).

## Endpoint

| Method | Đường dẫn |
|---|---|
| GET | `/api/public/v1/meta/field-types` -> `[{ type, label, settings[], customOnly, soon, computed }]` |
| GET | `/api/public/v1/objects/{ref}/fields` -> `{ systemFields[], customFields[], overrides[] }` |
| POST | `/api/public/v1/objects/{ref}/fields?dryRun=1` |
| PUT | `/api/public/v1/objects/{ref}/fields/{id}?dryRun=1` (**thay toàn bộ** `label`, `options`, `settings`; không đổi kiểu) |

## Quy trình

1. `GET /meta/field-types` (kiểu dùng được hôm nay) + `GET /objects/{ref}/fields` (trường hiện có: `systemFields[].key`, `customFields[].slug`).
2. Kiểm trùng: nhãn / slug đã có (kể cả trường có sẵn đang bị ẩn - khi đó đề xuất người dùng bỏ ẩn thay vì tạo mới).
3. Dựng payload theo [references/field-types.md](references/field-types.md) -> `--server-dry-run`. Công thức được máy chủ kiểm cú pháp, trường tồn tại, vòng lặp, trường nhạy cảm ngay trong dryRun.
4. Ghi thật (kế hoạch đã duyệt) -> đọc lại `GET .../fields` -> so `type`, `label`, `options`, `settings` quan trọng; ghi `id` + `slug` thật vào checkpoint.
5. Sửa: `GET` trường -> sửa -> `PUT` **đủ** `label`, `options`, `settings`, `section`, `showInList`, `isActive`.

### Ví dụ: lựa chọn đơn có màu

```json
POST /api/public/v1/objects/cobj%3Aphieu_khao_sat/fields?dryRun=1
{
  "label": "Trạng thái", "slug": "trang_thai", "type": "select",
  "options": [
    { "value": "moi", "label": "Mới", "color": "#2563EB", "isDefault": true },
    { "value": "da_khao_sat", "label": "Đã khảo sát", "color": "#059669" },
    { "value": "huy", "label": "Huỷ", "color": "#DC2626" }
  ],
  "settings": { "required": true, "help": "Vòng đời phiếu khảo sát", "display": "dropdown", "quickSearch": false },
  "section": null, "showInList": true
}
```

### Ví dụ: tra cứu thường tới đối tượng có sẵn

```json
{ "label": "Khách hàng", "slug": "khach_hang", "type": "lookup",
  "settings": { "required": true, "lookup": "crm:account", "multiple": false }, "showInList": true }
```

## Quy tắc hợp lệ (tóm tắt)

- `slug`: chữ thường không dấu, số, `_`; bỏ trống = sinh từ nhãn. Tham chiếu trường ở mọi nơi khác (giao diện, quy tắc, bộ lọc, công thức, bản ghi, báo cáo) bằng **slug thật đọc lại** (`customFields[].slug`); trường có sẵn bằng `systemFields[].key`.
- `cascading` (Cây thư mục) đang **Sắp có** - không thiết kế dựa vào nó.
- `dependent_lookup` chỉ có trên đối tượng **tự tạo** (thường do máy chủ tạo khi tạo đối tượng Con); luôn bắt buộc, một giá trị.
- Kiểu `computed` (`autonumber`, `formula`, `rollup`): không nhập tay, máy chủ bỏ `required` / `defaultValue`.
- Lựa chọn: `select` / `multiselect` cần >= 1 lựa chọn, `value` không trùng; **không đổi `value`** của lựa chọn đã có dữ liệu (chỉ đổi `label`, hoặc `active: false` để ngừng dùng).
- Đích tra cứu (`settings.lookup`) **không đổi được** sau khi tạo.
- `unique: true` -> không có giá trị mặc định.
- Biểu thức chính quy: <= 200 ký tự, không lượng từ lồng / chồng lấn (máy chủ chặn ReDoS).
- Dữ liệu nhạy cảm (lương, số giấy tờ, tài khoản ngân hàng) -> `settings.sensitive: true` (không gửi AI, không dùng trong công thức / tổng hợp).

## Bẫy thường gặp

- Công thức / tổng hợp tham chiếu trường chưa tạo -> tạo trường nguồn trước (DAG).
- Tổng hợp ở cha cần đối tượng Con có Tra cứu phụ thuộc về cha (`rollupLink` = slug trường đó ở con).
- `PUT` thiếu `options` = xoá hết lựa chọn (thay toàn bộ). Luôn dựng từ bản GET mới nhất.
- Tạo nhầm: không xoá được qua API -> `PUT` với `isActive: false` và báo người dùng.

## Báo kết quả

Bảng: nhãn | slug thật | id | kiểu | bắt buộc | REQ. Đường dẫn: `/settings/objects/<ref>` (Danh sách trường dữ liệu).
