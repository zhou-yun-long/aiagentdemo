import type { ApiEnvelope } from './request';
import { ApiRequestError } from './request';

export type AttachmentUploadResult = {
  attachmentId: string;
  fileName: string;
  contentType: string;
  size: number;
};

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export function validateFileSize(file: File): string | null {
  if (file.size > MAX_FILE_SIZE) {
    return `${file.name} 超过 50MB 限制（当前 ${(file.size / 1024 / 1024).toFixed(1)}MB）`;
  }
  return null;
}

const MOCK_UPLOAD_RESULT: AttachmentUploadResult = {
  attachmentId: 'mock-att-001',
  fileName: 'mock.txt',
  contentType: 'text/plain',
  size: 1024,
};

export async function uploadAttachment(
  projectId: number,
  file: File
): Promise<AttachmentUploadResult> {
  const sizeError = validateFileSize(file);
  if (sizeError) {
    throw new Error(sizeError);
  }

  if (import.meta.env.VITE_TREEIFY_API_MODE === 'mock') {
    return Promise.resolve({ ...MOCK_UPLOAD_RESULT, fileName: file.name });
  }

  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`/api/v1/projects/${projectId}/attachments`, {
    method: 'POST',
    body: formData,
  });

  const payload = (await response.json().catch(() => null)) as ApiEnvelope<AttachmentUploadResult> | null;

  if (!response.ok || !payload || payload.code !== 0) {
    throw new ApiRequestError(
      payload?.message || response.statusText || '附件上传失败',
      response.status,
      payload?.code,
      payload?.requestId
    );
  }

  return payload.data;
}
