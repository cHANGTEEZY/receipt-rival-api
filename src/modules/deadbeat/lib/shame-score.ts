const MS_PER_DAY = 86_400_000;

export type ShameScoreInputs = {
  maxDaysLate: number;
  overdueCount: number;
  overdueAmountCents: number;
};

export function daysLate(dueAt: Date | null, now: Date): number {
  if (!dueAt) return 0;
  const elapsed = now.getTime() - dueAt.getTime();
  if (elapsed <= 0) return 0;
  return Math.floor(elapsed / MS_PER_DAY);
}

export function computeShameScore({
  maxDaysLate,
  overdueCount,
  overdueAmountCents,
}: ShameScoreInputs): number {
  const lateness = Math.min(maxDaysLate * 1.5, 55);
  const count = Math.min(overdueCount * 8, 25);
  const amount = Math.min(overdueAmountCents / 2000, 20);
  return Math.max(0, Math.min(100, Math.round(lateness + count + amount)));
}

export function computeFameScore(
  shameScore: number,
  settledCount: number,
): number {
  const bonus = Math.min(settledCount * 6, 20);
  return Math.max(0, Math.min(100, Math.round(100 - shameScore + bonus)));
}
