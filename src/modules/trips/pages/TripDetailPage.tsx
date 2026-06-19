import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
  Button,
  Card,
  Descriptions,
  Modal,
  Space,
  Spin,
  message,
} from 'antd';
import { EditOutlined, UserAddOutlined } from '@ant-design/icons';
import { useQueryClient } from '@tanstack/react-query';
import { useTripDetail } from '../hooks/useTripDetail';
import { useAssignTrip } from '../hooks/useAssignTrip';
import { useUpdateStatus } from '../hooks/useUpdateStatus';
import { StatusBadge } from '../components/StatusBadge';
import AssignModal from '../components/AssignModal';
import type { Trip, TripStatusApi } from '../types';
import { useQuery } from '@tanstack/react-query';
import { vehiclesApi, type Vehicle } from '@/api/vehicles';
import { employeesApi, type Employee } from '@/api/employees';

function money(n: string | number | undefined | null) {
  if (n == null || n === '') return '—';
  const x = Number(n);
  if (Number.isNaN(x)) return '—';
  return x.toLocaleString('vi-VN');
}

function driverName(t: Trip) {
  const d = t.driver;
  if (!d) return '—';
  return d.fullName ?? d.name ?? '—';
}

function coDriverName(t: Trip) {
  const d = t.coDriver;
  if (!d) return '—';
  return d.fullName ?? d.name ?? '—';
}

const STATUS_NEXT: Record<TripStatusApi, TripStatusApi[]> = {
  new: ['assigned', 'cancelled'],
  assigned: ['in_progress', 'cancelled'],
  in_progress: ['completed', 'cancelled'],
  completed: ['cancelled'],
  cancelled: [],
};

