export type RecentActivity = {
  type: string;
  description: string;
  timestamp: string;
};

export type ReviewStatsDto = {
  pending: number;
  approved: number;
  rejected: number;
  needsRevision: number;
};

export type DashboardDto = {
  totalCases: number;
  coveredCases: number;
  passedCases: number;
  failedCases: number;
  blockedCases: number;
  passRate: number;
  recentActivity: RecentActivity[];
  reviewStats?: ReviewStatsDto;
};
