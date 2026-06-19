import { apiClient } from '@/api/client';
import type { Vehicle } from './types';
import type { VehicleDetailDashboardData } from './vehicleDetailTypes';

type VehicleListResponse = {
  success: boolean;
  data: Vehicle[];
  page?: number;
  limit?: number;
  total?: number;
  totalPages?: number;
  pagination?: { page: number; limit: number; total: number; totalPages: number };
};

/** GET /vehicles/stats — thống kê nhanh */
export type VehicleStatsData = {
  total?: number;
  active?: number;
  inactive?: number;
  maintenance?: number;
};

export async function fetchVehicleStats() {
  const res = await apiClient.get<{ success?: boolean; data?: VehicleStatsData } | VehicleStatsData>(
    '/vehicles/stats',
  );
  if (res && typeof res === 'object' && 'data' in res && res.data != null) {
    return res.data;
  }
  return res as VehicleStatsData;
}

export type VehicleQueryParams = {
  search?: string;
  status?: string;
  vehicleType?: string;
  /** BE chỉ hỗ trợ sort theo status */
  sort?: 'status';
  sortOrder?: 'ASC' | 'DESC';
  page?: number;
  limit?: number;
  /** Alias của `limit` theo tài liệu API */
  pageSize?: number;
};

export async function fetchVehicles(params: VehicleQueryParams) {
  const { pageSize, ...rest } = params;
  const limit = rest.limit ?? pageSize;
  const res = await apiClient.get<VehicleListResponse>('/vehicles', {
    params: {
      ...rest,
      limit,
    },
  });
  const total = res.pagination?.total ?? res.total ?? 0;
  return {
    data: res.data ?? [],
    total,
  };
}

export async function fetchVehicleDetail(id: string) {
  const res = await apiClient.get<{ success?: boolean; data: Vehicle }>(`/vehicles/${id}`);
  return res.data;
}

export type VehicleDetailParams = {
  fromDate?: string;
  toDate?: string;
};

export async function fetchVehicleDetailDashboard(id: string, params: VehicleDetailParams) {
  const res = await apiClient.get<{ success?: boolean; data: VehicleDetailDashboardData }>(
    `/vehicles/${id}/detail`,
    { params },
  );
  return res.data;
}

export type VehicleExpensePayload = {
  transactionDate: string;
  amount: number;
  description?: string;
  note?: string;
};

export type VehicleTripsParams = {
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
};

type VehicleTripsResponse = {
  data?: Array<{
    id: string;
    tripCode?: string;
    tripDate: string;
    note?: string;
    revenue?: number;
    status?: string;
  }>;
  pagination?: { page: number; limit: number; total: number; totalPages: number };
};

export async function fetchVehicleTrips(id: string, params: VehicleTripsParams) {
  const res = await apiClient.get<VehicleTripsResponse>(`/vehicles/${id}/trips`, { params });
  const data = res?.data ?? [];
  const total = res?.pagination?.total ?? data.length;
  return { data, total };
}

export type VehicleRepairsParams = {
  fromDate?: string;
  toDate?: string;
};

/** Khớp `getRepairHistory` (BE): map từ transaction REPAIR gắn xe */
export type VehicleRepair = {
  id: string;
  /** BE trả `date` (transactionDate) */
  date?: string;
  amount?: number | string;
  /** BE trả `note` (description) */
  note?: string | null;
  category?: string;
};

type VehicleRepairsResponse = {
  data?: VehicleRepair[];
};

export async function fetchVehicleRepairs(id: string, params?: VehicleRepairsParams) {
  const res = await apiClient.get<VehicleRepairsResponse>(`/vehicles/${id}/repairs`, { params });
  return { data: res?.data ?? [] };
}

export async function createVehicleFuel(vehicleId: string, payload: VehicleExpensePayload) {
  const body = {
    transactionDate: payload.transactionDate,
    amount: payload.amount,
    description: payload.description ?? payload.note,
    note: payload.note ?? payload.description,
  };
  const res = await apiClient.post<{ success?: boolean; data: { id: string } }>(
    `/vehicles/${vehicleId}/fuels`,
    body,
  );
  return res.data;
}

