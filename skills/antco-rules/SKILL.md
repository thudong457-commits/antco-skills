---
name: antco-rules
description: "Cấu hình quy tắc khai báo của đối tượng Antco qua Public API: quy tắc giao diện (ẩn/hiện/bắt buộc/chỉ đọc/đặt giá trị theo điều kiện), quy tắc trùng lặp dữ liệu (chặn/cảnh báo), quy tắc bảo mật dữ liệu (chia sẻ bản ghi theo điều kiện cho nhân sự), quy tắc chuyển trạng thái (đường chuyển + trường bắt buộc khi chuyển) và lộ trình (path). Dùng khi nghiệp vụ cần ràng buộc hành vi dữ liệu trên Antco mà không viết code."
license: MIT
metadata:
  author: Antco
  version: "1.0.0"
---

# Antco Rules (quy tắc + lộ trình)

- **Phiên bản:** `1.0.0` - **Ngày phát hành:** `2026-10-02`
- Xác thực: [../antco-api-auth/SKILL.md](../antco-api-auth/SKILL.md). Payload từng loại: [references/rule-payloads.md](references/rule-payloads.md). Điều kiện dùng chung: [../antco-filters/references/operators.md](../antco-filters/references/operators.md).

## Chọn loại quy tắc

| Nhu cầu nghiệp vụ | Loại | Ràng buộc ở đâu |
|---|---|---|
| "Khi Mức độ = Cao thì bắt buộc Phương án khẩn, hiện khối Khẩn cấp" | Quy tắc giao diện | Trình duyệt (form) |
| "Không cho tạo 2 phiếu cùng khách + ngày" / "cảnh báo trùng tên" | Quy tắc trùng lặp | Máy chủ |
| "Phòng kỹ thuật xem phiếu đã xong của mọi người" | Quy tắc bảo mật dữ liệu | Máy chủ (chỉ đối tượng tự tạo) |
| "Nháp -> Chờ duyệt -> Đã duyệt; Từ chối phải có lý do" | Quy tắc chuyển trạng thái | Máy chủ |
| Thanh bước đầu bản ghi + chỉ dẫn từng bước | Lộ trình | Trang bản ghi |

Ràng buộc dữ liệu luôn đúng (kể cả nhập qua API, nhập Excel) đặt ở **trường** (`required`, `unique`) hoặc quy tắc máy chủ; quy tắc giao diện chỉ là trải nghiệm nhập.

Không có qua API (-> `CHUA_HO_TRO`): xoá quy tắc (chỉ `isActive: false`), theo dõi lịch sử trường, Composite ID.

## Quyền

Đọc `settings:custom_fields:read`; tạo / sửa `settings:custom_fields:write`.

## Endpoint (tiền tố `/api/public/v1/objects/{ref}`)

| Loại | Đọc / tạo | Sửa (thay toàn bộ) |
|---|---|---|
| Quy tắc giao diện | `GET` / `POST /layout-rules` | `PUT /layout-rules/{id}` |
| Quy tắc trùng lặp | `GET` / `POST /duplicate-rules` | `PUT /duplicate-rules/{id}` |
| Quy tắc bảo mật | `GET` / `POST /security-rules` | `PUT /security-rules/{id}` |
| Chuyển trạng thái | `GET` / `POST /status-rules` | `PUT /status-rules/{id}` |
| Lộ trình | `GET /path` | `PUT /path` |

Danh sách có phân trang (`?page`, `?limit`). Mọi lệnh ghi nhận `?dryRun=1`.

## Quy trình chung

1. `GET` loại tương ứng + `GET /objects/{ref}/fields` - tránh trùng / mâu thuẫn quy tắc đang bật; lấy slug và `value` lựa chọn thật.
2. Dựng payload theo [references/rule-payloads.md](references/rule-payloads.md) -> `--server-dry-run`.
3. Ghi thật (đã duyệt) -> đọc lại -> **kiểm bằng dữ liệu demo**: một ca phải bị chặn, một ca phải qua (dùng `?dryRun=1` trên `PUT /records/...` để thử không ghi).
4. Sửa: `GET` -> sửa -> `PUT` đủ cấu hình.

## Cổng hẹp và cảnh báo bắt buộc

- **Quy tắc bảo mật:** bật quy tắc **đầu tiên** của đối tượng làm **giới hạn** bản ghi người khác thấy (chỉ còn bản ghi của mình + phần được quy tắc chia sẻ; Toàn quyền bỏ qua). Trước khi bật: mô tả ai mất quyền xem gì, chờ người dùng đồng ý riêng. Tạo với `isActive: false`, bật bằng `PUT` sau khi đồng ý. Không tạo quy tắc mở rộng quyền vượt thiết kế đã duyệt.
- **Trùng lặp kiểu `block`** và **chuyển trạng thái** trên đối tượng đang có dữ liệu thật -> chặn thao tác người dùng; nêu rõ trong kế hoạch.
- Tắt quy tắc có sẵn của công ty: chỉ khi người dùng yêu cầu rõ.

## Giới hạn

| Loại | Giới hạn |
|---|---|
| Quy tắc giao diện | <= 50 / đối tượng; `priority` 1-1000 (số nhỏ thắng); hành động lên khối (`target: "section"`) chỉ khi `layoutIds` có đúng 1 giao diện |
| Quy tắc trùng lặp | <= 50 / đối tượng; <= 10 điều kiện; áp cho đối tượng tự tạo, Kho / Kế toán và trang CRM đã gắn |
| Chuyển trạng thái | <= 5 quy tắc đang bật / đối tượng; 1 quy tắc đang bật / trường; trường Lựa chọn đơn **tự thêm** |
| Lộ trình | >= 2 bước; `keyFields` <= 5 / bước |
| Điều kiện lọc (mọi loại) | <= 30 điều kiện |

## Bẫy

- Điều kiện dùng nhãn thay vì `value` của lựa chọn -> không bao giờ khớp.
- Ô trống luôn **không thoả** điều kiện (kể cả "Không bằng") - thêm điều kiện `empty` nếu cần.
- "Hiện" trong quy tắc giao diện chỉ tác dụng với trường / khối đặt `visible: false` trên giao diện.
- "Đặt giá trị" chạy khi quy tắc **vừa** thoả; màn Sửa không gán lại cho quy tắc đang thoả sẵn.
- Đồ thị trạng thái nối tất cả với tất cả = không ràng buộc. Vẽ đồ thị nhỏ nhất; trạng thái kết thúc không có đường ra (trừ "Mở lại" nếu nghiệp vụ cần). `from: ""` = trạng thái được phép khi tạo mới.

## Báo kết quả

Bảng: loại | tên | id | đang bật | điều kiện tóm tắt | kết quả kiểm bằng demo. Đường dẫn: `/settings/objects/<ref>`.
