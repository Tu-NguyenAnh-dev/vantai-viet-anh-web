# Frontend — Quản lý nhân viên (UI/UX & API)

**Prefix:** `/api/v1` · **Header:** `Authorization: Bearer <token>` (cùng convention toàn app).

**Code chính**

| Khu vực | Đường dẫn |
|---------|-----------|
| API & kiểu | `src/api/employees.ts` |
| Danh sách + modal tạo/sửa | `src/pages/Employees/index.tsx` |
| Chi tiết (dashboard theo tháng) | `src/modules/employees/pages/EmployeeDetailPage.tsx` |

---

## 1. Tổng quan luồng người dùng

1. Vào **Quản lý nhân viên** → bảng danh sách có lọc tìm kiếm, vị trí, trạng thái → click dòng hoặc **Xem chi tiết** → màn **Chi tiết nhân viên**.
2. Trên chi tiết: đọc **thông tin cố định** (card trên), sau đó làm việc trong **Lịch sử vận hành** theo **một tháng** (mặc định **tháng hiện tại**), chuyển **tab** để xem chuyến / chấm công / ứng lương / bảng lương.
3. Thao tác **ứng lương** và **ngày nghỉ** gắn với ngày ghi nhận; sau khi lưu, dữ liệu **dashboard tháng** được làm mới từ API `detail`.

Thiết kế hướng tới cùng “nhịp” với **Chi tiết xe**: chọn **kỳ (tháng)** trước, rồi xem nội dung trong **tab** thay vì cuộn dài danh sách nhiều tháng trên một trang.

---

## 2. Màn danh sách (`/employees`)

### 2.1 UI

- **Tiêu đề:** “Quản lý nhân viên”.
- **Bộ lọc (cùng hàng):**
  - **Tìm kiếm:** ô `Input.Search` — tìm theo tên, mã NV, SĐT (theo query `search` của BE).
  - **Vị trí:** `Select` (vd. lái xe, phụ xe, kế toán, điều phối, quản lý).
  - **Trạng thái:** `Select` — `active` / `inactive` (khớp `status` query).
- **Hành động:** Import Excel, tải template, **Thêm nhân viên** (mở modal).
- **Bảng:** cột gồm mã NV, họ tên, SĐT, email, vị trí, GPLX, trạng thái (Tag xanh = hoạt động), cột hành động (Xem chi tiết, Sửa).
- **Click dòng** → điều hướng ` /employees/:id ` (chi tiết).

### 2.2 UX

- Đổi bộ lọc → reset về **trang 1** để tránh nhầm dữ liệu trang cũ.
- Modal **Thêm / Sửa:** form dọc; **Lương cơ bản** dùng `VndInputNumber`; email rỗng không gửi (tránh lỗi validate BE) — xử lý trong `normalizeEmployeeWritePayload`.

### 2.3 API

| Method | Path | Query / ghi chú |
|--------|------|-------------------|
| `GET` | `/employees` | `page`, `limit`, `search`, `position`, `status` |
| `POST` | `/employees` | Body: bảng field trong `EmployeeCreatePayload` |
| `PATCH` | `/employees/:id` | Partial |
| `DELETE` | `/employees/:id` | Soft: `inactive` (theo BE) |

---

## 3. Màn chi tiết (`/employees/:id`)

### 3.1 Cấu trúc trang (trên → dưới)

| Khối | Mô tả UI |
|------|-----------|
| **Tiêu đề** | “Chi tiết nhân viên” |
| **Card “Thông tin nhân viên”** | `Descriptions`: mã NV, họ tên, lương CB, vị trí, SĐT, email, GPLX, trạng thái (Tag). chỉ đọc từ entity `employee` trong response `detail`. |
| **Alert “Quy tắc tính lương”** (nếu BE có `rules`) | Hiển thị chuỗi hoặc danh sách key/value — giúp người dùng hiểu công thức (tooltip icon “i”). |
| **Card “Lịch sử vận hành”** | Gồm **chọn tháng** + **Tabs** — phần lõi vận hành theo tháng (mục 3.2). |

### 3.2 Chọn tháng (kỳ xem)

- **`DatePicker` `picker="month"`**, format hiển thị `MM/YYYY`.
- **Mặc định:** tháng hiện tại (`dayjs().startOf('month')`).
- **Không cho clear** (`allowClear={false}`) để luôn có một tháng hợp lệ.
- **Gọi API:** `GET /employees/:id/detail?fromMonth=YYYY-MM&toMonth=YYYY-MM` với **cùng một tháng** cho cả hai tham số (chỉ lấy dữ liệu đúng một tháng).
- **Khi đang tải** tháng mới: vùng tab thay bằng **Spin** căn giữa — tránh hiển thị số liệu tháng cũ cùng label tháng mới. (`placeholderData: keepPreviousData` giúp **thông tin nhân viên** không nhấp nháy biến mất trong lúc refetch.)

