import { and, eq, ilike, ne, or } from "drizzle-orm";
import { db } from "../../db";
import { user } from "../../db/schema/auth";
import { friendship } from "../../db/schema/friends";

function friendshipPairJoin(currentUserId: string) {
  return or(
    and(
      eq(friendship.userLowId, currentUserId),
      eq(friendship.userHighId, user.id),
    ),
    and(
      eq(friendship.userLowId, user.id),
      eq(friendship.userHighId, currentUserId),
    ),
  );
}

export const usersRepository = {
  async findById(id: string) {
    const [record] = await db
      .select()
      .from(user)
      .where(eq(user.id, id))
      .limit(1);

    return record ?? null;
  },

  async updateProfile(id: string, input: { name?: string; image?: string | null }) {
    const [record] = await db
      .update(user)
      .set({
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.image !== undefined ? { image: input.image } : {}),
      })
      .where(eq(user.id, id))
      .returning();

    return record ?? null;
  },

  async search(query: string, currentUserId: string, limit = 20) {
    const pattern = `%${query}%`;

    return db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        emailVerified: user.emailVerified,
        image: user.image,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        friendshipId: friendship.id,
        friendshipStatus: friendship.status,
        friendshipRequesterId: friendship.requesterId,
      })
      .from(user)
      .leftJoin(friendship, friendshipPairJoin(currentUserId))
      .where(
        and(
          ne(user.id, currentUserId),
          or(ilike(user.name, pattern), ilike(user.email, pattern)),
        ),
      )
      .limit(limit);
  },
};
