import { useMemo, useState } from 'react';
import { Button, Card, Col, DatePicker, Input, Row, Select, Space, Statistic, message } from 'antd';
import { DownloadOutlined, PlusOutlined, UploadOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { ImportExcelModal } from '@/components/common/ImportExcelModal';
import { downloadTemplate } from '@/utils/exportReport';
import type { Dayjs } from 'dayjs';
import { useQuery } from '@tanstack/react-query';
import TripTable from '../components/TripTable';
import { useTrips } from '../hooks/useTrips';
import { tripApi } from '../services/trip.api';
import type { TripStatsData, TripStatusApi } from '../types';
import { customersApi, type Customer } from '@/api/customers';
import { vehiclesApi, type Vehicle } from '@/api/vehicles';
import { employeesApi, type Employee } from '@/api/employees';

const STATUS_OPTIONS: { value: TripStatusApi; label: string }[] = [
  { value: 'new', label: 'Mới' },
  { value: 'assigned', label: 'Đã phân công' },
  { value: 'in_progress', label: 'Đang chạy' },
  { value: 'completed', label: 'Hoàn thành' },
  { value: 'cancelled', label: 'Hủy' },
];

function toList<T>(res: unknown): T[] {
  if (res && typeof res === 'object' && Array.isArray((res as { data?: T[] }).data)) {
    return (res as { data: T[] }).data;
  }
  return [];
}

function downloadExcelBase64(buffer: string, fileName: string) {
  const binary = atob(buffer);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const blob = new Blob([bytes], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName || 'trips.xlsx';
  a.click();
  URL.revokeObjectURL(url);
}

export default function TripListPage() {
  const navigate = useNavigate();
  const [exporting, setExporting] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<TripStatusApi | undefined>(undefined);
  const [customerId, setCustomerId] = useState<string | undefined>(undefined);
  const [vehicleId, setVehicleId] = useState<string | undefined>(undefined);
  const [driverId, setDriverId] = useState<string | undefined>(undefined);
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);

  const { data: customersRes } = useQuery({
    queryKey: ['trips-filter-customers'],
    queryFn: () => customersApi.list({ page: 1, limit: 100 }),
  });
  const { data: vehiclesRes } = useQuery({
    queryKey: ['trips-filter-vehicles'],
    queryFn: () => vehiclesApi.list({ page: 1, limit: 100 }),
  });
  const { data: driversRes } = useQuery({
    queryKey: ['trips-filter-drivers'],
    queryFn: () => employeesApi.getDrivers(),
  });

  const customerOptions = useMemo(
    () =>
      toList<Customer>(customersRes).map((c) => ({
        value: c.id,
        label: c.name,
      })),
    [customersRes],
  );
  const vehicleOptions = useMemo(
    () =>
      toList<Vehicle>(vehiclesRes).map((v) => ({
        value: v.id,
        label: v.licensePlate,
      })),
    [vehiclesRes],
  );
  const driverOptions = useMemo(
    () =>
      toList<Employee>(driversRes).map((e) => ({
        value: e.id,
        label: e.fullName,
      })),
    [driversRes],
  );

  const startDate = dateRange?.[0]?.format('YYYY-MM-DD');
  const endDate = dateRange?.[1]?.format('YYYY-MM-DD');

  const { data, isLoading } = useTrips({
    page,
    limit: pageSize,
    search: search || undefined,
    status,
    customerId,
    vehicleId,
    driverId,
    startDate,
    endDate,
  });

  const { data: statsEnvelope, isFetching: statsLoading } = useQuery({
    queryKey: ['trips-stats', startDate, endDate],
    queryFn: () => tripApi.getStats({ startDate, endDate }),
  });

  const trips = data?.data ?? [];
  const total = data?.pagination?.total ?? 0;

  const stats: TripStatsData | undefined =
    statsEnvelope && typeof statsEnvelope === 'object' && 'data' in statsEnvelope
      ? (statsEnvelope as { data: TripStatsData }).data
      : undefined;

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await tripApi.exportTrips({
        page: 1,
        limit: 10000,
        search: search || undefined,
        status,
        customerId,
        vehicleId,
        driverId,
        startDate,
        endDate,
      });
      const payload = (res as { data?: { buffer: string; fileName?: string } }).data;
      if (!payload?.buffer) {
        message.warning('Không có dữ liệu xuất');
        return;
      }
      downloadExcelBase64(payload.buffer, payload.fileName ?? 'trips.xlsx');
      message.success('Đã tải file');
    } catch (e) {
      message.error(e instanceof Error ? e.message : 'Xuất Excel thất bại');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div>
      <h2 style={{ marginBottom: 16 }}>Quản lý chuyến xe</h2>
      <Space wrap style={{ marginBottom: 16 }} align="start">
        <Input.Search
          allowClear
          placeholder="Mã chuyến, địa chỉ, khách, lái xe, biển số..."
          onSearch={(value) => {
            setSearch(value);
            setPage(1);
          }}
          style={{ width: 280 }}
        />
        <Select
          allowClear
          placeholder="Trạng thái"
          style={{ width: 140 }}
          options={STATUS_OPTIONS}
          value={status}
          onChange={(v) => {
            setStatus(v);
            setPage(1);
          }}
        />
        <Select
          allowClear
          placeholder="Khách hàng"
          style={{ width: 180 }}
          options={customerOptions}
          value={customerId}
          onChange={(v) => {
            setCustomerId(v);
            setPage(1);
          }}
        />
        <Select
          allowClear
          placeholder="Xe"
          style={{ width: 140 }}
          options={vehicleOptions}
          value={vehicleId}
          onChange={(v) => {
            setVehicleId(v);
            setPage(1);
          }}
        />
        <Select
          allowClear
          placeholder="Tài xế"
          style={{ width: 160 }}
          options={driverOptions}
          value={driverId}
          onChange={(v) => {
            setDriverId(v);
            setPage(1);
          }}
        />
        <DatePicker.RangePicker
          value={dateRange}
          onChange={(r) => {
            setDateRange(r);
            setPage(1);
          }}
          placeholder={['Từ ngày', 'Đến ngày']}
        />
      </Space>
      <Card size="small" style={{ marginBottom: 16 }} loading={statsLoading}>
        <Row gutter={24}>
          <Col xs={24} sm={8}>
            <Statistic
              title="Chuyến hoàn thành (theo ngày lọc)"
              value={stats?.totalTrips ?? '—'}
            />
          </Col>
          <Col xs={24} sm={8}>
            <Statistic
              title="Tổng doanh thu"
              value={
                stats?.totalRevenue != null ? Number(stats.totalRevenue) : '—'
              }
              formatter={(v) =>
                typeof v === 'number' && Number.isFinite(v) ? v.toLocaleString('vi-VN') : String(v)
              }
            />
          </Col>
          <Col xs={24} sm={8}>
            <Statistic
              title="Tổng lợi nhuận"
              value={stats?.totalProfit != null ? Number(stats.totalProfit) : '—'}
              formatter={(v) =>
                typeof v === 'number' && Number.isFinite(v) ? v.toLocaleString('vi-VN') : String(v)
              }
            />
          </Col>
        </Row>
      </Card>
      <Space style={{ marginBottom: 16, width: '100%', justifyContent: 'flex-end' }}>
        <Button icon={<UploadOutlined />} onClick={() => setIsImportOpen(true)}>
          Import Excel
        </Button>
        <Button icon={<DownloadOutlined />} loading={exporting} onClick={handleExport}>
          Xuất Excel
        </Button>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => navigate('/trips/create')}
        >
          Tạo đơn vận chuyển
        </Button>
      </Space>
      <ImportExcelModal
        open={isImportOpen}
        type="trips"
        onClose={() => setIsImportOpen(false)}
        onDownloadTemplate={() => downloadTemplate('trips')}
      />
      <TripTable
        data={trips}
        loading={isLoading}
        pagination={{
          current: page,
          pageSize,
          total,
          onChange: (p, ps) => {
            setPage(p);
            setPageSize(ps);
          },
        }}
      />
    </div>
  );
}
