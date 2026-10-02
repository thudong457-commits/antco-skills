# Cây giao diện Antco v2 (`config`)

```
config { v: 2, page, rows[] }
  row      { id, slug, type: "row", ratios[], columns[], gap, maxWidth, maxUnit: "%"|"px", align: "left"|"center"|"right" }
    column { id, slug, type: "column", children[] }           children: section | tabs
      section { id, slug, type: "section", name, showName, showBorder, visible, children[] }
      tabs    { id, slug, type: "tabs", underline, tabs[ { id, slug, name, visible, children[] } ] }
        (children của section / tab) group | related | display | widget | comp
        group  { id, slug, type: "group", name, showName, cols: 1|2|3, collapsible, items[] }
          (items) field | related | display | widget | comp
```

`page`: `{ title?, maxWidth?, maxUnit?, padding: [t,r,b,l], bg: null | "#hex", showBorder }`.

## Thuộc tính chung của khối chứa

| Khoá | Ghi chú |
|---|---|
| `id`, `slug` | `^[a-z0-9_-]{1,60}$`, duy nhất; sai -> máy chủ sinh lại (quy tắc giao diện trỏ id cũ sẽ hỏng) |
| `name` (<= 100), `showName` | |
| `showBorder` | Section / Tab-Section mặc định `true` |
| `visible` | `false` = ẩn mặc định, chỉ hiện khi quy tắc giao diện "Hiện" |
| `padding` | `[t,r,b,l]`, 0..200 |

## Lá

| `type` | Khoá | Ghi chú |
|---|---|---|
| `field` | `key` (slug trường tự thêm / key trường có sẵn), `label?`, `showLabel`, `readonly?`, `required?`, `labelPos` (`top`/`left`), `wide?`, `visible?` | `required` / `readonly` ở đây là ràng buộc **giao diện**; ràng buộc dữ liệu thật đặt ở trường |
| `related` | `ref` (đối tượng nguồn), `link` (slug trường tra cứu ở nguồn), `label?`, `showLabel`, `allowAdd`, `readonly`, `hideEmpty`, `quickSearch`, `height`, `pageSize`, `filter?`, `sortField`, `sortDir`, `columns?` | lấy từ `GET /objects/{ref}/related-lists` (khoá dạng `<ref nguồn>.<link>`) |
| `display` | `name`, `text` (văn bản thuần <= 5000) | |
| `widget` | `key` | khối đặc thù của trang có sẵn - chỉ dùng khoá có trong giao diện tiêu chuẩn / `data.target` |
| `comp` | `kind`, `slug`, `name`, `showName`, `visible` + thuộc tính riêng | bảng dưới |

## Thành phần (`comp.kind`)

| `kind` | Thuộc tính riêng | Tối đa / giao diện |
|---|---|---|
| `buttons` | `actions[]` (id hành động màn bản ghi), `align`, `groupActions` | nhiều |
| `tasks` | - (công việc gắn bản ghi) | 1 |
| `smartPaste` | - (cần bật Copy/dán AI của đối tượng) | 1 |
| `iframe` | `url` (https, có thể `{{slug}}` ở path/query, không trường nhạy cảm), `height` 100-2000, `allowFullscreen` | nhiều |
| `recaptcha` | - (chỉ tác dụng ở biểu mẫu công khai) | 1 |
| `sla` | `sla { start: "createdAt" \| slug trường ngày, duration, unit: "m"\|"h"\|"d", warnPct, stop { type: "none"\|"select"\|"date", field?, values? } }` | nhiều |
| `report` | `reportId`, `display` (`table`/`chart`), `chart?`, `linkField?`, `height` | nhiều |
| `dashboard` | `dashboardId`, `height` | nhiều |

Tổng thành phần <= 30.

## Giới hạn máy chủ

<= 20 Row; <= 6 cột / Row; <= 30 con / khối; <= 20 tab; <= 150 lá; mỗi trường / danh sách liên quan / widget 1 lần; màu nền chỉ hex; văn bản <= 5000; <= 30 giao diện / đối tượng. Khối / khoá lạ bị bỏ.

## Thứ tự áp dụng khi mở trang

`?layoutId=` trên URL > lựa chọn riêng của người dùng (menu ⋮ Giao diện) > giao diện tuỳ chỉnh đầu tiên khớp gán + màn (theo thứ tự ở Danh sách giao diện) > Giao diện tiêu chuẩn.
