DA_TRA_LOI | Chưa cần liên kết |DA_TRA_LOI | Có, khoảng 8 phiếu |DA_TRA_LOI | Nhiều phương án, khách chọn 1 |DA_TRA_LOI | Trưởng nhóm kỹ thuật (trên 50 triệu chỉ thông báo Giám đốc, không duyệt trên hệ thống) |DA_TRA_LOI | 3 mức: Thấp, Trung bình, Cao |# Khảo sát hiện trường và phương án kỹ thuật - Công ty diệt côn trùng PCS (ví dụ)

<!-- antco-artifact:requirements project=pcs-khao-sat revision=v2 status=APPROVED -->
<!-- antco-gate:1:APPROVED at=2026-10-02T10:40:00+07:00 by=chat:"duyệt yeu-cau-giai-phap-v2" -->
<!-- antco-token-preflight:VERIFIED -->

- Dự án: `pcs-khao-sat` · Revision: `v2` · Trạng thái: `APPROVED` (cổng 1, 2026-10-02 10:40) · Chế độ: `DESIGN_ONLY`
- Workspace: `pcs.example.com` · Người chạy API: `Quản trị (ví dụ)` · Quyền: `allAccess` · Kiểm lúc: `2026-10-02T09:00:00+07:00`
- Nguồn yêu cầu: chat ngày 2026-10-02 - "Tôi là công ty diệt côn trùng PCS, cần quản lý khảo sát hiện trường + phương án kỹ thuật..."
- Dữ liệu trong file này là **ví dụ tổng hợp**, không phải dữ liệu thật.

## 1. Tóm tắt nghiệp vụ

Kỹ thuật viên đến cơ sở của khách hàng để khảo sát, ghi nhận từng khu vực có dấu hiệu côn trùng và mức độ nhiễm. Từ phiếu khảo sát, trưởng nhóm kỹ thuật lập một hoặc nhiều phương án xử lý (phương pháp, tần suất, giá trị). Phương án phải được duyệt trước khi gửi khách. Quản lý cần thấy số phiếu, trạng thái và giá trị phương án theo tháng.

## 2. Bảng yêu cầu

<!-- antco-table:requirements -->
| ID | Yêu cầu | Tác nhân | Ưu tiên | Hướng xử lý | Trạng thái làm rõ | Nguồn |
|---|---|---|---|---|---|---|
| REQ-001 | Lập phiếu khảo sát cho khách hàng: khách, địa chỉ, ngày khảo sát, kỹ thuật viên phụ trách, loại cơ sở, trạng thái | Kỹ thuật viên | MUST | TAO_MOI | DA_RO | chat 2026-10-02 |
| REQ-002 | Ghi nhận từng khu vực khảo sát: khu vực, loại côn trùng, mức độ nhiễm (Thấp / Trung bình / Cao), diện tích | Kỹ thuật viên | MUST | TAO_MOI | DA_RO | chat 2026-10-02 |
| REQ-003 | Lập một hoặc nhiều phương án kỹ thuật cho mỗi phiếu (khách chọn 1): phương pháp xử lý, tần suất, giá trị dự kiến | Trưởng nhóm kỹ thuật | MUST | TAO_MOI | DA_RO | chat 2026-10-02 |
| REQ-004 | Trưởng nhóm kỹ thuật duyệt phương án trước khi gửi khách; từ chối phải ghi lý do | Trưởng nhóm kỹ thuật | MUST | TAO_MOI | DA_RO | chat 2026-10-02 |
| REQ-005 | Quản lý xem số phiếu theo tháng và trạng thái, tổng giá trị phương án | Quản lý kỹ thuật | SHOULD | TAO_MOI | DA_RO | chat 2026-10-02 |
| REQ-006 | Mỗi kỹ thuật viên có danh sách "Phiếu của tôi đang mở" | Kỹ thuật viên | SHOULD | CAU_HINH | DA_RO | chat 2026-10-02 |
| REQ-007 | Tự động gửi phương án đã duyệt qua email cho khách | Hệ thống | COULD | NGOAI_PHAM_VI | NGOAI_PHAM_VI | chat 2026-10-02 |

## 3. Câu hỏi cần làm rõ

<!-- antco-table:questions -->
| ID | REQ | Câu hỏi | Gợi ý lựa chọn | Mức | Trạng thái | Trả lời |
|---|---|---|---|---|---|---|
| Q-001 | REQ-002 | Mức độ nhiễm côn trùng chia mấy mức? | 3 mức: Thấp, Trung bình, Cao / 4 mức: thêm Nghiêm trọng / Khác (ghi rõ) | BLOCKING | DA_TRA_LOI | 3 mức: Thấp, Trung bình, Cao |
| Q-002 | REQ-004 | Ai duyệt phương án kỹ thuật trước khi gửi khách? | Trưởng nhóm kỹ thuật / Giám đốc kỹ thuật / Không cần duyệt | BLOCKING | DA_TRA_LOI | Trưởng nhóm kỹ thuật (trên 50 triệu chỉ thông báo Giám đốc, không duyệt trên hệ thống) |
| Q-003 | REQ-003 | Một phiếu khảo sát có thể có nhiều phương án (để khách chọn) không? | Chỉ 1 phương án / Nhiều phương án (khách chọn 1) | BLOCKING | DA_TRA_LOI | Nhiều phương án, khách chọn 1 |
| Q-004 | REQ-005 | Có tạo dữ liệu demo (phiếu, khu vực, phương án giả lập, gắn nhãn, dọn được) để chạy thử không? Nếu có, cho biết 2-3 khách hàng có sẵn để gắn vào phiếu demo. | Có, khoảng 8 phiếu / Không | NON_BLOCKING | DA_TRA_LOI | Có, khoảng 8 phiếu; gắn vào 3 khách hàng có sẵn người dùng chỉ định |
| Q-005 | REQ-001 | Antco đã có "Yêu cầu khảo sát hiện trường" (đặt lịch). Phiếu khảo sát mới có cần liên kết tới yêu cầu đó ngay không? | Chưa cần / Có, liên kết bắt buộc | NON_BLOCKING | DA_TRA_LOI | Chưa cần liên kết |

## 4. Khảo sát hiện trạng (chỉ đọc)

<!-- antco-table:survey -->
| Tài nguyên | ref / id | Quan sát | Thời điểm |
|---|---|---|---|
| Đối tượng | crm:account | Dùng làm khách hàng của phiếu (tái dùng, không tạo danh mục mới) | 2026-10-02T09:05:00+07:00 |
| Đối tượng | hrm:staff | Dùng làm kỹ thuật viên phụ trách (chỉ tham chiếu) | 2026-10-02T09:05:00+07:00 |
| Đối tượng | fsm:survey | Yêu cầu khảo sát (đặt lịch) đã có - hỏi ở Q-005 | 2026-10-02T09:06:00+07:00 |
| Đối tượng tự tạo | GET /objects?kind=custom | Chưa có đối tượng tự tạo nào liên quan khảo sát | 2026-10-02T09:06:00+07:00 |

## 5. Ngoài phạm vi / chưa hỗ trợ

- REQ-007: gửi email tự động không thuộc bộ skill này; đề xuất cấu hình quy trình tự động trong Antco sau khi ứng dụng chạy ổn.

## 6. Submission đã xử lý

- smg8k2d1a-x7q2pf - 2026-10-02T10:15:00+07:00 - 5 câu (áp vào v2)
