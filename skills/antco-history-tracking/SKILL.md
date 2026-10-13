---
name: antco-history-tracking
description: "Cấu hình và đọc lịch sử thay đổi trường của đối tượng Antco qua Public API: xem trường đang theo dõi + trường theo dõi được, chọn tối đa 20 trường ghi lịch sử (thay toàn bộ, rỗng = tắt), đọc lịch sử một bản ghi (ai đổi, lúc nào, giá trị cũ -> mới; trường nhạy cảm bị che). Dùng khi nghiệp vụ cần truy vết thay đổi trạng thái, người phụ trách, số tiền... hoặc kiểm tra một bản ghi đã bị sửa gì."
license: MIT
metadata:
  author: Antco
  version: "1.2.0"
---

# Antco History Tracking (lịch sử thay đổi)

- **Phiên bản:** `1.2.0` - **Ngày phát hành:** `2026-10-13`
- Xác thực: [../antco-api-auth/SKILL.md](../antco-api-auth/SKILL.md).

## Quyền

| Việc | Quyền |
|---|---|
| Xem / chọn trường theo dõi | `settings:custom_fields:read` / `settings:custom_fields:write` |
| Đọc lịch sử 1 bản ghi | quyền xem đối tượng (`cobj:<slug>:read` hoặc quyền xem của phân hệ) + bản ghi trong phạm vi dữ liệu của người chạy |

## Endpoint

| Method | Đường dẫn | Ghi chú |
|---|---|---|
| GET | `/api/public/v1/objects/{ref}/tracking` | `{ keys[], trackable[{ key, label, type, custom }], max: 20 }` |
| PUT | `/api/public/v1/objects/{ref}/tracking?dryRun=1` | body `{ keys: [...] }` - **thay toàn bộ**; `[]` = tắt |
| GET | `/api/public/v1/records/{ref}/{id}/history` | `{ tracked, items[{ fieldKey, fieldLabel, oldText, newText, changedAt, changedByName }] }`, mới nhất trước, tối đa 300 |

## Quy trình

1. `GET .../tracking` - chỉ chọn trong `trackable` (trường có sẵn không nhạy cảm + trường tự thêm, trừ trường tính toán; trang viết tay chưa gắn theo dõi chỉ có trường tự thêm).
2. Chọn trường có ý nghĩa truy vết: trạng thái / giai đoạn, người phụ trách, ngày hẹn, số tiền, mức độ. Không theo dõi trường tự sinh hoặc thay đổi liên tục.
3. Gộp với `keys` đang có (PUT thay toàn bộ - gửi thiếu = bỏ theo dõi trường cũ) -> `--server-dry-run` -> `--apply --run-id`.
4. Kiểm: sửa một bản ghi demo (`PUT /records/{ref}/{id}`) rồi `GET /records/{ref}/{id}/history` -> phải có dòng đổi đúng trường.

```json
PUT /api/public/v1/objects/cobj%3Aphieu_khao_sat/tracking?dryRun=1
{ "keys": ["trang_thai", "nguoi_phu_trach", "ngay_hen"] }
```

## Bẫy

- Lịch sử chỉ ghi **từ lúc bật** - không có lịch sử lùi.
- Tối đa 20 trường / đối tượng; trường không theo dõi được -> `400 VALIDATION_ERROR` liệt kê mã sai.
- Trường bị đánh dấu nhạy cảm sau khi đã có lịch sử -> giá trị cũ hiện `******`.
- Bản ghi ngoài phạm vi người chạy -> `403` / `404` (đúng như trên giao diện).

## Báo kết quả

Đối tượng | trường theo dõi (trước -> sau) | kết quả kiểm bằng bản ghi demo. Giao diện: nút **Lịch sử** ở đầu trang bản ghi; cấu hình ở `/settings/objects/<ref>`.
