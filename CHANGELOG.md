# Nhật ký thay đổi

Theo [Semantic Versioning](https://semver.org/). Ngày theo giờ Việt Nam (UTC+7).

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
