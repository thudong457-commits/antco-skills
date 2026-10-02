# 23 kiểu trường Antco

Nguồn chuẩn khi chạy: `GET /api/public/v1/meta/field-types` (`settings[]` = cài đặt hỗ trợ, `soon`, `customOnly`, `computed`).

## Khung payload

```json
{
  "label": "Nhãn tiếng Việt",
  "slug": "nhan_khong_dau",
  "type": "<kiểu>",
  "options": [ { "value": "a", "label": "A", "color": "#2563EB", "isDefault": false, "active": true } ],
  "settings": { },
  "section": null,
  "showInList": true
}
```

Cài đặt chung trong `settings`: `required`, `help` (<= 255), `placeholder` (<= 255), `description` (<= 1000), `allowCreate` / `allowEdit` (mặc định `true` - cho nhập khi tạo / sửa), `quickSearch` (tìm nhanh trong danh sách), `sensitive`.

## Bảng kiểu

| # | `type` | Nhãn | Cài đặt riêng | Giá trị khi ghi bản ghi (`values.<slug>`) |
|---|---|---|---|---|
| 1 | `text` | Văn bản ngắn | `unique`, `defaultValue`, `maxLength` (mặc định 500) | chuỗi |
| 2 | `phone` | Số điện thoại | `unique` | chuỗi 6-20 ký tự `0-9 + ( ) . -` |
| 3 | `bool` | Boolean | `defaultValue` | `true` / `false` |
| 4 | `textarea` | Văn bản dài | `maxLength` (mặc định 5000) | chuỗi (văn bản thuần) |
| 5 | `email` | Email | `unique` | email hợp lệ |
| 6 | `select` | Lựa chọn đơn | `options[]`, `display` (`dropdown` / `radio`), `optionSort` (`list` / `az` / `za`); mặc định = lựa chọn `isDefault` | `value` của lựa chọn đang dùng |
| 7 | `date` | Ngày | `defaultValue` | `YYYY-MM-DD` |
| 8 | `datetime` | Ngày giờ | - | ISO 8601 có múi giờ, VD `2026-10-02T09:00:00+07:00` |
| 9 | `url` | Đường dẫn URL | - | `http(s)://` có tên miền |
| 10 | `multiselect` | Lựa chọn nhiều | `options[]`, `display` (`dropdown` / `checkbox`) | mảng `value` |
| 11 | `number` | Số | `defaultValue`, `min`, `max`, `decimals` | số |
| 12 | `label` | Nhãn | - | mảng chuỗi (<= 30 nhãn, mỗi nhãn <= 50 ký tự) |
| 13 | `cascading` | Cây thư mục | **Sắp có** - không dùng | - |
| 14 | `percent` | Phần trăm | `defaultValue`, `min`, `max`, `decimals` | số theo đơn vị % (VD `15` = 15%) - xác nhận bằng đọc lại |
| 15 | `file` | Tải lên tệp | `multiple` | Public API v1 không có tải tệp -> để trống, người dùng tự đính kèm |
| 16 | `rating` | Xếp hạng | `maxRating` (3-10, mặc định 5) | số nguyên 0..max |
| 17 | `money` | Tiền tệ | `defaultValue`, `min`, `max` | số (VND, không định dạng) |
| 18 | `regex` | Biểu thức chính quy | `unique`, `pattern` (<= 200), `patternMessage` | chuỗi khớp mẫu |
| 19 | `lookup` | Tra cứu thường | `lookup` (ref đích, không đổi sau khi tạo), `multiple` | id bản ghi đích (mảng nếu `multiple`) |
| 20 | `autonumber` | Đánh số tự động | `prefix` (<= 40), `digits` (1-10), `startAt` | **không gửi** - máy chủ sinh |
| 21 | `formula` | Công thức | `formula`, `returnType` (`number` / `text` / `bool` / `date`), `valueType` (`number` / `money` / `percent`), `decimals` (0-15), `blankAsZero` | **không gửi** - máy chủ tính |
| 22 | `dependent_lookup` | Tra cứu phụ thuộc | `lookup` (ref cha), `relatedListName`; chỉ đối tượng tự tạo, luôn bắt buộc | id bản ghi cha |
| 23 | `rollup` | Tổng hợp | `rollupObject` (ref con), `rollupLink` (slug trường tra cứu phụ thuộc ở con), `rollupFn` (`sum` / `count` / `min` / `max` / `avg`), `rollupField`, `rollupFilter` (điều kiện chuẩn, <= 10), `valueType` (`number` / `money`), `decimals` | **không gửi** - máy chủ tính |

## Chọn kiểu nhanh

| Nhu cầu | Kiểu |
|---|---|
| Mã chứng từ, số phiếu | tên bản ghi `autonumber` của đối tượng |
| Trạng thái, giai đoạn, mức độ | `select` có màu |
| Nhiều hạng mục chọn sẵn | `multiselect` |
| Gắn thẻ tự do | `label` |
| Liên kết khách hàng, nhân sự, sản phẩm | `lookup` tới đối tượng có sẵn |
| Dòng chi tiết thuộc phiếu | đối tượng Con (`dependent_lookup` do máy chủ tạo) |
| Thành tiền = SL x Đơn giá | `formula` (`returnType: number`, `valueType: money`) |
| Tổng tiền / số dòng từ con | `rollup` ở cha |
| Diện tích, số lượng | `number` (`decimals`) |
| Điểm hài lòng | `rating` |
| Mã số thuế 10/13 số | `regex` `^\d{10}(\d{3})?$` |
