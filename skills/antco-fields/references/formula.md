# Công thức và Tổng hợp

## Công thức (`formula`)

Antco tính bằng bộ tính riêng (không chạy JavaScript, không `eval`). Cú pháp:

- Giá trị: số, `'chuỗi'` / `"chuỗi"`, `true` / `false` / `null`, `$record.<slug trường>`.
- Toán tử: `+ - * / %`, `== != < <= > >=`, `&& || !`, `điều_kiện ? a : b`, ngoặc.
- Hàm: `IF(đk, a, b)`; `Math.abs / round / ceil / floor / sqrt / pow / max / min / mod`, `Math.PI`, `Math.E`; `Text.upper / lower / trim / length / left / right / contains / begins / endsWith / replace / isBlank / concat`; `Number.toNumber`; `Date.today / diffDays / addDays / addMonths / year / month / day`. Hàm khác -> lỗi; không tự bịa hàm.
- Chia 0 -> trống. `blankAsZero: true` coi ô trống là 0.
- Không tham chiếu trường nhạy cảm; không tham chiếu vòng (A dùng B, B dùng A).

### Kiểm trước khi lưu (bằng dryRun)

```json
POST /api/public/v1/objects/cobj%3Ahang_muc_khao_sat/fields?dryRun=1
{ "label": "Thành tiền", "slug": "thanh_tien", "type": "formula",
  "settings": { "formula": "$record.dien_tich * $record.don_gia", "returnType": "number", "valueType": "money", "decimals": 0, "blankAsZero": true } }
```

`success: true` -> công thức hợp lệ (máy chủ kiểm cú pháp, trường tồn tại, trường nhạy cảm, vòng lặp). Lỗi -> `400 VALIDATION_ERROR` với message "Công thức: ...". Chỉ ghi thật khi dryRun sạch.

Sau khi ghi: công thức tính ngay cho bản ghi hiện có. Với dữ liệu demo, đọc lại 2 bản ghi và so với tính tay.

## Tổng hợp (`rollup`)

- Đặt ở **cha**; nguồn là đối tượng **Con tự tạo** có Tra cứu phụ thuộc trỏ về cha.
- `rollupLink` = slug trường Tra cứu phụ thuộc ở con (đọc từ `GET /objects/{ref con}/fields`).
- `rollupFn`: `sum`, `count`, `min`, `max`, `avg`. `count` không cần `rollupField`. `sum`/`avg` cần trường số (hoặc công thức `returnType: number`); `min`/`max` nhận số hoặc ngày.
- `rollupFilter` (tuỳ chọn): điều kiện chuẩn (<= 10 điều kiện, không dùng trường nhạy cảm).

```json
{ "label": "Số khu vực", "slug": "so_khu_vuc", "type": "rollup",
  "settings": { "rollupObject": "cobj:khu_vuc_khao_sat", "rollupLink": "phieu_khao_sat", "rollupFn": "count", "valueType": "number" } }
```

Máy chủ lưu giá trị ở cha và tính lại khi dòng con đổi.
