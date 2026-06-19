import { useMemo, useState } from 'react';
import {
  Button,
  DatePicker,
  Form,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Tag,
} from 'antd';
import { DollarOutlined, PlusOutlined } from '@ant-design/icons';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Dayjs } from 'dayjs';
import { DataTable } from '@/components/common/DataTable';
import { FormModal } from '@/components/common/FormModal';
import { VndInputNumber } from '@/components/common/VndInputNumber';
import type { Debt, DebtStatus, DebtType } from '../types';
import {
  createDebt,
  createSupplier,
  deleteDebt,
  fetchDebts,
  fetchSuppliers,
  payDebt,
} from '../services';
import { fetchCustomers } from '@/modules/customers/services';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { ROUTES } from '@/config/routes';
import { useNavigate } from 'react-router-dom';

const TYPE_OPTIONS: { value: DebtType; label: string }[] = [
  { value: 'RECEIVABLE', label: 'Khách nợ (Thu)' },
  { value: 'PAYABLE', label: 'Nợ NCC (Chi)' },
];

const STATUS_OPTIONS: { value: DebtStatus; label: string }[] = [
  { value: 'UNPAID', label: 'Chưa trả' },
  { value: 'PAID', label: 'Đã trả' },
  { value: 'OVERDUE', label: 'Quá hạn' },
];

const SORT_OPTIONS = [
  { value: 'dueDate', label: 'Hạn thanh toán' },
  { value: 'remaining', label: 'Số dư' },
  { value: 'createdAt', label: 'Ngày tạo' },
];

type CreateDebtFormValues = {
  type: DebtType;
  customerId?: string;
  supplierId?: string;
  amount: number;
  dueDate: Dayjs;
};

