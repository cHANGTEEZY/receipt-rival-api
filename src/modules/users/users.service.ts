import { usersRepository } from "./users.repository";
import type { PublicUser, PublicUserCard } from "./users.types";

function toPublicUser(record: {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image: string | null;
  createdAt: Date;
  updatedAt: Date;
}): PublicUser {
  return {
    id: record.id,
    name: record.name,
    email: record.email,
    emailVerified: record.emailVerified,
    image: record.image,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

function toPublicUserCard(record: {
  id: string;
  name: string;
  image: string | null;
}): PublicUserCard {
  return {
    id: record.id,
    name: record.name,
    image: record.image,
  };
}

export const usersService = {
  async getProfile(userId: string) {
    const record = await usersRepository.findById(userId);
    if (!record) return null;
    return toPublicUser(record);
  },

  async getPublicCard(userId: string) {
    const record = await usersRepository.findById(userId);
    if (!record) return null;
    return toPublicUserCard(record);
  },

  async searchUsers(query: string, currentUserId: string) {
    const records = await usersRepository.search(query, currentUserId);
    return records.map(toPublicUser);
  },
};
