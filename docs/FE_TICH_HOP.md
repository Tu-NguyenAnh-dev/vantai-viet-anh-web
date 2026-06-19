# Tích hợp Frontend — Vận Tải Anh Việt

## Transactions (Thu – Chi & Giao dịch)

Base: `/api/v1` · Header `Authorization: Bearer <token>`

### Nguyên tắc

- Mọi dòng tiền là **transaction** (cột `transactionType`: `income` | `expense`; API trả **`INCOME`** | **`EXPENSE`**).
- **Category** chuẩn: `TRIP_PAYMENT`, `FUEL`, `REPAIR`, `SALARY` (DB lưu chữ HOA).
- Ghép type ↔ category:
  - `TRIP_PAYMENT` → chỉ **`INCOME`**
  - `FUEL`, `REPAIR`, `SALARY` → chỉ **`EXPENSE`**

### API Paths

| Method | Path | Mô tả |
|--------|------|--------|
| GET | `/transactions` | Danh sách: `page`, `limit`, `fromDate`, `toDate` (hoặc `startDate`/`endDate`), `type`, `category`, `tripId`, `vehicleId`, `employeeId`, `customerId`, `status` |
| GET | `/transactions/:id` | Chi tiết (kèm quan hệ trip/vehicle/employee/customer) |
| POST | `/transactions` | Tạo: `type`, `category`, `amount`, `date`, `note`, `tripId`, `vehicleId`, `employeeId`, `customerId` |
| PATCH | `/transactions/:id` | Cập nhật (cùng quy tắc type/category) |
| DELETE | `/transactions/:id` | Hủy (set `status = cancelled`) |
| GET | `/transactions/summary` | Tổng hợp: `fromDate`, `toDate` → `{ totalIncome, totalExpense, profit }` |
| GET | `/transactions/breakdown` | Chi tiết theo danh mục: `fromDate`, `toDate` → `{ income: {...}, expense: {...} }` |
| GET | `/transactions/export` | Export: `fromDate`, `toDate` → `{ buffer, fileName }` |
| GET | `/transactions/vehicle/:vehicleId/summary` | Tổng theo xe: `fromDate`, `toDate` |
| GET | `/transactions/employee/:employeeId/summary` | Tổng theo nhân viên: `fromDate`, `toDate` |
| GET | `/transactions/stats` | Tương thích cũ: `byCategory`, `netAmount`, … |
| GET | `/transactions/balance` | Số dư lũy kế (completed) |

### POST body — Field alias

| Chuẩn mới | Alias cũ |
|-----------|----------|
| `type` | `transactionType` |
| `date` | `transactionDate` |
| `note` | `description` |

- `amount` > 0 (bắt buộc)
- `category` bắt buộc (một trong bốn mã trên)

### Tích hợp nghiệp vụ

- **Thu từ khách / chuyến:** `INCOME` + `TRIP_PAYMENT` + `tripId` + `customerId`
- **Nhiên liệu:** `EXPENSE` + `FUEL` + `vehicleId`
- **Sửa chữa:** `EXPENSE` + `REPAIR` + `vehicleId`
- **Lương:** `EXPENSE` + `SALARY` + `employeeId`

---

## Employees (Nhân viên)

**Tài liệu đầy đủ (API + UI/UX chi tiết, chi tiết theo tháng & tab):** [FE_QUAN_LY_NHAN_VIEN.md](./FE_QUAN_LY_NHAN_VIEN.md).

Tóm tắt kỹ thuật: Backend `CreateEmployeeDto` / `UpdateEmployeeDto` (camelCase, `whitelist: true`). FE gửi body đã chuẩn qua `normalizeEmployeeWritePayload` trong `src/api/employees.ts` (email/SĐT rỗng không gửi). Trường bắt buộc khi tạo: `fullName` (hoặc `name`), `baseSalary` (≥ 0). Các field khác: `employeeCode`, `phone`, `email`, `position`, `licenseNumber`, `licenseType`, `status` (mặc định `active`).
