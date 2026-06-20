import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, Col, Flex, Form, Input, InputNumber, message, Popconfirm, Row, Select, Space, Statistic, Tag } from 'antd';
import { VndInputNumber } from '@/components/common/VndInputNumber';
import { DownloadOutlined, PlusOutlined, UploadOutlined } from '@ant-design/icons';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DataTable } from '@/components/common/DataTable';
import type { Vehicle } from '../types';
import { vehiclePlate, vehicleTypeLabel, vehicleYearLabel } from '../types';
import { createVehicle, deleteVehicle, fetchVehicleStats, fetchVehicles, updateVehicle } from '../services';
import { FormModal } from '@/components/common/FormModal';
import { ROUTES } from '@/config/routes';
import { ImportExcelModal } from '@/components/common/ImportExcelModal';
import { downloadTemplate } from '@/utils/exportReport';

const STATUS_OPTIONS = [
  { label: 'Tất cả', value: '' },
  { label: 'Hoạt động', value: 'active' },
  { label: 'Ngừng hoạt động', value: 'inactive' },
];

export function VehicleListPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [vehicleType, setVehicleType] = useState<string>();
  const [sortStatus, setSortStatus] = useState<'ASC' | 'DESC' | undefined>();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [form] = Form.useForm<Vehicle>();
  const queryClient = useQueryClient();

  const { data: stats } = useQuery({
    queryKey: ['vehicles-stats'],
    queryFn: fetchVehicleStats,
    staleTime: 60 * 1000,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['vehicles', { search, status, vehicleType, sortStatus, page, pageSize }],
    queryFn: () =>
      fetchVehicles({
        search,
        status,
        vehicleType,
        sort: sortStatus ? 'status' : undefined,
        sortOrder: sortStatus,
        page,
        limit: pageSize,
      }),
    placeholderData: keepPreviousData,
  });

  const createMutation = useMutation({
    mutationFn: createVehicle,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['vehicles-stats'] });
      setIsModalOpen(false);
      setEditingVehicle(null);
      form.resetFields();
    },
  });

  const updateMutation = useMutation({
    mutationFn: (payload: { id: string; data: Partial<Vehicle> }) =>
      updateVehicle(payload.id, payload.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['vehicles-stats'] });
      setIsModalOpen(false);
      setEditingVehicle(null);
      form.resetFields();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteVehicle,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['vehicles-stats'] });
      message.success('Đã đánh dấu xe ngừng hoạt động');
    },
    onError: (e: Error) => message.error(e.message || 'Không xóa được'),
  });

  const handleOpenCreate = () => {
    setEditingVehicle(null);
    form.resetFields();
    setIsModalOpen(true);
  };

  const handleOpenEdit = (record: Vehicle) => {
    setEditingVehicle(record);
    const y = vehicleYearLabel(record);
    form.setFieldsValue({
      ...record,
      licensePlate: vehiclePlate(record) || record.licensePlate,
      vehicleType: vehicleTypeLabel(record),
      year: y,
    });
    setIsModalOpen(true);
  };

  const buildVehiclePayload = (values: Vehicle): Partial<Vehicle> => {
    return {
      licensePlate: values.licensePlate,
      vehicleType: values.vehicleType,
      brand: values.brand,
      model: values.model,
      year: values.year,
      capacity: values.capacity,
      status: values.status,
    };
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    const payload = buildVehiclePayload(values);
    if (editingVehicle) {
      await updateMutation.mutateAsync({
        id: editingVehicle.id,
        data: payload,
      });
    } else {
      await createMutation.mutateAsync(payload as Parameters<typeof createVehicle>[0]);
    }
  };

  return (
    <>
      <h2 style={{ marginBottom: 24 }}>Quản lý xe</h2>

      {stats ? (
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col xs={12} sm={6}>
            <Card size="small">
              <Statistic title="Tổng xe" value={stats.total ?? 0} />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card size="small">
              <Statistic title="Hoạt động" value={stats.active ?? 0} valueStyle={{ color: '#16a34a' }} />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card size="small">
              <Statistic title="Bảo trì" value={stats.maintenance ?? 0} valueStyle={{ color: '#ea580c' }} />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card size="small">
              <Statistic title="Ngừng HĐ" value={stats.inactive ?? 0} />
            </Card>
          </Col>
        </Row>
      ) : null}

      <Flex justify="space-between" align="center" style={{ marginBottom: 16 }}>
        <Space wrap align="center">
          <Input.Search
            allowClear
            placeholder="Biển số, hãng, model..."
            onSearch={setSearch}
            style={{ width: 260 }}
          />
          <Input.Search
            allowClear
            placeholder="Loại xe"
            style={{ width: 160 }}
            onSearch={(v) => setVehicleType(v.trim() || undefined)}
          />
          <Select
            allowClear
            placeholder="Trạng thái"
            options={STATUS_OPTIONS}
            style={{ width: 160 }}
            onChange={(value) => setStatus(value || undefined)}
          />
        </Space>
        <Space>
          <Button icon={<UploadOutlined />} onClick={() => setIsImportOpen(true)}>
            Import Excel
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenCreate}>
            Thêm xe
          </Button>
        </Space>
      </Flex>

      <DataTable<Vehicle>
        rowKey="id"
        loading={isLoading}
        dataSource={data?.data ?? []}
        onRow={(record) => ({
          onClick: () => navigate(`${ROUTES.VEHICLES}/${record.id}`),
          style: { cursor: 'pointer' },
        })}
        columns={[
          {
            title: 'Biển số',
            key: 'plate',
            render: (_: unknown, r: Vehicle) => vehiclePlate(r),
          },
          {
            title: 'Loại xe',
            key: 'vtype',
            render: (_: unknown, r: Vehicle) => vehicleTypeLabel(r),
          },
          { title: 'Hãng', dataIndex: 'brand' },
          { title: 'Model', dataIndex: 'model' },
          {
            title: 'Năm',
            key: 'yr',
            render: (_: unknown, r: Vehicle) => {
              const y = vehicleYearLabel(r);
              return y != null ? String(y) : '—';
            },
          },
          { title: 'Tải trọng (kg)', dataIndex: 'capacity' },
          {
            title: 'Trạng thái',
            dataIndex: 'status',
            key: 'status',
            sorter: true,
            sortOrder:
              sortStatus === 'ASC' ? 'ascend' : sortStatus === 'DESC' ? 'descend' : undefined,
            render: (value: Vehicle['status']) => {
              const label =
                value === 'active'
                  ? 'Hoạt động'
                  : value === 'maintenance'
                  ? 'Bảo trì'
                  : value === 'inactive'
                  ? 'Ngừng hoạt động'
                  : String(value);
              return (
                <Tag color={value === 'active' ? 'green' : value === 'maintenance' ? 'orange' : 'default'}>
                  {label}
                </Tag>
              );
            },
          },
          {
            title: 'Hành động',
            dataIndex: 'actions',
            render: (_, record) => (
              <Space onClick={(e) => e.stopPropagation()}>
                <Button type="link" onClick={() => navigate(`${ROUTES.VEHICLES}/${record.id}`)}>
                  Xem chi tiết
                </Button>
                <Button type="link" onClick={() => handleOpenEdit(record)}>
                  Sửa
                </Button>
                {record.status !== 'inactive' ? (
                  <Popconfirm
                    title="Ngừng sử dụng xe?"
                    description="Hệ thống gọi DELETE (soft delete): đặt trạng thái inactive, không xóa bản ghi."
                    okText="Xác nhận"
                    cancelText="Hủy"
                    onConfirm={() => deleteMutation.mutate(record.id)}
                  >
                    <Button type="link" danger loading={deleteMutation.isPending}>
                      Ngừng sử dụng
                    </Button>
                  </Popconfirm>
                ) : null}
              </Space>
            ),
          },
        ]}
        pagination={{
          current: page,
          pageSize,
          total: data?.total ?? 0,
        }}
        onChange={(pagination, _filters, sorter) => {
          if (pagination) {
            setPage(pagination.current ?? 1);
            if (pagination.pageSize != null) setPageSize(pagination.pageSize);
          }
          const s = Array.isArray(sorter) ? sorter[0] : sorter;
          if (s && (s as { field?: unknown }).field === 'status') {
            const order = (s as { order?: 'ascend' | 'descend' | null }).order;
            if (order === 'ascend') setSortStatus('ASC');
            else if (order === 'descend') setSortStatus('DESC');
            else setSortStatus(undefined);
          }
        }}
      />

      <FormModal
        title={editingVehicle ? 'Cập nhật xe' : 'Thêm xe'}
        open={isModalOpen}
        onCancel={() => {
          setIsModalOpen(false);
          setEditingVehicle(null);
          form.resetFields();
        }}
        onOk={handleSubmit}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            label="Biển số"
            name="licensePlate"
            rules={[{ required: true, message: 'Nhập biển số xe' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            label="Loại xe"
            name="vehicleType"
            rules={[{ required: true, message: 'Nhập loại xe' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item label="Hãng" name="brand">
            <Input />
          </Form.Item>
          <Form.Item label="Model" name="model">
            <Input />
          </Form.Item>
          <Form.Item label="Năm sản xuất" name="year">
            <InputNumber min={1900} max={2100} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="Tải trọng (kg)" name="capacity">
            <VndInputNumber min={0} currencySuffix={false} />
          </Form.Item>
          <Form.Item label="Trạng thái" name="status" initialValue="active">
            <Select
              options={[
                { label: 'Hoạt động', value: 'active' },
                { label: 'Ngừng hoạt động', value: 'inactive' },
              ]}
            />
          </Form.Item>
        </Form>
      </FormModal>

      <ImportExcelModal
        open={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        type="vehicles"
        title="Import xe từ Excel"
        onImported={() => queryClient.invalidateQueries({ queryKey: ['vehicles'] })}
      />
    </>
  );
}

