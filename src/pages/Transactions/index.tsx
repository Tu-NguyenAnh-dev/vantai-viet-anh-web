import { useMemo, useState } from 'react';
import {
  Button,
  Card,
  Col,
  DatePicker,
  Form,
  Input,
  Row,
  Select,
  Space,
  Tag,
} from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import { DataTable } from '@/components/common/DataTable';
import { FormModal } from '@/components/common/FormModal';
import { VndInputNumber } from '@/components/common/VndInputNumber';
import {
  transactionsApi,
  type Transaction,
  type TransactionCategory,
} from '@/api/transactions';
import { customersApi } from '@/api/customers';
import { vehiclesApi } from '@/api/vehicles';
import { employeesApi } from '@/api/employees';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';

const TYPE_OPTIONS = [
  { label: 'Thu', value: 'INCOME' },
  { label: 'Chi', value: 'EXPENSE' },
];

const CATEGORY_BY_TYPE: Record<string, { value: TransactionCategory; label: string }[]> = {
  INCOME: [{ value: 'TRIP_PAYMENT', label: 'Thu từ chuyến' }],
  EXPENSE: [
    { value: 'FUEL', label: 'Nhiên liệu' },
    { value: 'REPAIR', label: 'Sửa chữa' },
    { value: 'SALARY', label: 'Lương' },
  ],
};

type TransactionFormValues = {
  type: 'INCOME' | 'EXPENSE';
  category: TransactionCategory;
  amount: number;
  date: Dayjs;
  note?: string;
  tripId?: string;
  vehicleId?: string;
  employeeId?: string;
  customerId?: string;
};

function rows<T>(res: unknown): T[] {
  if (res && typeof res === 'object' && Array.isArray((res as { data?: T[] }).data)) {
    return (res as { data: T[] }).data;
  }
  return [];
}

