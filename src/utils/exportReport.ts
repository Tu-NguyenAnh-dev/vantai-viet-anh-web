/**
 * exportReport.ts
 * Xuất báo cáo Excel theo tháng cho xe và lái xe.
 * Dùng thư viện `xlsx` (SheetJS) đã có trong project.
 */
import * as XLSX from 'xlsx';
import dayjs from 'dayjs';
import type { VehicleDetailSummary, VehicleTripRow } from '@/modules/vehicles/vehicleDetailTypes';
import type { EmployeeDetailTrip, EmployeePayrollMonth } from '@/api/employees';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function n(v: number | string | null | undefined): number {
  if (v == null) return 0;
  const x = Number(v);
  return isNaN(x) ? 0 : x;
}

function fmt(v: number | string | null | undefined): number {
  return Math.round(n(v));
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = dayjs(iso);
  return d.isValid() ? d.format('DD/MM/YYYY') : iso;
}

function shiftLabel(s?: string | null) {
  if (s === 'night') return 'Đêm';
  if (s === 'day') return 'Ngày';
  return '';
}

/** Tải file Excel xuống trình duyệt */
function downloadWorkbook(wb: XLSX.WorkBook, filename: string) {
  XLSX.writeFile(wb, filename);
}

// ---------------------------------------------------------------------------
// Vehicle Report
// ---------------------------------------------------------------------------

export interface VehicleReportParams {
  plateNumber: string;
  fromDate: string;   // YYYY-MM-DD
  toDate: string;     // YYYY-MM-DD
  summary: VehicleDetailSummary;
  trips: VehicleTripRow[];
}

