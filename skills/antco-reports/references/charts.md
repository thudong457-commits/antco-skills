# Bảng điều khiển và biểu đồ

## Bố cục (`layout`)

```json
{ "cols": 12, "palette": 1, "filter": { "date": { "enabled": true, "preset": "this_month" }, "owner": { "enabled": false, "ids": [] } }, "widgets": [ ] }
```

- `cols`: 12 hoặc 9. Thẻ: `{ id, type: "chart" | "text" | "image", x, y, w, h, title? }`; không chồng nhau, `x + w <= cols`.
- `text`: chữ thuần (`text`). `image`: cần ảnh đã tải lên Antco - Public API v1 không có tải ảnh -> bỏ qua.
- `filter.date.preset`: `all`, `today`, `this_week`, `last_week`, `this_month`, `last_month`, `this_quarter`, `last_quarter`, `this_year`, `last_year`, `custom` (+ `from`, `to`).

## Thẻ biểu đồ (`type: "chart"`, khoá `chart`)

| `chart.chart` | Dùng cho | Báo cáo cần |
|---|---|---|
| `bar` | So sánh nhóm (cột đứng) | 1 nhóm |
| `hbar` | Nhóm tên dài (cột ngang) | 1 nhóm |
| `stacked` | Cơ cấu trong nhóm | 2 nhóm |
| `grouped` | So sánh nhóm con cạnh nhau | 2 nhóm |
| `table` | Bảng số liệu | bất kỳ |
| `pie` | Tỷ trọng (tròn / vành khuyên) | 1 nhóm |
| `line` | Xu hướng theo thời gian | nhóm theo ngày |
| `combo` | Cột + đường | 1 nhóm, `measure2` |
| `kpi` | Một con số | chỉ số |
| `funnel` | Phễu theo thứ tự nhóm | nhóm Lựa chọn có thứ tự |
| `gauge` | Đồng hồ đo | chỉ số + `gauge { min, max, target }` |

Khoá chính của `chart` (cấu hình thẻ):

```json
{ "chart": "line", "reportId": "<id báo cáo>", "measure": "<khoá cột chỉ số của kết quả báo cáo>", "group": "<trường nhóm, VD main.createdAt>", "group2": null,
  "maxGroups": 12, "showValues": true, "valueFormat": "short", "decimals": 0, "showPercent": false, "showTotal": false, "groupSmall": false,
  "axisTitles": "auto", "title": "Phương án theo tháng", "footer": null, "legend": "bottom", "customPalette": false, "colors": [],
  "filter": { "logic": "AND", "expression": null, "conditions": [] }, "dateField": null }
```

- `measure` = khoá cột chỉ số trong kết quả `POST /reports/run` (`data.columns[].key`) - chạy báo cáo trước để lấy đúng khoá, không đoán.
- `groupSmall` (gom nhóm nhỏ vào "Khác") chỉ cho chỉ số cộng dồn (Tổng / Số lượng).
- Dựng thẻ đầu tiên bằng dryRun, đọc `data` trả về để biết máy chủ giữ / bỏ khoá nào.

## Ví dụ tạo

```json
POST /api/public/v1/dashboards?dryRun=1
{ "name": "Điều hành khảo sát", "description": null, "slug": "dieu_hanh_khao_sat",
  "layout": { "cols": 12, "palette": 1, "filter": { "date": { "enabled": true, "preset": "this_year" }, "owner": { "enabled": false, "ids": [] } },
    "widgets": [
      { "id": "w_kpi", "type": "chart", "x": 0, "y": 0, "w": 3, "h": 3, "title": "Phiếu năm nay", "chart": { "chart": "kpi", "reportId": "<id>", "measure": "<khoá>" } },
      { "id": "w_line", "type": "chart", "x": 3, "y": 0, "w": 9, "h": 5, "title": "Phương án theo tháng", "chart": { "chart": "line", "reportId": "<id>", "measure": "<khoá>", "group": "main.createdAt" } },
      { "id": "w_note", "type": "text", "x": 0, "y": 5, "w": 12, "h": 1, "text": "Số liệu theo quyền người xem." }
    ] },
  "shares": [] }
```

## Kiểm sau khi tạo

1. `POST /dashboards/{id}/data` `{ "filter": null }` -> mọi thẻ trong `data.widgets` có `ok: true`; thẻ "không có quyền" là do quyền người chạy, ghi chú cho người dùng.
2. Số thẻ KPI = tổng báo cáo tương ứng khi `POST /reports/run`.
3. Báo người dùng: người xem dashboard cần được chia sẻ **cả báo cáo** và có quyền xem đối tượng.
