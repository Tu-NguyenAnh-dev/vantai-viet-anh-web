import { apiClient } from '@/api/client';
import type { Trip, TripStatsData, TripsListResponse } from '../types';

/** Query GET /trips — align QueryTripDto */
export type QueryTripParams = {
  page?: number;
  limit?: number;
  startDate?: string;
  endDate?: string;
  vehicleId?: string;
  driverId?: string;
  customerId?: string;
  status?: string;
  search?: string;
};

export const tripApi = {
  getTrips: (params?: QueryTripParams) =>
    apiClient.get<TripsListResponse>('/trips', { params }),

  getTripDetail: (id: string) =>
    apiClient.get<{ success: boolean; data: Trip }>(`/trips/${id}`),

  createTrip: (data: Record<string, unknown>) =>
    apiClient.post<{ success: boolean; data: Trip }>('/trips', data),

  updateTrip: (id: string, data: Record<string, unknown>) =>
    apiClient.patch<{ success: boolean; data: Trip }>(`/trips/${id}`, data),

  assignTrip: (id: string, data: { vehicleId: string; driverId: string }) =>
    apiClient.patch<{ success: boolean; data: Trip }>(`/trips/${id}/assign`, data),

  /** BE yêu cầu status UPPERCASE trong body */
  updateTripStatus: (id: string, status: string) =>
    apiClient.patch<{ success: boolean; data: Trip }>(`/trips/${id}/status`, {
      status: status.toUpperCase().replace(/ /g, '_'),
    }),

  deleteTrip: (id: string) => apiClient.delete(`/trips/${id}`),

  getStats: (params?: { startDate?: string; endDate?: string }) =>
    apiClient.get<{ success?: boolean; data: TripStatsData }>('/trips/stats', {
      params,
    }),

  /** `data.buffer` base64, `data.fileName` */
  exportTrips: (params?: QueryTripParams) =>
    apiClient.get<{
      success?: boolean;
      data: { buffer: string; fileName?: string };
    }>('/trips/export', { params }),
};

