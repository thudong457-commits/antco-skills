---
name: antco-schema-workbook
description: "Thiết kế dữ liệu Antco bằng workbook Excel (.xlsx): mỗi sheet một phần - đối tượng tự tạo (Thường / Con / Trung gian, tên bản ghi đánh số), trường (23 kiểu, tra cứu, công thức, tổng hợp), lựa chọn có màu; người dùng duyệt / sửa trong Excel rồi script kiểm hợp lệ, sinh kế hoạch theo thứ tự phụ thuộc và tạo hàng loạt qua Public API (dryRun từng bước, dừng ở lỗi đầu, chạy lại làm tiếp). Dùng khi cần tạo nhiều đối tượng + trường một lần hoặc người dùng muốn duyệt thiết kế dạng bảng tính."
license: MIT
metadata:
  author: Antco
  version: "1.1.0"
---

# Antco Schema Workbook

- **Phiên bản:** `1.1.0` - **Ngày phát hành:** `2026-10-13`
- Xác thực: [../antco-api-auth/SKILL.md](../antco-api-auth/SKILL.md). Quy tắc đối tượng: [../antco-objects/SKILL.md](../antco-objects/SKILL.md). Kiểu trường + cài đặt: [../antco-fields/references/field-types.md](../antco-fields/references/field-types.md). Công thức: [../antco-fields/references/formula.md](../antco-fields/references/formula.md).
- Script (sau khi cài nằm ở `../antco-api-auth/scripts/`; chạy từ repo thì ở `scripts/`): `schema_workbook.mjs` (Node.js >= 18, không thư viện ngoài; đọc / ghi .xlsx bằng `scripts/xlsx_lite.mjs`; gọi API qua `scripts/antco_client.mjs`).

## Khi nào dùng

- Từ 3 trường trở lên hoặc nhiều đối tượng liên quan nhau (cha - con, trung gian, tra cứu, tổng hợp) cần tạo một lần.
- Người dùng muốn **duyệt thiết kế trong Excel** (sửa nhãn, lựa chọn, bắt buộc) trước khi tạo.
- Người dùng gửi một workbook theo mẫu này.

Một trường lẻ -> dùng thẳng [antco-fields](../antco-fields/SKILL.md). Antco không có màn "nhập đối tượng từ Excel" - workbook này chỉ là bản thiết kế, việc tạo luôn qua Public API.

## Cấu trúc workbook

