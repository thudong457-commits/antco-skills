# Thiết kế dữ liệu demo

Mục tiêu: đủ để người dùng **thấy ứng dụng chạy** và để agent **kiểm chứng** công thức, tổng hợp, quy tắc, bộ lọc, báo cáo. Không mô phỏng toàn bộ dữ liệu thật.

## Phạm vi

- Chỉ tạo bản ghi của **đối tượng tự tạo** (Public API v1 không ghi đối tượng có sẵn).
- Trường tra cứu tới đối tượng có sẵn (khách hàng, nhân sự, sản phẩm): dùng 2-3 bản ghi có sẵn **người dùng chỉ định** (hỏi ở bước câu hỏi), chỉ tham chiếu id. Nếu người dùng không muốn gắn vào dữ liệu thật và trường đó không bắt buộc -> để trống.

## Quy mô mặc định

| Loại | Số bản ghi |
|---|---|
| Đối tượng chính (phiếu, phương án) | 6-12 |
| Đối tượng Con | 2-4 dòng mỗi cha |
| Trung gian | 1-3 dòng mỗi cặp |

Tổng mỗi lượt <= 100 bản ghi trừ khi người dùng yêu cầu khác (120 lần gọi / phút, tạo tuần tự).

## Quy ước giá trị

- Văn bản: hư cấu, có chữ `(Demo)` ở trường mô tả / ghi chú để người dùng nhận ra.
- Email `<ten>@example.com`; điện thoại `0900000001`...; địa chỉ chung chung (`Quận 7, TP.HCM`).
- Ngày: rải 3 tháng gần nhất + 1 tháng tới; có vài bản ghi quá hạn để bộ lọc "Quá hạn" có dữ liệu.
- Lựa chọn / trạng thái: mỗi giá trị có ít nhất 1 bản ghi; trạng thái cuối chiếm 20-30%. Chuyển trạng thái theo đúng đường chuyển (tạo ở trạng thái đầu rồi PUT từng bước).
- Tiền: số tròn dễ cộng tay (450000, 1200000).
- Không điền trường nhạy cảm.

## Bảng kế hoạch demo (đưa vào kế hoạch)

```markdown
| ID | Đối tượng | Số lượng | Phụ thuộc | Mục đích kiểm | Giá trị đặc biệt |
|---|---|---|---|---|---|
| DM-001 | cobj:phieu_khao_sat | 8 | khách hàng có sẵn do người dùng chỉ định | Bộ lọc theo trạng thái, báo cáo theo tháng | 2 phiếu quá hạn |
| DM-002 | cobj:khu_vuc_khao_sat | 20 | DM-001 | Tổng hợp Số khu vực ở phiếu | 3 mức độ đủ cả |
| DM-003 | cobj:phuong_an_ky_thuat | 10 | DM-001 | Quy tắc chuyển trạng thái, báo cáo giá trị | giá trị tròn |
```

## Đối soát sau khi tạo

| Kiểm | Cách |
|---|---|
| Đánh số tự động | Đọc lại: mã liên tiếp đúng định dạng |
| Công thức | Tính tay 2 bản ghi, so với giá trị đọc lại |
| Tổng hợp | Cộng / đếm tay dòng con của 1 cha, so với trường ở cha |
| Bộ lọc | Đếm tay theo điều kiện, so với `data.total` của `GET /records/{ref}?filterId=` |
| Báo cáo | So tổng nhóm của `POST /reports/run` với số tính tay |
| Quy tắc trạng thái | `PUT ... ?dryRun=1` một đường chuyển không hợp lệ trên bản ghi demo -> phải bị chặn (dryRun nên không ghi gì) |

Ghi kết quả vào bàn giao (T-xxx: PASS/FAIL, kỳ vọng, thực tế).
