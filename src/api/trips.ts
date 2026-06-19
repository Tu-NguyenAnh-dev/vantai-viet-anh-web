import { apiClient } from './client';

/** Khớp GET /trips — enrich từ BE (price, debtRemaining, …) */
export interface Trip {
  id: string;
  tripCode?: string;
  tripDate: string;
  vehicle?: { id: string; licensePlate: string };
  driver?: { id: string; fullName: string };
  coDriver?: { id: string; fullName: string };
  customer?: { id: string; name: string };
  manager?: { id: string; fullName?: string; name?: string };
  contactEmployee?: { id: string; fullName?: string; name?: string };
  address?: string;
  revenue?: number | string;
  price?: number | string;
  paidAmount?: number | string;
  debtRemaining?: number | string;
  fuelCost?: number | string;
  tollCost?: number | string;
  driverSalary?: number | string;
  otherCosts?: number | string;
  otherCostsNote?: string | null;
  profit?: number | string;
  status: string;
  notes?: string;
  customerName?: string | null;
  managerName?: string | null;
  commissionContactName?: string | null;
}

export interface TripListParams {
  page?: number;
  limit?: number;
  startDate?: string;
  endDate?: string;
  vehicleId?: string;
  driverId?: string;
  customerId?: string;
  status?: string;
  search?: string;
}

export const tripsApi = {
  list: (params?: TripListParams) =>
    apiClient.get<{ data: Trip[]; pagination: { page: number; limit: number; total: number; totalPages: number } }>(
      '/trips',
      { params },
    ),
  getById: (id: string) => apiClient.get<{ data: Trip }>(`/trips/${id}`),
  create: (data: Record<string, unknown>) => apiClient.post<{ data: Trip }>('/trips', data),
  update: (id: string, data: Record<string, unknown>) => apiClient.patch<{ data: Trip }>(`/trips/${id}`, data),
  delete: (id: string) => apiClient.delete(`/trips/${id}`),
  getStats: (params?: { startDate?: string; endDate?: string }) =>
    apiClient.get<{ data: Record<string, unknown> }>('/trips/stats', {
      params,
    }),
};
