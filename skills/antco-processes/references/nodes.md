# Sơ đồ quy trình Antco (`flowConfig`) - tham chiếu bước

Nguồn chuẩn khi chạy: `GET /api/public/v1/processes/{id}` của một quy trình làm mẫu + `POST /processes/{id}/validate`. Khác tài liệu này thì máy chủ thắng.

## 1. Khung

```json
{ "nodes": [ { "id": "duyet_1", "type": "userTask", "label": "Quản lý duyệt", "data": { "nodeType": "userTask", "label": "Quản lý duyệt", "slug": "duyet_1" } } ],
  "edges": [ { "id": "e1", "from": "start", "to": "duyet_1", "source": "start", "target": "duyet_1", "label": "", "data": { "offset": 0 } } ] }
```

- Đặt **cả** `type` và `data.nodeType` (cùng giá trị). Cấu hình của bước nằm PHẲNG trong `data` (không bọc `config`). `position` tuỳ chọn - trình thiết kế tự sắp.
- Cạnh: ghi đủ `from`/`to` và `source`/`target`. `id` node / slug: chữ Latin thường, số, `_`, bắt đầu bằng chữ, không `__`, không kết thúc `_`.
- **Biến dạng `${...}`** (KHÔNG `{{ }}`): `${triggerData.<khoá>}`, `${flow.input.newRecord.<khoá>}` / `oldRecord`, `${vars.<tên>}`, `${step['<node id>'].form.<khoá>}`
  (kết quả bước người dùng: `{ mode, action, completedBy, completedByName, comment, form, completedAt }`), `${step['<node id>'].<đầu ra>}`, `${instance.id|code|title|requesterId|submittedBy}`, `${currentUser.id}`.
- `{{secret.<TÊN>}}` (kho bí mật cho bước HTTP) **bị từ chối qua token** -> bước HTTP cần khoá: người dùng tự cấu hình ở trình thiết kế.

## 2. Loại quy trình (`category`)

| Loại | Dùng khi | Bước đầu |
|---|---|---|
| `MANUAL` | Người dùng bấm tạo lượt + nhập form | `start` -> User Task gốc `isRoot: true`, `actionMode: "SUBMIT"` (form khởi tạo) |
| `NORMAL` | Quy trình con / được quy trình khác gọi | `start` nối thẳng bước tự động |
| `SCHEDULED` | Định kỳ | `start.data.scheduleRules[]` |
| `TRIGGERED` | Bản ghi tạo / sửa / xoá, hoặc webhook | `start.data.triggerType` = `OBJECT` / `WEBHOOK` |
| `SEQUENCE` | (chưa có bộ chạy - không dùng) | - |

Chỉ `MANUAL` / `NORMAL` khởi chạy tay được (`POST /processes/{id}/runs`).

### Bắt đầu theo bản ghi (`TRIGGERED`, `triggerType: "OBJECT"`)

`data`: `targetEntity` (ref đối tượng), `condition` = `CREATE` | `UPDATE` | `CREATE_OR_UPDATE` | `DELETE`, `useFilters` + `filters[{ field, operator, value }]` + `filterLogic` (`AND` / `OR` / `CUSTOM`) + `filterCustomLogic`,
`changeMode` = `ANY` | `ONLY` | `EXCEPT` + `changeFields[]`, `runWhen` = `ALWAYS` | `ON_ENTER` (lần đầu thoả điều kiện) | `FIRST_TIME`. Dữ liệu lượt: trường bản ghi + `oldRecord` / `newRecord` + `triggerOperation`.

### Webhook (`triggerType: "WEBHOOK"`)

`webhookSample`, `webhookFields`, `respondTiming` = `IMMEDIATELY` | `WHEN_EXECUTION_COMPLETED` | `USE_RESPOND_TO_WEBHOOK`. URL + mã webhook lấy ở trình thiết kế (người dùng làm - mã là bí mật).

### Theo lịch (`SCHEDULED`)

