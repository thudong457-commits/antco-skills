# Lỗi Antco Public API v1 và cách xử lý

Luôn đọc cả HTTP status, `success` và `error.code`. `error.message` là tiếng Việt, nói rõ trường nào sai - đưa nguyên văn cho người dùng khi cần.

| HTTP | `error.code` | Ý nghĩa | Agent làm gì |
|---|---|---|---|
| 400 | `VALIDATION_ERROR`, `INVALID_BODY` | Dữ liệu sai | Đọc `message` / `details`, sửa payload, `--server-dry-run` lại. Không gửi lại nguyên văn |
| 400 | `INVALID_RUN_ID` | `X-Antco-Run-Id` sai định dạng | 3-80 ký tự `A-Z a-z 0-9 _ . : -` |
| 400 | `NOT_SUPPORTED` | Chưa hỗ trợ (VD đọc chung một đối tượng có sẵn, ghi bản ghi đối tượng có sẵn) | Ghi `CHUA_HO_TRO`, đề xuất làm tay |
| 400 | `READ_ONLY_OBJECT` | Đối tượng / mục chỉ đọc (VD giao diện tiêu chuẩn) | Tạo bản mới (VD `copyFrom`) thay vì sửa |
| 401 | `UNAUTHORIZED`, `INVALID_TOKEN`, `TOKEN_INACTIVE`, `TOKEN_EXPIRED` | Thiếu / sai / vô hiệu / hết hạn (sau 23:59 giờ VN ngày hết hạn) | Dừng mọi việc ghi; người dùng tạo hoặc bật token |
| 403 | `FORBIDDEN` | Người chạy thiếu quyền hoặc ngoài phạm vi dữ liệu | Nêu đúng việc bị chặn; người dùng cấp quyền cho người chạy, agent **không** lách |
| 403 | `FORBIDDEN_ENDPOINT` | Nhóm API bị cấm cho token | Không thử lại; việc đó người dùng tự làm |
| 403 | `RUN_AS_USER_INACTIVE`, `TWO_FACTOR_SETUP_REQUIRED` | Người chạy bị khoá / nghỉ / không nội bộ; quản trị chưa bật 2FA | Người dùng đổi người chạy hoặc bật 2FA |
| 404 | `NOT_FOUND` | Không có **hoặc** người chạy không được thấy | Không kết luận "không tồn tại"; kiểm lại ref/id và quyền |
| 409 | `CONFLICT` | Trùng slug, quy tắc trùng lặp, Composite ID | `details.duplicate` (mức cảnh báo): chỉ gửi lại kèm `confirmDuplicate: true` khi người dùng đồng ý; dữ liệu demo -> đổi giá trị cho khỏi trùng |
| 429 | `RATE_LIMITED` | Quá 120 lần / 60 giây | Chờ `Retry-After` giây; giảm nhịp |
| 500 | `INTERNAL_ERROR` | Lỗi máy chủ | GET: thử lại 1 lần. Ghi: đọc lại để biết đã ghi chưa |
| 503 | `SERVICE_UNAVAILABLE` | Tạm không kiểm được token | Thử lại sau vài giây |

## Exit code của `antco_client.mjs`

| Exit | Nghĩa |
|---|---|
| 0 | Thành công, hoặc dry-run phía client đã in request |
| 2 | Sai cách dùng |
| 3 | Thiếu / sai cấu hình (`ANTCO_BASE_URL`, `ANTCO_API_KEY`) |
| 4 | API trả lỗi (HTTP không 2xx hoặc `success: false`) |
| 5 | Lỗi mạng / timeout / bị chuyển hướng |

## Khi lỗi giữa chừng kế hoạch

1. Đánh dấu W-ID `FAILED` trong checkpoint, ghi `error.code`, `message`, việc đã / chưa ghi.
2. Dừng các W-ID phụ thuộc; nhánh độc lập có thể tiếp tục.
3. Không xoá thứ đã tạo để "quay lui" (Public API v1 gần như không có xoá cấu hình). Đề xuất: sửa tiếp, đặt `isActive: false`, hoặc người dùng xoá tay trong Antco.
