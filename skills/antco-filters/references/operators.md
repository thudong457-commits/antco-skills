# Điều kiện lọc chuẩn Antco (dùng chung)

Dùng cho: bộ lọc nâng cao, `adhoc` của danh sách bản ghi, quy tắc giao diện, quy tắc bảo mật, điều kiện Tổng hợp, bộ lọc báo cáo, lọc danh sách liên quan. Danh mục dưới đây theo chuẩn bộ lọc Antco; máy chủ kiểm khi lưu (dùng `?dryRun=1` để kiểm trước).

## Cấu trúc

```json
{
  "logic": "CUSTOM",
  "expression": "1 AND (2 OR 3)",
  "conditions": [
    { "id": "c1", "field": "trang_thai", "operator": "in", "value": ["moi", "da_hen"] },
    { "id": "c2", "field": "ky_thuat_vien", "operator": "equals", "value": "$currentUser" },
    { "id": "c3", "field": "ngay_khao_sat", "operator": "past_n_days", "value": 7 }
  ]
}
```

- `logic`: `AND` | `OR` | `CUSTOM` (bắt buộc `expression`, dùng **số thứ tự** điều kiện trong mảng (1, 2, 3...), `AND`, `OR`, `NOT`, ngoặc) | `NONE` (không lọc).
- Tối đa **30 điều kiện**.
- **Ô trống luôn không thoả** điều kiện (kể cả `not_equals`, `not_in`). Muốn gồm ô trống: thêm điều kiện `empty` và dùng `OR`.

## Toán tử theo loại trường

| Loại trường | Toán tử (`operator`) |
|---|---|
| Văn bản (`text`, `textarea`, `email`, `phone`, `url`, `regex`) | `equals`, `not_equals`, `contains`, `not_contains`, `starts_with`, `ends_with`, `empty`, `not_empty` |
| Số (`number`, `money`, `percent`, `rating`, `formula` số, `rollup`) | `equals`, `not_equals`, `lt`, `lte`, `gt`, `gte`, `between` (`value` + `secondValue`), `empty`, `not_empty` |
| Ngày (`date`, `datetime`) | như Số + `yesterday`, `today`, `tomorrow`, `past_n_days`, `next_n_days`, `n_days_ago`, `n_days_later`, `last_week`, `this_week`, `next_week`, `past_n_weeks`, `next_n_weeks`, `last_month`, `this_month`, `next_month`, `past_n_months`, `next_n_months`, `last_quarter`, `this_quarter`, `next_quarter`, `last_year`, `this_year`, `next_year`, `past_n_years`, `next_n_years` (giờ Việt Nam GMT+7) |
| Lựa chọn, tra cứu (`select`, `multiselect`, `lookup`, `dependent_lookup`, `label`) | `equals`, `not_equals`, `in`, `not_in` (`value` là mảng), `empty`, `not_empty` |
| Boolean | `equals`, `not_equals` (`value` `true`/`false`) |

- Toán tử `*_n_*`: `value` là số n >= 0.
- `empty`, `not_empty`, toán tử ngày không có n: không gửi `value`.
- Giá trị lựa chọn = `value` của lựa chọn; giá trị tra cứu = id bản ghi thật (đọc từ API, **không gõ tay tên**).

## Biến

| Biến | Nghĩa |
|---|---|
| `$currentUser` | Người đang xem |
| `$currentUser.department` | Phòng ban của người đang xem |
| `$currentUser.position` | Vị trí công việc của người đang xem |
| `$currentUser.<trường>` | Một số trường khác của người dùng theo danh sách trắng (VD `employee_code`, `work_email`) |
| `$today` | Hôm nay |

Biến lạ bị máy chủ từ chối khi lưu.