`scheduleRules[{ id, triggerInterval: { type: SECONDS|MINUTES|HOURS|DAYS|WEEKS|MONTHS|YEARS|CRON, between, atHour, atMinute, daysOfWeek, daysOfMonth, cronExpression }, start, end, maxRun }]`.

## 3. Bước người dùng (`userTask`)

| Khoá | Giá trị |
|---|---|
| `actionMode` | `APPROVAL` (Duyệt / Từ chối) hoặc `SUBMIT` (nhập liệu, Hoàn thành) |
| `isRoot` | `true` cho form khởi tạo của MANUAL |
| `taskPerformers` | `[[cond, ...], ...]` - trong nhóm AND, giữa nhóm OR. `cond = { field, option, value[] }` |
| `formConfig` | `{ title, screenType: normal|drawer|modal, rows[{ id, columns[{ id, sections[{ id, title, groups[{ id, title, fields[] }] }] }] }] }` |
| `sla` | `{ enabled, type: relative|absolute|field, relativeConfig: { days, hours, minutes, useWorkingDays } }` |
| `permissions` | `{ canViewInstanceProgress, canViewOtherSteps }` |

`taskPerformers.field`: `account` (user id), `department`, `position`, `role`, `manager` (`option: "L1"|"L2"|"L3"`, `value: ["${instance.requesterId}"]`), `permission` (mã quyền).
`option`: `"2"` đúng các giá trị, `"1"` trừ các giá trị, `"3"` tất cả, `"4"` cùng phòng ban người chọn, `"5"` phòng ban cấp trên. Giá trị có thể là `${...}`.
Không ai khớp: APPROVAL -> quản lý của người khởi tạo; SUBMIT không cấu hình -> người khởi tạo. Hơn 15 ứng viên -> hàng chờ chung. Người khởi tạo KHÔNG duyệt bước APPROVAL của chính mình.

Trường form (`fields[]`): `{ id, key, label, type, required, readonly, placeholder, options[{ value, label }], defaultValue }` - `type`: `text textarea url number file percentage currency time email tag phone regex boolean lookup displayText select table`.

**Định tuyến kết quả theo NHÃN cạnh ra:** 1 cạnh -> đi tiếp cả khi duyệt lẫn từ chối; nhiều cạnh -> nhãn khớp `từ chối|reject|không|no|hủy` cho Từ chối, `duyệt|approve|đồng ý|yes|thành công` hoặc rỗng cho Duyệt. Không nhãn nào khớp -> đi TẤT CẢ cạnh. Luôn đặt nhãn "Duyệt" / "Từ chối".

## 4. Cổng rẽ nhánh

`exclusiveGateway` (nhánh khớp đầu tiên, rồi mặc định) | `inclusiveGateway` (mọi nhánh khớp) | `parallelGateway` (tất cả). `data.gatewayMode`: `OPEN` (tách, >= 2 cạnh ra) / `CLOSE` (gộp, đúng 1 cạnh ra).
`data.branches[{ id, name, label, targetNodeId (= target của 1 cạnh ra), isDefault, logic: AND|OR|CUSTOM|NONE, customLogic: "(1 OR 2) AND 3", conditions[{ field, operator, value }] }]`.
Toán tử: `EQUALS NOT_EQUALS GT GTE LT LTE CONTAINS NOT_CONTAINS STARTS_WITH ENDS_WITH IS_EMPTY IS_NOT_EMPTY IS_NULL IS_NOT_NULL IS_ONE_OF IS_NOT_ONE_OF SELECT_LIST_CONTAINS LIST_IS_EMPTY LIST_IS_NOT_EMPTY`.
`field` là đường dẫn ngữ cảnh (`triggerData.amount`, `${step['form_khoi_tao'].form.so_tien}`). Không nhánh nào khớp + không mặc định -> nhánh lỗi. Song song tách phải có cổng gộp tương ứng.

## 5. Kết thúc, chờ, lặp, quy trình con

