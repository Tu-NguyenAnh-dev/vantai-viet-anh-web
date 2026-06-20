import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Form, Input, Select, Space, Tag } from 'antd';
import { VndInputNumber } from '@/components/common/VndInputNumber';
import { PlusOutlined, UploadOutlined } from '@ant-design/icons';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DataTable } from '@/components/common/DataTable';
import { FormModal } from '@/components/common/FormModal';
import { ImportExcelModal } from '@/components/common/ImportExcelModal';
import {
  employeesApi,
  type Employee,
  normalizeEmployeeWritePayload,
  type EmployeeCreatePayload,
  type EmployeeUpdatePayload,
} from '@/api/employees';
import { ROUTES } from '@/config/routes';
import { normalizeNumeric } from '@/utils/number';
import { downloadTemplate } from '@/utils/exportReport';

type EmployeeFormValues = {
  employeeCode?: string;
  fullName: string;
  baseSalary: number;
  phone?: string;
  email?: string;
  position?: string;
  licenseNumber?: string;
  licenseType?: string;
  status?: string;
};

const POSITION_OPTIONS = [
  { label: 'Lái xe', value: 'lái xe' },
  { label: 'Phụ xe', value: 'phụ xe' },
  { label: 'Kế toán', value: 'kế toán' },
  { label: 'Điều phối', value: 'điều phối' },
  { label: 'Quản lý', value: 'quản lý' },
];

