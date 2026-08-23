import {
  computeFameScore,
  computeShameScore,
  daysLate,
} from "./lib/shame-score";
import { pickFameTitle, pickShameTitle } from "./lib/titles";
import { deadbeatRepository } from "./deadbeat.repository";
import type {
  DeadbeatBoard,
  DeadbeatLeaderboard,
  DeadbeatLeaderboardEntry,
  PendingDebtRow,
} from "./deadbeat.types";

function uniqueIds(ids: string[]): string[] {
  return [...new Set(ids.filter(Boolean))];
}

function dueAtForDebt(debt: PendingDebtRow): Date | null {
  return debt.splitDueAt ?? debt.paymentDueAt;
}

function aggregateDebts(debts: PendingDebtRow[], now: Date) {
  let maxDaysLate = 0;
  let overdueCount = 0;
  const amountByCurrency = new Map<string, number>();

  for (const debt of debts) {
    const late = daysLate(dueAtForDebt(debt), now);
    if (late <= 0) continue;

    overdueCount += 1;
    maxDaysLate = Math.max(maxDaysLate, late);
    const currency = debt.currency || "USD";
    amountByCurrency.set(
      currency,
      (amountByCurrency.get(currency) ?? 0) + debt.amountCents,
    );
  }

  let currency = "USD";
  let overdueAmountCents = 0;
  for (const [code, amountCents] of amountByCurrency) {
    if (amountCents > overdueAmountCents) {
      currency = code;
      overdueAmountCents = amountCents;
    }
  }

  return { maxDaysLate, overdueCount, overdueAmountCents, currency };
}

type PersonStats = {
  user: { id: string; name: string; image: string | null };
  shameScore: number;
  fameScore: number;
  daysLate: number;
  overdueCount: number;
  overdueAmountCents: number;
  settledCount: number;
  currency: string;
};

function rankBoard(
  people: PersonStats[],
  viewerId: string,
  kind: "shame" | "fame",
): DeadbeatBoard {
  const sorted = [...people].sort((a, b) => {
    if (kind === "shame") {
      if (b.shameScore !== a.shameScore) return b.shameScore - a.shameScore;
      if (b.daysLate !== a.daysLate) return b.daysLate - a.daysLate;
    } else {
      if (b.fameScore !== a.fameScore) return b.fameScore - a.fameScore;
      if (b.settledCount !== a.settledCount) {
        return b.settledCount - a.settledCount;
      }
    }
    return a.user.name.localeCompare(b.user.name);
  });

  const entries: DeadbeatLeaderboardEntry[] = sorted.map((person, index) => ({
    rank: index + 1,
    user: person.user,
    shameScore: person.shameScore,
    fameScore: person.fameScore,
    title:
      kind === "shame"
        ? pickShameTitle(person.user.id, person.shameScore)
        : pickFameTitle(person.user.id, person.fameScore),
    daysLate: person.daysLate,
    overdueCount: person.overdueCount,
    overdueAmountCents: person.overdueAmountCents,
    settledCount: person.settledCount,
    currency: person.currency,
    isCurrentUser: person.user.id === viewerId,
  }));

  const meEntry = entries.find((entry) => entry.isCurrentUser) ?? null;

  return {
    entries,
    me: meEntry
      ? {
          rank: meEntry.rank,
          shameScore: meEntry.shameScore,
          fameScore: meEntry.fameScore,
          title: meEntry.title,
        }
      : null,
  };
}

export const deadbeatService = {
  async getLeaderboard(viewerId: string): Promise<DeadbeatLeaderboard> {
    const [friendIds, paymentIds] = await Promise.all([
      deadbeatRepository.listAcceptedFriendIds(viewerId),
      deadbeatRepository.listSharedPaymentIds(viewerId),
    ]);
    const coParticipantIds =
      await deadbeatRepository.listCoParticipantIds(paymentIds);
    const eligibleIds = uniqueIds([
      viewerId,
      ...friendIds,
      ...coParticipantIds,
    ]);

    const [debts, settledCounts, users] = await Promise.all([
      deadbeatRepository.listPendingDebts(paymentIds, eligibleIds),
      deadbeatRepository.listSettledCounts(paymentIds, eligibleIds),
      deadbeatRepository.listPublicUsers(eligibleIds),
    ]);

    const debtsByUser = new Map<string, PendingDebtRow[]>();
    for (const debt of debts) {
      const existing = debtsByUser.get(debt.debtorUserId);
      if (existing) {
        existing.push(debt);
      } else {
        debtsByUser.set(debt.debtorUserId, [debt]);
      }
    }

    const now = new Date();
    const people: PersonStats[] = users.map((person) => {
      const metrics = aggregateDebts(debtsByUser.get(person.id) ?? [], now);
      const shameScore = computeShameScore(metrics);
      const settledCount = settledCounts.get(person.id) ?? 0;
      return {
        user: {
          id: person.id,
          name: person.name,
          image: person.image,
        },
        shameScore,
        fameScore: computeFameScore(shameScore, settledCount),
        daysLate: metrics.maxDaysLate,
        overdueCount: metrics.overdueCount,
        overdueAmountCents: metrics.overdueAmountCents,
        settledCount,
        currency: metrics.currency,
      };
    });

    return {
      shame: rankBoard(people, viewerId, "shame"),
      fame: rankBoard(people, viewerId, "fame"),
    };
  },
};