export function exportVehicleReport(params: VehicleReportParams) {
  const { plateNumber, fromDate, toDate, summary, trips } = params;

  const from = dayjs(fromDate);
  const to = dayjs(toDate);
  const periodLabel =
    from.format('MM/YYYY') === to.format('MM/YYYY')
      ? `Tháng ${from.format('MM/YYYY')}`
      : `${from.format('DD/MM/YYYY')} – ${to.format('DD/MM/YYYY')}`;

  const sheetName = `Xe ${plateNumber}`.slice(0, 31);
  const title = `BÁO CÁO XE ${plateNumber} - ${periodLabel.toUpperCase()}`;

  const TRIP_HEADERS = [
    'Ngày', 'Mã chuyến', 'Ca', 'Lái xe', 'Khách hàng', 'Tuyến',
    'Doanh thu', 'Đã thu', 'Công nợ',
    'Cầu đường', 'Vé vào cổng', 'Luật/phạt', 'CP khác', 'Ghi chú CP',
    'Lương TX', 'Trạng thái',
  ];

  const rows: any[][] = [];

  // Row 1: title (sẽ merge A1:P1)
  rows.push([title]);
  // Row 2: ngày xuất
  rows.push([`Ngày xuất: ${dayjs().format('DD/MM/YYYY HH:mm')}`]);
  // Row 3: empty
  rows.push([]);
  // Row 4: headers
  rows.push(TRIP_HEADERS);

  // Trip data
  for (const t of trips) {
    const revenue = fmt(t.revenue);
    const paid = fmt(t.paidAmount);
    const debt = Math.max(0, revenue - paid);
    rows.push([
      fmtDate(t.tripDate),
      t.tripCode ?? '',
      shiftLabel(t.driverShift),
      t.driverName ?? '',
      t.customerName ?? '',
      t.address ?? '',
      revenue,
      paid,
      debt,
      fmt(t.tollCost),
      fmt(t.ticketCost),
      fmt(t.fineCost),
      fmt(t.otherCosts),
      t.otherCostsNote ?? '',
      fmt(t.driverSalary),
      t.status ?? '',
    ]);
  }

  // Empty row before summary
  rows.push([]);

  // Summary block
  const totalExpense = n(summary.revenue) - n(summary.profit);
  const summaryRows: [string, number][] = [
    ['Tổng doanh thu', fmt(summary.revenue)],
    ['Đã thu', fmt(summary.paidAmount)],
    ['Công nợ', fmt(summary.debtAmount)],
    ['', 0],
    ['--- CHI PHÍ ---', 0],
    ['Phí cầu đường', fmt(summary.tollCost)],
    ['Vé vào cổng / gửi xe', fmt(summary.ticketCost)],
    ['Luật / phạt', fmt(summary.fineCost)],
    ['Chi phí khác (chuyến)', fmt(summary.otherCosts)],
    ['Lương tài xế (%)', fmt(summary.driverPercentCost)],
    ['Lương phụ xe', fmt(summary.assistantSalary)],
    ['Phụ cấp phụ xe', fmt(summary.assistantAllowance)],
    ['Hoa hồng liên hệ', fmt(summary.commissionContact)],
    ['Xăng dầu (xe)', fmt(summary.fuelCost)],
    ['Sửa chữa (xe)', fmt(summary.repairCost)],
    ['', 0],
    ['TỔNG CHI PHÍ', fmt(totalExpense)],
    ['LỢI NHUẬN', fmt(summary.profit)],
  ];

  for (const [label, value] of summaryRows) {
    rows.push([label, value === 0 && label === '' ? '' : value, '', '', '', '', '', '', '', '', '', '', '', '', '', '']);
  }

  // Build worksheet
  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Column widths
  ws['!cols'] = [
    { wch: 12 }, // Ngày
    { wch: 20 }, // Mã chuyến
    { wch: 7  }, // Ca
    { wch: 14 }, // Lái xe
    { wch: 16 }, // Khách hàng
    { wch: 20 }, // Tuyến
    { wch: 14 }, // Doanh thu
    { wch: 12 }, // Đã thu
    { wch: 12 }, // Công nợ
    { wch: 12 }, // Cầu
    { wch: 12 }, // Vé
    { wch: 12 }, // Luật
    { wch: 12 }, // CP khác
    { wch: 18 }, // Ghi chú CP
    { wch: 12 }, // Lương TX
    { wch: 12 }, // Trạng thái
  ];

  // Merge title row
  ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 15 } }];

  // Format number cells (cols 6-14 = G-O, data rows)
  const dataStartRow = 4; // 0-based
  const dataEndRow = dataStartRow + trips.length - 1;
  const numCols = [6, 7, 8, 9, 10, 11, 12, 14];
  for (let r = dataStartRow; r <= dataEndRow; r++) {
    for (const c of numCols) {
      const ref = XLSX.utils.encode_cell({ r, c });
      if (ws[ref] && typeof ws[ref].v === 'number') {
        ws[ref].z = '#,##0';
      }
    }
  }

  // Format summary number column (col B = 1)
  const summaryStartRow = dataEndRow + 2;
  for (let r = summaryStartRow; r < rows.length; r++) {
    const ref = XLSX.utils.encode_cell({ r, c: 1 });
    if (ws[ref] && typeof ws[ref].v === 'number' && ws[ref].v !== 0) {
      ws[ref].z = '#,##0';
    }
  }

  // Workbook
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  const filename = `BaoCao_${plateNumber.replace(/[^a-zA-Z0-9]/g, '_')}_${from.format('MM-YYYY')}.xlsx`;
  downloadWorkbook(wb, filename);
}

// ---------------------------------------------------------------------------
// Employee Report
// ---------------------------------------------------------------------------

export interface EmployeeReportParams {
  employeeName: string;
  yearMonth: string; // YYYY-MM
  trips: EmployeeDetailTrip[];
  payroll: EmployeePayrollMonth;
}