export default function TransactionsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);
  const [type, setType] = useState<'INCOME' | 'EXPENSE' | undefined>(undefined);
  const [category, setCategory] = useState<string | undefined>(undefined);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form] = Form.useForm<TransactionFormValues>();

  const fromDate = dateRange?.[0]?.format('YYYY-MM-DD');
  const toDate = dateRange?.[1]?.format('YYYY-MM-DD');

  const { data, isLoading } = useQuery({
    queryKey: ['transactions', { page, pageSize, fromDate, toDate, type, category }],
    queryFn: () =>
      transactionsApi.list({
        page,
        limit: pageSize,
        fromDate,
        toDate,
        type,
        category: category || undefined,
      }),
    placeholderData: keepPreviousData,
  });

  const { data: summaryData } = useQuery({
    queryKey: ['transactions-summary', fromDate, toDate],
    queryFn: () => transactionsApi.getSummary({ fromDate, toDate }),
  });

  const [vehicleSearch, setVehicleSearch] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [employeeSearch, setEmployeeSearch] = useState('');
  const debouncedVehicle = useDebouncedValue(vehicleSearch, 300);
  const debouncedCustomer = useDebouncedValue(customerSearch, 300);
  const debouncedEmployee = useDebouncedValue(employeeSearch, 300);

  const { data: vehiclesRes } = useQuery({
    queryKey: ['vehicles-select', debouncedVehicle],
    queryFn: () => vehiclesApi.list({ page: 1, limit: 20, search: debouncedVehicle }),
  });
  const { data: customersRes } = useQuery({
    queryKey: ['customers-select', debouncedCustomer],
    queryFn: () => customersApi.list({ page: 1, limit: 20, search: debouncedCustomer }),
  });
  const { data: employeesRes } = useQuery({
    queryKey: ['employees-select', debouncedEmployee],
    queryFn: () => employeesApi.list({ page: 1, limit: 20, search: debouncedEmployee }),
  });

  const vehicleOptions = useMemo(
    () =>
      rows<{ id: string; licensePlate?: string; vehicleType?: string }>(vehiclesRes).map((v) => ({
        value: v.id,
        label: `${v.licensePlate ?? ''}${v.vehicleType ? ` – ${v.vehicleType}` : ''}`.trim() || v.id,
      })),
    [vehiclesRes],
  );
  const customerOptions = useMemo(
    () =>
      rows<{ id: string; name?: string; phone?: string }>(customersRes).map((c) => ({
        value: c.id,
        label: c.phone ? `${c.name ?? c.id} (${c.phone})` : c.name ?? c.id,
      })),
    [customersRes],
  );
  const employeeOptions = useMemo(
    () =>
      rows<{ id: string; fullName?: string; phone?: string }>(employeesRes).map((e) => ({
        value: e.id,
        label: e.phone ? `${e.fullName ?? e.id} (${e.phone})` : e.fullName ?? e.id,
      })),
    [employeesRes],
  );

  const createMutation = useMutation({
    mutationFn: (values: TransactionFormValues) =>
      transactionsApi.create({
        type: values.type,
        category: values.category,
        amount: Number(values.amount),
        date: values.date?.format('YYYY-MM-DD'),
        note: values.note,
        tripId: values.tripId,
        vehicleId: values.vehicleId,
        employeeId: values.employeeId,
        customerId: values.customerId,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['transactions-summary'] });
      setIsModalOpen(false);
      form.resetFields();
    },
  });

  const transactions = data?.data ?? [];
  const pagination = data?.pagination;
  const summaryRaw = summaryData && typeof summaryData === 'object'
    ? ('totalIncome' in summaryData ? summaryData : (summaryData as { data?: typeof summaryData }).data)
    : null;
  const summary = summaryRaw && typeof summaryRaw === 'object' && 'totalIncome' in summaryRaw
    ? (summaryRaw as { totalIncome: number; totalExpense: number; profit: number })
    : null;

  const getTypeDisplay = (t: Transaction) => {
    const ty = (t.type ?? t.transactionType ?? '').toUpperCase();
    return ty === 'INCOME' ? 'Thu' : 'Chi';
  };

  const getCategoryLabel = (cat: string) => {
    const m: Record<string, string> = {
      TRIP_PAYMENT: 'Thu từ chuyến',
      FUEL: 'Nhiên liệu',
      REPAIR: 'Sửa chữa',
      SALARY: 'Lương',
    };
    return m[cat] ?? cat;
  };

  return (
    <div>
      <h2 style={{ marginBottom: 24 }}>Thu - Chi</h2>

      {summary && (
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col xs={24} sm={8}>
            <Card size="small">
              <div style={{ color: '#52c41a', fontWeight: 600 }}>
                Thu: {(summary.totalIncome ?? 0).toLocaleString('vi-VN')}
              </div>
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card size="small">
              <div style={{ color: '#ff4d4f', fontWeight: 600 }}>
                Chi: {(summary.totalExpense ?? 0).toLocaleString('vi-VN')}
              </div>
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card size="small">
              <div style={{ fontWeight: 600 }}>
                Lợi nhuận: {(summary.profit ?? 0).toLocaleString('vi-VN')}
              </div>
            </Card>
          </Col>
        </Row>
      )}

      <Space style={{ marginBottom: 16, flexWrap: 'wrap' }}>
        <DatePicker.RangePicker
          value={dateRange}
          onChange={(r) => {
            setDateRange(r);
            setPage(1);
          }}
          placeholder={['Từ ngày', 'Đến ngày']}
        />
        <Select
          allowClear
          placeholder="Loại"
          style={{ width: 100 }}
          options={TYPE_OPTIONS}
          value={type}
          onChange={(v) => {
            setType(v);
            setPage(1);
          }}
        />
        <Select
          allowClear
          placeholder="Danh mục"
          style={{ width: 140 }}
          options={[
            { label: 'Thu từ chuyến', value: 'TRIP_PAYMENT' },
            { label: 'Nhiên liệu', value: 'FUEL' },
            { label: 'Sửa chữa', value: 'REPAIR' },
            { label: 'Lương', value: 'SALARY' },
          ]}
          value={category}
          onChange={(v) => {
            setCategory(v);
            setPage(1);
          }}
        />
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsModalOpen(true)}>
          Thêm giao dịch
        </Button>
      </Space>

      <DataTable
        rowKey="id"
        loading={isLoading}
        dataSource={transactions}
        columns={[
          { title: 'Mã GD', dataIndex: 'transactionCode', width: 100 },
          {
            title: 'Ngày',
            dataIndex: 'date',
            render: (v: string, r: Transaction) =>
              (v ?? r.transactionDate ?? '').toString().slice(0, 10),
            width: 110,
          },
          {
            title: 'Loại',
            key: 'type',
            width: 70,
            render: (_: unknown, r: Transaction) => {
              const ty = (r.type ?? r.transactionType ?? '').toUpperCase();
              return (
                <Tag color={ty === 'INCOME' ? 'green' : 'red'}>{getTypeDisplay(r)}</Tag>
              );
            },
          },
          {
            title: 'Danh mục',
            dataIndex: 'category',
            width: 120,
            render: (v: string) => getCategoryLabel(v ?? ''),
          },
          {
            title: 'Số tiền',
            dataIndex: 'amount',
            width: 120,
            align: 'right',
            render: (v: number, r: Transaction) => {
              const ty = (r.type ?? r.transactionType ?? '').toUpperCase();
              const num = typeof v === 'number' ? v : Number(v) || 0;
              return (
                <span style={{ color: ty === 'INCOME' ? '#52c41a' : '#ff4d4f' }}>
                  {num.toLocaleString('vi-VN')}
                </span>
              );
            },
          },
          {
            title: 'Ghi chú',
            dataIndex: 'note',
            render: (v: string, r: Transaction) => v ?? r.description ?? '-',
            ellipsis: true,
          },
        ]}
        pagination={{
          current: page,
          pageSize,
          total: pagination?.total ?? 0,
          onChange: (p, ps) => {
            setPage(p);
            setPageSize(ps ?? 20);
          },
        }}
      />

      <FormModal
        title="Thêm giao dịch"
        open={isModalOpen}
        onCancel={() => {
          setIsModalOpen(false);
          form.resetFields();
        }}
        onOk={() => form.validateFields().then((vals) => createMutation.mutateAsync(vals))}
        confirmLoading={createMutation.isPending}
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{ type: 'EXPENSE', category: 'FUEL', amount: 0, date: dayjs() }}
        >
          <Form.Item name="type" label="Loại" rules={[{ required: true }]}>
            <Select
              options={TYPE_OPTIONS}
              onChange={(v) => {
                form.setFieldValue('category', v === 'INCOME' ? 'TRIP_PAYMENT' : 'FUEL');
              }}
            />
          </Form.Item>
          <Form.Item
            name="category"
            label="Danh mục"
            rules={[{ required: true, message: 'Chọn danh mục' }]}
          >
            <Select
              options={Form.useWatch('type', form) === 'INCOME'
                ? CATEGORY_BY_TYPE.INCOME
                : CATEGORY_BY_TYPE.EXPENSE}
              placeholder="Chọn danh mục"
            />
          </Form.Item>
          <Form.Item
            name="amount"
            label="Số tiền (VND)"
            rules={[
              { required: true, message: 'Nhập số tiền' },
              { type: 'number', min: 1, message: 'Số tiền > 0' },
            ]}
          >
            <VndInputNumber min={1} />
          </Form.Item>
          <Form.Item name="date" label="Ngày" rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="note" label="Ghi chú">
            <Input.TextArea rows={2} placeholder="Mô tả giao dịch" />
          </Form.Item>
          {Form.useWatch('category', form) === 'FUEL' && (
            <Form.Item name="vehicleId" label="Xe (khuyến nghị)">
              <Select
                showSearch
                placeholder="Chọn xe"
                options={vehicleOptions}
                filterOption={false}
                onSearch={setVehicleSearch}
                allowClear
              />
            </Form.Item>
          )}
          {Form.useWatch('category', form) === 'REPAIR' && (
            <Form.Item name="vehicleId" label="Xe (khuyến nghị)">
              <Select
                showSearch
                placeholder="Chọn xe"
                options={vehicleOptions}
                filterOption={false}
                onSearch={setVehicleSearch}
                allowClear
              />
            </Form.Item>
          )}
          {Form.useWatch('category', form) === 'SALARY' && (
            <Form.Item name="employeeId" label="Nhân viên (khuyến nghị)">
              <Select
                showSearch
                placeholder="Chọn nhân viên"
                options={employeeOptions}
                filterOption={false}
                onSearch={setEmployeeSearch}
                allowClear
              />
            </Form.Item>
          )}
          {Form.useWatch('category', form) === 'TRIP_PAYMENT' && (
            <>
              <Form.Item name="tripId" label="Chuyến (khuyến nghị)">
                <Input placeholder="ID chuyến" />
              </Form.Item>
              <Form.Item name="customerId" label="Khách hàng (khuyến nghị)">
                <Select
                  showSearch
                  placeholder="Chọn khách hàng"
                  options={customerOptions}
                  filterOption={false}
                  onSearch={setCustomerSearch}
                  allowClear
                />
              </Form.Item>
            </>
          )}
        </Form>
      </FormModal>
    </div>
  );
}
