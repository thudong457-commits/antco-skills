---
name: antco-actions
description: "Tạo hành động (nút) và chuỗi hành động cho đối tượng tự tạo Antco qua Public API: Cập nhật bản ghi hiện tại (gán giá trị, cộng thêm, cho người dùng nhập), Tạo bản ghi từ màn danh sách, Nhân bản, Xoá, Chuỗi hành động nhiều bước; rồi đặt nút lên giao diện bằng Button group. Dùng khi nghiệp vụ cần nút thao tác nhanh như Gửi duyệt, Duyệt, Từ chối, Hoàn thành trên Antco."
license: MIT
metadata:
  author: Antco
  version: "1.0.0"
---

# Antco Actions (Hành động & Chuỗi hành động)

- **Phiên bản:** `1.0.0` - **Ngày phát hành:** `2026-10-02`
- Xác thực: [../antco-api-auth/SKILL.md](../antco-api-auth/SKILL.md). Đặt nút lên giao diện: [../antco-layouts/SKILL.md](../antco-layouts/SKILL.md).

## Phạm vi

- Chỉ **đối tượng tự tạo**. Đối tượng có sẵn: `GET /actions` trả `supported: false` -> `CHUA_HO_TRO`.
- `actionType`: `update` (sửa bản ghi hiện tại) | `create` (tạo bản ghi, nút màn danh sách) | `clone` | `delete` (luôn hỏi người dùng cuối, xoá mềm) | `chain` (chuỗi).
- Không có: gọi API ra ngoài, gộp bản ghi, xuất dữ liệu, cập nhật đối tượng khác, xoá hành động qua API (chỉ `isActive: false`) -> đề xuất cách khác.

## Quyền

Cấu hình: `settings:custom_fields:read / write`. Khi người dùng cuối bấm nút, Antco kiểm `cobj:<slug>:write` (Xoá: `:delete`) + quy tắc bảo mật; chuỗi kiểm đủ quyền mọi bước. **Agent không bấm hành động trên bản ghi thật** - Public API v1 không có endpoint chạy hành động; kiểm thử bằng cách mô tả cho người dùng bấm thử trên bản ghi demo.

## Endpoint

| Method | Đường dẫn |
|---|---|
| GET | `/api/public/v1/objects/{ref}/actions` -> `{ supported, actions[], fields[], filters[] }` (gồm nút hệ thống) |
| POST | `/api/public/v1/objects/{ref}/actions?dryRun=1` |
| PUT | `/api/public/v1/objects/{ref}/actions/{id}?dryRun=1` (**thay toàn bộ**, không đổi `actionType`) |

## Ví dụ

```json
POST /api/public/v1/objects/cobj%3Aphuong_an_ky_thuat/actions?dryRun=1
{
  "actionType": "update",
  "name": "Gửi duyệt",
  "slug": "gui_duyet",
  "icon": null,
  "display": "center",
  "isActive": true,
  "config": { "silent": false, "fields": [ { "key": "trang_thai", "mode": "replace", "value": "cho_duyet", "editable": false } ] }
}
```

```json
{
  "actionType": "update", "name": "Từ chối", "slug": "tu_choi", "display": "center", "isActive": true,
  "config": { "silent": false, "fields": [
    { "key": "trang_thai", "mode": "replace", "value": "tu_choi", "editable": false },
    { "key": "ly_do_tu_choi", "mode": "replace", "value": null, "editable": true }
  ] }
}
```

```json
{
  "actionType": "chain", "name": "Duyệt và chốt", "slug": "duyet_va_chot", "title": "Duyệt phương án", "display": "center", "isActive": true,
  "config": { "tooltip": "Duyệt rồi đánh dấu khách chọn", "steps": [
    { "actionId": "<id hành động Duyệt>", "skipIfPrevCreate": false, "skipIfPrevUpdate": false, "allowSkip": false, "silent": false },
    { "actionId": "<id hành động Khách chọn>", "skipIfPrevCreate": false, "skipIfPrevUpdate": false, "allowSkip": true, "silent": false }
  ] }
}
```

- `slug`: chữ thường không dấu, số, `_`, 2-50 ký tự, duy nhất trong đối tượng.
- `display`: `center` | `right` | `left` | `fullscreen` (kiểu hộp nhập khi bấm).
- `config.fields[]` (update / create): `{ key: slug trường, value, mode: "replace" | "add" (cộng thêm cho Số / Tiền / Phần trăm), editable }`. `editable: true` + `value: null` = người dùng nhập khi bấm.
- `create`: `config { fields[], filterKeys[] }`; `clone`: `{ silent }`; `delete`: `{ confirmText }`; `chain`: `title` (bắt buộc, đặt ở cấp ngoài cùng như ví dụ; nếu máy chủ báo thiếu tiêu đề thì thử thêm `config.title`), `config { tooltip, popupWidth, steps[] }`.
- `icon`: để `null` (chỉ nhận biểu tượng trong danh sách của Antco).
- Chuỗi chạy trong **một giao dịch**: bước lỗi thì huỷ cả chuỗi.

## Quy trình

1. Đọc trường + quy tắc chuyển trạng thái: hành động đổi trạng thái phải đi **đúng đường chuyển**, nếu không người dùng bấm sẽ lỗi.
2. Tạo hành động con trước, chuỗi sau (cần id thật).
3. `--server-dry-run` -> ghi -> đọc lại `GET /actions`.
4. Đặt lên giao diện Xem/Sửa: thêm `comp` `kind: "buttons"`, `actions: [id...]` qua `antco-layouts` (PUT đủ cây, giữ id khối cũ).
5. Bàn giao: hướng dẫn người dùng bấm thử trên bản ghi demo.

## Bẫy

- Gán giá trị lựa chọn dùng `value`, không dùng nhãn.
- `mode: "add"` cần có `value` số.
- Hành động `delete` trong chuỗi: tránh, trừ khi người dùng yêu cầu rõ.