export function exportEmployeeReport(params: EmployeeReportParams) {
  const { employeeName, yearMonth, trips, payroll } = params;

  const monthLabel = dayjs(yearMonth + '-01').format('MM/YYYY');
  const sheetName = `LX ${employeeName}`.slice(0, 31);
  const title = `BÁO CÁO LÁI XE ${employeeName.toUpperCase()} - THÁNG ${monthLabel}`;

  const TRIP_HEADERS = [
    'Ngày', 'Mã chuyến', 'Xe', 'Khách hàng', 'Tuyến', 'Ca',
    'Doanh thu', 'Cầu đường', 'Vé vào cổng', 'Luật/phạt', 'CP khác',
    'Lương % chuyến', 'Ghi chú',
  ];

  const rows: any[][] = [];

  rows.push([title]);
  rows.push([`Ngày xuất: ${dayjs().format('DD/MM/YYYY HH:mm')}`]);
  rows.push([]);
  rows.push(TRIP_HEADERS);

  for (const t of trips) {
    const revenue = fmt(t.revenue);
    const incentive = fmt(t.driverIncentiveThisTrip);
    rows.push([
      fmtDate(t.tripDate),
      t.tripCode ?? '',
      t.vehicle?.licensePlate ?? '',
      t.customer?.name ?? '',
      t.address ?? '',
      shiftLabel(t.driverShift),
      revenue,
      fmt(t.tollCost),
      fmt(t.ticketCost),
      fmt(t.fineCost),
      fmt(t.otherCosts),
      incentive,
      t.notes ?? '',
    ]);
  }

  // Totals row
  const totalRevenue = trips.reduce((s, t) => s + n(t.revenue), 0);
  const totalIncentive = n(payroll.driverPercentTotal);
  rows.push([]);
  rows.push(['TỔNG', '', '', '', '', '', fmt(totalRevenue), '', '', '', '', fmt(totalIncentive), '']);

  // Salary board
  rows.push([]);
  rows.push(['--- BẢNG LƯƠNG ---']);

  const baseSalary = fmt(payroll.baseSalary);
  const driverPct = fmt(payroll.driverPercentTotal);
  const advanceTotal = fmt(payroll.advanceTotal);
  const att = payroll.attendance;
  const extraAbsent = n(att?.extraAbsentDays);
  const dailyRate = n(att?.dailyRateFromBase);
  const absenceDeduction = fmt(att?.absenceDeduction);
  const totalSalary = fmt(payroll.totalSalary);

  const salaryRows: [string, number | string][] = [
    ['Lương cơ bản', baseSalary],
    ['Lương % (tổng chuyến)', driverPct],
    ['Cộng', baseSalary + driverPct],
    ['Tạm ứng trong tháng', advanceTotal],
    [
      `Khấu trừ nghỉ (${extraAbsent} ngày × ${Math.round(dailyRate).toLocaleString('vi')})`,
      absenceDeduction,
    ],
    ['THỰC LĨNH', totalSalary],
  ];

  for (const [label, value] of salaryRows) {
    rows.push([label, value]);
  }

  // Advance detail
  if (payroll.advances?.length) {
    rows.push([]);
    rows.push(['Chi tiết tạm ứng:']);
    for (const adv of payroll.advances) {
      rows.push([fmtDate(adv.advanceDate), fmt(adv.amount), adv.note ?? '']);
    }
  }

  // Build worksheet
  const ws = XLSX.utils.aoa_to_sheet(rows);

  ws['!cols'] = [
    { wch: 12 }, // Ngày
    { wch: 20 }, // Mã chuyến
    { wch: 12 }, // Xe
    { wch: 16 }, // Khách
    { wch: 20 }, // Tuyến
    { wch: 7  }, // Ca
    { wch: 14 }, // Doanh thu
    { wch: 12 }, // Cầu
    { wch: 12 }, // Vé
    { wch: 12 }, // Luật
    { wch: 12 }, // CP khác
    { wch: 14 }, // Lương %
    { wch: 20 }, // Ghi chú
  ];

  ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 12 } }];

  // Format number cols for trip rows
  const dataStart = 4;
  const dataEnd = dataStart + trips.length - 1;
  const numCols = [6, 7, 8, 9, 10, 11];
  for (let r = dataStart; r <= dataEnd; r++) {
    for (const c of numCols) {
      const ref = XLSX.utils.encode_cell({ r, c });
      if (ws[ref] && typeof ws[ref].v === 'number') {
        ws[ref].z = '#,##0';
      }
    }
  }

  // Format salary block col B
  const salaryBlockStart = dataEnd + 4; // approx
  for (let r = salaryBlockStart; r < rows.length; r++) {
    const ref = XLSX.utils.encode_cell({ r, c: 1 });
    if (ws[ref] && typeof ws[ref].v === 'number') {
      ws[ref].z = '#,##0';
    }
  }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  const filename = `BaoCao_LX_${employeeName.replace(/\s+/g, '_')}_${yearMonth}.xlsx`;
  downloadWorkbook(wb, filename);
}

// ---------------------------------------------------------------------------
// Template generators — tạo file Excel mẫu để import
// ---------------------------------------------------------------------------

