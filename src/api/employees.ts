import { apiClient } from './client';
import { normalizeNumeric } from '@/utils/number';

/**
 * Body khớp `CreateEmployeeDto` / `UpdateEmployeeDto` (NestJS, `vantaiAnhViet`).
 * Trường camelCase: employeeCode, fullName (hoặc alias name), phone, email, position,
 * licenseNumber, licenseType, status, baseSalary.
 */
export type EmployeeCreatePayload = {
  employeeCode?: string;
  fullName: string;
  phone?: string;
  email?: string;
  position?: string;
  licenseNumber?: string;
  licenseType?: string;
  status?: string;
  baseSalary: number;
};

export type EmployeeUpdatePayload = Partial<EmployeeCreatePayload>;

/** Chuẩn hóa giá trị form → payload API (email/SĐT rỗng → không gửi, tránh @IsEmail fail với ""). */
export function normalizeEmployeeWritePayload(values: {
  employeeCode?: string;
  fullName: string;
  baseSalary: number;
  phone?: string;
  email?: string;
  position?: string;
  licenseNumber?: string;
  licenseType?: string;
  status?: string;
}): EmployeeCreatePayload {
  const trim = (s?: string | null) => {
    const t = s?.trim();
    return t === '' || t === undefined ? undefined : t;
  };
  return {
    employeeCode: trim(values.employeeCode),
    fullName: values.fullName.trim(),
    baseSalary: normalizeNumeric(values.baseSalary, 0),
    phone: trim(values.phone),
    email: trim(values.email),
    position: values.position || undefined,
    licenseNumber: trim(values.licenseNumber),
    licenseType: trim(values.licenseType),
    status: values.status,
  };
}

export interface Employee {
  id: string;
  employeeCode?: string;
  fullName: string;
  phone?: string;
  email?: string;
  position?: string;
  licenseNumber?: string;
  licenseType?: string;
  /** BE có thể trả number hoặc string (JSON). Dùng `normalizeNumeric` khi set form. */
  baseSalary?: number | string;
  /** Một số API trả snake_case */
  base_salary?: number | string;
  status: string;
}

export interface EmployeeListParams {
  page?: number;
  limit?: number;
  search?: string;
  position?: string;
  status?: string;
}

export type EmployeeTrip = {
  id: string;
  tripCode?: string | null;
  tripDate: string;
  address?: string | null;
  /** API trả `notes` (không phải `note`) */
  notes?: string | null;
  revenue?: number | string;
  tollCost?: number | string;
  ticketCost?: number | string;
  fineCost?: number | string;
  otherCosts?: number | string;
  otherCostsNote?: string | null;
  assistantAllowance?: number | string;
  status?: string;
  vehicle?: { id: string; licensePlate?: string | null } | null;
  customer?: { id: string; name?: string | null } | null;
};

export type EmployeeSalary = {
  id?: string;
  period?: string;
  fromDate?: string;
  toDate?: string;
  baseAmount?: number;
  bonus?: number;
  deduction?: number;
  total?: number;
};

/** `GET /employees/:id/detail` — ứng lương */
export type EmployeeSalaryAdvance = {
  id: string;
  advanceDate: string;
  amount: number | string;
  note?: string | null;
};

/** `GET /employees/:id/detail` — nghỉ */
export type EmployeeAbsence = {
  id: string;
  absenceDate: string;
  note?: string | null;
};

export type EmployeePayrollAttendance = {
  allowedRestDays: number;
  absentDays: number;
  absenceDates: EmployeeAbsence[];
  extraAbsentDays: number;
  workDaysDenominator: number;
  dailyRateFromBase: number | string;
  absenceDeduction: number | string;
};

export type EmployeePayrollMonth = {
  yearMonth: string;
  baseSalary: number | string;
  driverPercentTotal: number | string;
  advances: EmployeeSalaryAdvance[];
  advanceTotal: number | string;
  attendance: EmployeePayrollAttendance;
  totalSalary: number | string;
};

/** Chuyến trong `tripHistoryByMonth` — đã enrich */
export type EmployeeDetailTrip = EmployeeTrip & {
  driverIncentiveThisTrip?: number | string | null;
  tripCode?: string | null;
  driverShift?: 'day' | 'night' | null;
};

export type EmployeeTripHistoryMonth = {
  yearMonth: string;
  trips: EmployeeDetailTrip[];
};

export type EmployeeDetailData = {
  employee: Employee;
  tripHistoryByMonth: EmployeeTripHistoryMonth[];
  payrollByMonth: EmployeePayrollMonth[];
  /** Tooltip / legend — chuỗi hoặc object */
  rules?: string | Record<string, unknown> | null;
};

export type SalaryAdvanceWriteBody = {
  advanceDate: string;
  amount: number;
  note?: string;
};