export default function TripDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [assignOpen, setAssignOpen] = useState(false);

  const { data, isLoading } = useTripDetail(id);
  const assignTrip = useAssignTrip();
  const updateStatus = useUpdateStatus();

  const { data: vehiclesRes } = useQuery({
    queryKey: ['trip-assign-vehicles'],
    queryFn: () => vehiclesApi.list({ page: 1, limit: 100, status: 'active' }),
  });
  const { data: driversRes } = useQuery({
    queryKey: ['trip-assign-drivers'],
    queryFn: () => employeesApi.getDrivers(),
  });

  const vehicleOptions = useMemo(() => {
    const list = (vehiclesRes as { data?: Vehicle[] })?.data ?? [];
    return list.map((v) => ({
      value: v.id,
      label: v.licensePlate,
      disabled: v.status !== 'active',
    }));
  }, [vehiclesRes]);
  const driverOptions = useMemo(() => {
    const list = (driversRes as { data?: Employee[] })?.data ?? [];
    return list.map((e) => ({
      value: e.id,
      label: e.fullName,
    }));
  }, [driversRes]);

  const trip = data?.data;

  const canEdit = trip?.status !== 'completed';
  const canAssign = canEdit && !['cancelled', 'completed'].includes(trip?.status ?? '');
  const nextStatuses = trip ? STATUS_NEXT[trip.status as TripStatusApi] ?? [] : [];
  const hasVehicleDriver = !!(trip?.vehicleId && trip?.driverId);

  const handleAssign = async (vehicleId: string, driverId: string) => {
    if (!id) return;
    try {
      await assignTrip.mutateAsync({ id, data: { vehicleId, driverId } });
      message.success('Phân công thành công');
      setAssignOpen(false);
      queryClient.invalidateQueries({ queryKey: ['trip', id] });
    } catch (e) {
      message.error(e instanceof Error ? e.message : 'Phân công thất bại');
    }
  };

  const handleStatusChange = async (status: string) => {
    if (!id) return;
    if (['in_progress', 'completed'].includes(status) && !hasVehicleDriver) {
      message.warning('Cần gán xe và tài xế trước khi chuyển trạng thái');
      return;
    }
    if (status === 'completed') {
      Modal.confirm({
        title: 'Hoàn thành chuyến',
        content: 'Chuyến hoàn thành không thể sửa sau. Tiếp tục?',
        okText: 'Xác nhận',
        cancelText: 'Hủy',
        onOk: async () => {
          try {
            await updateStatus.mutateAsync({ id, status });
            message.success('Cập nhật trạng thái thành công');
            queryClient.invalidateQueries({ queryKey: ['trip', id] });
          } catch (e) {
            message.error(e instanceof Error ? e.message : 'Thất bại');
          }
        },
      });
    } else {
      try {
        await updateStatus.mutateAsync({ id, status });
        message.success('Cập nhật trạng thái thành công');
        queryClient.invalidateQueries({ queryKey: ['trip', id] });
      } catch (e) {
        message.error(e instanceof Error ? e.message : 'Thất bại');
      }
    }
  };

  if (isLoading || !trip) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
        <Spin size="large" />
      </div>
    );
  }

  const isCompleted = trip.status === 'completed';

  return (
    <div>
      <Space style={{ marginBottom: 16 }} wrap>
        <h2 style={{ margin: 0 }}>Chi tiết chuyến</h2>
        {canEdit ? (
          <Button type="primary" icon={<EditOutlined />} onClick={() => navigate(`/trips/${id}/edit`)}>
            Sửa chuyến
          </Button>
        ) : null}
        {canAssign ? (
          <Button icon={<UserAddOutlined />} onClick={() => setAssignOpen(true)}>
            Gán xe / tài xế
          </Button>
        ) : null}
      </Space>
      {isCompleted ? (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          message="Chuyến đã hoàn thành"
          description="Không thể chỉnh sửa chuyến khi completed. Có thể hủy qua nút Hủy chuyến nếu nghiệp vụ cho phép."
        />
      ) : null}
      <Card>
        <Descriptions column={{ xs: 1, sm: 2 }} bordered size="small">
          <Descriptions.Item label="Mã chuyến">{trip.tripCode ?? '—'}</Descriptions.Item>
          <Descriptions.Item label="Ngày chuyến">{trip.tripDate}</Descriptions.Item>
          <Descriptions.Item label="Khách hàng">
            {trip.customerName ?? trip.customer?.name ?? '—'}
          </Descriptions.Item>
          <Descriptions.Item label="Trạng thái">
            <StatusBadge status={trip.status} />
          </Descriptions.Item>
          <Descriptions.Item label="Địa chỉ chuyến" span={2}>
            {trip.address?.trim() ?? '—'}
          </Descriptions.Item>
          <Descriptions.Item label="Xe">{trip.vehicle?.licensePlate ?? '—'}</Descriptions.Item>
          <Descriptions.Item label="Tài xế">{driverName(trip)}</Descriptions.Item>
          <Descriptions.Item label="Phụ xe">{coDriverName(trip)}</Descriptions.Item>
          <Descriptions.Item label="Ca làm việc">
            {trip.driverShift === 'night' ? 'Ca đêm' : trip.driverShift === 'day' ? 'Ca ngày' : '—'}
          </Descriptions.Item>
          <Descriptions.Item label="Phụ cấp phụ xe">
            {trip.coDriverId != null && trip.coDriverId !== ''
              ? money(trip.assistantAllowance)
              : '—'}
          </Descriptions.Item>
          <Descriptions.Item label="Quản lý">
            {trip.managerName ?? trip.manager?.fullName ?? trip.manager?.name ?? '—'}
          </Descriptions.Item>
          <Descriptions.Item label="Người liên hệ HH">
            {trip.commissionContactName ?? trip.contactEmployee?.fullName ?? trip.contactEmployee?.name ?? '—'}
          </Descriptions.Item>
          <Descriptions.Item label="Giá thành">{money(trip.price ?? trip.revenue)}</Descriptions.Item>
          <Descriptions.Item label="Đã thanh toán">{money(trip.paidAmount)}</Descriptions.Item>
          <Descriptions.Item label="Công nợ">
            {trip.debtRemaining != null && trip.debtRemaining !== ''
              ? money(trip.debtRemaining)
              : money(
                  Number(trip.revenue ?? trip.price ?? 0) - Number(trip.paidAmount ?? 0),
                )}
          </Descriptions.Item>
          <Descriptions.Item label="Xăng (nhật ký xe)">{money(trip.fuelCost)}</Descriptions.Item>
          <Descriptions.Item label="Phí cầu đường">{money(trip.tollCost)}</Descriptions.Item>
          <Descriptions.Item label="Lương tài xế">{money(trip.driverSalary)}</Descriptions.Item>
          <Descriptions.Item label="Chi phí phát sinh" span={2}>
            {money(trip.otherCosts)}
            {trip.otherCostsNote?.trim() ? (
              <div style={{ color: '#666', marginTop: 4 }}>{trip.otherCostsNote}</div>
            ) : null}
          </Descriptions.Item>
          <Descriptions.Item label="Lợi nhuận">{money(trip.profit)}</Descriptions.Item>
          <Descriptions.Item label="Ghi chú" span={2}>
            {trip.notes?.trim() ? trip.notes : '—'}
          </Descriptions.Item>
          {trip.commissionRateApplied != null ? (
            <Descriptions.Item label="% HH áp dụng">{trip.commissionRateApplied}%</Descriptions.Item>
          ) : null}
        </Descriptions>

        {nextStatuses.length > 0 && (
          <Space style={{ marginTop: 16 }} wrap>
            <span>Chuyển trạng thái:</span>
            {nextStatuses.map((s) => (
              <Button
                key={s}
                size="small"
                danger={s === 'cancelled'}
                onClick={() => handleStatusChange(s)}
                loading={updateStatus.isPending}
              >
                {s === 'assigned'
                  ? 'Đã phân công'
                  : s === 'in_progress'
                  ? 'Đang chạy'
                  : s === 'completed'
                  ? 'Hoàn thành'
                  : 'Hủy chuyến'}
              </Button>
            ))}
          </Space>
        )}
      </Card>

      {trip.status === 'in_progress' && hasVehicleDriver && (
        <Card title="Hoàn thành chuyến" style={{ marginTop: 16 }}>
          <p style={{ color: '#666', marginBottom: 16 }}>
            Xác nhận chuyến đã hoàn tất. Sau khi hoàn thành, chuyến không thể chỉnh sửa.
          </p>
          <Button
            type="primary"
            size="large"
            onClick={() => handleStatusChange('completed')}
            loading={updateStatus.isPending}
          >
            Cập nhật trạng thái: Hoàn thành
          </Button>
        </Card>
      )}

      <AssignModal
        open={assignOpen}
        onCancel={() => setAssignOpen(false)}
        vehicleId={trip.vehicleId}
        driverId={trip.driverId}
        vehicles={vehicleOptions}
        drivers={driverOptions}
        onOk={handleAssign}
        loading={assignTrip.isPending}
      />
    </div>
  );
}