type TemplateType = 'vehicles' | 'employees' | 'customers' | 'users' | 'trips';

const TEMPLATE_CONFIG: Record<TemplateType, { filename: string; headers: string[]; example: (string | number)[] }> = {
  vehicles: {
    filename: 'template-xe.xlsx',
    headers: ['Biển số xe*', 'Loại xe', 'Hãng xe', 'Model', 'Năm SX', 'Tải trọng (tấn)', 'Trạng thái'],
    example: ['51D-12345', 'Tải', 'Hyundai', 'HD120', 2020, 8.5, 'active'],
  },
  employees: {
    filename: 'template-nhan-vien.xlsx',
    headers: ['Mã NV', 'Họ tên*', 'Số điện thoại', 'Email', 'Lương cơ bản', 'Chức vụ', 'Số GPLX', 'Hạng GPLX', 'Trạng thái'],
    example: ['NV001', 'Nguyễn Văn A', '0912345678', 'a@email.com', 8000000, 'Lái xe', 'B123456', 'C', 'active'],
  },
  customers: {
    filename: 'template-khach-hang.xlsx',
    headers: ['Mã KH', 'Tên khách hàng*', 'Số điện thoại', 'Email', 'Địa chỉ', 'Mã số thuế', 'Người liên hệ', 'Hoa hồng (%)', 'Trạng thái'],
    example: ['KH001', 'Công ty TNHH ABC', '0281234567', 'abc@company.com', '123 Lý Thường Kiệt', '0123456789', 'Nguyễn Thị B', 5, 'active'],
  },
  trips: {
    filename: 'template-chuyen-xe.xlsx',
    headers: [
      'Mã chuyến', 'Ngày*', 'Biển số xe*', 'Tài xế (tên/mã)*', 'Khách hàng (tên/mã)*',
      'Tuyến đường', 'Doanh thu', 'Phí cầu đường', 'Vé cổng', 'Tiền phạt',
      'CP khác', 'Ghi chú CP khác', 'Ca (day/night)', 'Phụ cấp phụ xe', 'Trạng thái', 'Ghi chú',
    ],
    example: [
      'CH001', '2026-06-20', '51D-12345', 'Nguyễn Văn A', 'Công ty TNHH ABC',
      'HCM - Đà Nẵng', 5000000, 200000, 50000, 0,
      0, '', 'day', 0, 'completed', '',
    ],
  },
  users: {
    filename: 'template-nguoi-dung.xlsx',
    headers: ['Email*', 'Họ tên*', 'Vai trò*', 'Mật khẩu*', 'Trạng thái'],
    example: ['user@email.com', 'Nguyễn Văn A', 'ADMIN', 'Matkhau@123', 'active'],
  },
};

export function downloadTemplate(type: TemplateType): void {
  const config = TEMPLATE_CONFIG[type];
  const wb = XLSX.utils.book_new();

  // Sheet 1: Template
  const ws = XLSX.utils.aoa_to_sheet([
    config.headers,
    config.example,
  ]);

  // Style header row width
  ws['!cols'] = config.headers.map(() => ({ wch: 20 }));

  // Sheet 2: Hướng dẫn
  const guide: (string | number)[][] = [
    ['HƯỚNG DẪN NHẬP LIỆU'],
    [],
    ['- Cột có dấu * là bắt buộc'],
    ['- Trạng thái: active | inactive'],
  ];

  if (type === 'employees') {
    guide.push(['- Hạng GPLX: B1, B2, C, D, E, F']);
    guide.push(['- Chức vụ: Lái xe, Phụ xe, Quản lý, Kế toán']);
  }
  if (type === 'users') {
    guide.push(['- Vai trò: ADMIN, DISPATCHER, ACCOUNTANT, DRIVER']);
  }
  if (type === 'vehicles') {
    guide.push(['- Loại xe: Tải, Container, Đầu kéo, Xe khách']);
  }

  const wsGuide = XLSX.utils.aoa_to_sheet(guide);
  wsGuide['!cols'] = [{ wch: 50 }];

  XLSX.utils.book_append_sheet(wb, ws, 'Template');
  XLSX.utils.book_append_sheet(wb, wsGuide, 'Hướng dẫn');

  downloadWorkbook(wb, config.filename);
}
