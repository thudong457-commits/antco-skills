# Phương pháp thiết kế dữ liệu cho Antco

Mục tiêu: từ mô tả nghiệp vụ ra **mô hình đối tượng tối thiểu, đúng, tái dùng tối đa** cái có sẵn.

## Bước 1 - Liệt kê thực thể

- Gạch chân danh từ trong mô tả: "phiếu khảo sát", "hạng mục", "phương án kỹ thuật", "khách hàng", "kỹ thuật viên".
- Với mỗi danh từ hỏi: có **vòng đời riêng** (tạo, đổi trạng thái, xoá) và cần **danh sách riêng** không? Có -> đối tượng. Không -> trường của đối tượng khác.
- Đối chiếu `GET /objects`: "khách hàng" = `crm:account`, "người liên hệ" = `crm:contact`, "kỹ thuật viên" = `hrm:staff`, "vật tư" = đối tượng Kho... -> **REUSE**, không tạo mới.

## Bước 2 - Quan hệ

| Câu hỏi | Trả lời | Chọn |
|---|---|---|
| Xoá cha thì con còn ý nghĩa? | Không (dòng chi tiết, hạng mục) | Đối tượng **Con** + Tra cứu phụ thuộc |
| | Có (khách hàng của phiếu) | **Tra cứu thường** |
| Một A có nhiều B và một B có nhiều A? | Có | Đối tượng **Trung gian** |
| Cần tổng / đếm từ con lên cha? | Có | Trường **Tổng hợp** ở cha (cha phải có đối tượng Con) |

Ghi mỗi quan hệ là một dòng `REL-xxx` (từ - đến - loại - bắt buộc - lý do).

## Bước 3 - Trường

- Mỗi trường: nhãn tiếng Việt, slug ASCII `lower_snake_case` (bỏ dấu), kiểu, bắt buộc, duy nhất, lý do (REQ).
- Trường tên bản ghi: Văn bản ngắn (tên tự nhập) hoặc **Đánh số tự động** (chứng từ, phiếu: `KS-{yyyy}-0001`).
- Trạng thái: **Lựa chọn đơn**, lựa chọn có màu; đặt thứ tự theo vòng đời.
- Tiền: **Tiền tệ**. Tỷ lệ: **Phần trăm**. Điểm: **Xếp hạng** hoặc **Số**.
- Giá trị tính: **Công thức** (trong cùng bản ghi) hoặc **Tổng hợp** (từ con). Không tạo trường nhập tay cho giá trị tính được.
- Không tạo trường hệ thống (người tạo, ngày tạo, người sửa...) - Antco đã có.
- Không đặt trường nhạy cảm (lương, số giấy tờ) vào công thức, báo cáo, AI, biểu mẫu công khai.

## Bước 4 - Thứ tự tạo (DAG mặc định)

1. Preflight token + ảnh chụp cấu hình (`GET /objects/{ref}`, `/layouts`, các quy tắc) của đối tượng đã có sẽ sửa.
2. Đối tượng tự tạo độc lập.
3. Đối tượng Con / Trung gian (cần cha đã có).
4. Trường thường -> trường tra cứu -> trường lựa chọn trạng thái.
5. Công thức (kiểm `formula/check` trước) -> Tổng hợp.
6. Quy tắc trùng lặp, chuyển trạng thái, lộ trình (Composite ID / theo dõi lịch sử: người dùng tự bật trong Antco).
7. Hành động (trước khi đặt Button group lên giao diện).
8. Giao diện + quy tắc giao diện (cần id khối của giao diện).
9. Danh sách liên quan.
10. Bộ lọc (cần trường đã có).
11. Loại báo cáo -> báo cáo -> chạy đối soát -> bảng điều khiển.
12. Biểu mẫu công khai (cổng hẹp khi bật).
13. Dữ liệu demo (cha -> con), kiểm công thức / tổng hợp / báo cáo ra số đúng.

## Bước 5 - Hành vi

- Trạng thái: vẽ đồ thị chuyển nhỏ nhất (Mới -> Đang làm -> Chờ duyệt -> Hoàn thành; nhánh Huỷ). Trạng thái kết thúc không có đường ra. Không nối tất cả với tất cả.
- Trùng lặp: chọn khoá nghiệp vụ (mã KH + ngày khảo sát...). Cảnh báo hay Chặn - hỏi người dùng.
- Bảo mật: chỉ đề xuất; ghi là cổng hẹp.

## Bước 6 - Trình bày

- Giao diện Tạo: chỉ trường cần nhập lúc tạo, nhóm 2 cột, trường bắt buộc lên đầu.
- Giao diện Xem/Sửa: định danh -> trạng thái + lộ trình -> nghiệp vụ -> liên hệ -> mô tả -> danh sách liên quan (tab).
- Bộ lọc: theo vai trò ("Phiếu của tôi", "Chờ duyệt", "Quá hạn"), 5-10 cột, cột tên ghim trái.
- Báo cáo: mỗi câu hỏi quản lý = 1 báo cáo; dashboard gom KPI.
