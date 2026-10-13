---
name: antco-document-templates
description: "Quản lý mẫu văn bản Antco qua Public API cho MỌI đối tượng (có sẵn và tự tạo): mẫu soạn HTML (in / PDF), mẫu Word (.docx) và Excel (.xlsx) tải lên dạng base64; trường trộn {{record.<khoá>}}, trường của bản ghi tra cứu, người in, công ty, ngày in, danh sách liên quan lặp dòng; xuất thử bằng dữ liệu ví dụ và bản ghi thật; mẫu mặc định. Dùng khi cần in hợp đồng, báo giá, biên bản, phiếu... từ dữ liệu Antco hoặc xuất file từ bước quy trình."
license: MIT
metadata:
  author: Antco
  version: "1.2.0"
---

# Antco Document Templates (mẫu văn bản)

- **Phiên bản:** `1.2.0` - **Ngày phát hành:** `2026-10-13`
- Xác thực: [../antco-api-auth/SKILL.md](../antco-api-auth/SKILL.md). Bước "Xuất bản ghi" trong quy trình: [../antco-processes/references/nodes.md](../antco-processes/references/nodes.md).

## Quyền

`settings:document_templates:read|write|delete`; xuất bằng bản ghi thật cần thêm quyền xem đối tượng + bản ghi trong phạm vi người chạy API.

## Endpoint (tiền tố `/api/public/v1/document-templates`)

| Method | Đường dẫn | Ghi chú |
|---|---|---|
| GET | `/objects` | mọi đối tượng hỗ trợ (`ref`, `label`, `moduleLabel`) |
| GET | `/objects/{ref}` | `fields` (mã trộn), `common`, `lists` (danh sách liên quan) |
| GET / POST | `/` (`?objectRef=`) | danh sách / tạo (`?dryRun=1`) |
| GET / PUT / DELETE | `/{id}` | PUT gửi đủ như khi tạo; DELETE xoá mềm (mẫu hệ thống không xoá được) |
| PUT | `/{id}/file` | `{ fileName, contentBase64 }` cho mẫu WORD (.docx) / EXCEL (.xlsx) <= 10 MB -> `tags` (mã trộn tìm thấy) |
| POST | `/{id}/render` | `{ recordId }` (trống = dữ liệu ví dụ) -> HTML: `{ html }`; Word / Excel: `{ fileName, contentBase64 }` |

## Cú pháp trộn (giống mẫu HTML, Word, Excel)

| Mục đích | Cú pháp |
|---|---|
| Trường bản ghi (chữ hiển thị: nhãn lựa chọn, tên bản ghi tra cứu, ngày dd/mm/yyyy, tiền 1.234.567) | `{{record.<khoá>}}` |
| Trường của bản ghi tra cứu (1 cấp) | `{{record.<khoá tra cứu>.<khoá>}}` |
| Người in | `{{currentUser.fullName}}`, `.email`, `.phone`, `.departmentName`, `.positionName` |
| Công ty / ngày in | `{{company.name}}`, `{{company.taxCode}}`, `{{company.address}}`, `{{today.text}}`, `{{today.date}}`, `{{printedBy}}` |
| Lặp danh sách liên quan | `{{#rl.<khoá>}} {{stt}}. {{<trường của dòng>}} {{/rl.<khoá>}}` (tối đa 200 dòng) |
| Có / không có giá trị | `{{#record.x}}...{{/record.x}}` / `{{^record.x}}...{{/record.x}}` |

- **Luôn lấy mã từ `GET /objects/{ref}`** - không đoán. Hợp đồng lao động (`hrm:labor_contract`), Quyết định (`hrm:decision`) dùng mã riêng (VD `decision.no`, danh sách `employees`).
- Bảng lặp (Word / Excel / HTML): đặt `{{#ds}}` ở ô ĐẦU và `{{/ds}}` ở ô CUỐI của CÙNG một dòng mẫu -> lặp nguyên dòng.
- Word: gõ liền mạch mỗi thẻ `{{...}}` một kiểu chữ (Word tách thẻ khi sửa dở chừng -> máy chủ báo lỗi cú pháp); thẻ chỉ trong thân văn bản (không header / footer / text box).
- Không có công thức / định dạng trong mẫu: giá trị đã được định dạng sẵn. Không `#if`, `#foreach`, `$record` (cú pháp Cogover) - đổi sang bảng trên.

## Quy trình

1. `GET /objects` -> chọn đối tượng; `GET /objects/{ref}` -> bảng ánh xạ: vị trí trong mẫu | nội dung | mã trộn | nguồn (bản ghi / tra cứu / người in / danh sách). Ánh xạ mơ hồ -> hỏi.
2. **HTML** (in / PDF từ trình duyệt): `POST /?dryRun=1` `{ name, objectRef, fileFormat: "HTML", contentHtml, category, paper: A4 | A4L | A5 }` -> tạo thật.
   **Word / Excel**: tạo mẫu `fileFormat: "WORD" | "EXCEL"` -> sửa file người dùng gửi (bản sao, giữ logo / định dạng; thay chữ mẫu bằng mã trộn) -> `PUT /{id}/file?dryRun=1` (máy chủ kiểm cú pháp, trả `tags` - đối chiếu bảng ánh xạ) -> tải thật.
3. **Xuất thử** `POST /{id}/render` `{}` (dữ liệu ví dụ - mọi mã phải ra chữ, không còn `{{`), rồi với 1-2 bản ghi thật / demo (`recordId`): trường rỗng, danh sách 0 / 1 / nhiều dòng. File Word / Excel: lưu `contentBase64` ra file, mở kiểm bố cục.
4. Người dùng dùng mẫu: trang bản ghi có nút **In / Xuất văn bản** (máy in) ở cụm nút đầu trang khi đối tượng có mẫu đang dùng; bước quy trình "Xuất bản ghi" chọn `templateId`.

## Bẫy

- Mẫu ngừng dùng (`isActive: false`) không hiện ở nút In; xuất thử vẫn được.
- Đổi `fileFormat` khi sửa -> file mẫu cũ bị bỏ.
- `isDefault: true` -> các mẫu khác của đối tượng thôi mặc định.
- Trường nhạy cảm / trường tệp không có trong mẫu.

## Báo kết quả

Bảng: mẫu | id | đối tượng | định dạng | mặc định | kết quả xuất thử (ví dụ / bản ghi thật). Đường dẫn: `/settings/document-templates/<id>`.
