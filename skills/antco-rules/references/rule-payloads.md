# Payload quy tắc (theo Antco Public API v1; `openapi.json` là nguồn chuẩn)

Điều kiện chuẩn dùng chung:

```json
{ "logic": "AND", "expression": null,
  "conditions": [ { "id": "c1", "field": "muc_do", "operator": "equals", "value": "cao" } ] }
```

`logic`: `AND` | `OR` | `CUSTOM` (kèm `expression` như `1 AND (2 OR 3)`) | `NONE`. Toán tử: `../../antco-filters/references/operators.md`.

## Quy tắc giao diện

```json
POST /api/public/v1/objects/cobj%3Aphieu_khao_sat/layout-rules?dryRun=1
{
  "name": "Mức độ cao cần phương án khẩn",
  "description": null,
  "isActive": true,
  "layoutIds": ["<id giao diện Xem/Sửa>"],
  "priority": 10,
  "condition": { "logic": "AND", "expression": null, "conditions": [ { "id": "c1", "field": "muc_do_chung", "operator": "equals", "value": "cao" } ] },
  "actions": [
    { "target": "field", "key": "phuong_an_khan", "action": "show" },
    { "target": "field", "key": "phuong_an_khan", "action": "require" },
    { "target": "section", "key": "grp_khan_cap", "action": "show" },
    { "target": "field", "key": "uu_tien", "action": "set", "value": "1" }
  ]
}
```

- `target: "field"`: `key` = slug trường; `action` = `show` | `hide` | `require` | `optional` | `readonly` | `editable` | `set` (kèm `value`) | `clear`.
- `target: "section"`: `key` = **id khối** trong cây giao diện (section / tabs / tab / group / comp); `action` = `show` | `hide`; chỉ khi `layoutIds` có đúng 1 id.
- `layoutIds: []` = mọi giao diện kể cả bố cục mặc định.

## Quy tắc trùng lặp

```json
POST /api/public/v1/objects/cobj%3Aphieu_khao_sat/duplicate-rules?dryRun=1
{
  "name": "Trùng khách hàng và ngày khảo sát",
  "description": null,
  "isActive": true,
  "logic": "AND",
  "conditions": [ { "field": "khach_hang", "match": "equals" }, { "field": "ngay_khao_sat", "match": "equals" } ],
  "blankAsDuplicate": false,
  "onCreate": "warn",
  "onUpdate": "allow",
  "message": "Khách này đã có phiếu khảo sát cùng ngày. Kiểm tra trước khi lưu."
}
```

`match`: `equals` | `equals_ci` (không phân biệt hoa thường, đúng cả chữ có dấu) | `phone` (chuẩn hoá +84 -> 0) | `contains`. `onCreate` / `onUpdate`: `block` | `warn` | `allow`.

## Quy tắc bảo mật dữ liệu (chỉ đối tượng tự tạo)

```json
POST /api/public/v1/objects/cobj%3Aphieu_khao_sat/security-rules?dryRun=1
{
  "name": "Phòng kỹ thuật xem phiếu đã khảo sát",
  "description": null,
  "isActive": false,
  "filter": { "logic": "AND", "expression": null, "conditions": [ { "id": "c1", "field": "trang_thai", "operator": "equals", "value": "da_khao_sat" } ] },
  "people": [ { "type": "department", "ids": ["<id phòng ban do người dùng cung cấp>"] } ],
  "canEdit": false,
  "canDelete": false
}
```

`people[].type`: `all` | `user` | `department` | `position` | `role` | `creator` | `creator_department` (`ids` bắt buộc với user / department / position / role). Tạo `isActive: false`; bật bằng `PUT` (đủ cấu hình, `isActive: true`) sau khi người dùng đồng ý ở cổng hẹp.

## Quy tắc chuyển trạng thái

```json
POST /api/public/v1/objects/cobj%3Aphuong_an_ky_thuat/status-rules?dryRun=1
{
  "name": "Vòng đời phương án kỹ thuật",
  "description": null,
  "fieldKey": "trang_thai",
  "isActive": true,
  "transitions": [
    { "from": "", "to": "nhap", "requiredFields": [] },
    { "from": "nhap", "to": "cho_duyet", "requiredFields": ["gia_tri"] },
    { "from": "cho_duyet", "to": "da_duyet", "requiredFields": [] },
    { "from": "cho_duyet", "to": "tu_choi", "requiredFields": ["ly_do_tu_choi"] },
    { "from": "tu_choi", "to": "nhap", "requiredFields": [] },
    { "from": "da_duyet", "to": "khach_chon", "requiredFields": [] }
  ]
}
```

`from: ""` = khi tạo mới.

## Lộ trình

```json
PUT /api/public/v1/objects/cobj%3Aphieu_khao_sat/path?dryRun=1
{
  "fieldKey": "trang_thai",
  "isActive": true,
  "steps": [
    { "value": "moi", "guidance": "Gọi khách xác nhận địa chỉ, thời gian.", "keyFields": ["khach_hang", "dia_chi"] },
    { "value": "da_khao_sat", "guidance": "Lập phương án kỹ thuật trong 24 giờ.", "keyFields": ["ky_thuat_vien"] }
  ]
}
```

PUT thay toàn bộ lộ trình: `GET /path` trước, gộp, gửi đủ.