| Sheet | Một dòng = | Cột chính (tiêu đề dạng `Nhãn (khoá)`, script đọc khoá trong ngoặc) |
|---|---|---|
| `Doi tuong` | 1 đối tượng tự tạo | `slug`, `label`, `plural`, `module`, `objectType` (normal / child / junction), `parentRef`, `junctionRefs` (2 mã, phẩy), `nameLabel`, `nameType` (text / autonumber), `namePrefix`, `nameDigits`, `description` |
| `Truong` | 1 trường | `object` (mã trong sheet đối tượng hoặc ref có sẵn như `crm:account`), `slug`, `label`, `type`, `required`, `showInList`, `unique`, `lookup`, `multiple`, `decimals`, `min`, `max`, `formula`, `returnType`, `valueType`, `rollupObject`, `rollupLink`, `rollupFn`, `rollupField`, `help`, `sensitive` |
| `Lua chon` | 1 lựa chọn của trường select / multiselect | `object`, `field`, `value`, `label`, `color` (#RRGGBB), `isDefault` |
| `Huong dan` | - | hướng dẫn điền (bỏ qua khi đọc) |

- Ô Có / Không: `x`, `có`, `true`, `1`. Mã (slug) chữ thường không dấu, số, `_`.
- Đối tượng Con tự có trường **Tra cứu phụ thuộc** về cha - không khai báo. Tổng hợp ở cha: `rollupLink` = `$parent` (script tự tìm slug thật sau khi con đã tạo).
- Thêm trường vào đối tượng có sẵn: ghi `object` = ref có sẵn (VD `crm:account`), không cần dòng ở sheet đối tượng.

## Quy trình

1. **Khảo sát** (chỉ đọc): `GET /objects` + `GET /objects/{ref}/fields` các đối tượng liên quan -> tái dùng đối tượng có sẵn (khách hàng, nhân sự, sản phẩm...) qua tra cứu, không tạo danh mục trùng.
2. **Thiết kế** -> `schema.json` (cùng cấu trúc với `fromWorkbook`: `{ objects[], fields[{ object, slug, label, type, required, options[], settings{} }] }`), rồi:

```bash
node scripts/schema_workbook.mjs export schema.json thiet-ke-du-lieu.xlsx
```

   Gửi file cho người dùng duyệt. Người dùng sửa -> `import thiet-ke-du-lieu.xlsx schema.json` (kiểm hợp lệ, in lỗi theo dòng). Bắt đầu từ trang trắng: `template <out.xlsx>`.
3. **Kế hoạch:** `plan schema.json payloads/<run>/` -> `plan.json` (từng request) + `plan.md` (bảng: thứ tự, khoá, kiểu, phụ thuộc). Thứ tự: đối tượng (cha trước con) -> trường thường -> tra cứu -> công thức -> tổng hợp. Đưa `plan.md` vào kế hoạch, chờ duyệt.
4. **Kiểm trên máy chủ** (không ghi): `apply payloads/<run>/plan.json --env .env` -> đối tượng / đích tra cứu có sẵn có tồn tại không, mã đối tượng đã bị dùng chưa, dryRun các bước kiểm được ngay (bước phụ thuộc đối tượng mới hiện `~ chờ bước trước`).
5. **Ghi thật** (đã duyệt): `apply payloads/<run>/plan.json --env .env --apply --run-id ar_<yyyymmdd>_<ngẫu nhiên>` -> mỗi bước dryRun rồi ghi; **dừng ở lỗi đầu tiên**; trạng thái ở `plan.state.json`; sửa lỗi rồi chạy lại cùng lệnh = làm tiếp các bước còn lại.
6. **Đọc lại** `GET /objects/{ref}/fields` từng đối tượng -> so slug, kiểu, lựa chọn với workbook; báo bảng kết quả. Quyền `cobj:<slug>:*` của đối tượng mới chỉ vai trò Toàn quyền có ngay - ghi rõ cho người dùng cấp ở Cài đặt > Phân quyền.

## Bẫy

- `schema.json` viết tay: dạng chuẩn là `nameSettings { prefix, digits }` và `settings { lookup, formula... }`; script cũng nhận dạng phẳng như cột workbook (`namePrefix`, `nameDigits`, `lookup`...) và tự chuyển.
- Git Bash (Windows) đổi đường dẫn bắt đầu bằng `/` -> đặt `MSYS_NO_PATHCONV=1` trước khi gọi `antco_client.mjs`.

- Đổi `value` lựa chọn sau khi đã có dữ liệu = mất liên kết dữ liệu cũ. Chỉ đổi nhãn.
- Mã đối tượng / trường **không đổi được** sau khi tạo; mã của đối tượng đã xoá vẫn bị giữ chỗ.
- Lỗi mạng giữa chừng khi ghi: lệnh có thể **đã** thực hiện -> `GET /runs/<run-id>/items` hoặc đọc lại trước khi chạy tiếp; không xoá `plan.state.json`.
- Không có xoá qua API: tạo nhầm -> `PUT ... isActive: false` + báo người dùng xoá tay.
- Workbook có thể chứa thiết kế nội bộ công ty -> để trong `payloads/` / `artifacts/` (đã gitignore), không commit.

## Báo kết quả

Bảng: đối tượng / trường | ref / slug thật | kiểu | trạng thái (đã tạo / đã có / lỗi) | ghi chú. Kèm đường dẫn `/settings/objects/<ref>` và trang `/o/<slug>`.
