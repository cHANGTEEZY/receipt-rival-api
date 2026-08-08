import { and, eq, ilike, ne, or } from "drizzle-orm";
import { db } from "../../db";
import { user } from "../../db/schema/auth";

export const usersRepository = {
  async findById(id: string) {
    const [record] = await db
      .select()
      .from(user)
      .where(eq(user.id, id))
      .limit(1);

    return record ?? null;
  },

  async search(query: string, excludeUserId: string, limit = 20) {
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
      })
      .from(user)
      .where(
        and(
          ne(user.id, excludeUserId),
          or(ilike(user.name, pattern), ilike(user.email, pattern)),
        ),
      )
      .limit(limit);
  },
};