export function DebtListPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [type, setType] = useState<DebtType | undefined>(undefined);
  const [status, setStatus] = useState<DebtStatus | undefined>(undefined);
  const [customerId, setCustomerId] = useState<string | undefined>(undefined);
  const [supplierId, setSupplierId] = useState<string | undefined>(undefined);
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);
  const [sortBy, setSortBy] = useState<'dueDate' | 'remaining' | 'createdAt'>('dueDate');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [payTarget, setPayTarget] = useState<Debt | null>(null);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [form] = Form.useForm<CreateDebtFormValues>();
  const [supplierForm] = Form.useForm<{ name: string; code?: string }>();

  const { data, isLoading } = useQuery({
    queryKey: [
      'debts',
      { page, pageSize, type, status, customerId, supplierId, dateRange, sortBy, sortOrder },
    ],
    queryFn: () =>
      fetchDebts({
        page,
        limit: pageSize,
        type,
        status,
        customerId,
        supplierId,
        startDate: dateRange?.[0]?.format('YYYY-MM-DD'),
        endDate: dateRange?.[1]?.format('YYYY-MM-DD'),
        sortBy,
        sortOrder,
      }),
    placeholderData: keepPreviousData,
  });

  const [customerSearch, setCustomerSearch] = useState('');
  const debouncedCustomerSearch = useDebouncedValue(customerSearch, 300);
  const { data: customersRes } = useQuery({
    queryKey: ['customers-select', debouncedCustomerSearch],
    queryFn: () => fetchCustomers({ page: 1, limit: 50, search: debouncedCustomerSearch || undefined }),
  });
  const customerOptions = useMemo(
    () =>
      (customersRes?.data ?? []).map((c) => ({
        value: c.id,
        label: c.customerCode ? `${c.name} (${c.customerCode})` : c.name,
      })),
    [customersRes],
  );

  const { data: suppliersRes } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => fetchSuppliers({ page: 1, limit: 100 }),
  });
  const supplierOptions = useMemo(
    () =>
      (suppliersRes?.data ?? []).map((s) => ({
        value: s.id,
        label: s.code ? `${s.name} (${s.code})` : s.name,
      })),
    [suppliersRes],
  );

  const createMutation = useMutation({
    mutationFn: createDebt,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['debts'] });
      setIsCreateOpen(false);
      form.resetFields();
    },
  });

  const payMutation = useMutation({
    mutationFn: ({ id, amount }: { id: string; amount: number }) => payDebt(id, amount),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['debts'] });
      setPayTarget(null);
      setPayAmount(0);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteDebt,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['debts'] });
    },
  });

  const createSupplierMutation = useMutation({
    mutationFn: createSupplier,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      setIsSupplierModalOpen(false);
      supplierForm.resetFields();
    },
  });

  const handleCreateSubmit = async () => {
    const values = await form.validateFields();
    const payload = {
      type: values.type,
      amount: values.amount,
      dueDate: values.dueDate.format('YYYY-MM-DD'),
      ...(values.type === 'RECEIVABLE' && values.customerId
        ? { customerId: values.customerId }
        : {}),
      ...(values.type === 'PAYABLE' && values.supplierId ? { supplierId: values.supplierId } : {}),
    };
    await createMutation.mutateAsync(payload as Parameters<typeof createDebt>[0]);
  };

  const handlePay = () => {
    if (!payTarget || payAmount <= 0) return;
    payMutation.mutate({ id: payTarget.id, amount: payAmount });
  };

  const maxPayAmount = payTarget ? Math.min(payTarget.remaining, payTarget.amount - payTarget.paidAmount) : 0;

  const statusColor: Record<DebtStatus, string> = {
    UNPAID: 'orange',
    PAID: 'green',
    OVERDUE: 'red',
  };

  const statusLabel: Record<DebtStatus, string> = {
    UNPAID: 'Chưa trả',
    PAID: 'Đã trả',
    OVERDUE: 'Quá hạn',
  };

  return (
    <div>
      <h2 style={{ marginBottom: 24 }}>Quản lý công nợ</h2>

      <Space wrap style={{ marginBottom: 16 }} align="center">
        <Select
          allowClear
          placeholder="Loại"
          style={{ width: 160 }}
          options={TYPE_OPTIONS}
          value={type}
          onChange={(v) => {
            setType(v);
            setPage(1);
          }}
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
        {type !== 'PAYABLE' && (
          <Select
            allowClear
            showSearch
            placeholder="Khách hàng"
            style={{ width: 200 }}
            options={customerOptions}
            filterOption={false}
            onSearch={setCustomerSearch}
            value={customerId}
            onChange={(v) => {
              setCustomerId(v);
              setPage(1);
            }}
          />
        )}
        {type !== 'RECEIVABLE' && (
          <Select
            allowClear
            placeholder="Nhà cung cấp"
            style={{ width: 200 }}
            options={supplierOptions}
            value={supplierId}
            onChange={(v) => {
              setSupplierId(v);
              setPage(1);
            }}
          />
        )}
        <DatePicker.RangePicker
          value={dateRange}
          onChange={(r) => {
            setDateRange(r);
            setPage(1);
          }}
          placeholder={['Từ ngày', 'Đến ngày']}
        />
        <Select
          placeholder="Sắp xếp theo"
          style={{ width: 160 }}
          options={SORT_OPTIONS}
          value={sortBy}
          onChange={(v) => setSortBy(v)}
        />
        <Select
          style={{ width: 100 }}
          options={[
            { value: 'ASC', label: 'Tăng dần' },
            { value: 'DESC', label: 'Giảm dần' },
          ]}
          value={sortOrder}
          onChange={(v) => setSortOrder(v)}
        />
      </Space>

      <Space style={{ marginBottom: 16, width: '100%', justifyContent: 'flex-end' }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsCreateOpen(true)}>
          Tạo công nợ
        </Button>
      </Space>

      <DataTable<Debt>
        rowKey="id"
        loading={isLoading}
        dataSource={data?.data ?? []}
        columns={[
          {
            title: 'Loại',
            dataIndex: 'type',
            width: 120,
            render: (v: DebtType) => (
              <Tag color={v === 'RECEIVABLE' ? 'blue' : 'purple'}>
                {v === 'RECEIVABLE' ? 'Thu' : 'Chi'}
              </Tag>
            ),
          },
          {
            title: 'Khách hàng / NCC',
            key: 'party',
            render: (_, r) =>
              r.type === 'RECEIVABLE'
                ? r.customer?.name ?? r.customerId ?? '-'
                : r.supplier?.name ?? r.supplierId ?? '-',
          },
          {
            title: 'Chuyến',
            key: 'trip',
            render: (_, r) =>
              r.trip ? (
                <a onClick={() => navigate(`${ROUTES.TRIPS}/${r.trip?.id}`)}>
                  {r.trip.tripCode ?? r.trip.id}
                </a>
              ) : (
                '-'
              ),
          },
          {
            title: 'Số tiền',
            dataIndex: 'amount',
            align: 'right',
            render: (v: number) => (typeof v === 'number' ? v.toLocaleString('vi-VN') : '0'),
          },
          {
            title: 'Đã thu/chi',
            dataIndex: 'paidAmount',
            align: 'right',
            render: (v: number) => (typeof v === 'number' ? v.toLocaleString('vi-VN') : '0'),
          },
          {
            title: 'Còn lại',
            dataIndex: 'remaining',
            align: 'right',
            render: (v: number) => {
              const n = typeof v === 'number' ? v : 0;
              return (
                <Tag color={n > 0 ? 'red' : 'green'}>{n.toLocaleString('vi-VN')}</Tag>
              );
            },
          },
          {
            title: 'Hạn TT',
            dataIndex: 'dueDate',
            width: 110,
          },
          {
            title: 'Trạng thái',
            dataIndex: 'status',
            width: 100,
            render: (v: DebtStatus) => (
              <Tag color={statusColor[v] ?? 'default'}>{statusLabel[v] ?? v}</Tag>
            ),
          },
          {
            title: 'Thao tác',
            key: 'actions',
            width: 180,
            fixed: 'right',
            render: (_, record) => (
              <Space onClick={(e) => e.stopPropagation()}>
                {record.remaining > 0 && (
                  <Button
                    type="link"
                    size="small"
                    icon={<DollarOutlined />}
                    onClick={() => {
                      setPayTarget(record);
                      setPayAmount(record.remaining);
                    }}
                  >
                    Thu/Chi
                  </Button>
                )}
                <Popconfirm
                  title="Xóa công nợ này?"
                  onConfirm={() => deleteMutation.mutate(record.id)}
                >
                  <Button type="link" size="small" danger>
                    Xóa
                  </Button>
                </Popconfirm>
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
            setPageSize(ps ?? 10);
          },
        }}
      />

      <FormModal
        title="Tạo công nợ thủ công"
        open={isCreateOpen}
        onCancel={() => {
          setIsCreateOpen(false);
          form.resetFields();
        }}
        onOk={handleCreateSubmit}
        confirmLoading={createMutation.isPending}
      >
        <Form form={form} layout="vertical" initialValues={{ type: 'RECEIVABLE' }}>
          <Form.Item
            name="type"
            label="Loại"
            rules={[{ required: true }]}
          >
            <Select options={TYPE_OPTIONS} />
          </Form.Item>
          <Form.Item
            noStyle
            shouldUpdate={(prev, curr) => prev.type !== curr.type}
          >
            {({ getFieldValue }) =>
              getFieldValue('type') === 'RECEIVABLE' ? (
                <Form.Item
                  name="customerId"
                  label="Khách hàng"
                  rules={[{ required: true, message: 'Chọn khách hàng' }]}
                >
                  <Select
                    showSearch
                    placeholder="Chọn khách hàng"
                    options={customerOptions}
                    filterOption={false}
                    onSearch={setCustomerSearch}
                  />
                </Form.Item>
              ) : (
                <Form.Item
                  name="supplierId"
                  label="Nhà cung cấp"
                  rules={[{ required: true, message: 'Chọn nhà cung cấp' }]}
                >
                  <Select
                    placeholder="Chọn nhà cung cấp"
                    options={supplierOptions}
                    dropdownRender={(menu) => (
                      <>
                        {menu}
                        <div style={{ padding: 8, borderTop: '1px solid #f0f0f0' }}>
                          <Button
                            type="text"
                            block
                            onClick={() => setIsSupplierModalOpen(true)}
                          >
                            + Thêm nhà cung cấp mới
                          </Button>
                        </div>
                      </>
                    )}
                  />
                </Form.Item>
              )
            }
          </Form.Item>
          <Form.Item
            name="amount"
            label="Số tiền"
            rules={[{ required: true, message: 'Nhập số tiền' }]}
          >
            <VndInputNumber min={1} />
          </Form.Item>
          <Form.Item
            name="dueDate"
            label="Hạn thanh toán"
            rules={[{ required: true, message: 'Chọn ngày' }]}
          >
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </FormModal>

      <Modal
        title="Thêm nhà cung cấp"
        open={isSupplierModalOpen}
        onCancel={() => {
          setIsSupplierModalOpen(false);
          supplierForm.resetFields();
        }}
        onOk={() => supplierForm.validateFields().then((v) => createSupplierMutation.mutateAsync(v))}
        confirmLoading={createSupplierMutation.isPending}
        okText="Tạo"
      >
        <Form form={supplierForm} layout="vertical">
          <Form.Item name="name" label="Tên NCC" rules={[{ required: true, message: 'Nhập tên' }]}>
            <Input placeholder="Tên nhà cung cấp" />
          </Form.Item>
          <Form.Item name="code" label="Mã NCC">
            <Input placeholder="Mã (tùy chọn)" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Thu / Chi công nợ"
        open={!!payTarget}
        onCancel={() => {
          setPayTarget(null);
          setPayAmount(0);
        }}
        onOk={handlePay}
        confirmLoading={payMutation.isPending}
        okText="Xác nhận"
      >
        {payTarget && (
          <Space direction="vertical" style={{ width: '100%' }}>
            <p>
              <strong>
                {payTarget.type === 'RECEIVABLE'
                  ? payTarget.customer?.name ?? payTarget.customerId
                  : payTarget.supplier?.name ?? payTarget.supplierId}
              </strong>
            </p>
            <p>Còn nợ: {payTarget.remaining.toLocaleString('vi-VN')} VND</p>
            <label>Số tiền thu/chi:</label>
            <VndInputNumber
              min={1}
              max={maxPayAmount}
              value={payAmount}
              onChange={(v) => setPayAmount(typeof v === 'number' ? v : 0)}
            />
          </Space>
        )}
      </Modal>
    </div>
  );
}
