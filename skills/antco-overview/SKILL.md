---
name: antco-overview
description: "Bản đồ Antco ERP cho agent: các phân hệ (CRM, Kế toán, Kho, Nhân sự, Hiện trường, Marketing, OKR, Đào tạo, Omni), khái niệm đối tượng có sẵn vs tự tạo, những gì cấu hình được qua Cài đặt > Dữ liệu (trường, giao diện, quy tắc, hành động, biểu mẫu, bộ lọc, báo cáo) và chọn đúng skill antco-* cho từng việc. Dùng khi người dùng hỏi Antco làm được gì, cần chọn skill, hoặc cần phương pháp thiết kế dữ liệu trước khi tuỳ biến Antco."
license: MIT
metadata:
  author: Antco
  version: "1.0.0"
---

# Antco Overview

- **Phiên bản:** `1.0.0` - **Ngày phát hành:** `2026-10-02`
- Chỉ đọc, không gọi API ghi. Xác thực: [../antco-api-auth/SKILL.md](../antco-api-auth/SKILL.md).

## 1. Antco là gì (theo góc nhìn tuỳ biến)

Antco ERP là nền tảng nhiều phân hệ trên **một động cơ đối tượng chung**. Mỗi loại dữ liệu nghiệp vụ là một **đối tượng** có mã `ref`:

| Loại | Mã `ref` | Ví dụ | Tuỳ biến được |
|---|---|---|---|
| Có sẵn (Tiêu chuẩn) | `<module>:<key>` | `crm:account`, `crm:opportunity`, `scm:warehouse`, `fin:customer_invoice`, `hrm:staff` | Qua API: thêm trường tự thêm, giao diện (nếu đối tượng hỗ trợ), danh sách liên quan, quy tắc trùng lặp, bộ lọc, báo cáo; bản ghi **chỉ đọc**. Trong Antco (người dùng tự làm): ẩn / đổi nhãn / bắt buộc trường có sẵn, Composite ID, lịch sử |
| Tự tạo - Thường | `cobj:<slug>` | `cobj:phieu_khao_sat` | Toàn bộ: trường mọi kiểu, giao diện, mọi loại quy tắc, lộ trình, hành động, biểu mẫu công khai, AI, bộ lọc, báo cáo |
| Tự tạo - Con | `cobj:<slug>` | `cobj:hang_muc_khao_sat` (cha = phiếu khảo sát) | Như trên + trường **Tra cứu phụ thuộc** về cha: xoá cha xoá con, cha có danh sách liên quan nhập dòng trực tiếp, cha tính **Tổng hợp** từ con |
| Tự tạo - Trung gian | `cobj:<slug>` | `cobj:dong_bao_gia` (nối Báo giá + Sản phẩm) | Nối 2 đối tượng (n-n), thường có công thức Thành tiền |

Đối tượng tự tạo hiện ở menu trái của phân hệ được gắn (nhóm "Tùy chỉnh"), trang bản ghi chung `/o/<slug>`. Quyền sinh tự động `cobj:<slug>:read|write|delete` - người dùng tự cấp cho vai trò ở **Cài đặt > Phân quyền** (agent không tự cấp).

Bản đồ phân hệ và đối tượng tiêu biểu: [references/modules.md](references/modules.md).

## 2. Bề mặt cấu hình (Cài đặt > Dữ liệu > Đối tượng > một đối tượng)

