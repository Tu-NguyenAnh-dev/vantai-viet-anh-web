/** Trạng thái từ API (chữ thường) */
export type TripStatusApi =
  | 'new'
  | 'assigned'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

/** Gửi lên PATCH /trips/:id/status (DTO Nest — UPPERCASE) */
export type TripStatusPatch =
  | 'NEW'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED';

export type TripPerson = {
  id: string;
  fullName?: string;
  name?: string;
};

/**
 * GET /trips & GET /trips/:id — enrich + trường phẳng theo tài liệu BE.
 */
export type Trip = {
  id: string;
  companyId?: string;
  tripCode?: string | null;
  tripDate: string;
  vehicleId?: string;
  driverId?: string;
  coDriverId?: string | null;
  customerId: string;
  /** Quản lý chuyến */
  managerId?: string | null;
  contactEmployeeId?: string | null;
  commissionRateApplied?: number | null;
  /** Ca ngày/đêm — ảnh hưởng % tài xế trên dashboard xe */
  driverShift?: 'day' | 'night' | null;
  /** Phụ cấp phụ xe (khi có coDriverId) */
  assistantAllowance?: number | string | null;
  paidAmount?: number | string;
  address?: string | null;
  /** Giá thành — bằng revenue */
  revenue?: number | string;
  price?: number | string;
  fuelCost?: number | string;
  tollCost?: number | string;
  /** Vé vào cổng / gửi xe */
  ticketCost?: number | string;
  /** Luật / phạt */
  fineCost?: number | string;
  driverSalary?: number | string;
  otherCosts?: number | string;
  otherCostsNote?: string | null;
  profit?: number | string;
  status: TripStatusApi;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
  /** Từ bảng debts / fallback */
  debtRemaining?: number | string | null;
  /** Trường phẳng từ BE */
  customerName?: string | null;
  managerName?: string | null;
  commissionContactName?: string | null;
  customer?: {
    id: string;
    name: string;
    phone?: string;
  };
  vehicle?: {
    id: string;
    licensePlate: string;
    vehicleType?: string;
    status?: string;
  };
  driver?: TripPerson;
  coDriver?: TripPerson;
  manager?: TripPerson | null;
  contactEmployee?: TripPerson | null;
  /** @deprecated BE không whitelist — dùng otherCosts + otherCostsNote */
  cargoType?: string;
  cargoWeight?: number;
  cargoQuantity?: number;
};

export type TripsPagination = {
  page: number;
  limit: number;
  total: number;
  totalPages?: number;
};

export type TripsListResponse = {
  success: boolean;
  data: Trip[];
  pagination?: TripsPagination;
};

export type TripStatsData = {
  totalTrips?: number;
  totalRevenue?: number;
  totalProfit?: number;
  [key: string]: unknown;
};
