---
name: antco-forms
description: "Tạo biểu mẫu web công khai (public form /f/<slug>) cho đối tượng tự tạo Antco qua Public API: chọn giao diện màn Tạo làm form, slug, mô tả, bật/tắt, cài đặt bổ sung (lời cảm ơn, giá trị ẩn đặt sẵn, giới hạn lượt gửi). Dùng khi người ngoài (khách hàng, ứng viên) cần gửi thông tin vào Antco mà không đăng nhập, VD đăng ký khảo sát miễn phí, yêu cầu báo giá."
license: MIT
metadata:
  author: Antco
  version: "1.0.0"
---

# Antco Forms (Biểu mẫu web công khai)

- **Phiên bản:** `1.0.0` - **Ngày phát hành:** `2026-10-02`
- Xác thực: [../antco-api-auth/SKILL.md](../antco-api-auth/SKILL.md). Giao diện form: [../antco-layouts/SKILL.md](../antco-layouts/SKILL.md).

## Phạm vi và an toàn

- Chỉ **đối tượng tự tạo** (`GET /forms` trả `supported: false` với đối tượng có sẵn -> `CHUA_HO_TRO`).
- Biểu mẫu **bật** = trang công khai trên Internet ghi được dữ liệu vào công ty. **Cổng hẹp**: tạo với `isActive: false`; chỉ bật khi người dùng đồng ý riêng sau khi xem lại các trường.
- Khách chỉ gửi được trường **nhập được** của giao diện đã chọn (Antco bỏ tra cứu, tệp, trường tính, chỉ đọc); bản ghi tạo với người tạo "Hệ thống"; khách không nhận id / dữ liệu bản ghi.
- Không đặt trường nhạy cảm hay nội bộ (giá vốn, ghi chú nội bộ) vào giao diện form.
- reCAPTCHA (khối `recaptcha` trên giao diện) chỉ chạy khi công ty đã cấu hình khoá - agent không cấu hình khoá.

## Quyền

`settings:custom_fields:read / write`.

## Endpoint

| Method | Đường dẫn |
|---|---|
| GET | `/api/public/v1/objects/{ref}/forms` -> `{ supported, forms[], layouts[], hiddenFields[] }` |
| POST | `/api/public/v1/objects/{ref}/forms?dryRun=1` |
| PUT | `/api/public/v1/objects/{ref}/forms/{id}?dryRun=1` (**thay toàn bộ**; bật / tắt bằng `isActive`) |

## Quy trình

1. Tạo **giao diện màn Tạo riêng cho form** (`antco-layouts`, `screens: "create"`, `allowSelect: false`): chỉ trường khách cần điền, Display Box hướng dẫn, có thể thêm `recaptcha`. Trường bắt buộc mà khách không điền phải có giá trị mặc định / giá trị ẩn đặt sẵn, nếu không form không hoạt động.
2. `GET /forms` xem `layouts[]` chọn được và `hiddenFields[]` (trường đặt sẵn giá trị được).
3. Tạo form ở trạng thái tắt:

```json
POST /api/public/v1/objects/cobj%3Ayeu_cau_khao_sat/forms?dryRun=1
{ "name": "Đăng ký khảo sát miễn phí", "slug": "dang-ky-khao-sat", "description": "Form trên website", "isActive": false,
  "layoutId": "<id giao diện form>", "settings": {} }
```

`settings` (lời cảm ơn, giá trị ẩn đặt sẵn, giới hạn lượt gửi / ngày / IP): cấu trúc theo `openapi.json`; dựng từ bản `GET` của một form có sẵn nếu có, hoặc để `{}` và hướng dẫn người dùng chỉnh trong Antco.

4. Đọc lại. Link công khai: `${ANTCO_BASE_URL}/f/<slug>`.
5. Báo người dùng xem trước, nêu rủi ro spam; khi đồng ý -> `PUT` đủ cấu hình với `isActive: true`.
6. Không tự gửi thử form công khai.

## Bẫy

- Slug form: chữ thường không dấu, số, `-`, 3-60 ký tự; duy nhất.
- Tắt / sửa giao diện mà form đang dùng -> form ngừng hoạt động. Ghi phụ thuộc trong kế hoạch.
- Giới hạn lượt gửi chỉ là chống spam cơ bản.
