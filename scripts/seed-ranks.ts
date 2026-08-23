import { isAPIError } from "better-auth/api";
import { and, eq, like } from "drizzle-orm";
import { db, pool } from "../src/db/index.ts";
import { user } from "../src/db/schema/auth.ts";
import { friendship } from "../src/db/schema/friends.ts";
import {
  payment,
  paymentParticipant,
  paymentSplit,
} from "../src/db/schema/payments.ts";
import { auth } from "../src/modules/auth/auth.service.ts";
import { friendsRepository } from "../src/modules/friends/friends.repository.ts";

const VIEWER = {
  name: "Asd",
  email: "asd@gmail.com",
  password: "password",
} as const;

const FRIEND_PASSWORD = "Password123!";

const SEED_FRIENDS = [
  { name: "Emily Chen", email: "emily.chen@gmail.com" },
  { name: "Marcus Johnson", email: "marcus.johnson@outlook.com" },
  { name: "Sarah Williams", email: "sarah.williams@yahoo.com" },
  { name: "David Martinez", email: "david.martinez@gmail.com" },
  { name: "Jessica Thompson", email: "jessica.thompson@icloud.com" },
  { name: "Ryan O'Brien", email: "ryan.obrien@gmail.com" },
  { name: "Priya Patel", email: "priya.patel@outlook.com" },
  { name: "James Anderson", email: "james.anderson@gmail.com" },
  { name: "Olivia Garcia", email: "olivia.garcia@yahoo.com" },
  { name: "Michael Kim", email: "michael.kim@gmail.com" },
] as const;

function normalizePair(userA: string, userB: string) {
  return userA < userB
    ? { userLowId: userA, userHighId: userB }
    : { userLowId: userB, userHighId: userA };
}

function daysAgo(days: number) {
  const date = new Date();
  date.setUTCHours(12, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() - days);
  return date;
}

async function ensureUser(name: string, email: string, password: string) {
  try {
    await auth.api.signUpEmail({
      body: { name, email, password },
    });
    console.log(`Created user: ${name} (${email})`);
  } catch (error) {
    if (isAPIError(error) && error.status === "UNPROCESSABLE_ENTITY") {
      console.log(`User exists: ${email}`);
    } else {
      throw error;
    }
  }

  const [record] = await db
    .select({ id: user.id, name: user.name, email: user.email })
    .from(user)
    .where(eq(user.email, email))
    .limit(1);

  if (!record) {
    throw new Error(`Could not load user ${email} after signup`);
  }

  return record;
}

async function ensureAcceptedFriendship(viewerId: string, friendId: string) {
  const existing = await friendsRepository.findPair(viewerId, friendId);
  if (!existing) {
    const { userLowId, userHighId } = normalizePair(viewerId, friendId);
    await db.insert(friendship).values({
      id: crypto.randomUUID(),
      requesterId: viewerId,
      addresseeId: friendId,
      userLowId,
      userHighId,
      status: "accepted",
      acceptedAt: new Date(),
    });
    return;
  }

  if (existing.status !== "accepted") {
    await friendsRepository.accept(existing.id);
  }
}

type SeedSplit = {
  debtorUserId: string;
  amountCents: number;
  dueAt: Date;
  status: "pending" | "settled";
};

async function createSeedPayment(input: {
  ownerId: string;
  title: string;
  dueAt: Date;
  splits: SeedSplit[];
}) {
  const paymentId = crypto.randomUUID();
  const totalAmountCents = input.splits.reduce(
    (sum, split) => sum + split.amountCents,
    0,
  );
  const participantIds = [
    ...new Set([input.ownerId, ...input.splits.map((split) => split.debtorUserId)]),
  ];

  await db.transaction(async (tx) => {
    await tx.insert(payment).values({
      id: paymentId,
      createdBy: input.ownerId,
      title: input.title,
      currency: "USD",
      totalAmountCents,
      splitMethod: "custom",
      status: "finalized",
      dueAt: input.dueAt,
      finalizedAt: new Date(),
    });

    await tx.insert(paymentParticipant).values(
      participantIds.map((userId) => ({
        id: crypto.randomUUID(),
        paymentId,
        userId,
        addedBy: input.ownerId,
        isOwner: userId === input.ownerId,
        isActive: true,
      })),
    );

    await tx.insert(paymentSplit).values(
      input.splits.map((split) => ({
        id: crypto.randomUUID(),
        paymentId,
        debtorUserId: split.debtorUserId,
        creditorUserId: input.ownerId,
        amountCents: split.amountCents,
        currency: "USD",
        status: split.status,
        dueAt: split.dueAt,
      })),
    );
  });
}

