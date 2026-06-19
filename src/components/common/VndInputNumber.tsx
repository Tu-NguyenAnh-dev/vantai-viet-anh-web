import { InputNumber, type InputNumberProps } from 'antd';

import { formatVndInput, parseVndInput } from '@/utils/vndInput';

export type VndInputNumberProps = Omit<InputNumberProps, 'formatter' | 'parser'> & {
  /** Mặc định `true` — hậu tố `đ` */
  currencySuffix?: boolean;
};

/**
 * Ô nhập số tiền VND: định dạng 1.000.000 và hậu tố `đ` (có thể tắt).
 * Số nguyên (đồng), không xu lẻ.
 */
export function VndInputNumber({
  currencySuffix = true,
  style,
  addonAfter,
  controls = false,
  ...rest
}: VndInputNumberProps) {
  return (
    <InputNumber
      {...rest}
      controls={controls}
      formatter={(value) => formatVndInput(value)}
      parser={(display) => parseVndInput(display)}
      addonAfter={currencySuffix ? addonAfter ?? 'đ' : addonAfter}
      style={{ width: '100%', ...style }}
    />
  );
}
