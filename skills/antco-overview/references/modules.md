# Phân hệ Antco và đối tượng tiêu biểu

Danh sách chỉ để định hướng. **Luôn lấy danh sách thật** bằng `GET /api/public/v1/objects` (mỗi công ty bật phân hệ khác nhau; mã chính xác lấy từ API, không lấy từ bảng này).

| Phân hệ | Mã module | Đối tượng tiêu biểu (`ref` minh hoạ) | Ghi chú tuỳ biến |
|---|---|---|---|
| Bán hàng - CRM | `crm` | Tài khoản `crm:account`, Liên hệ `crm:contact`, KH tiềm năng `crm:lead`, Cơ hội `crm:opportunity`, Báo giá, Hợp đồng, Đơn hàng bán | 4 đối tượng đầu hỗ trợ đầy đủ trong Antco (ghi đè trường, trùng lặp, lịch sử, giao diện, bộ lọc trung tâm); qua API: thêm trường, giao diện, quy tắc trùng lặp, bộ lọc, đọc bản ghi |
| Kế toán - FIN | `fin` | Hoá đơn bán, hoá đơn nhà cung cấp, phiếu thu/chi, đề nghị thanh toán | Động cơ chung: trường, giao diện, bộ lọc, trùng lặp |
| Kho - SCM | `scm` | Kho, vị trí, sản phẩm/vật tư, lô-seri, phiếu nhập/xuất/điều chuyển, tài sản - thiết bị | Động cơ chung như FIN |
| Nhân sự - HRM | `hrm` | Nhân sự, hợp đồng lao động, quyết định, đơn từ, tuyển dụng, ca | Nhiều trường **nhạy cảm** (lương, CCCD, MST) - không đưa vào công thức, báo cáo, AI |
| Hiện trường - FSM | `fsm` | Khảo sát hiện trường, phiếu công việc | Phù hợp gắn đối tượng tự tạo (phương án kỹ thuật, hạng mục) |
| Marketing - MKT | `mkt` | Chiến dịch, chiến dịch email/SMS | |
| OKR | `okr` | Mục tiêu, công việc, check-in | |
| Đào tạo - LMS | `lms` | Khoá học, chứng chỉ | |
| Omni | `omni` | Hội thoại đa kênh | Chủ yếu đọc |

## Cách gắn đối tượng tự tạo vào phân hệ

- Khi tạo đối tượng tự tạo, chọn `module` (phân hệ gắn menu). Đối tượng hiện ở nhóm "Tùy chỉnh" cuối menu trái phân hệ đó.
- Đối tượng Con có thể chọn cha là đối tượng tự tạo **hoặc** một số đối tượng có sẵn được hỗ trợ (danh sách cha hợp lệ đọc từ API - trường `canBeParent` hoặc lỗi khi dry-run).
- Liên kết dữ liệu: **dùng lại** đối tượng có sẵn bằng trường Tra cứu (khách hàng, nhân sự, sản phẩm, hợp đồng...) thay vì tạo danh mục mới trùng chức năng.
