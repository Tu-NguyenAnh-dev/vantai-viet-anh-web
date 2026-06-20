import { useMemo, useState } from 'react';
import { Button, Descriptions, Modal, Table, Upload, message } from 'antd';
import type { UploadProps } from 'antd';
import { InboxOutlined } from '@ant-design/icons';
import { importExcel, type ImportResult, type ImportType } from '@/services/importService';
import { useMutation } from '@tanstack/react-query';

type ImportExcelModalProps = {
  open: boolean;
  onClose: () => void;
  type: ImportType;
  title: string;
  templateHref?: string;
  onDownloadTemplate?: () => void;
  onImported?: () => void;
};

const MAX_SIZE_MB = 5;

export function ImportExcelModal({
  open,
  onClose,
  type,
  title,
  templateHref,
  onDownloadTemplate,
  onImported,
}: ImportExcelModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);

  const handleClose = () => {
    setFile(null);
    setResult(null);
    onClose();
  };

  const mutation = useMutation({
    mutationFn: (f: File) => importExcel(type, f),
    onSuccess: (res) => {
      setResult(res);
      message.success(`Import thành công: ${res.success}, lỗi: ${res.failed}`);
      onImported?.();
      // Nếu không có lỗi thì tự đóng modal
      if ((res.failed ?? 0) === 0 && (res.errors?.length ?? 0) === 0) {
        handleClose();
      }
    },
    onError: (err) => {
      const msg = err instanceof Error ? err.message : 'Import thất bại';
      message.error(msg);
    },
  });

  const uploadProps: UploadProps = useMemo(
    () => ({
      multiple: false,
      maxCount: 1,
      accept: '.xlsx',
      beforeUpload: (f) => {
        const isXlsx =
          f.type ===
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
          f.name.toLowerCase().endsWith('.xlsx');
        if (!isXlsx) {
          message.error('Chỉ hỗ trợ file .xlsx');
          return Upload.LIST_IGNORE;
        }
        const sizeMb = f.size / 1024 / 1024;
        if (sizeMb > MAX_SIZE_MB) {
          message.error(`File vượt quá ${MAX_SIZE_MB}MB`);
          return Upload.LIST_IGNORE;
        }
        setFile(f as File);
        setResult(null);
        return false; // prevent auto upload
      },
      onRemove: () => {
        setFile(null);
        setResult(null);
      },
      showUploadList: true,
    }),
    [],
  );

  const handleOk = async () => {
    if (!file) {
      message.error('Vui lòng chọn file .xlsx');
      return;
    }
    await mutation.mutateAsync(file);
  };

  return (
    <Modal
      title={title}
      open={open}
      onCancel={handleClose}
      onOk={handleOk}
      okText="Import"
      confirmLoading={mutation.isPending}
      width={900}
      destroyOnClose
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ color: '#666' }}>
          Chỉ nhận <b>.xlsx</b>, tối đa <b>5MB</b>, tối đa <b>5000</b> dòng (không tính header).
        </div>
        {(onDownloadTemplate || templateHref) ? (
          <Button onClick={onDownloadTemplate ?? (() => window.open(templateHref, '_blank'))}>
            Tải template
          </Button>
        ) : null}
      </div>

      <Upload.Dragger {...uploadProps}>
        <p className="ant-upload-drag-icon">
          <InboxOutlined />
        </p>
        <p className="ant-upload-text">Kéo thả file Excel vào đây hoặc bấm để chọn</p>
        <p className="ant-upload-hint">Form field: <code>file</code></p>
      </Upload.Dragger>

      {result ? (
        <div style={{ marginTop: 16 }}>
          <Descriptions bordered size="small" column={3}>
            <Descriptions.Item label="Thành công">{result.success}</Descriptions.Item>
            <Descriptions.Item label="Thất bại">{result.failed}</Descriptions.Item>
            <Descriptions.Item label="Tổng lỗi">{result.errors?.length ?? 0}</Descriptions.Item>
          </Descriptions>

          <div style={{ marginTop: 12 }}>
            <Table
              rowKey={(r) => `${r.row}-${r.field}-${r.message}`}
              size="small"
              dataSource={result.errors ?? []}
              pagination={{ pageSize: 10 }}
              columns={[
                { title: 'Row', dataIndex: 'row', width: 80 },
                { title: 'Field', dataIndex: 'field', width: 160 },
                { title: 'Message', dataIndex: 'message' },
              ]}
              locale={{ emptyText: 'Không có lỗi' }}
            />
          </div>
        </div>
      ) : null}
    </Modal>
  );
}

