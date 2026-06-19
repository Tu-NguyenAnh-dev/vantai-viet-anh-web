import { Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import type { Trip } from '../types';
import { formatMoneyVi, normalizeNumeric } from '@/utils/number';

function driverLabel(t: Trip) {
  const d = t.driver;
  if (!d) return '—';
  return d.fullName ?? d.name ?? '—';
}

function customerLabel(t: Trip) {
  return t.customerName ?? t.customer?.name ?? '—';
}

function managerLabel(t: Trip) {
  return t.managerName ?? t.manager?.fullName ?? t.manager?.name ?? '—';
}

function plateLabel(t: Trip) {
  return t.vehicle?.licensePlate ?? '—';
}

function coDriverLabel(t: Trip) {
  const d = t.coDriver;
  if (!d) return '—';
  return d.fullName ?? d.name ?? '—';
}

function shiftLabel(t: Trip) {
  if (t.driverShift === 'night') return 'Đêm';
  if (t.driverShift === 'day') return 'Ngày';
  return '—';
}

function commissionContactLabel(t: Trip) {
  return t.commissionContactName ?? t.contactEmployee?.fullName ?? t.contactEmployee?.name ?? '—';
}

function priceValue(t: Trip) {
  const p = t.price ?? t.revenue;
  return formatMoneyVi(p, '—');
}

function debtLabel(t: Trip) {
  if (t.debtRemaining != null && t.debtRemaining !== '') {
    return formatMoneyVi(t.debtRemaining, '—');
  }
  const rev = normalizeNumeric(t.revenue ?? t.price, 0);
  const paid = normalizeNumeric(t.paidAmount, 0);
  return formatMoneyVi(Math.max(0, rev - paid), '0');
}

/** Tổng chi phí = cầu + vé + luật + khác */
function totalCostsValue(t: Trip): number {
  return (
    normalizeNumeric(t.tollCost, 0) +
    normalizeNumeric(t.ticketCost, 0) +
    normalizeNumeric(t.fineCost, 0) +
    normalizeNumeric(t.otherCosts, 0)
  );
}

function costsCell(t: Trip) {
  const total = totalCostsValue(t);
  if (total === 0) return '0';

  const parts: string[] = [];
  if (normalizeNumeric(t.tollCost, 0) > 0)
    parts.push(`Cầu: ${formatMoneyVi(t.tollCost, '0')}`);
  if (normalizeNumeric(t.ticketCost, 0) > 0)
    parts.push(`Vé: ${formatMoneyVi(t.ticketCost, '0')}`);
  if (normalizeNumeric(t.fineCost, 0) > 0)
    parts.push(`Luật: ${formatMoneyVi(t.fineCost, '0')}`);
  if (normalizeNumeric(t.otherCosts, 0) > 0) {
    const note = t.otherCostsNote?.trim();
    parts.push(`Khác: ${formatMoneyVi(t.otherCosts, '0')}${note ? ` (${note})` : ''}`);
  }

  return (
    <span>
      <b>{formatMoneyVi(total, '0')}</b>
      {parts.map((p, i) => (
        <span key={i} style={{ display: 'block', color: '#666', fontSize: 11 }}>
          {p}
        </span>
      ))}
    </span>
  );
}

type TripTableProps = {
  data: Trip[];
  loading?: boolean;
  pagination?: {
    current: number;
    pageSize: number;
    total: number;
    onChange: (page: number, pageSize: number) => void;
  };
};

export default function TripTable({ data, loading, pagination }: TripTableProps) {
  const navigate = useNavigate();

  const columns: ColumnsType<Trip> = [
    {
      title: 'Ngày',
      dataIndex: 'tripDate',
      width: 110,
      render: (d: string) => (d ? dayjs(d).format('DD/MM/YYYY') : '—'),
    },
    {
      title: 'Lái xe',
      key: 'driver',
      width: 140,
      ellipsis: true,
      render: (_, record) => driverLabel(record),
    },
    {
      title: 'Xe',
      key: 'vehicle',
      width: 110,
      ellipsis: true,
      render: (_, record) => plateLabel(record),
    },
    {
      title: 'Ghi chú',
      dataIndex: 'notes',
      ellipsis: true,
      render: (v: string | null | undefined) => v?.trim() || '—',
    },
    {
      title: 'Giá thành',
      key: 'price',
      align: 'right',
      width: 120,
      render: (_, record) => priceValue(record),
    },
    {
      title: 'Đã thanh toán',
      dataIndex: 'paidAmount',
      align: 'right',
      width: 130,
      render: (v: unknown) => formatMoneyVi(v, '—'),
    },
    {
      title: 'Công nợ',
      key: 'debt',
      align: 'right',
      width: 120,
      render: (_, record) => debtLabel(record),
    },
    {
      title: 'Quản lý',
      key: 'manager',
      width: 130,
      ellipsis: true,
      render: (_, record) => managerLabel(record),
    },
    {
      title: 'Khách hàng',
      key: 'customer',
      width: 160,
      ellipsis: true,
      render: (_, record) => customerLabel(record),
    },
    {
      title: 'Phụ xe',
      key: 'coDriver',
      width: 130,
      ellipsis: true,
      render: (_, record) => coDriverLabel(record),
    },
    {
      title: 'Ca',
      key: 'driverShift',
      width: 72,
      render: (_, record) => shiftLabel(record),
    },
    {
      title: 'Phụ cấp PX',
      key: 'assistantAllowance',
      align: 'right',
      width: 110,
      render: (_, record) => formatMoneyVi(record.assistantAllowance, '—'),
    },
    {
      title: 'Xăng (xe)',
      key: 'fuelCost',
      align: 'right',
      width: 100,
      render: (_, record) => formatMoneyVi(record.fuelCost, '—'),
    },
    {
      title: 'HH liên hệ',
      key: 'commissionContact',
      width: 130,
      ellipsis: true,
      render: (_, record) => commissionContactLabel(record),
    },
    {
      title: 'Chi phí (tổng)',
      key: 'costs',
      width: 200,
      render: (_, record) => costsCell(record),
    },
  ];

  return (
    <Table
      rowKey="id"
      loading={loading}
      columns={columns}
      dataSource={data}
      pagination={pagination}
      scroll={{ x: 2100 }}
      onRow={(record) => ({
        onClick: () => navigate(`/trips/${record.id}`),
        style: { cursor: 'pointer' },
      })}
    />
  );
}
