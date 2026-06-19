import { useMemo, useState } from 'react';
import {
  Button,
  Card,
  Col,
  DatePicker,
  Descriptions,
  Empty,
  Form,
  type FormInstance,
  Input,
  Modal,
  Popconfirm,
  Row,
  Skeleton,
  Space,
  Table,
  Tabs,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import { QuestionCircleOutlined } from '@ant-design/icons';
import { VndInputNumber } from '@/components/common/VndInputNumber';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { useParams, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  Legend,
} from 'recharts';
import {
  fetchVehicleDetailDashboard,
  createVehicleFuel,
  updateVehicleFuel,
  deleteVehicleFuel,
  createVehicleRepairTx,
  updateVehicleRepairTx,
  deleteVehicleRepairTx,
  type VehicleExpensePayload,
} from '../services';
import type {
  VehicleExpenseRow,
  VehicleDetailSummary,
  VehicleTripRow,
} from '../vehicleDetailTypes';
import { vehiclePlate, vehicleTypeLabel, vehicleYearLabel } from '../types';
import { ROUTES } from '@/config/routes';
import { formatMoneyVi } from '@/utils/number';
import { DownloadOutlined } from '@ant-design/icons';
import { exportVehicleReport } from '@/utils/exportReport';

const PIE_COLORS = ['#22c55e', '#ef4444', '#f97316', '#2563eb', '#06b6d4', '#a855f7'];

function monthRangeDefault(): [Dayjs, Dayjs] {
  const start = dayjs().startOf('month');
  const end = dayjs().endOf('month');
  return [start, end];
}

/** Map summary → pie chart data (mỗi khoản chi phí 1 slice) */
function summaryToChartData(s: VehicleDetailSummary) {
  return [
    { name: 'Xăng dầu', value: Math.max(0, s.fuelCost) },
    { name: 'Sửa chữa', value: Math.max(0, s.repairCost) },
    { name: 'Lương tài xế (%)', value: Math.max(0, s.driverPercentCost) },
    { name: 'Lương phụ xe', value: Math.max(0, s.assistantSalary) },
    { name: 'Phụ cấp phụ xe', value: Math.max(0, s.assistantAllowance) },
    { name: 'Hoa hồng', value: Math.max(0, s.commissionContact) },
    { name: 'Phí cầu đường', value: Math.max(0, s.tollCost) },
    { name: 'Vé vào cổng', value: Math.max(0, s.ticketCost) },
    { name: 'Luật / phạt', value: Math.max(0, s.fineCost) },
    { name: 'Chi phí khác', value: Math.max(0, s.otherCosts) },
  ].filter((d) => d.value > 0);
}

/** Tổng chi phí = revenue − profit */
function totalExpenseFromSummary(s: VehicleDetailSummary): number {
  return s.revenue - s.profit;
}

export function VehicleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(() => monthRangeDefault());

  const fromDate = dateRange?.[0]?.format('YYYY-MM-DD');
  const toDate = dateRange?.[1]?.format('YYYY-MM-DD');

  const { data: dashboard, isLoading, isFetching } = useQuery({
    queryKey: ['vehicle-detail-dashboard', id, fromDate, toDate],
    queryFn: () =>
      fetchVehicleDetailDashboard(id!, {
        fromDate: fromDate!,
        toDate: toDate!,
      }),
    enabled: !!id && !!fromDate && !!toDate,
  });

  const vehicle = dashboard?.vehicle;
  const summary = dashboard?.summary;
  const operations = dashboard?.operations;

  const chartData = useMemo(() => (summary ? summaryToChartData(summary) : []), [summary]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['vehicle-detail-dashboard', id] });
  };

  if (isLoading && !dashboard) {
    return (
      <div>
        <h2 style={{ marginBottom: 24 }}>Chi tiết xe</h2>
        <Skeleton active paragraph={{ rows: 6 }} />
      </div>
    );
  }

  if (!vehicle || !id) {
    return (
      <div style={{ padding: 48 }}>
        <Empty description="Không tìm thấy xe" />
      </div>
    );
  }

  const v = vehicle;
  const yearLabel = vehicleYearLabel(v);

  function handleExportVehicle() {
    if (!summary || !operations || !vehicle) return;
    const plate = String(vehicle.licensePlate ?? vehicle.plateNumber ?? 'xe');
    exportVehicleReport({
      plateNumber: plate,
      fromDate: fromDate!,
      toDate: toDate!,
      summary,
      trips: operations.trips,
    });
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ margin: 0 }}>Chi tiết xe</h2>
        <Button
          icon={<DownloadOutlined />}
          onClick={handleExportVehicle}
          disabled={!summary || isFetching}
        >
          Xuất báo cáo Excel
        </Button>
      </div>

      <Row gutter={16}>
        <Col xs={24} md={16}>
          <Card title="Thông tin xe" style={{ marginBottom: 16 }}>
            <Descriptions column={1}>
              <Descriptions.Item label="Biển số">{vehiclePlate(v) || '—'}</Descriptions.Item>
              <Descriptions.Item label="Loại xe">{vehicleTypeLabel(v) || '—'}</Descriptions.Item>
              <Descriptions.Item label="Hãng">{String(v.brand ?? '-')}</Descriptions.Item>
              <Descriptions.Item label="Model">{String(v.model ?? '-')}</Descriptions.Item>
              <Descriptions.Item label="Năm sản xuất">
                {yearLabel != null ? String(yearLabel) : '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Tải trọng (kg)">{v.capacity != null ? String(v.capacity) : '-'}</Descriptions.Item>
              <Descriptions.Item label="Trạng thái">
                <Tag
                  color={
                    v.status === 'active'
                      ? 'green'
                      : v.status === 'maintenance'
                      ? 'orange'
                      : 'default'
                  }
                >
                  {v.status === 'active'
                    ? 'Hoạt động'
                    : v.status === 'maintenance'
                    ? 'Bảo trì'
                    : 'Ngừng hoạt động'}
                </Tag>
              </Descriptions.Item>
              {v.status === 'maintenance' ? (
                <Descriptions.Item label="Chi phí bảo trì (VND)">
                  {formatMoneyVi(v.maintenanceCost, '—')}
                </Descriptions.Item>
              ) : null}
            </Descriptions>
          </Card>
        </Col>
      </Row>

      <Card title="Tổng quan tài chính" style={{ marginBottom: 16 }}>
        <Space wrap style={{ marginBottom: 16 }}>
          <Typography.Text type="secondary">Khoảng thời gian (mặc định tháng hiện tại):</Typography.Text>
          <DatePicker.RangePicker
            value={dateRange}
            onChange={(r) => {
              setDateRange(r ?? monthRangeDefault());
            }}
            format="DD/MM/YYYY"
          />
        </Space>

        {isFetching ? (
          <Skeleton active paragraph={{ rows: 2 }} />
        ) : summary ? (
          <>
            {/* ── Row 1: KPI chính ── */}
            <Row gutter={[12, 12]} style={{ marginBottom: 12 }}>
              <Col xs={12} sm={6}>
                <Card size="small" style={{ borderColor: '#22c55e', textAlign: 'center' }}>
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>Số chuyến</Typography.Text>
                  <div style={{ fontSize: 22, fontWeight: 700 }}>{summary.tripCount ?? 0}</div>
                </Card>
              </Col>
              <Col xs={12} sm={6}>
                <Card size="small" style={{ borderColor: '#22c55e', textAlign: 'center' }}>
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>Doanh thu</Typography.Text>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#16a34a' }}>
                    {formatMoneyVi(summary.revenue, '0')}
                  </div>
                </Card>
              </Col>
              <Col xs={12} sm={6}>
                <Card size="small" style={{ borderColor: '#2563eb', textAlign: 'center' }}>
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>Đã thu</Typography.Text>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#2563eb' }}>
                    {formatMoneyVi(summary.paidAmount, '0')}
                  </div>
                </Card>
              </Col>
              <Col xs={12} sm={6}>
                <Card size="small" style={{ borderColor: '#f97316', textAlign: 'center' }}>
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>Công nợ</Typography.Text>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#ea580c' }}>
                    {formatMoneyVi(summary.debtAmount, '0')}
                  </div>
                </Card>
              </Col>
            </Row>

            {/* ── Row 2: Chi phí & Lợi nhuận ── */}
            <Row gutter={[12, 12]} style={{ marginBottom: 24 }}>
              <Col xs={24} sm={12}>
                <Card size="small" style={{ borderColor: '#ef4444', textAlign: 'center' }}>
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>Tổng chi phí</Typography.Text>
                  <div style={{ fontSize: 20, fontWeight: 700, color: '#dc2626' }}>
                    {formatMoneyVi(totalExpenseFromSummary(summary), '0')}
                  </div>
                </Card>
              </Col>
              <Col xs={24} sm={12}>
                <Card size="small" style={{ textAlign: 'center' }}>
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>Lợi nhuận</Typography.Text>
                  <div
                    style={{
                      fontSize: 20,
                      fontWeight: 700,
                      color: summary.profit >= 0 ? '#16a34a' : '#dc2626',
                    }}
                  >
                    {formatMoneyVi(summary.profit, '0')}
                  </div>
                </Card>
              </Col>
            </Row>

            <Typography.Title level={5} style={{ marginTop: 0 }}>
              Phân tích chi phí
            </Typography.Title>
            <Descriptions
              bordered
              size="small"
              column={2}
              style={{ marginBottom: 24 }}
              labelStyle={{ width: 180 }}
            >
              <Descriptions.Item label="Xăng dầu (xe)">
                {formatMoneyVi(summary.fuelCost, '0')}
              </Descriptions.Item>
              <Descriptions.Item label="Sửa chữa (xe)">
                {formatMoneyVi(summary.repairCost, '0')}
              </Descriptions.Item>
              <Descriptions.Item label="Phí cầu đường">
                {formatMoneyVi(summary.tollCost, '0')}
              </Descriptions.Item>
              <Descriptions.Item label="Vé vào cổng / gửi xe">
                {formatMoneyVi(summary.ticketCost, '0')}
              </Descriptions.Item>
              <Descriptions.Item label="Luật / phạt">
                {formatMoneyVi(summary.fineCost, '0')}
              </Descriptions.Item>
              <Descriptions.Item label="Chi phí khác">
                {formatMoneyVi(summary.otherCosts, '0')}
              </Descriptions.Item>
              <Descriptions.Item
                label={
                  <span>
                    Lương tài xế (%)
                    <Tooltip title="Net chuyến × 10% (ca ngày) / 15% (ca đêm). Net = doanh thu − cầu − vé − luật − chi phí khác − phụ cấp phụ xe − hoa hồng.">
                      <QuestionCircleOutlined style={{ color: '#999', marginLeft: 4 }} />
                    </Tooltip>
                  </span>
                }
              >
                {formatMoneyVi(summary.driverPercentCost, '0')}
              </Descriptions.Item>
              <Descriptions.Item label="Lương phụ xe">
                {formatMoneyVi(summary.assistantSalary, '0')}
              </Descriptions.Item>
              <Descriptions.Item label="Phụ cấp phụ xe">
                {formatMoneyVi(summary.assistantAllowance, '0')}
              </Descriptions.Item>
              <Descriptions.Item label="Hoa hồng liên hệ">
                {formatMoneyVi(summary.commissionContact, '0')}
              </Descriptions.Item>
            </Descriptions>

            <Typography.Title level={5}>Biểu đồ cơ cấu chi phí</Typography.Title>
            {chartData.length === 0 ? (
              <Empty description="Chưa có dữ liệu" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
              <div style={{ width: '100%', height: 320 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={chartData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={120}
                      label={({ name, percent }) =>
                        `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                      }
                    >
                      {chartData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip formatter={(v: number) => formatMoneyVi(v, '0')} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </>
        ) : (
          <Empty description="Chưa có dữ liệu" />
        )}
      </Card>

      <Card title="Lịch sử vận hành">
        <Tabs
          items={[
            {
              key: 'trips',
              label: 'Chuyến xe',
              children: (
                <TripsTable
                  rows={operations?.trips ?? []}
                  loading={isFetching}
                  onRowClick={(tripId) => navigate(`${ROUTES.TRIPS}/${tripId}`)}
                />
              ),
            },
            {
              key: 'fuel',
              label: 'Nhiên liệu',
              children: (
                <ExpenseCrudTab
                  kind="fuel"
                  vehicleId={id}
                  rows={operations?.fuels ?? []}
                  loading={isFetching}
                  onChanged={invalidate}
                />
              ),
            },
            {
              key: 'repairs',
              label: 'Sửa chữa',
              children: (
                <ExpenseCrudTab
                  kind="repair"
                  vehicleId={id}
                  rows={operations?.repairs ?? []}
                  loading={isFetching}
                  onChanged={invalidate}
                />
              ),
            },
            {
              key: 'debts',
              label: 'Công nợ',
              children: <DebtsTable rows={operations?.debts ?? []} loading={isFetching} />,
            },
          ]}
        />
      </Card>
    </div>
  );
}

function tripShiftLabel(shift: VehicleTripRow['driverShift']) {
  if (shift === 'night') return 'Đêm';
  return 'Ngày';
}

function TripsTable({
  rows,
  loading,
  onRowClick,
}: {
  rows: VehicleTripRow[];
  loading: boolean;
  onRowClick: (id: string) => void;
}) {
  if (!loading && rows.length === 0) {
    return <Empty description="Chưa có dữ liệu" />;
  }
  return (
    <Table<VehicleTripRow>
      rowKey="id"
      loading={loading}
      dataSource={rows}
      pagination={false}
      locale={{ emptyText: 'Chưa có dữ liệu' }}
      scroll={{ x: 1400 }}
      onRow={(r) => ({
        onClick: () => onRowClick(r.id),
        style: { cursor: 'pointer' },
      })}
      columns={[
        {
          title: 'Ngày',
          dataIndex: 'tripDate',
          width: 105,
          fixed: 'left',
          render: (d: string) => (d ? dayjs(d).format('DD/MM/YYYY') : '—'),
        },
        {
          title: 'Mã chuyến',
          dataIndex: 'tripCode',
          width: 110,
          render: (c: string | null) => c ?? '—',
        },
        {
          title: 'Ca',
          dataIndex: 'driverShift',
          width: 75,
          render: (_: unknown, r: VehicleTripRow) => tripShiftLabel(r.driverShift),
        },
        {
          title: 'Lái xe',
          dataIndex: 'driverName',
          width: 130,
          ellipsis: true,
          render: (v: string | null) => v ?? '—',
        },
        {
          title: 'Khách hàng',
          dataIndex: 'customerName',
          width: 140,
          ellipsis: true,
          render: (v: string | null) => v ?? '—',
        },
        {
          title: 'Tuyến',
          dataIndex: 'address',
          width: 160,
          ellipsis: true,
          render: (v: string | null) => v ?? '—',
        },
        {
          title: 'Doanh thu',
          dataIndex: 'revenue',
          align: 'right',
          width: 115,
          render: (v: number) => formatMoneyVi(v, '0'),
        },
        {
          title: 'Đã thu',
          dataIndex: 'paidAmount',
          align: 'right',
          width: 110,
          render: (v: number) => formatMoneyVi(v, '0'),
        },
        {
          title: 'Công nợ',
          key: 'debt',
          align: 'right',
          width: 110,
          render: (_: unknown, r: VehicleTripRow) => {
            const debt = r.revenue - r.paidAmount;
            return (
              <span style={{ color: debt > 0 ? '#dc2626' : '#16a34a' }}>
                {formatMoneyVi(Math.max(0, debt), '0')}
              </span>
            );
          },
        },
        {
          title: 'Cầu + Vé + Luật',
          key: 'tripCosts',
          align: 'right',
          width: 130,
          render: (_: unknown, r: VehicleTripRow) => {
            const total = r.tollCost + r.ticketCost + r.fineCost;
            if (total === 0) return '—';
            return (
              <span>
                <b>{formatMoneyVi(total, '0')}</b>
                {r.tollCost > 0 && (
                  <span style={{ display: 'block', color: '#666', fontSize: 11 }}>
                    Cầu: {formatMoneyVi(r.tollCost, '0')}
                  </span>
                )}
                {r.ticketCost > 0 && (
                  <span style={{ display: 'block', color: '#666', fontSize: 11 }}>
                    Vé: {formatMoneyVi(r.ticketCost, '0')}
                  </span>
                )}
                {r.fineCost > 0 && (
                  <span style={{ display: 'block', color: '#dc2626', fontSize: 11 }}>
                    Luật: {formatMoneyVi(r.fineCost, '0')}
                  </span>
                )}
              </span>
            );
          },
        },
        {
          title: 'CP khác',
          key: 'otherCosts',
          align: 'right',
          width: 110,
          render: (_: unknown, r: VehicleTripRow) => {
            if (!r.otherCosts) return '—';
            return (
              <span>
                {formatMoneyVi(r.otherCosts, '0')}
                {r.otherCostsNote && (
                  <span style={{ display: 'block', color: '#666', fontSize: 11 }}>
                    {r.otherCostsNote}
                  </span>
                )}
              </span>
            );
          },
        },
        {
          title: 'Lương TX',
          dataIndex: 'driverSalary',
          align: 'right',
          width: 110,
          render: (v: number) => formatMoneyVi(v, '0'),
        },
        {
          title: 'Trạng thái',
          dataIndex: 'status',
          width: 110,
          render: (s: string) => <Tag>{s}</Tag>,
        },
      ]}
    />
  );
}

function DebtsTable({
  rows,
  loading,
}: {
  rows: {
    id: string;
    amount?: number | string;
    remaining?: number | string;
    dueDate?: string | Date;
    status?: string;
    tripId?: string | null;
    note?: string | null;
  }[];
  loading: boolean;
}) {
  if (!loading && rows.length === 0) {
    return <Empty description="Chưa có dữ liệu" />;
  }
  return (
    <Table
      rowKey="id"
      loading={loading}
      dataSource={rows}
      pagination={false}
      locale={{ emptyText: 'Chưa có dữ liệu' }}
      columns={[
        {
          title: 'Hạn thanh toán',
          dataIndex: 'dueDate',
          render: (d: string | Date) =>
            d ? (typeof d === 'string' ? d.slice(0, 10) : dayjs(d).format('YYYY-MM-DD')) : '—',
        },
        {
          title: 'Số tiền',
          dataIndex: 'amount',
          align: 'right',
          render: (v: unknown) => formatMoneyVi(v, '—'),
        },
        {
          title: 'Còn lại',
          dataIndex: 'remaining',
          align: 'right',
          render: (v: unknown) => formatMoneyVi(v, '—'),
        },
        { title: 'Trạng thái', dataIndex: 'status', render: (s: string) => <Tag>{s ?? '—'}</Tag> },
        { title: 'Ghi chú', dataIndex: 'note', ellipsis: true, render: (t: string) => t ?? '—' },
      ]}
    />
  );
}

function ExpenseCrudTab({
  kind,
  vehicleId,
  rows,
  loading,
  onChanged,
}: {
  kind: 'fuel' | 'repair';
  vehicleId: string;
  rows: VehicleExpenseRow[];
  loading: boolean;
  onChanged: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<VehicleExpenseRow | null>(null);
  const [form] = Form.useForm<VehicleExpensePayload & { note?: string }>();

  const createFuel = useMutation({
    mutationFn: (p: VehicleExpensePayload) => createVehicleFuel(vehicleId, p),
    onSuccess: () => {
      onChanged();
      setOpen(false);
      form.resetFields();
    },
  });
  const updateFuel = useMutation({
    mutationFn: ({ fuelId, p }: { fuelId: string; p: Partial<VehicleExpensePayload> }) =>
      updateVehicleFuel(vehicleId, fuelId, p),
    onSuccess: () => {
      onChanged();
      setOpen(false);
      setEditing(null);
      form.resetFields();
    },
  });
  const deleteFuel = useMutation({
    mutationFn: (fuelId: string) => deleteVehicleFuel(vehicleId, fuelId),
    onSuccess: onChanged,
  });

  const createRepair = useMutation({
    mutationFn: (p: VehicleExpensePayload) => createVehicleRepairTx(vehicleId, p),
    onSuccess: () => {
      onChanged();
      setOpen(false);
      form.resetFields();
    },
  });
  const updateRepair = useMutation({
    mutationFn: ({ repairId, p }: { repairId: string; p: Partial<VehicleExpensePayload> }) =>
      updateVehicleRepairTx(vehicleId, repairId, p),
    onSuccess: () => {
      onChanged();
      setOpen(false);
      setEditing(null);
      form.resetFields();
    },
  });
  const deleteRepair = useMutation({
    mutationFn: (repairId: string) => deleteVehicleRepairTx(vehicleId, repairId),
    onSuccess: onChanged,
  });

  const openCreate = () => {
    setEditing(null);
    form.setFieldsValue({
      transactionDate: dayjs().format('YYYY-MM-DD'),
      amount: undefined,
      note: undefined,
    });
    setOpen(true);
  };

  const openEdit = (r: VehicleExpenseRow) => {
    setEditing(r);
    const d = typeof r.date === 'string' ? r.date.slice(0, 10) : dayjs(r.date as Date).format('YYYY-MM-DD');
    form.setFieldsValue({
      transactionDate: d,
      amount: Number(r.amount),
      note: r.note ?? undefined,
    });
    setOpen(true);
  };

  const submit = async () => {
    const values = await form.validateFields();
    const payload: VehicleExpensePayload = {
      transactionDate: values.transactionDate,
      amount: Number(values.amount),
      note: values.note,
      description: values.note,
    };
    if (kind === 'fuel') {
      if (editing) {
        await updateFuel.mutateAsync({ fuelId: editing.id, p: payload });
      } else {
        await createFuel.mutateAsync(payload);
      }
    } else {
      if (editing) {
        await updateRepair.mutateAsync({ repairId: editing.id, p: payload });
      } else {
        await createRepair.mutateAsync(payload);
      }
    }
  };

  const handleDelete = (r: VehicleExpenseRow) => {
    if (kind === 'fuel') {
      deleteFuel.mutate(r.id);
    } else {
      deleteRepair.mutate(r.id);
    }
  };

  const pending =
    createFuel.isPending ||
    updateFuel.isPending ||
    deleteFuel.isPending ||
    createRepair.isPending ||
    updateRepair.isPending ||
    deleteRepair.isPending;

  return (
    <div>
      <Button type="primary" onClick={openCreate} style={{ marginBottom: 16 }}>
        Thêm
      </Button>
      <Table<VehicleExpenseRow>
        rowKey="id"
        loading={loading}
        dataSource={rows}
        pagination={false}
        locale={{ emptyText: 'Chưa có dữ liệu' }}
        columns={[
          {
            title: 'Ngày',
            dataIndex: 'date',
            render: (d: string) => (d ? String(d).slice(0, 10) : '—'),
          },
          {
            title: 'Số tiền',
            dataIndex: 'amount',
            align: 'right',
            render: (v: unknown) => formatMoneyVi(v, '—'),
          },
          {
            title: 'Ghi chú',
            dataIndex: 'note',
            ellipsis: true,
            render: (t: string | null) => t?.trim() || '—',
          },
          {
            title: 'Thao tác',
            key: 'actions',
            width: 160,
            render: (_, r) => (
              <Space>
                <Button type="link" size="small" onClick={() => openEdit(r)}>
                  Sửa
                </Button>
                <Popconfirm title="Xóa bản ghi?" onConfirm={() => handleDelete(r)}>
                  <Button type="link" size="small" danger>
                    Xóa
                  </Button>
                </Popconfirm>
              </Space>
            ),
          },
        ]}
      />
      <Modal
        title={editing ? 'Sửa' : 'Thêm'}
        open={open}
        onCancel={() => {
          setOpen(false);
          setEditing(null);
          form.resetFields();
        }}
        onOk={submit}
        confirmLoading={pending}
        destroyOnClose
      >
        <ExpenseForm form={form} />
      </Modal>
    </div>
  );
}

function ExpenseForm({ form }: { form: FormInstance<VehicleExpensePayload & { note?: string }> }) {
  return (
    <Form form={form} layout="vertical">
      <Form.Item
        name="transactionDate"
        label="Ngày"
        rules={[{ required: true, message: 'Chọn ngày' }]}
      >
        <Input type="date" />
      </Form.Item>
      <Form.Item
        name="amount"
        label="Số tiền (VND)"
        rules={[{ required: true, message: 'Nhập số tiền' }]}
      >
        <VndInputNumber min={1} placeholder="0" />
      </Form.Item>
      <Form.Item name="note" label="Ghi chú">
        <Input.TextArea rows={2} />
      </Form.Item>
    </Form>
  );
}
