import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
  DatePicker,
  Descriptions,
  Empty,
  Form,
  Input,
  Modal,
  Popconfirm,
  Row,
  Space,
  Spin,
  Table,
  Tabs,
  Tag,
  Tooltip,
  Typography,
  message,
} from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';
import { useParams, useNavigate, Link } from 'react-router-dom';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { VndInputNumber } from '@/components/common/VndInputNumber';
import {
  employeesApi,
  type Employee,
  type EmployeeAbsence,
  type EmployeeDetailData,
  type EmployeeDetailTrip,
  type EmployeePayrollMonth,
  type EmployeeSalaryAdvance,
} from '@/api/employees';
import { ROUTES } from '@/config/routes';
import { formatMoneyVi, normalizeNumeric } from '@/utils/number';
import { DownloadOutlined } from '@ant-design/icons';
import { exportEmployeeReport } from '@/utils/exportReport';

function rulesDescription(rules: EmployeeDetailData['rules']) {
  if (rules == null) return null;
  if (typeof rules === 'string') {
    return <Typography.Paragraph style={{ marginBottom: 0 }}>{rules}</Typography.Paragraph>;
  }
  return (
    <ul style={{ marginBottom: 0, paddingLeft: 20 }}>
      {Object.entries(rules).map(([k, v]) => (
        <li key={k}>
          <strong>{k}:</strong> {typeof v === 'object' ? JSON.stringify(v) : String(v)}
        </li>
      ))}
    </ul>
  );
}

function formatTripDay(iso: string) {
  const d = dayjs(iso);
  return d.isValid() ? d.format('DD/MM/YYYY') : iso;
}

function shiftTripLabel(t: EmployeeDetailTrip) {
  if (t.driverShift === 'night') return 'Đêm';
  if (t.driverShift === 'day') return 'Ngày';
  return '—';
}

type AdvanceFormValues = {
  advanceDate: Dayjs;
  amount: number;
  note?: string;
};

type AbsenceFormValues = {
  absenceDate: Dayjs;
  note?: string;
};

/** Mặc định tháng hiện tại — giống tư duy chi tiết xe */
function defaultViewMonth(): Dayjs {
  return dayjs().startOf('month');
}

