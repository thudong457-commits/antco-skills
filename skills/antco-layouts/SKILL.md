---
name: antco-layouts
description: "Tạo và sửa giao diện kéo-thả v2 của đối tượng Antco qua Public API: cây Layout Row > Column > Section/Tab-Section > Group > trường / danh sách liên quan / Display Box / thành phần (Button group, Công việc, Smart paste, Iframe, reCAPTCHA, SLA, Report, Dashboard), màn Tạo hay Xem-Sửa, Website/Mobile, gán theo nhân sự/phòng ban/vị trí/vai trò, nhân bản từ giao diện tiêu chuẩn. Dùng khi cần bố trí màn hình tạo hoặc chi tiết bản ghi trên Antco; ẩn/hiện theo điều kiện dùng antco-rules."
license: MIT
metadata:
  author: Antco
  version: "1.0.0"
---

# Antco Layouts (giao diện v2)

- **Phiên bản:** `1.0.0` - **Ngày phát hành:** `2026-10-02`
- Xác thực: [../antco-api-auth/SKILL.md](../antco-api-auth/SKILL.md). Cây + giới hạn: [references/layout-v2-tree.md](references/layout-v2-tree.md). Ví dụ đầy đủ: [references/example-create-layout.json](references/example-create-layout.json).

## Khi nào dùng

- Bố trí màn **Tạo** / **Xem-Sửa** cho đối tượng tự tạo, hoặc đối tượng có sẵn có hỗ trợ giao diện (thấy trong `GET /objects/{ref}/layouts`).
- Đặt danh sách liên quan, Button group, báo cáo, bộ đếm SLA... lên trang bản ghi.

Không có qua API (-> người dùng làm ở Danh sách giao diện): xoá giao diện (chỉ `isActive: false`), đổi thứ tự ưu tiên / "Đặt làm mặc định", script / CSS / API URL tuỳ ý (Antco không hỗ trợ).

## Quyền

`settings:custom_fields:read` (đọc), `settings:custom_fields:write` (tạo / sửa).

## Endpoint

| Method | Đường dẫn |
|---|---|
| GET | `/api/public/v1/objects/{ref}/layouts` (phân trang; gồm `standard` chỉ đọc) |
| GET | `/api/public/v1/objects/{ref}/layouts/{id}` -> `data.layout.config` (cây), `data.target` (khối dùng được) |
| POST | `/api/public/v1/objects/{ref}/layouts?dryRun=1` (`copyFrom` = id giao diện để nhân bản) |
| PUT | `/api/public/v1/objects/{ref}/layouts/{id}?dryRun=1` (**thay toàn bộ**: `name`, `screens`, `isActive`, `assign`, `config`, `platforms`, `allowSelect`) |

## Body

```json
{
  "name": "Phiếu khảo sát - Xem/Sửa",
  "screens": "edit",
  "platforms": { "web": true, "mobile": true },
  "allowSelect": true,
  "isActive": true,
  "assign": [],
  "config": { "v": 2, "page": { "padding": [0, 0, 0, 0] }, "rows": [ "<Layout Row...>" ] }
}
```

- `screens`: `all` | `create` | `edit`.
- `assign`: `[]` = mọi người; hoặc `[{ "type": "department" | "position" | "role" | "user", "ids": ["..."], "screens": ["edit"] }]`. Id phòng ban / vị trí / vai trò không có API tra cứu - hỏi người dùng hoặc để `[]`.
- `config` **bắt buộc có `"v": 2`** và `rows` là các **Layout Row** (row > column > section...). Thiếu `v: 2` máy chủ coi như không có cây và dựng khung trống - luôn đọc lại để phát hiện.
- `copyFrom: "standard"` = bắt đầu từ giao diện tiêu chuẩn (đúng bố cục trang hiện tại).

## Quy trình

1. `GET /objects/{ref}/fields` (slug thật, trường bắt buộc), `GET /objects/{ref}/related-lists` (khoá danh sách liên quan), `GET /objects/{ref}/layouts` (giao diện đang có, gán, màn).
2. `GET .../layouts/standard` lấy cây tiêu chuẩn làm khung (hoặc dùng `copyFrom`), sửa theo thiết kế. Id / slug khối mới: `^[a-z0-9_-]{1,60}$`, duy nhất; **giữ nguyên id khối cũ** khi sửa (quy tắc giao diện trỏ vào id).
3. Mọi trường **bắt buộc** của đối tượng phải nằm trên giao diện màn Tạo.
4. `--server-dry-run` -> máy chủ làm sạch cây (`layoutValidate`): so `data` trả về với cây gửi lên; khối / trường bị bỏ = lỗi thiết kế cần sửa.
5. Ghi thật (đã duyệt) -> `GET .../layouts/{id}` -> so số Row / Section / Group, danh sách trường, danh sách liên quan, `screens`, `assign`.

## Nguyên tắc thiết kế (UX)

- **Màn Tạo:** 1 Row (max-width ~1000px, căn giữa), 1 Section, Group 2 cột "Thông tin chung" (trường bắt buộc trước), Group thu gọn "Thông tin thêm". Không đặt danh sách liên quan, SLA, Công việc ở màn Tạo.
- **Màn Xem/Sửa:** Row tỉ lệ `[2, 1]` hoặc `[1, 2, 1]`: cột chính (định danh -> trạng thái -> nghiệp vụ -> mô tả), cột phụ (người phụ trách, ngày, SLA), Tab-Section cho danh sách liên quan / báo cáo.
- Display Box là **văn bản thuần** (hướng dẫn nhập).

## Bẫy thường gặp

- **Đối tượng có sẵn chưa có giao diện tuỳ chỉnh** (VD Tài khoản): giao diện mới gán cho mọi người (`assign: []`, đang bật) có thể thành **mặc định của tất cả** -> thay đổi màn hình người đang dùng. Là **cổng hẹp**: tạo với `isActive: false` hoặc gán hẹp, bật khi người dùng đồng ý.
- Trường / danh sách liên quan / widget đặt 2 lần -> bị bỏ lần sau.
- Group / Section rỗng -> bị làm sạch.
- `ratios` của Row phải cùng số phần tử với `columns`.
- Chỉ 1 lần mỗi giao diện: Công việc cần hoàn thành, Smart paste, reCAPTCHA.
- Iframe chỉ hiện khi tên miền nằm trong danh sách cho phép cấp công ty (người dùng tự cấu hình); chỉ `https`.
- Giao diện tiêu chuẩn chỉ đọc (`READ_ONLY_OBJECT`) - tạo bản mới.

## Báo kết quả

Bảng: tên | id | màn | nền tảng | gán | đang bật | trường đã đặt / bắt buộc thiếu. Trình dựng: `/settings/object-layout/<ref>/<id>`.