| Mục trong Antco | Việc | Skill |
|---|---|---|
| Chi tiết đối tượng | Tên, số nhiều, mô tả, tên bản ghi, ẩn nút tạo, đang hoạt động, cho phép báo cáo (đối tượng tự tạo) | `antco-objects` |
| Danh sách trường dữ liệu | 23 kiểu trường, lựa chọn, tra cứu, công thức, tổng hợp, đánh số | `antco-fields` |
| Danh sách giao diện | Giao diện kéo-thả v2, gán theo người/màn, thứ tự mặc định | `antco-layouts` |
| Danh sách liên quan | Hiện/ẩn, nhãn, cột, tối thiểu/tối đa | `antco-related-lists` |
| Hành động & Chuỗi hành động | Nút cập nhật / tạo / nhân bản / xoá / chuỗi | `antco-actions` |
| Quy tắc giao diện / bảo mật / chuyển trạng thái / trùng lặp, Quản lý lộ trình, Lịch sử thay đổi | Quy tắc khai báo | `antco-rules` |
| Biểu mẫu | Form web công khai `/f/<slug>` | `antco-forms` |
| Cài đặt > Dữ liệu > Bộ lọc | Bộ lọc nâng cao lưu máy chủ, chia sẻ, cột, Kanban/Lịch | `antco-filters` |
| Cài đặt > Báo cáo | Loại báo cáo, báo cáo, thư mục, bảng điều khiển | `antco-reports` |
| Bản ghi | Đọc/ghi bản ghi, dữ liệu demo | `antco-records` |
| Cả một ứng dụng từ mô tả nghiệp vụ | Điều phối toàn bộ, có 2 cổng duyệt | `build-antco-app` |

**Không có qua API (không hứa với người dùng):** script/CSS tuỳ ý trên giao diện, hành động "Gọi API" ra ngoài, Federation component, cấp/sửa vai trò - phân quyền, tạo tài khoản người dùng, thanh toán, quy trình (workflow) - nếu `openapi.json` chưa có. Ghi `CHUA_HO_TRO` và đề xuất cách làm tay trong Antco.

## 3. Chọn skill

1. Người dùng mô tả **cả một nghiệp vụ** cần dựng ("tôi cần quản lý ... gồm ... và báo cáo ...") -> `build-antco-app`.
2. Một thay đổi đơn lẻ, rõ ràng (thêm 1 trường, 1 bộ lọc, 1 báo cáo) -> skill chuyên trách tương ứng; vẫn theo luật đọc trước - dry-run - ghi - đọc lại.
3. Câu hỏi "Antco có ... không", "nên đặt ở đâu" -> trả lời từ skill này, có thể đọc `GET /objects` (chỉ đọc).

## 4. Phương pháp thiết kế dữ liệu (tóm tắt)

Đọc đầy đủ: [references/design-method.md](references/design-method.md). Tóm tắt 6 bước:

1. **Thực thể**: danh từ nghiệp vụ có vòng đời riêng -> đối tượng; thuộc tính -> trường. **Tái dùng đối tượng có sẵn trước** (Tài khoản, Liên hệ, Nhân sự, Sản phẩm, Kho...) - không tạo danh mục trùng.
2. **Quan hệ**: hỏi "xoá cha thì con còn ý nghĩa không?" - không -> đối tượng Con (Tra cứu phụ thuộc); có -> Tra cứu thường. n-n -> đối tượng Trung gian.
3. **Kiểu trường**: chọn kiểu hẹp nhất đúng nghĩa (tiền -> Tiền tệ; trạng thái -> Lựa chọn đơn; mã chứng từ -> Đánh số tự động).
4. **Thứ tự tạo**: đối tượng độc lập -> đối tượng phụ thuộc -> trường tra cứu -> công thức/tổng hợp -> quy tắc -> giao diện -> bộ lọc -> báo cáo -> dữ liệu demo.
5. **Hành vi**: trạng thái + chuyển trạng thái + lộ trình; trùng lặp; bảo mật; hành động.
6. **Trình bày**: giao diện tạo / xem, danh sách liên quan, bộ lọc theo vai trò, báo cáo + bảng điều khiển.

## 5. Luật an toàn chung (mọi skill antco-*)

- Mọi việc trước khi người dùng duyệt kế hoạch là **chỉ đọc**.
- Không sửa, xoá, ghi đè **bản ghi nghiệp vụ có sẵn**. Chỉ tạo bản ghi demo có nhãn lượt chạy, hoặc bản ghi người dùng yêu cầu rõ từng cái.
- Không xoá đối tượng / trường / giao diện có sẵn; xoá thứ do chính lượt chạy tạo cũng phải liệt kê và xác nhận.
- Không nới lỏng phân quyền, không bật quy tắc bảo mật hay biểu mẫu công khai mà không cảnh báo tác động và được đồng ý riêng.
- Không đoán id/slug - đọc từ API. Đọc lại sau mỗi lần ghi.
- Không đưa token vào bất cứ đâu ngoài header.
