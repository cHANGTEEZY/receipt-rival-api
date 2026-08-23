export type DeadbeatPublicUser = {
  id: string;
  name: string;
  image: string | null;
};

export type DeadbeatLeaderboardEntry = {
  rank: number;
  user: DeadbeatPublicUser;
  shameScore: number;
  fameScore: number;
  title: string;
  daysLate: number;
  overdueCount: number;
  overdueAmountCents: number;
  settledCount: number;
  currency: string;
  isCurrentUser: boolean;
};

export type DeadbeatMeSummary = {
  rank: number;
  shameScore: number;
  fameScore: number;
  title: string;
};

export type DeadbeatBoard = {
  entries: DeadbeatLeaderboardEntry[];
  me: DeadbeatMeSummary | null;
};

export type DeadbeatLeaderboard = {
  shame: DeadbeatBoard;
  fame: DeadbeatBoard;
};

export type PendingDebtRow = {
  debtorUserId: string;
  amountCents: number;
  currency: string;
  splitDueAt: Date | null;
  paymentDueAt: Date | null;
};
