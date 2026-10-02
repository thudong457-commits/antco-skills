# Triển khai kế hoạch đã duyệt

## Chuẩn bị

1. `GET /whoami` lại: đúng công ty, người chạy có đủ quyền cho các W sẽ chạy (`permissions.allAccess` hoặc mã trong `permissions.codes`). Thiếu -> dừng trước khi ghi gì, báo quyền cần cấp cho người chạy.
2. Sinh `run_id`: `ar_<yyyymmdd>_<6 ký tự a-z0-9>`; ghi `<!-- antco-run-id:... -->` vào `ke-hoach-vN.md`.
3. Kiểm trôi cấu hình (drift): với mỗi đối tượng trong kế hoạch, `GET` lại; nếu khác bằng chứng ở pha khảo sát đến mức ảnh hưởng thiết kế (VD ai đó đã tạo trường cùng slug) -> dừng, báo, cập nhật thiết kế.
4. Snapshot đối tượng có sẵn (xem `gates-and-safety.md`).

## Vòng lặp mỗi W-ID

```
chọn W READY có mọi phụ thuộc DONE và khoá không bận
  -> checkpoint IN_PROGRESS
  -> dựng payload từ thiết kế + id thật đọc trong phiên
  -> node antco_client.mjs <METHOD> <path> --body payload.json --server-dry-run
  -> sửa đến khi sạch
  -> node antco_client.mjs <METHOD> <path> --body payload.json --apply --run-id <run_id>
  -> đọc lại (GET), so với payload
  -> checkpoint DONE (thời điểm, id tạo ra) | FAILED (error.code, message, đã ghi gì)
```

- Payload tạm để ở `artifacts/antco/<slug>/payloads/W-xxx.json` (không chứa token). Ghi id thật trả về vào checkpoint để W sau dùng.
- Public API không có Idempotency-Key: mọi lệnh ghi gắn `--run-id`, để sau timeout tra được bằng `GET /runs/{runId}/items`.
- Đối tượng tự tạo vừa tạo: quyền `cobj:<slug>:*` chỉ vai trò Toàn quyền có ngay. Người chạy không phải Toàn quyền -> W ghi bản ghi sẽ `403` cho tới khi người dùng cấp quyền (nạp lại tối đa 60 giây) - xếp W này sau một bước "người dùng cấp quyền" trong kế hoạch.
- Cập nhật `checkpoints` **ngay sau mỗi W**, trước khi làm W tiếp theo.

## Lỗi giữa chừng

| Tình huống | Làm gì |
|---|---|
| Lỗi 400 / 409 ở dry-run | Sửa payload; nếu do thiết kế sai -> ghi chú, có thể cần revision thiết kế |
| Lỗi khi ghi thật | `FAILED`, dừng các W phụ thuộc, tiếp tục nhánh độc lập nếu an toàn |
| Timeout khi ghi | `GET /runs/{runId}/items` hoặc đọc lại theo slug / tên; chưa có -> gửi lại; đã có -> coi như xong, đọc lại |
| 401 | Dừng toàn bộ; token hết hạn/bị thu hồi |
| 403 | Dừng W đó; báo quyền thiếu |
| Kết quả đọc lại khác payload | `FAILED` với ghi chú khác biệt; không tự "sửa đè" nhiều lần |

Không xoá thứ đã tạo để "quay lui". Đề xuất: sửa tiếp, tắt (`isActive: false` qua PUT), hoặc người dùng xoá tay trong Antco (Public API v1 không xoá cấu hình).

## Kết thúc pha

- Mọi W `DONE` / `SKIPPED` (có lý do) / `FAILED` (đã báo).
- Chạy `validate_artifacts.mjs --plan ke-hoach-vN.md --design ... --requirements ...` để bảo đảm checkpoint khớp trạng thái.
- Sang pha demo (nếu có) rồi kiểm tra + bàn giao.