export function EmployeeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [selectedMonth, setSelectedMonth] = useState<Dayjs>(defaultViewMonth);
  const yearMonth = selectedMonth.format('YYYY-MM');

  /** Thông tin NV cố định — tách query để đổi tháng không làm nhấp nháy card. */
  const { data: employeeRes, isLoading: loadingEmployee } = useQuery({
    queryKey: ['employee', id],
    queryFn: () => employeesApi.getById(id!),
    enabled: !!id,
  });

  const {
    data: detailRes,
    isFetching: fetchingMonthData,
  } = useQuery({
    queryKey: ['employee-detail', id, yearMonth],
    queryFn: () =>
      employeesApi.getDetail(id!, {
        fromMonth: yearMonth,
        toMonth: yearMonth,
      }),
    enabled: !!id,
  });

  const detail = detailRes?.data;
  const employee = employeeRes?.data ?? detail?.employee;

  const [persistedRules, setPersistedRules] = useState<EmployeeDetailData['rules']>(null);
  useEffect(() => {
    if (detail?.rules != null) setPersistedRules(detail.rules);
  }, [detail?.rules]);
  const rulesForAlert = detail?.rules ?? persistedRules;
  const baseSalaryRaw = employee?.baseSalary ?? (employee as Employee & { base_salary?: unknown })?.base_salary;
  const baseSalary =
    typeof baseSalaryRaw === 'number' ? baseSalaryRaw : Number(baseSalaryRaw);

  const payroll = detail?.payrollByMonth?.find((p) => p.yearMonth === yearMonth);
  const trips = detail?.tripHistoryByMonth?.find((t) => t.yearMonth === yearMonth)?.trips ?? [];

  const invalidateDetail = () => {
    queryClient.invalidateQueries({ queryKey: ['employee-detail', id] });
  };

  if (loadingEmployee && !employee) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!employee) {
    return (
      <div style={{ padding: 24 }}>
        <Typography.Text type="danger">Không tìm thấy nhân viên.</Typography.Text>
      </div>
    );
  }

  function handleExportEmployee() {
    if (!payroll || !employee) return;
    exportEmployeeReport({
      employeeName: employee.fullName ?? 'NhânViên',
      yearMonth,
      trips,
      payroll,
    });
  }

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Link to={ROUTES.EMPLOYEES}>
          <Button type="link" style={{ paddingLeft: 0 }}>
            ← Danh sách nhân viên
          </Button>
        </Link>
      </Space>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ margin: 0 }}>Chi tiết nhân viên</h2>
        <Button
          icon={<DownloadOutlined />}
          onClick={handleExportEmployee}
          disabled={!payroll || fetchingMonthData}
        >
          Xuất báo cáo Excel
        </Button>
      </div>

      <Row gutter={16}>
        <Col xs={24} md={16}>
          <Card title="Thông tin nhân viên" style={{ marginBottom: 16 }}>
            <Descriptions column={1}>
              <Descriptions.Item label="Mã NV">{employee.employeeCode ?? '—'}</Descriptions.Item>
              <Descriptions.Item label="Họ tên">{employee.fullName}</Descriptions.Item>
              <Descriptions.Item label="Lương cơ bản">
                {!Number.isNaN(baseSalary) && baseSalary >= 0
                  ? formatMoneyVi(baseSalary, '—')
                  : '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Vị trí">{employee.position ?? '—'}</Descriptions.Item>
              <Descriptions.Item label="Số điện thoại">{employee.phone ?? '—'}</Descriptions.Item>
              <Descriptions.Item label="Email">{employee.email ?? '—'}</Descriptions.Item>
              <Descriptions.Item label="Số GPLX">{employee.licenseNumber ?? '—'}</Descriptions.Item>
              <Descriptions.Item label="Hạng GPLX">{employee.licenseType ?? '—'}</Descriptions.Item>
              <Descriptions.Item label="Trạng thái">
                <Tag color={employee.status === 'active' ? 'green' : 'default'}>
                  {employee.status === 'active' ? 'Hoạt động' : 'Ngừng'}
                </Tag>
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>
      </Row>

      {rulesForAlert != null ? (
        <Alert
          style={{ marginBottom: 16 }}
          type="info"
          showIcon
          message={
            <Space>
              Quy tắc tính lương
              <Tooltip title="Theo cấu hình BE (`rules`)">
                <InfoCircleOutlined />
              </Tooltip>
            </Space>
          }
          description={rulesDescription(rulesForAlert)}
        />
      ) : null}

      <Card
        title="Lịch sử vận hành"
        style={{ marginBottom: 16 }}
        extra={
          <Space wrap align="center">
            <Typography.Text type="secondary" style={{ fontSize: 13 }}>
              Tháng xem
            </Typography.Text>
            <DatePicker
              picker="month"
              value={selectedMonth}
              onChange={(d) => {
                if (d) setSelectedMonth(d.startOf('month'));
              }}
              format="MM/YYYY"
              allowClear={false}
            />
          </Space>
        }
      >
        <Typography.Paragraph type="secondary" style={{ marginBottom: 16, marginTop: 0 }}>
          Chuyến xe, chấm công, ứng lương và bảng lương theo tháng đã chọn. Mặc định là tháng hiện
          tại (giống kỳ xem trên chi tiết xe).
        </Typography.Paragraph>
        <EmployeeMonthOperationTabs
          employeeId={id!}
          yearMonth={yearMonth}
          monthLoading={fetchingMonthData}
          payroll={payroll}
          trips={trips}
          onInvalidate={invalidateDetail}
        />
      </Card>
    </div>
  );
}

type EmployeeMonthOperationTabsProps = {
  employeeId: string;
  yearMonth: string;
  /** Đang tải dữ liệu theo tháng — bảng dùng `loading` giống chi tiết xe */
  monthLoading: boolean;
  payroll?: EmployeePayrollMonth;
  trips: EmployeeDetailTrip[];
  onInvalidate: () => void;
};

