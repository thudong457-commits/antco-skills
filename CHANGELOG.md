# Nhật ký thay đổi

Theo [Semantic Versioning](https://semver.org/). Ngày theo giờ Việt Nam (UTC+7).

## [1.2.0] - 2026-10-13

Theo Antco 20.479: **Khoá kết nối** 1 chuỗi (giống Cogover) - khách chỉ dán 1 khoá vào AI agent.

### Thêm

- `antco_client.mjs`: `ANTCO_API_KEY` nhận Khoá kết nối `antco_ck_...` (gộp địa chỉ công ty + token) -> tự lấy địa chỉ, không cần `ANTCO_BASE_URL`;
  có cả `ANTCO_BASE_URL` mà khác địa chỉ trong khoá -> lỗi cấu hình (mã 3). Gửi phần `antco_pat_` nên chạy được cả với máy chủ Antco cũ. Che `antco_ck_` trong mọi đầu ra.
- `secret_scan.mjs`: mẫu `ANTCO_CONNECTION_KEY`; `validate_artifacts.mjs`: manifest có `antco_ck_` -> lỗi.

### Đổi

- `antco-api-auth`: credential còn 1 khoá; agent dạng chat (claude.ai, ChatGPT...) được xin người dùng dán Khoá kết nối đúng 1 lần, ghi vào `.env` cục bộ của phiên
  rồi gọi qua `--env` (không lặp lại, không đưa vào lệnh shell); thêm lỗi máy chủ `401 WRONG_WORKSPACE`. README, `build-antco-app`, tài liệu hợp đồng theo cách mới.

## [1.1.0] - 2026-10-13

Theo hợp đồng **Antco Public API v1** mở rộng lên 139 endpoint.

### Thêm

- 7 skill: `antco-schema-workbook` (workbook Excel thiết kế dữ liệu; script `schema_workbook.mjs` + `xlsx_lite.mjs` đọc / ghi .xlsx không thư viện: template, export, import, validate, plan, apply có dryRun từng bước và chạy tiếp từ `plan.state.json`),
  `antco-history-tracking`, `antco-app-menus`, `antco-processes` (kèm `references/nodes.md`), `antco-ai-agents`, `antco-document-templates` (mọi đối tượng), `antco-access`.
- Hợp đồng rút gọn `public-api-v1.md`: nhóm endpoint lịch sử thay đổi, menu ứng dụng, AI Agent, mẫu văn bản, quy trình, tổ chức + phân quyền; danh sách cấm mới (mở vai trò / cấp quyền có chốt chống leo thang; tài khoản người dùng chỉ đọc).

### Đổi

- `antco-overview`, `build-antco-app`, `antco-objects`, `antco-fields`, `antco-rules`: trỏ sang skill mới thay cho ghi chú "chưa hỗ trợ".

### Sửa (sau khi thử thật bằng token)

- `schema_workbook.mjs`: JSON viết tay dạng phẳng (`namePrefix` / `nameDigits`, `lookup` / `formula`... ở cấp trường) được chuyển sang dạng chuẩn - trước đây báo lỗi số chữ số và mất tiền tố khi xuất Excel.
- `antco-processes`: kiểm người duyệt qua `tasks[].assigneeName` (không có `performers`); "Hàng chờ chung" = không tìm ra người duyệt.
- `antco-access`: mã quyền không có trong danh mục bị bỏ qua không báo lỗi - đối chiếu `added`.
- `antco-schema-workbook`: ghi chú `MSYS_NO_PATHCONV=1` cho Git Bash.

## [1.0.0] - 2026-10-02

Phát hành đầu tiên, dựng theo hợp đồng **Antco Public API v1 `1.0.0`** (65 endpoint).

### Thêm

- 13 skill: `build-antco-app` (điều phối, 2 cổng duyệt), `antco-api-auth`, `antco-overview`, `antco-objects`, `antco-fields`, `antco-records` (kèm dữ liệu demo), `antco-layouts`, `antco-rules`, `antco-actions`, `antco-forms`, `antco-filters`, `antco-related-lists`, `antco-reports`.
- Hợp đồng API rút gọn cho agent: `skills/antco-api-auth/references/public-api-v1.md` (nguồn chuẩn khi chạy: `GET {ANTCO_BASE_URL}/api/public/v1/openapi.json`).
- Mẫu artifact: yêu cầu + câu hỏi, thiết kế, kế hoạch, bàn giao; form câu hỏi HTML offline (CSP chặn mạng, hiển thị bằng `textContent`, lưu JSON); JSON schema câu trả lời và manifest bàn giao.
- Script Node.js >= 18 không phụ thuộc: `antco_client.mjs`, `validate_artifacts.mjs`, `render_questions_form.mjs`, `secret_scan.mjs`, `install.mjs`, `check_bundle.mjs`; hook `.githooks/pre-commit`.
- Dự án mẫu `examples/pcs-khao-sat` (dữ liệu tổng hợp) qua đủ vòng: yêu cầu v1 -> câu trả lời -> v2 duyệt cổng 1 -> thiết kế -> kế hoạch duyệt cổng 2 -> bàn giao -> manifest.

### Ghi chú hợp đồng

Một số ví dụ trong tài liệu hợp đồng Public API v1 khác hành vi kiểm hợp lệ của máy chủ; bundle dùng dạng đúng và đề nghị Antco sửa ví dụ:

- Giao diện: `screens` nhận `all | create | edit` (ví dụ ghi `both`); `assign` là mảng `[{ type, ids, screens }]`, `[]` = mọi người (ví dụ ghi `{ "mode": "all" }`); `config` cần `"v": 2` và `rows` là Layout Row (ví dụ đặt Section thẳng trong `rows`, thiếu `v` -> máy chủ dựng khung trống).
- Hành động chuỗi: `title` nằm ở cấp ngoài cùng của body (mô tả ghi trong `config`).
