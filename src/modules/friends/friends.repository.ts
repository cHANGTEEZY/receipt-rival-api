import { and, eq, or } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "../../db";
import { user } from "../../db/schema/auth";
import { friendship } from "../../db/schema/friends";

function normalizePair(userA: string, userB: string) {
  return userA < userB
    ? { userLowId: userA, userHighId: userB }
    : { userLowId: userB, userHighId: userA };
}

const friendUser = alias(user, "friend_user");
const requesterUser = alias(user, "requester_user");

export const friendsRepository = {
  async findPair(userA: string, userB: string) {
    const { userLowId, userHighId } = normalizePair(userA, userB);
    const [record] = await db
      .select()
      .from(friendship)
      .where(
        and(
          eq(friendship.userLowId, userLowId),
          eq(friendship.userHighId, userHighId),
        ),
      )
      .limit(1);

    return record ?? null;
  },

  async findById(id: string) {
    const [record] = await db
      .select()
      .from(friendship)
      .where(eq(friendship.id, id))
      .limit(1);

    return record ?? null;
  },

  async createRequest(requesterId: string, addresseeId: string) {
    const { userLowId, userHighId } = normalizePair(requesterId, addresseeId);
    const [record] = await db
      .insert(friendship)
      .values({
        id: crypto.randomUUID(),
        requesterId,
        addresseeId,
        userLowId,
        userHighId,
        status: "pending",
      })
      .returning();

    return record ?? null;
  },

  async reopenAsPending(id: string, requesterId: string, addresseeId: string) {
    const [record] = await db
      .update(friendship)
      .set({
        requesterId,
        addresseeId,
        status: "pending",
        requestedAt: new Date(),
        acceptedAt: null,
        removedAt: null,
      })
      .where(eq(friendship.id, id))
      .returning();

    return record ?? null;
  },

  async accept(id: string) {
    const [record] = await db
      .update(friendship)
      .set({
        status: "accepted",
        acceptedAt: new Date(),
        removedAt: null,
      })
      .where(eq(friendship.id, id))
      .returning();

    return record ?? null;
  },

  async rejectOrRemove(id: string) {
    const [record] = await db
      .update(friendship)
      .set({
        status: "removed",
        removedAt: new Date(),
      })
      .where(eq(friendship.id, id))
      .returning();

    return record ?? null;
  },

  async listAccepted(userId: string) {
    return db
      .select({
        friendship,
        friend: {
          id: friendUser.id,
          name: friendUser.name,
          image: friendUser.image,
        },
      })
      .from(friendship)
      .innerJoin(
        friendUser,
        or(
          and(
            eq(friendship.requesterId, userId),
            eq(friendUser.id, friendship.addresseeId),
          ),
          and(
            eq(friendship.addresseeId, userId),
            eq(friendUser.id, friendship.requesterId),
          ),
        ),
      )
      .where(
        and(
          eq(friendship.status, "accepted"),
          or(
            eq(friendship.requesterId, userId),
            eq(friendship.addresseeId, userId),
          ),
        ),
      );
  },

  async listIncomingPending(userId: string) {
    return db
      .select({
        friendship,
        requester: {
          id: requesterUser.id,
          name: requesterUser.name,
          image: requesterUser.image,
        },
      })
      .from(friendship)
      .innerJoin(requesterUser, eq(friendship.requesterId, requesterUser.id))
      .where(
        and(
          eq(friendship.addresseeId, userId),
          eq(friendship.status, "pending"),
        ),
      );
  },

  async areAcceptedFriends(userA: string, userB: string) {
    const pair = await this.findPair(userA, userB);
    return pair?.status === "accepted";
  },
};
