export type ApiEnvelope<T> = {
  code: number;
  message: string;
  data: T;
  requestId?: string;
};

export class ApiRequestError extends Error {
  code: number;
  requestId?: string;
  status: number;

  constructor(message: string, status: number, code = -1, requestId?: string) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
    this.code = code;
    this.requestId = requestId;
  }
}

export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers
    },
    ...init
  });

  const payload = (await response.json().catch(() => null)) as ApiEnvelope<T> | null;

  if (!response.ok || !payload || payload.code !== 0) {
    throw new ApiRequestError(
      payload?.message || response.statusText || '请求失败',
      response.status,
      payload?.code,
      payload?.requestId
    );
  }

  return payload.data;
}