- `endEvent`: kết thúc LƯỢT (huỷ nhánh khác; lượt `REJECTED` nếu hành động cuối là Từ chối). `endBranch`: chỉ kết thúc nhánh đó.
- `waitEvent`: `eventType` = `AFTER_DURATION` (`duration: { value, unit: SECOND|MINUTE|HOUR|DAY|WEEK }`) | `AT_TIME` (`atTime`) | `RECORD_CHANGED` (`record: { targetEntity, updateFields[], triggerFilters, exitFilters, ... }`); `timeout` tuỳ chọn.
- `loop`: `sourceCollection` (`${...}` ra mảng), `forEachTarget` + `afterLastTarget` (phải là target của cạnh ra), `maxIterations` <= 1000; thân vòng quay lại node loop. Biến `${loop.<slug>.currentItem|index|count}`.
- `subProcess`: `targetDefinitionId` (đã xuất bản + kích hoạt, không phải chính nó), `async`, `inputs[{ childVar, value }]`, `outputs[{ childVar, parentVar }]`; sâu tối đa 5.

## 6. Bước tự động

| `type` | Khoá chính | Lỗi |
|---|---|---|
| `updateRecord` | `actionType: CREATE|UPDATE`, `targetEntity` (`cobj:<slug>`, `crm:*`, `fin:*`, `scm:*`), `fieldMappings[{ targetField, sourceValue }]`, `recordVar` (UPDATE), `outputVarName` | dừng, trừ `onErrorStrategy: "SKIP_ERROR"` |
| `getRecords` | `targetEntity`, `conditions[]`, `logic`, `sorts`, `limit`, `resultType: ONE|MANY`, `outputVarName` -> `{ record, records, total }` | `onErrorStrategy` |
| `notification` | `recipients[{ type: user|variable|role, value }]`, `channels: ["IN_APP","WEB_PUSH"]`, `title`, `message`, `actionUrl` | `stopOnError` |
| `sendEmail` | `recipients[{ type: email|variable, value }]`, `subject`, `bodyContent`, `fromType: "PERSONNEL"`, `fromPersonnel` (hộp thư đã cấu hình - không đoán) | `stopOnError` |
| `assignment` | `assignments[{ targetVar, valueType: STATIC|VARIABLE, value, operator: EQUALS|ADD|SUBTRACT|LIST_SIZE }]` | - |
| `sendHttp` | `url`, `method`, `headers[{ key, value }]`, `bodyType`, `bodyContent`, `timeoutSeconds`, `retry`, `outputVarName` | `continueOnFail` |
| `aiAgent` | `agentId`, `prompt`, `identity: INITIATOR|PERSONNEL`, `outputVarName` (mặc định `aiResult`) | `continueOnError` |
| `exportRecord` | `objectRef`, `recordId`, `templateId` (mẫu Word / Excel - skill antco-document-templates), `emailTo`, `outputVarName` | `continueOnError` |
| `organization` | `mode: LOOKUP|UPDATE`, `criteria`, `targetUserVar`, `outputVarName` (tra quản lý / phòng ban của người dùng) | `continueOnError` |
| `jsonToObject`, `pushMessage`, `omniMessage`, `phoneCall`, `respondWebhook` | xem quy trình mẫu bằng `GET /processes/{id}` | - |

`runScript` cần Kho script (cấm với token) - không dùng qua API.

## 7. Mẫu: đề nghị -> quản lý duyệt -> hoàn tất / từ chối (+ thông báo)

Là ví dụ của `POST /processes` trong `GET /openapi.json`. Thêm bước thông báo cho người khởi tạo khi bị từ chối:

```json
{ "id": "bao_tu_choi", "type": "notification", "label": "Báo từ chối",
  "data": { "nodeType": "notification", "label": "Báo từ chối", "recipients": [{ "type": "variable", "value": "${instance.requesterId}" }],
    "channels": ["IN_APP"], "title": "Đề nghị bị từ chối", "message": "${step['duyet_1'].completedByName}: ${step['duyet_1'].comment}" } }
```

Nối `duyet_1 -(Từ chối)-> bao_tu_choi -> tu_choi`. Nội dung thông báo: in họ tên (không in mã người dùng), không in `null` / số thô.
