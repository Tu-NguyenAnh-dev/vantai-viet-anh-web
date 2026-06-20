import { apiClient } from '@/api/client';

export type ImportType = 'vehicles' | 'employees' | 'customers' | 'trips' | 'users';

export type ImportErrorItem = {
  row: number;
  field: string;
  message: string;
};

export type ImportResult = {
  success: number;
  failed: number;
  errors: ImportErrorItem[];
};

export async function importExcel(type: ImportType, file: File) {
  const form = new FormData();
  form.append('file', file);
  const res = await apiClient.post<ImportResult>(`/import/${type}`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res;
}

