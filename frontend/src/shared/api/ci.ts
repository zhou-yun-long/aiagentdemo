import type { ApiTokenDto, CreateTokenRequest } from '../types/ci';
import { request } from './request';

export function createToken(projectId: number, data: CreateTokenRequest) {
  return request<ApiTokenDto>(`/api/v1/projects/${projectId}/tokens`, {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

export function listTokens(projectId: number) {
  return request<ApiTokenDto[]>(`/api/v1/projects/${projectId}/tokens`);
}

export function revokeToken(tokenId: number) {
  return request<void>(`/api/v1/tokens/${tokenId}`, {
    method: 'DELETE'
  });
}
