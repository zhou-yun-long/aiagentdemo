export type RecentActivity = {
  type: string;
  description: string;
  timestamp: string;
};

export type DashboardDto = {
  totalCases: number;
  coveredCases: number;
  passedCases: number;
  failedCases: number;
  blockedCases: number;
  passRate: number;
  recentActivity: RecentActivity[];
};
