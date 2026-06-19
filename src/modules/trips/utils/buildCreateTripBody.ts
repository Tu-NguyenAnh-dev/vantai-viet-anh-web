import dayjs, { type Dayjs } from 'dayjs';
import type { Trip } from '../types';

/**
 * Body POST/PATCH /trips — align CreateTripDto (whitelist).
 * `fuelCost` không nhập trên chuyến — ghi nhận tại module xe (dầu theo ngày).
 */
export type TripFormSubmitValues = {
  customerId: string;
  vehicleId?: string;
  driverId?: string;
  coDriverId?: string | null;
  managerId?: string | null;
  /** Ant Design DatePicker */
  tripDate: Dayjs;
  address?: string;
  price?: number;
  paidAmount?: number;
  tollCost?: number;
  /** Vé vào cổng / gửi xe */
  ticketCost?: number;
  /** Luật / phạt */
  fineCost?: number;
  otherCosts?: number;
  otherCostsNote?: string;
  notes?: string;
  contactEmployeeId?: string | null;
  commissionRateApplied?: number | string | null;
  /** Mặc định `day` — BE */
  driverShift?: 'day' | 'night';
  assistantAllowance?: number;
};

export function buildCreateTripBody(values: TripFormSubmitValues): Record<string, unknown> {
  const tripDate = values.tripDate.format('YYYY-MM-DD');

  const body: Record<string, unknown> = {
    tripDate,
    customerId: values.customerId,
    paidAmount: Number(values.paidAmount ?? 0),
    tollCost: Number(values.tollCost ?? 0),
    ticketCost: Number(values.ticketCost ?? 0),
    fineCost: Number(values.fineCost ?? 0),
    otherCosts: Number(values.otherCosts ?? 0),
  };

  if (values.vehicleId) body.vehicleId = values.vehicleId;
  if (values.driverId) body.driverId = values.driverId;
  if (values.coDriverId) body.coDriverId = values.coDriverId;

  const ocn = values.otherCostsNote?.trim();
  if (ocn) body.otherCostsNote = ocn;

  if (values.managerId != null && values.managerId !== '') {
    body.managerId = values.managerId;
  } else {
    body.managerId = null;
  }

  if (values.price != null && String(values.price).trim() !== '') {
    body.revenue = Number(values.price);
  }

  const addressTrim = values.address?.trim();
  if (addressTrim) body.address = addressTrim;

  const notesTrim = values.notes?.trim();
  if (notesTrim) body.notes = notesTrim;

  if (values.contactEmployeeId != null && values.contactEmployeeId !== '') {
    body.contactEmployeeId = values.contactEmployeeId;
  } else {
    body.contactEmployeeId = null;
  }

  const rate = values.commissionRateApplied;
  if (rate != null && rate !== '') {
    body.commissionRateApplied = Number(rate);
  } else {
    body.commissionRateApplied = null;
  }

  body.driverShift = values.driverShift === 'night' ? 'night' : 'day';

  const coId = values.coDriverId;
  if (coId != null && coId !== '') {
    body.assistantAllowance = Math.max(0, Number(values.assistantAllowance ?? 0));
  } else {
    body.assistantAllowance = 0;
  }

  return body;
}

function n(v: unknown, fallback = 0): number {
  if (v == null || v === '') return fallback;
  const x = Number(v);
  return Number.isFinite(x) ? x : fallback;
}

export function tripToFormValues(trip: Trip): TripFormSubmitValues {
  const price = trip.price != null && trip.price !== '' ? n(trip.price) : n(trip.revenue);
  return {
    customerId: trip.customerId,
    vehicleId: trip.vehicleId,
    driverId: trip.driverId,
    coDriverId: trip.coDriverId ?? null,
    managerId: trip.managerId ?? null,
    tripDate: dayjs(trip.tripDate),
    address: trip.address?.trim() ? trip.address : undefined,
    price,
    paidAmount: n(trip.paidAmount),
    tollCost: n(trip.tollCost),
    ticketCost: n(trip.ticketCost),
    fineCost: n(trip.fineCost),
    otherCosts: n(trip.otherCosts),
    otherCostsNote: trip.otherCostsNote?.trim() ? trip.otherCostsNote : undefined,
    notes: trip.notes?.trim() ? trip.notes : undefined,
    contactEmployeeId: trip.contactEmployeeId ?? null,
    commissionRateApplied:
      trip.commissionRateApplied == null || String(trip.commissionRateApplied).trim() === ''
        ? null
        : (() => {
            const x = Number(trip.commissionRateApplied);
            return Number.isFinite(x) ? x : null;
          })(),
    driverShift: trip.driverShift === 'night' ? 'night' : 'day',
    assistantAllowance: n(trip.assistantAllowance),
  };
}
