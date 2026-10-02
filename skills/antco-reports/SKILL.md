---
name: antco-reports
description: "Xây báo cáo Antco qua Public API: loại báo cáo (tập dữ liệu: đối tượng chính + tối đa 7 quan hệ qua tra cứu + section trường), báo cáo nhóm theo hàng/cột (ngày theo ngày/tháng/quý/năm) với số lượng/tổng/trung bình/min/max, công thức, bộ lọc, chia sẻ; chạy báo cáo để đối soát số liệu; bảng điều khiển với 11 loại biểu đồ (cột, ngang, chồng, nhóm, bảng, tròn, đường, kết hợp, KPI, phễu, đồng hồ). Dùng khi người dùng cần thống kê, KPI, biểu đồ quản lý trên dữ liệu Antco."
license: MIT
metadata:
  author: Antco
  version: "1.0.0"
---

# Antco Reports & Dashboards

- **Phiên bản:** `1.0.0` - **Ngày phát hành:** `2026-10-02`
- Xác thực: [../antco-api-auth/SKILL.md](../antco-api-auth/SKILL.md). Biểu đồ + dashboard: [references/charts.md](references/charts.md). Điều kiện: [../antco-filters/references/operators.md](../antco-filters/references/operators.md).

## Mô hình

```
Loại báo cáo (tập dữ liệu)  ->  Báo cáo (nhóm + chỉ số + lọc)  ->  Bảng điều khiển (thẻ biểu đồ từ báo cáo)
```

- **Loại báo cáo:** đối tượng chính (`mainObjectRef`, phải bật "Cho phép báo cáo"; không đổi sau khi tạo) + tối đa 7 quan hệ qua **tra cứu một giá trị** + section trường. Trường trong tập dữ liệu gọi là `<alias>.<khoá>` (`main.trang_thai`, `r1.industry`). Trường nhạy cảm và một số đối tượng phạm vi đặc biệt (Nhân sự, Quyết định, Đơn từ) bị từ chối.
- **Báo cáo:** `rowGroups` / `colGroups` (`{ field, dateGroup?: day | month | quarter | year }`), `columns` (`{ field, agg: count | sum | avg | min | max | none, label }`), `formulas`, `filter`, `scopeMode` (`all` | `mine` | `created`), `linkedFilters`, `limit`, chia sẻ.
- **Chạy luôn theo quyền + phạm vi của người xem.** Kết quả agent thấy = theo người chạy API.

## Quyền

| Việc | Quyền |
|---|---|
| Loại báo cáo | `settings:report_types:read / write` |
| Báo cáo | `settings:reports:read / write` |
| Chạy | `settings:reports:read` (+ `:write` khi chạy config chưa lưu) |
| Bảng điều khiển | `settings:dashboards:read / write` |

## Endpoint

| Method | Đường dẫn |
|---|---|
| GET / POST | `/api/public/v1/report-types` (POST `?dryRun=1`) |
| GET / PUT | `/api/public/v1/report-types/{id}` (id hoặc slug; PUT chỉ khoá gửi lên) |
| PUT | `/api/public/v1/report-types/{id}/relations` · `/report-types/{id}/sections` (**thay toàn bộ**) |
| GET / POST | `/api/public/v1/reports` |
| GET / PUT | `/api/public/v1/reports/{id}` (PUT chỉ phần gửi lên) |
| POST | `/api/public/v1/reports/run` |
| GET / POST | `/api/public/v1/dashboards` |
| GET / PUT | `/api/public/v1/dashboards/{id}` |
| POST | `/api/public/v1/dashboards/{id}/data` |

Không có qua API: xoá loại báo cáo / báo cáo / dashboard, thư mục báo cáo, tải ảnh cho dashboard.

## Quy trình

1. **Hợp đồng báo cáo** (đưa vào thiết kế): câu hỏi quản lý, tập bản ghi, hạt (một dòng = gì), nhóm, chỉ số, bộ lọc, ai xem.
2. Tái dùng loại báo cáo cùng đối tượng chính nếu có (`GET /report-types`). Đối tượng tự tạo mới: bật `allowReports: true` (`PUT /objects/{ref}`) nếu đang tắt.
3. Tạo loại báo cáo + quan hệ:

```json
POST /api/public/v1/report-types?dryRun=1
{ "name": "Phương án kỹ thuật", "description": null, "category": null, "slug": "rt_phuong_an", "status": "deployed", "mainObjectRef": "cobj:phuong_an_ky_thuat" }

PUT /api/public/v1/report-types/rt_phuong_an/relations?dryRun=1
{ "relations": [ { "alias": "r1", "from": "main", "field": "phieu_khao_sat", "objectRef": "cobj:phieu_khao_sat", "join": "left" } ] }
```

Sections: đọc `GET /report-types/{id}` trước; chỉ `PUT .../sections` khi cần thêm / bớt trường (gửi đủ: `{ "sections": [{ "id", "name", "fields": [{ "alias", "key" }] }] }`).

4. Tạo báo cáo (loại báo cáo phải `deployed`):

```json
POST /api/public/v1/reports?dryRun=1
{
  "name": "Giá trị phương án theo tháng và trạng thái", "description": null, "slug": "bc_gia_tri_phuong_an", "folderId": null,
  "reportTypeId": "<id loại báo cáo>",
  "config": {
    "rowGroups": [ { "field": "main.createdAt", "dateGroup": "month" } ],
    "colGroups": [ { "field": "main.trang_thai" } ],
    "columns": [ { "field": "main.id", "agg": "count", "label": "Số phương án" }, { "field": "main.gia_tri", "agg": "sum", "label": "Tổng giá trị" } ],
    "formulas": [], "filter": { "logic": "AND", "expression": null, "conditions": [] },
    "scopeMode": "all", "linkedFilters": [], "limit": null
  },
  "shares": [ ]
}
```

Khoá trường chính xác (VD `main.createdAt`) lấy từ `GET /report-types/{id}` (`fields[]`).

5. **Chạy và đối soát:** `POST /reports/run` `{ "reportId": "<id>", "page": 1, "pageSize": 50 }` -> so tổng nhóm với số tính tay trên dữ liệu demo. Lệch thì sửa báo cáo, không "chỉnh" dữ liệu. Có thể chạy thử config chưa lưu: `{ "reportTypeId": "<id>", "config": { ... } }`.
6. Bảng điều khiển: [references/charts.md](references/charts.md); báo cáo dùng cho biểu đồ phải **có nhóm**.
7. Đọc lại; báo link `/settings/reports/<slug>`, `/settings/dashboards/<slug>`.

## Bẫy

- Quan hệ qua tra cứu **nhiều giá trị** không được; tối đa 7 quan hệ.
- Đối tượng liên quan người xem không có quyền -> cột ra trống (không phải lỗi).
- Quá 5.000 nhóm -> lỗi; thêm bộ lọc hoặc nhóm thô hơn.
- Chia sẻ báo cáo không cấp quyền xem đối tượng; người xem vẫn cần quyền đối tượng.
- `shares[]` cùng cấu trúc bộ lọc (`targetType`, `targetId`, `permission`, `mode`).