export default function EmployeesPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [position, setPosition] = useState<string | undefined>(undefined);
  const [status, setStatus] = useState<string | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [form] = Form.useForm<EmployeeFormValues>();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['employees', { page, pageSize, search, position, status }],
    queryFn: async () => {
      const res = await employeesApi.list({
        page,
        limit: pageSize,
        search,
        position,
        status,
      });
      return res;
    },
    placeholderData: keepPreviousData,
  });

  const createMutation = useMutation({
    mutationFn: (payload: EmployeeCreatePayload) => employeesApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      setIsModalOpen(false);
      setEditingEmployee(null);
      form.resetFields();
    },
  });

  const updateMutation = useMutation({
    mutationFn: (payload: { id: string; data: EmployeeUpdatePayload }) =>
      employeesApi.update(payload.id, payload.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      setIsModalOpen(false);
      setEditingEmployee(null);
      form.resetFields();
    },
  });

  const handleOpenCreate = () => {
    setEditingEmployee(null);
    form.resetFields();
    setIsModalOpen(true);
  };

  const handleOpenEdit = (record: Employee) => {
    if (!record) return;
    setEditingEmployee(record);
    const baseSalary = normalizeNumeric(record.baseSalary ?? record.base_salary, 0);
    form.setFieldsValue({
      employeeCode: record.employeeCode,
      fullName: record.fullName,
      baseSalary,
      phone: record.phone,
      email: record.email,
      position: record.position,
      licenseNumber: record.licenseNumber,
      licenseType: record.licenseType,
      status: record.status,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    const payload = normalizeEmployeeWritePayload(values);
    if (editingEmployee) {
      await updateMutation.mutateAsync({ id: editingEmployee.id, data: payload });
    } else {
      await createMutation.mutateAsync(payload);
    }
  };

  return (
    <div>
      <h2 style={{ marginBottom: 24 }}>Quản lý nhân viên</h2>

      <Space style={{ marginBottom: 16, width: '100%', justifyContent: 'space-between' }}>
        <Input.Search
          allowClear
          placeholder="Tìm theo tên, mã NV, SĐT..."
          onSearch={(value) => {
            setSearch(value);
            setPage(1);
          }}
          style={{ maxWidth: 320 }}
        />
        <Select
          allowClear
          placeholder="Vị trí"
          style={{ width: 160 }}
          options={POSITION_OPTIONS}
          value={position}
          onChange={(v) => {
            setPosition(v);
            setPage(1);
          }}
        />
        <Select
          allowClear
          placeholder="Trạng thái"
          style={{ width: 150 }}
          options={[
            { label: 'Hoạt động', value: 'active' },
            { label: 'Ngừng', value: 'inactive' },
          ]}
          value={status}
          onChange={(v) => {
            setStatus(v);
            setPage(1);
          }}
        />
        <Space>
          <Button icon={<UploadOutlined />} onClick={() => setIsImportOpen(true)}>
            Import Excel
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenCreate}>
            Thêm nhân viên
          </Button>
        </Space>
      </Space>

      <DataTable<Employee>
        rowKey="id"
        loading={isLoading}
        dataSource={data?.data ?? []}
        onRow={(record) => ({
          onClick: () => navigate(`${ROUTES.EMPLOYEES}/${record.id}`),
          style: { cursor: 'pointer' },
        })}
        columns={[
          { title: 'Mã NV', dataIndex: 'employeeCode' },
          { title: 'Họ tên', dataIndex: 'fullName' },
          { title: 'SĐT', dataIndex: 'phone' },
          { title: 'Email', dataIndex: 'email' },
          { title: 'Vị trí', dataIndex: 'position', render: (v: string) => v ?? '-' },
          { title: 'Số GPLX', dataIndex: 'licenseNumber' },
          { title: 'Hạng GPLX', dataIndex: 'licenseType' },
          {
            title: 'Trạng thái',
            dataIndex: 'status',
            render: (value: string) => (
              <Tag color={value === 'active' ? 'green' : 'default'}>
                {value === 'active' ? 'Hoạt động' : 'Ngừng'}
              </Tag>
            ),
          },
          {
            title: 'Hành động',
            dataIndex: 'actions',
            render: (_, record) => (
              <Space onClick={(e) => e.stopPropagation()}>
                <Button type="link" onClick={() => navigate(`${ROUTES.EMPLOYEES}/${record.id}`)}>
                  Xem chi tiết
                </Button>
                <Button type="link" onClick={() => handleOpenEdit(record)}>
                  Sửa
                </Button>
              </Space>
            ),
          },
        ]}
        pagination={{
          current: page,
          pageSize,
          total: data?.pagination?.total ?? 0,
          onChange: (p, ps) => {
            setPage(p);
            setPageSize(ps);
          },
        }}
      />

      <FormModal
        title={editingEmployee ? 'Cập nhật nhân viên' : 'Thêm nhân viên'}
        open={isModalOpen}
        onCancel={() => {
          setIsModalOpen(false);
          setEditingEmployee(null);
          form.resetFields();
        }}
        onOk={handleSubmit}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
      >
        <Form form={form} layout="vertical">
          <Form.Item label="Mã nhân viên" name="employeeCode">
            <Input />
          </Form.Item>
          <Form.Item
            label="Họ tên"
            name="fullName"
            rules={[{ required: true, message: 'Nhập họ tên nhân viên' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item label="Số điện thoại" name="phone">
            <Input placeholder="Nhập SĐT" inputMode="tel" />
          </Form.Item>
          <Form.Item
            label="Email"
            name="email"
            rules={[
              {
                validator: (_, value) => {
                  const v = typeof value === 'string' ? value.trim() : value;
                  if (!v) return Promise.resolve();
                  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
                    ? Promise.resolve()
                    : Promise.reject(new Error('Email không hợp lệ'));
                },
              },
            ]}
          >
            <Input type="email" placeholder="email@example.com" autoComplete="email" />
          </Form.Item>
          <Form.Item
            label="Lương cơ bản (VND)"
            name="baseSalary"
            rules={[
              {
                validator: (_, value) => {
                  if (value === null || value === undefined || value === '') {
                    return Promise.reject(new Error('Nhập lương cơ bản'));
                  }
                  const num = normalizeNumeric(value, NaN);
                  if (!Number.isFinite(num)) {
                    return Promise.reject(new Error('Nhập số hợp lệ'));
                  }
                  if (num < 0) {
                    return Promise.reject(new Error('Lương cơ bản ≥ 0'));
                  }
                  return Promise.resolve();
                },
              },
            ]}
          >
            <VndInputNumber min={0} placeholder="0" />
          </Form.Item>
          <Form.Item label="Vị trí" name="position">
            <Select
              placeholder="Chọn vị trí"
              options={POSITION_OPTIONS}
              allowClear
            />
          </Form.Item>
          <Form.Item label="Số GPLX" name="licenseNumber">
            <Input />
          </Form.Item>
          <Form.Item label="Hạng GPLX" name="licenseType">
            <Input />
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
        type="employees"
        title="Import nhân viên từ Excel"
        onDownloadTemplate={() => downloadTemplate('employees')}
        onImported={() => queryClient.invalidateQueries({ queryKey: ['employees'] })}
      />
    </div>
  );
}