### 3.3 Tabs trong “Lịch sử vận hành”

Giao diện tương tự ý tưởng **Chi tiết xe** (một card tiêu đề, bên trong là tab nội dung):

| Tab | Nội dung hiển thị | Hành động chính |
|-----|-------------------|-----------------|
| **Chuyến xe** | Bảng chuyến trong tháng (vai trò **tài xế**). Cột: **Ngày** (`DD/MM/YYYY`), **Mã chuyến**, **Ca** (Ngày/Đêm nếu BE trả `driverShift`), **Doanh thu**, **Trạng thái** (Tag). | Click dòng → `/trips/:id`. **Empty state** khi không có chuyến. |
| **Chấm công** | Tóm tắt: ngày nghỉ miễn, đã khai báo, vượt mức, mẫu ngày công, khấu trừ (từ `payroll.attendance`) — không hiển thị lương ngày. Bảng **chi tiết ngày nghỉ** (ngày, ghi chú, Xóa). | **Thêm ngày nghỉ** → Modal (ngày + ghi chú). Trùng ngày → BE 400; FE hiện `message` lỗi. |
| **Ứng lương** | Bảng tạm ứng trong tháng (ngày, số tiền, ghi chú). | **Thêm ứng lương**, **Sửa**, **Xóa** (Popconfirm). Modal dùng `VndInputNumber` cho tiền. |
| **Lương** | Bảng tổng hợp tháng: CB, tổng %/thưởng lái, tổng tạm ứng, khấu trừ nghỉ, **Tổng lương** (nhấn mạnh typo). | Dòng mô tả công thức tóm tắt (theo BE). **Empty** nếu chưa có dòng payroll tháng đó. |

Dữ liệu các tab lấy từ `data` của `GET .../detail`: `tripHistoryByMonth`, `payrollByMonth` — FE lọc đúng `yearMonth` đang chọn.

### 3.4 API chi tiết & CRUD (không đổi contract)

| Mô tả | Method | Path |
|-------|--------|------|
| Dashboard tháng (employee + lịch sử chuyến + payroll + rules) | `GET` | `/employees/:id/detail?fromMonth=&toMonth=` |
| Ứng lương tạo | `POST` | `/employees/:id/salary-advances` — `advanceDate`, `amount`, `note?` |
| Ứng lương sửa | `PATCH` | `/employees/:id/salary-advances/:advanceId` |
| Ứng lương xóa | `DELETE` | `/employees/:id/salary-advances/:advanceId` |
| Ngày nghỉ tạo | `POST` | `/employees/:id/absences` — `absenceDate`, `note?` |
| Ngày nghỉ xóa | `DELETE` | `/employees/:id/absences/:absenceId` |

**Endpoint cũ vẫn có trên BE** (có thể dùng cho màn mở rộng sau, không gắn bắt buộc vào layout tab hiện tại):

- `GET /employees/:id/trips` — lịch sử chuyến phân trang.
- `GET /employees/:id/salaries` — lương dynamic/transaction.
- `GET /employees/:id/commissions` — hoa hồng theo kỳ.
- `GET /employees/drivers` — dropdown tài xế (module chuyến).

---

## 4. Checklist QA gợi ý (FE)

- [ ] Danh sách: lọc `status` + `position` + `search` trả đúng.
- [ ] Chi tiết: đổi tháng → Spin → số liệu khớp tháng đã chọn.
- [ ] Tab **Chuyến xe**: định dạng ngày `DD/MM/YYYY`; click vào chuyến đúng route.
- [ ] Tab **Ứng lương / Chấm công**: thêm → refetch → dòng mới xuất hiện; xóa có Popconfirm.
- [ ] Trùng ngày nghỉ: backend trả lỗi → user thấy `message` rõ.

---

## 5. Ghi chú triển khai DB

Ứng lương / chấm công cần migration payroll (vd. `20260415_employee_payroll_tables.sql`) trên BE trước khi các API trên có dữ liệu đầy đủ.

---

*Tài liệu này mô tả UI/UX theo code hiện tại (`EmployeeDetailPage`, `employeesApi`). Nếu BE đổi tên field hoặc thêm cột, cập nhật song song `src/api/employees.ts` và bảng trong §3.*
