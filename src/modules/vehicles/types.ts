export type VehicleStatus = 'active' | 'inactive' | 'maintenance';

export type Vehicle = {
  id: string;
  /** DB: `licensePlate` — API có thể trả thêm alias `plateNumber` */
  licensePlate: string;
  /** DB: `vehicleType` — alias `type` */
  vehicleType: string;
  plateNumber?: string;
  type?: string;
  manufactureYear?: number;
  brand?: string;
  model?: string;
  year?: number;
  capacity?: number;
  status: VehicleStatus;
  /** Chỉ khi status = maintenance; BE đồng bộ Thu–Chi */
  maintenanceCost?: number | string | null;
};

/** Ưu tiên alias API mới, fallback trường gốc (list + detail) */
export function vehiclePlate(v: { licensePlate?: string; plateNumber?: string }): string {
  const p =
    v.plateNumber != null && String(v.plateNumber).trim() !== ''
      ? String(v.plateNumber)
      : v.licensePlate != null
      ? String(v.licensePlate)
      : '';
  return p;
}

export function vehicleTypeLabel(v: { vehicleType?: string; type?: string }): string {
  if (v.type != null && String(v.type).trim() !== '') return String(v.type);
  return v.vehicleType ?? '';
}

export function vehicleYearLabel(v: { year?: number; manufactureYear?: number }): number | undefined {
  if (v.manufactureYear != null) return Number(v.manufactureYear);
  return v.year;
}