export async function updateVehicleFuel(
  vehicleId: string,
  fuelId: string,
  payload: Partial<VehicleExpensePayload>,
) {
  const body: Record<string, unknown> = {};
  if (payload.transactionDate != null) body.transactionDate = payload.transactionDate;
  if (payload.amount != null) body.amount = payload.amount;
  if (payload.description != null || payload.note != null) {
    body.description = payload.description ?? payload.note;
    body.note = payload.note ?? payload.description;
  }
  const res = await apiClient.patch<{ success?: boolean; data: unknown }>(
    `/vehicles/${vehicleId}/fuels/${fuelId}`,
    body,
  );
  return res.data;
}

export async function deleteVehicleFuel(vehicleId: string, fuelId: string) {
  await apiClient.delete(`/vehicles/${vehicleId}/fuels/${fuelId}`);
}

export async function createVehicleRepairTx(vehicleId: string, payload: VehicleExpensePayload) {
  const body = {
    transactionDate: payload.transactionDate,
    amount: payload.amount,
    description: payload.description ?? payload.note,
    note: payload.note ?? payload.description,
  };
  const res = await apiClient.post<{ success?: boolean; data: { id: string } }>(
    `/vehicles/${vehicleId}/repairs`,
    body,
  );
  return res.data;
}

export async function updateVehicleRepairTx(
  vehicleId: string,
  repairId: string,
  payload: Partial<VehicleExpensePayload>,
) {
  const body: Record<string, unknown> = {};
  if (payload.transactionDate != null) body.transactionDate = payload.transactionDate;
  if (payload.amount != null) body.amount = payload.amount;
  if (payload.description != null || payload.note != null) {
    body.description = payload.description ?? payload.note;
    body.note = payload.note ?? payload.description;
  }
  const res = await apiClient.patch<{ success?: boolean; data: unknown }>(
    `/vehicles/${vehicleId}/repairs/${repairId}`,
    body,
  );
  return res.data;
}

export async function deleteVehicleRepairTx(vehicleId: string, repairId: string) {
  await apiClient.delete(`/vehicles/${vehicleId}/repairs/${repairId}`);
}

/** Soft delete — BE set `status = inactive` */
export async function deleteVehicle(id: string) {
  await apiClient.delete(`/vehicles/${id}`);
}

/**
 * API: plateNumber|licensePlate, type|vehicleType, manufactureYear|year, status ACTIVE→active
 */
export async function createVehicle(
  payload: Omit<Vehicle, 'id' | 'status'> & { status?: Vehicle['status']; maintenanceCost?: number },
) {
  const body: Record<string, unknown> = { ...payload };
  if (payload.licensePlate) body.plateNumber = payload.licensePlate;
  if (payload.vehicleType) body.type = payload.vehicleType;
  delete body.year;
  if (payload.year != null) body.manufactureYear = payload.year;
  if (payload.status === 'active') body.status = 'ACTIVE';
  else if (payload.status) body.status = payload.status;
  const res = await apiClient.post<{ success: boolean; data: Vehicle }>('/vehicles', body);
  return res.data;
}

/** API: plateNumber|licensePlate, type|vehicleType, manufactureYear|year, status ACTIVE→active */
export async function updateVehicle(id: string, payload: Partial<Omit<Vehicle, 'id'>>) {
  const body: Record<string, unknown> = { ...payload };
  if (payload.licensePlate != null) body.plateNumber = payload.licensePlate;
  if (payload.vehicleType != null) body.type = payload.vehicleType;
  delete body.year;
  if (payload.year != null) body.manufactureYear = payload.year;
  if (payload.status === 'active') body.status = 'ACTIVE';
  else if (payload.status) body.status = payload.status;
  const res = await apiClient.patch<{ success: boolean; data: Vehicle }>(`/vehicles/${id}`, body);
  return res.data;
}