async function seedRanks() {
  const viewer = await ensureUser(VIEWER.name, VIEWER.email, VIEWER.password);
  const friends = [];

  for (const friend of SEED_FRIENDS) {
    const record = await ensureUser(
      friend.name,
      friend.email,
      FRIEND_PASSWORD,
    );
    await ensureAcceptedFriendship(viewer.id, record.id);
    friends.push(record);
  }

  console.log(`Linked ${friends.length} friends to ${VIEWER.email}`);

  const existingSeed = await db
    .select({ id: payment.id })
    .from(payment)
    .where(
      and(eq(payment.createdBy, viewer.id), like(payment.title, "[seed]%")),
    )
    .limit(1);

  if (existingSeed[0]) {
    console.log("Seed payments already exist for this user. Skipping bills.");
    return viewer;
  }

  const byEmail = new Map(friends.map((friend) => [friend.email, friend]));
  const requireFriend = (email: string) => {
    const record = byEmail.get(email);
    if (!record) throw new Error(`Missing seed friend ${email}`);
    return record;
  };

  const emily = requireFriend("emily.chen@gmail.com");
  const marcus = requireFriend("marcus.johnson@outlook.com");
  const sarah = requireFriend("sarah.williams@yahoo.com");
  const david = requireFriend("david.martinez@gmail.com");
  const jessica = requireFriend("jessica.thompson@icloud.com");
  const ryan = requireFriend("ryan.obrien@gmail.com");
  const priya = requireFriend("priya.patel@outlook.com");
  const james = requireFriend("james.anderson@gmail.com");
  const olivia = requireFriend("olivia.garcia@yahoo.com");
  const michael = requireFriend("michael.kim@gmail.com");

  await createSeedPayment({
    ownerId: viewer.id,
    title: "[seed] Overdue dinner",
    dueAt: daysAgo(14),
    splits: [
      {
        debtorUserId: emily.id,
        amountCents: 8200,
        dueAt: daysAgo(14),
        status: "pending",
      },
      {
        debtorUserId: marcus.id,
        amountCents: 4500,
        dueAt: daysAgo(8),
        status: "pending",
      },
      {
        debtorUserId: sarah.id,
        amountCents: 2200,
        dueAt: daysAgo(3),
        status: "pending",
      },
      {
        debtorUserId: david.id,
        amountCents: 6400,
        dueAt: daysAgo(20),
        status: "pending",
      },
    ],
  });

  await createSeedPayment({
    ownerId: viewer.id,
    title: "[seed] Settled brunch",
    dueAt: daysAgo(7),
    splits: [
      {
        debtorUserId: jessica.id,
        amountCents: 2800,
        dueAt: daysAgo(7),
        status: "settled",
      },
      {
        debtorUserId: ryan.id,
        amountCents: 2800,
        dueAt: daysAgo(7),
        status: "settled",
      },
      {
        debtorUserId: priya.id,
        amountCents: 2800,
        dueAt: daysAgo(7),
        status: "settled",
      },
      {
        debtorUserId: james.id,
        amountCents: 2800,
        dueAt: daysAgo(7),
        status: "settled",
      },
    ],
  });

  await createSeedPayment({
    ownerId: viewer.id,
    title: "[seed] Settled groceries",
    dueAt: daysAgo(4),
    splits: [
      {
        debtorUserId: jessica.id,
        amountCents: 1800,
        dueAt: daysAgo(4),
        status: "settled",
      },
      {
        debtorUserId: ryan.id,
        amountCents: 1800,
        dueAt: daysAgo(4),
        status: "settled",
      },
      {
        debtorUserId: olivia.id,
        amountCents: 1800,
        dueAt: daysAgo(4),
        status: "settled",
      },
      {
        debtorUserId: michael.id,
        amountCents: 1800,
        dueAt: daysAgo(4),
        status: "settled",
      },
    ],
  });

  console.log("Created [seed] overdue and settled payments.");
  return viewer;
}

try {
  await seedRanks();
  console.log(`\nSign in as ${VIEWER.email} / ${VIEWER.password}`);
} finally {
  await pool.end();
}
