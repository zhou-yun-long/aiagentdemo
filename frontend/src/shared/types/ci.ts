export interface ApiTokenDto {
  id: number;
  projectId: number;
  name: string;
  token: string;
  active: boolean;
  createdAt: string;
  lastUsedAt: string | null;
}

export interface CreateTokenRequest {
  name: string;
}