function EmployeeMonthOperationTabs({
  employeeId,
  yearMonth,
  monthLoading,
  payroll,
  trips,
  onInvalidate,
}: EmployeeMonthOperationTabsProps) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('trips');
  const [advanceOpen, setAdvanceOpen] = useState(false);
  const [advanceEditing, setAdvanceEditing] = useState<EmployeeSalaryAdvance | null>(null);
  const [absenceOpen, setAbsenceOpen] = useState(false);
  const [advanceForm] = Form.useForm<AdvanceFormValues>();
  const [absenceForm] = Form.useForm<AbsenceFormValues>();

  const createAdvance = useMutation({
    mutationFn: (body: Parameters<typeof employeesApi.createSalaryAdvance>[1]) =>
      employeesApi.createSalaryAdvance(employeeId, body),
    onSuccess: () => {
      message.success('Đã thêm ứng lương');
      setAdvanceOpen(false);
      advanceForm.resetFields();
      onInvalidate();
    },
    onError: (e: Error) => message.error(e.message),
  });

  const updateAdvance = useMutation({
    mutationFn: ({
      advanceId,
      body,
    }: {
      advanceId: string;
      body: Partial<{ advanceDate: string; amount: number; note: string }>;
    }) => employeesApi.updateSalaryAdvance(employeeId, advanceId, body),
    onSuccess: () => {
      message.success('Đã cập nhật');
      setAdvanceEditing(null);
      advanceForm.resetFields();
      onInvalidate();
    },
    onError: (e: Error) => message.error(e.message),
  });

  const deleteAdvance = useMutation({
    mutationFn: (advId: string) => employeesApi.deleteSalaryAdvance(employeeId, advId),
    onSuccess: () => {
      message.success('Đã xóa bản ghi ứng lương');
      onInvalidate();
    },
    onError: (e: Error) => message.error(e.message),
  });

  const createAbsence = useMutation({
    mutationFn: (body: Parameters<typeof employeesApi.createAbsence>[1]) =>
      employeesApi.createAbsence(employeeId, body),
    onSuccess: () => {
      message.success('Đã ghi nhận ngày nghỉ');
      setAbsenceOpen(false);
      absenceForm.resetFields();
      onInvalidate();
    },
    onError: (e: Error) => message.error(e.message),
  });

  const deleteAbsence = useMutation({
    mutationFn: (absenceId: string) => employeesApi.deleteAbsence(employeeId, absenceId),
    onSuccess: () => {
      message.success('Đã xóa ngày nghỉ');
      onInvalidate();
    },
    onError: (e: Error) => message.error(e.message),
  });

  const openCreateAdvance = () => {
    setAdvanceEditing(null);
    advanceForm.setFieldsValue({
      advanceDate: dayjs(`${yearMonth}-01`),
      amount: 0,
      note: undefined,
    });
    setAdvanceOpen(true);
  };

  const openEditAdvance = (row: EmployeeSalaryAdvance) => {
    setAdvanceEditing(row);
    advanceForm.setFieldsValue({
      advanceDate: dayjs(row.advanceDate),
      amount: normalizeNumeric(row.amount, 0),
      note: row.note ?? undefined,
    });
    setAdvanceOpen(true);
  };

  const submitAdvance = async () => {
    const v = await advanceForm.validateFields();
    const payload = {
      advanceDate: v.advanceDate.format('YYYY-MM-DD'),
      amount: normalizeNumeric(v.amount, 0),
      note: v.note?.trim() || undefined,
    };
    if (advanceEditing) {
      await updateAdvance.mutateAsync({ advanceId: advanceEditing.id, body: payload });
    } else {
      await createAdvance.mutateAsync(payload);
    }
  };

  const submitAbsence = async () => {
    const v = await absenceForm.validateFields();
    await createAbsence.mutateAsync({
      absenceDate: v.absenceDate.format('YYYY-MM-DD'),
      note: v.note?.trim() || undefined,
    });
  };

  const att = payroll?.attendance;

  const monthLabel = dayjs(`${yearMonth}-01`).format('MM/YYYY');

  const tabs = [
    {
      key: 'trips',
      label: 'Chuyến xe',
      children:
        !monthLoading && trips.length === 0 ? (
          <Empty description={`Không có chuyến trong tháng ${monthLabel}`} />
        ) : (
          <Table<EmployeeDetailTrip>
            size="middle"
            rowKey="id"
            pagination={false}
            loading={monthLoading}
            dataSource={trips}
            onRow={(record) => ({
              onClick: () => navigate(`${ROUTES.TRIPS}/${record.id}`),
              style: { cursor: 'pointer' },
            })}
            locale={{ emptyText: monthLoading ? ' ' : 'Chưa có dữ liệu' }}
            columns={[
              {
                title: 'Ngày',
                dataIndex: 'tripDate',
                width: 120,
                render: (d: string) => formatTripDay(d),
              },
              { title: 'Mã chuyến', dataIndex: 'tripCode', width: 160, render: (v) => v ?? '—' },
              { title: 'Ca', key: 'shift', width: 90, render: (_, r) => shiftTripLabel(r) },
              {
                title: 'Doanh thu',
                dataIndex: 'revenue',
                align: 'right',
                render: (v: unknown) => formatMoneyVi(v, '—'),
              },
              {
                title: 'Trạng thái',
                dataIndex: 'status',
                width: 120,
                render: (v: string) => (
                  <Tag>{v ?? '—'}</Tag>
                ),
              },
            ]}
          />
        ),
    },
    {
      key: 'attendance',
      label: 'Chấm công',
      children: (
        <Spin spinning={monthLoading}>
          <div>
            <Space style={{ marginBottom: 12 }}>
              <Button
                type="primary"
                size="small"
                disabled={monthLoading}
                onClick={() => {
                  absenceForm.setFieldsValue({
                    absenceDate: dayjs(`${yearMonth}-01`),
                    note: undefined,
                  });
                  setAbsenceOpen(true);
                }}
              >
                Thêm ngày nghỉ
              </Button>
            </Space>
            {att ? (
              <Descriptions size="small" column={{ xs: 1, sm: 2 }} style={{ marginBottom: 16 }}>
                <Descriptions.Item label="Ngày nghỉ phép (miễn)">{att.allowedRestDays}</Descriptions.Item>
                <Descriptions.Item label="Ngày nghỉ đã khai báo">{att.absentDays}</Descriptions.Item>
              <Descriptions.Item label="Ngày nghỉ vượt (trừ lương)">{att.extraAbsentDays}</Descriptions.Item>
              <Descriptions.Item label="Mẫu ngày công">{att.workDaysDenominator}</Descriptions.Item>
              <Descriptions.Item label="Khấu trừ nghỉ">{formatMoneyVi(att.absenceDeduction, '—')}</Descriptions.Item>
              </Descriptions>
            ) : (
              <Typography.Paragraph type="secondary" style={{ marginBottom: 16 }}>
                {monthLoading
                  ? ' '
                  : payroll
                    ? 'Chưa có dữ liệu chấm công cho tháng này.'
                    : 'Chưa có bảng lương tháng — vẫn có thể thêm ngày nghỉ, sau đó tải lại.'}
              </Typography.Paragraph>
            )}
            <Typography.Title level={5} style={{ marginTop: 0 }}>
              Chi tiết ngày nghỉ
            </Typography.Title>
            <Table<EmployeeAbsence>
              size="small"
              rowKey="id"
              pagination={false}
              dataSource={att?.absenceDates ?? []}
              locale={{ emptyText: 'Chưa khai báo ngày nghỉ' }}
              columns={[
              { title: 'Ngày', dataIndex: 'absenceDate', width: 140 },
              {
                title: 'Ghi chú',
                dataIndex: 'note',
                ellipsis: true,
                render: (v: string | null | undefined) => v?.trim() || '—',
              },
              {
                title: 'Thao tác',
                key: 'x',
                width: 100,
                render: (_, row) => (
                  <Popconfirm title="Xóa ngày nghỉ này?" onConfirm={() => deleteAbsence.mutate(row.id)}>
                    <Button type="link" size="small" danger loading={deleteAbsence.isPending}>
                      Xóa
                    </Button>
                  </Popconfirm>
                ),
              },
              ]}
            />
          </div>
        </Spin>
      ),
    },
    {
      key: 'advance',
      label: 'Ứng lương',
      children: (
        <div>
          <Space style={{ marginBottom: 12 }}>
            <Button type="primary" size="small" disabled={monthLoading} onClick={openCreateAdvance}>
              Thêm ứng lương
            </Button>
          </Space>
          <Table<EmployeeSalaryAdvance>
            size="middle"
            rowKey="id"
            pagination={false}
            loading={monthLoading}
            dataSource={payroll?.advances ?? []}
            locale={{ emptyText: 'Chưa có tạm ứng trong tháng' }}
            columns={[
              { title: 'Ngày ứng', dataIndex: 'advanceDate', width: 140 },
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
                render: (v: string | null | undefined) => v?.trim() || '—',
              },
              {
                title: 'Thao tác',
                key: 'a',
                width: 140,
                render: (_, row) => (
                  <Space>
                    <Button type="link" size="small" onClick={() => openEditAdvance(row)}>
                      Sửa
                    </Button>
                    <Popconfirm title="Xóa bản ghi ứng lương?" onConfirm={() => deleteAdvance.mutate(row.id)}>
                      <Button type="link" size="small" danger loading={deleteAdvance.isPending}>
                        Xóa
                      </Button>
                    </Popconfirm>
                  </Space>
                ),
              },
            ]}
          />
        </div>
      ),
    },
    {
      key: 'salary',
      label: 'Lương',
      children: monthLoading ? (
        <div style={{ padding: 32, textAlign: 'center' }}>
          <Spin />
        </div>
      ) : payroll ? (
        <div>
          <Descriptions bordered size="small" column={{ xs: 1, sm: 2 }}>
            <Descriptions.Item label="Lương cơ bản (áp cả kỳ)">
              {formatMoneyVi(payroll.baseSalary, '—')}
            </Descriptions.Item>
            <Descriptions.Item label="Tổng % / thưởng lái xe (tháng)">
              {formatMoneyVi(payroll.driverPercentTotal, '—')}
            </Descriptions.Item>
            <Descriptions.Item label="Tổng tạm ứng">{formatMoneyVi(payroll.advanceTotal, '—')}</Descriptions.Item>
            <Descriptions.Item label="Khấu trừ nghỉ">
              {formatMoneyVi(att?.absenceDeduction, '—')}
            </Descriptions.Item>
            <Descriptions.Item label="Tổng lương" span={2}>
              <Typography.Text strong style={{ fontSize: 16 }}>
                {formatMoneyVi(payroll.totalSalary, '—')}
              </Typography.Text>
            </Descriptions.Item>
          </Descriptions>
          <Typography.Paragraph type="secondary" style={{ marginTop: 16, marginBottom: 0 }}>
            Công thức: lương CB + % lái − tạm ứng − khấu trừ nghỉ (theo quy tắc BE).
          </Typography.Paragraph>
        </div>
      ) : (
        <Empty description={`Chưa có dữ liệu bảng lương cho tháng ${monthLabel}`} />
      ),
    },
  ];

  return (
    <>
      <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabs} />

      <Modal
        title={advanceEditing ? 'Sửa ứng lương' : 'Thêm ứng lương'}
        open={advanceOpen}
        onCancel={() => {
          setAdvanceOpen(false);
          setAdvanceEditing(null);
          advanceForm.resetFields();
        }}
        onOk={submitAdvance}
        confirmLoading={createAdvance.isPending || updateAdvance.isPending}
        destroyOnClose
      >
        <Form form={advanceForm} layout="vertical">
          <Form.Item name="advanceDate" label="Ngày ứng" rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="amount" label="Số tiền" rules={[{ required: true, message: 'Nhập số tiền' }]}>
            <VndInputNumber min={0} placeholder="0" />
          </Form.Item>
          <Form.Item name="note" label="Ghi chú">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Thêm ngày nghỉ"
        open={absenceOpen}
        onCancel={() => {
          setAbsenceOpen(false);
          absenceForm.resetFields();
        }}
        onOk={submitAbsence}
        confirmLoading={createAbsence.isPending}
        destroyOnClose
      >
        <Form form={absenceForm} layout="vertical">
          <Form.Item name="absenceDate" label="Ngày nghỉ" rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="note" label="Ghi chú">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
        <Typography.Paragraph type="secondary" style={{ fontSize: 12 }}>
          Trùng ngày cho cùng nhân viên — backend trả 400.
        </Typography.Paragraph>
      </Modal>
    </>
  );
}
