/** Response GET /vehicles/:id/detail — khớp BE `getVehicleDetail` */
export type VehicleDetailSummary = {
  tripCount: number;
  revenue: number;
  paidAmount: number;
  debtAmount: number;
  /** Chi phí từ chuyến xe */
  tollCost: number;
  ticketCost: number;
  fineCost: number;
  otherCosts: number;
  /** Lương & phụ cấp nhân sự */
  driverPercentCost: number;
  assistantSalary: number;
  assistantAllowance: number;
  commissionContact: number;
  /** Chi phí từ vehicle expense transactions */
  fuelCost: number;
  repairCost: number;
  profit: number;
};

export type VehicleExpenseRow = {
  id: string;
  amount: number;
  date: string;
  note?: string | null;
  category?: string;
};

export type VehicleTripRow = {
  id: string;
  tripCode?: string | null;
  tripDate: string;
  address?: string | null;
  revenue: number;
  paidAmount: number;
  tollCost: number;
  ticketCost: number;
  fineCost: number;
  otherCosts: number;
  otherCostsNote?: string | null;
  driverSalary: number;
  status: string;
  driverId?: string;
  driverName?: string | null;
  customerName?: string | null;
  /** Mặc định `day` nếu null — theo BE */
  driverShift?: 'day' | 'night' | null;
};

export type VehicleDebtRow = {
  id: string;
  amount?: number | string;
  paidAmount?: number | string;
  remaining?: number | string;
  dueDate?: string | Date;
  status?: string;
  tripId?: string | null;
  note?: string | null;
};

export type VehicleDetailDashboardData = {
  /** Entity + alias: plateNumber, type, manufactureYear */
  vehicle: Record<string, unknown> & {
    id: string;
    licensePlate?: string;
    plateNumber?: string;
    vehicleType?: string;
    type?: string;
    year?: number;
    manufactureYear?: number;
    status?: string;
    maintenanceCost?: number | string | null;
  };
  summary: VehicleDetailSummary;
  operations: {
    trips: VehicleTripRow[];
    fuels: VehicleExpenseRow[];
    repairs: VehicleExpenseRow[];
    debts: VehicleDebtRow[];
  };
};
