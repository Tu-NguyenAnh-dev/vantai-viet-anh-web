import { useMemo, useState } from 'react';
import { Button, Form, Input, InputNumber, Select, Space, Tag } from 'antd';
import { PlusOutlined, UploadOutlined } from '@ant-design/icons';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { DataTable } from '@/components/common/DataTable';
import { FormModal } from '@/components/common/FormModal';
import { ImportExcelModal } from '@/components/common/ImportExcelModal';
import type { Customer } from '../types';
import { createCustomer, fetchCustomers, updateCustomer } from '../services';
import { ROUTES } from '@/config/routes';
import { employeesApi } from '@/api/employees';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';

type CustomerFormValues = {
  customerCode?: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  taxCode?: string;
  contactEmployeeId?: string | null;
  commissionRateMin?: number;
  commissionRateMax?: number;
  status?: 'active' | 'inactive';
};

export function CustomerListPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive' | undefined>(undefined);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [form] = Form.useForm<CustomerFormValues>();
  const queryClient = useQueryClient();
  const [contactSearch, setContactSearch] = useState('');
  const debouncedContactSearch = useDebouncedValue(contactSearch, 300);

  const { data, isLoading } = useQuery({
    queryKey: ['customers', { page, pageSize, search, status }],
    queryFn: () => fetchCustomers({ page, limit: pageSize, search, status }),
    placeholderData: keepPreviousData,
  });

  const { data: employeesRes, isFetching: employeesLoading } = useQuery({
    queryKey: ['customer-contacts', debouncedContactSearch],
    queryFn: () => employeesApi.list({ page: 1, limit: 20, search: debouncedContactSearch, status: 'active' }),
  });

  const contactOptions = useMemo(
    () =>
      (employeesRes?.data ?? []).map((e) => ({
        value: e.id,
        label: e.phone ? `${e.fullName} (${e.phone})` : e.fullName,
      })),
    [employeesRes],
  );

  const createMutation = useMutation({
    mutationFn: createCustomer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setIsModalOpen(false);
      setEditingCustomer(null);
      form.resetFields();
    },
  });

  const updateMutation = useMutation({
    mutationFn: (payload: { id: string; data: CustomerFormValues }) =>
      updateCustomer(payload.id, payload.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setIsModalOpen(false);
      setEditingCustomer(null);
      form.resetFields();
    },
  });

  const handleOpenCreate = () => {
    setEditingCustomer(null);
    form.resetFields();
    setIsModalOpen(true);
  };

  const handleOpenEdit = (record: Customer) => {
    setEditingCustomer(record);
    form.setFieldsValue({
      customerCode: record.customerCode,
      name: record.name,
      phone: record.phone,
      email: record.email,
      address: record.address,
      taxCode: record.taxCode,
      contactEmployeeId: record.contactEmployeeId ?? null,
      commissionRateMin: record.commissionRateMin ?? 0,
      commissionRateMax: record.commissionRateMax ?? 0,
      status: record.status,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    if (editingCustomer) {
      await updateMutation.mutateAsync({ id: editingCustomer.id, data: values });
    } else {
      await createMutation.mutateAsync(values);
    }
  };

  return (
    <div>
      <h2 style={{ marginBottom: 24 }}>Quản lý khách hàng</h2>

      <Space style={{ marginBottom: 16, width: '100%', justifyContent: 'space-between' }}>
        <Input.Search
          allowClear
          placeholder="Tìm theo tên, mã KH, SĐT..."
          onSearch={(value) => {
            setSearch(value);
            setPage(1);
          }}
          style={{ maxWidth: 320 }}
        />
        <Select
          allowClear
          placeholder="Trạng thái"
          style={{ width: 160 }}
          options={[
            { label: 'Hoạt động', value: 'active' },
            { label: 'Ngừng', value: 'inactive' },
          ]}
          onChange={(value) => {
            setStatus(value);
            setPage(1);
          }}
        />
        <Space>
          <Button icon={<UploadOutlined />} onClick={() => setIsImportOpen(true)}>
            Import Excel
          </Button>
          <Button href="/templates/import-customers-template.xlsx" target="_blank">
            Tải template
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenCreate}>
            Thêm khách hàng
          </Button>
        </Space>
      </Space>

      <DataTable<Customer>
        rowKey="id"
        loading={isLoading}
        dataSource={data?.data ?? []}
        onRow={(record) => ({
          onClick: () => navigate(`${ROUTES.CUSTOMERS}/${record.id}`),
        })}
        columns={[
          { title: 'Mã KH', dataIndex: 'customerCode' },
          { title: 'Tên khách hàng', dataIndex: 'name' },
          { title: 'Số điện thoại', dataIndex: 'phone' },
          { title: 'Email', dataIndex: 'email' },
          {
            title: 'Tổng tiền',
            dataIndex: 'totalAmount',
            render: (value: number | undefined) =>
              typeof value === 'number' ? value.toLocaleString('vi-VN') : '0',
          },
          {
            title: 'Đã thanh toán',
            dataIndex: 'paidAmount',
            render: (value: number | undefined) =>
              typeof value === 'number' ? value.toLocaleString('vi-VN') : '0',
          },
          {
            title: 'Công nợ',
            dataIndex: 'remainingAmount',
            render: (value: number | undefined) => {
              const amount = typeof value === 'number' ? value : 0;
              return (
                <Tag color={amount > 0 ? 'red' : 'green'}>
                  {amount.toLocaleString('vi-VN')}
                </Tag>
              );
            },
          },
          {
            title: 'Trạng thái',
            dataIndex: 'status',
            render: (value: Customer['status']) => (
              <Tag color={value === 'active' ? 'green' : 'default'}>
                {value === 'active' ? 'Hoạt động' : 'Ngừng'}
              </Tag>
            ),
          },
          {
            title: 'Thao tác',
            dataIndex: 'actions',
            render: (_, record) => (
              <Space>
                <Button type="link" onClick={() => navigate(`${ROUTES.CUSTOMERS}/${record.id}`)}>
                  Xem chi tiết
                </Button>
                <Button
                  type="link"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenEdit(record);
                  }}
                >
                  Sửa
                </Button>
              </Space>
            ),
          },
        ]}
        pagination={{
          current: page,
          pageSize,
          total: data?.total ?? 0,
          onChange: (p, ps) => {
            setPage(p);
            setPageSize(ps);
          },
        }}
      />

      <FormModal
        title={editingCustomer ? 'Cập nhật khách hàng' : 'Thêm khách hàng'}
        open={isModalOpen}
        onCancel={() => {
          setIsModalOpen(false);
          setEditingCustomer(null);
          form.resetFields();
        }}
        onOk={handleSubmit}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
      >
        <Form form={form} layout="vertical">
          <Form.Item label="Mã khách hàng" name="customerCode">
            <Input />
          </Form.Item>
          <Form.Item
            label="Tên khách hàng"
            name="name"
            rules={[{ required: true, message: 'Nhập tên khách hàng' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item label="Số điện thoại" name="phone">
            <Input />
          </Form.Item>
          <Form.Item label="Email" name="email">
            <Input type="email" />
          </Form.Item>
          <Form.Item label="Mã số thuế" name="taxCode">
            <Input />
          </Form.Item>
          <Form.Item label="Nhân viên phụ trách" name="contactEmployeeId">
            <Select
              showSearch
              placeholder="Chọn nhân viên"
              options={contactOptions}
              filterOption={false}
              onSearch={setContactSearch}
              loading={employeesLoading}
              allowClear
            />
          </Form.Item>
          <Space style={{ width: '100%' }} size="middle">
            <Form.Item
              label="Hoa hồng min (%)"
              name="commissionRateMin"
              style={{ flex: 1 }}
              rules={[
                {
                  validator: (_, value) => {
                    const min = value ?? 0;
                    const max = form.getFieldValue('commissionRateMax') ?? 0;
                    if (min < 0 || min > 100) return Promise.reject(new Error('Min phải trong 0..100'));
                    if (min > max) return Promise.reject(new Error('Min không được > Max'));
                    return Promise.resolve();
                  },
                },
              ]}
              initialValue={0}
            >
              <InputNumber min={0} max={100} style={{ width: '100%' }} addonAfter="%" />
            </Form.Item>
            <Form.Item
              label="Hoa hồng max (%)"
              name="commissionRateMax"
              style={{ flex: 1 }}
              rules={[
                {
                  validator: (_, value) => {
                    const max = value ?? 0;
                    const min = form.getFieldValue('commissionRateMin') ?? 0;
                    if (max < 0 || max > 100) return Promise.reject(new Error('Max phải trong 0..100'));
                    if (min > max) return Promise.reject(new Error('Max không được < Min'));
                    return Promise.resolve();
                  },
                },
              ]}
              initialValue={0}
            >
              <InputNumber min={0} max={100} style={{ width: '100%' }} addonAfter="%" />
            </Form.Item>
          </Space>
          <Form.Item label="Địa chỉ" name="address">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item label="Trạng thái" name="status" initialValue="active">
            <Select
              options={[
                { label: 'Hoạt động', value: 'active' },
                { label: 'Ngừng', value: 'inactive' },
              ]}
            />
          </Form.Item>
        </Form>
      </FormModal>

      <ImportExcelModal
        open={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        type="customers"
        title="Import khách hàng từ Excel"
        templateHref="/templates/import-customers-template.xlsx"
        onImported={() => queryClient.invalidateQueries({ queryKey: ['customers'] })}
      />
    </div>
  );
}