export type AbsenceWriteBody = {
  absenceDate: string;
  note?: string;
};

/** Vị trí dùng lọc quản lý / điều phối chuyến (khớp filter Nhân viên) */
export const MANAGER_DISPATCHER_POSITIONS = ['quản lý', 'điều phối'] as const;

export const employeesApi = {
  list: (params?: EmployeeListParams) =>
    apiClient.get<{ data: Employee[]; pagination: { page: number; limit: number; total: number; totalPages: number } }>(
      '/employees',
      { params },
    ),

  /** Danh sách nhân viên quản lý hoặc điều phối (gộp 2 lần gọi `position`, loại trùng id). */
  listManagersAndDispatchers: async (params?: { search?: string; limit?: number }) => {
    const limit = params?.limit ?? 80;
    const search = params?.search;
    type ListRes = { data: Employee[]; pagination: { page: number; limit: number; total: number; totalPages: number } };
    const [r1, r2] = await Promise.all([
      apiClient.get<ListRes>('/employees', {
        params: {
          page: 1,
          limit,
          search,
          position: MANAGER_DISPATCHER_POSITIONS[0],
          status: 'active',
        },
      }),
      apiClient.get<ListRes>('/employees', {
        params: {
          page: 1,
          limit,
          search,
          position: MANAGER_DISPATCHER_POSITIONS[1],
          status: 'active',
        },
      }),
    ]);
    const byId = new Map<string, Employee>();
    for (const e of [...(r1.data ?? []), ...(r2.data ?? [])]) {
      byId.set(e.id, e);
    }
    return { data: Array.from(byId.values()) };
  },
  getDrivers: (search?: string) =>
    apiClient.get<{ data: Employee[] }>('/employees/drivers', { params: { search } }),
  getById: (id: string) => apiClient.get<{ data: Employee }>(`/employees/${id}`),

  /**
   * Dashboard HR — `fromMonth` / `toMonth` dạng `YYYY-MM`.
   * Nên gửi cùng một tháng cho cả hai để chỉ lấy dữ liệu một kỳ.
   * Bỏ trống cả hai: BE mặc định **tháng hiện tại** (một tháng).
   */
  getDetail: (id: string, params?: { fromMonth?: string; toMonth?: string }) =>
    apiClient.get<{ success?: boolean; data: EmployeeDetailData }>(`/employees/${id}/detail`, {
      params,
    }),
  getTrips: (
    id: string,
    params?: { fromDate?: string; toDate?: string; page?: number; limit?: number },
  ) =>
    apiClient.get<{
      data: EmployeeTrip[];
      pagination?: { page: number; limit: number; total: number; totalPages: number };
    }>(`/employees/${id}/trips`, { params }),
  getSalaries: (
    id: string,
    params: { fromDate: string; toDate: string; source?: 'dynamic' | 'transactions' },
  ) =>
    apiClient.get<{ data: EmployeeSalary[] }>(`/employees/${id}/salaries`, { params }),

  getCommissions: (id: string, params?: { fromDate?: string; toDate?: string }) =>
    apiClient.get<{ data: unknown[] }>(`/employees/${id}/commissions`, { params }),
  getIncome: (
    id: string,
    params: { fromDate: string; toDate: string },
  ) =>
    apiClient.get<{ data: { totalTrips: number; totalRevenue: number; salary: number } }>(
      `/employees/${id}/income`,
      { params },
    ),
  create: (data: EmployeeCreatePayload) => apiClient.post<{ data: Employee }>('/employees', data),
  update: (id: string, data: EmployeeUpdatePayload) =>
    apiClient.patch<{ data: Employee }>(`/employees/${id}`, data),
  delete: (id: string) => apiClient.delete(`/employees/${id}`),

  createSalaryAdvance: (employeeId: string, body: SalaryAdvanceWriteBody) =>
    apiClient.post(`/employees/${employeeId}/salary-advances`, body),

  updateSalaryAdvance: (
    employeeId: string,
    advanceId: string,
    body: Partial<Pick<SalaryAdvanceWriteBody, 'advanceDate' | 'amount' | 'note'>>,
  ) => apiClient.patch(`/employees/${employeeId}/salary-advances/${advanceId}`, body),

  deleteSalaryAdvance: (employeeId: string, advanceId: string) =>
    apiClient.delete(`/employees/${employeeId}/salary-advances/${advanceId}`),

  createAbsence: (employeeId: string, body: AbsenceWriteBody) =>
    apiClient.post(`/employees/${employeeId}/absences`, body),

  deleteAbsence: (employeeId: string, absenceId: string) =>
    apiClient.delete(`/employees/${employeeId}/absences/${absenceId}`),
};
