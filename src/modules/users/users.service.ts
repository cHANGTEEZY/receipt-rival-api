import { usersRepository } from "./users.repository";
import type {
  FriendRequestDirection,
  FriendRequestStatus,
  PublicUser,
  PublicUserCard,
  PublicUserSearchResult,
} from "./users.types";

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

  async searchUsers(
    query: string,
    currentUserId: string,
  ): Promise<PublicUserSearchResult[]> {
    const records = await usersRepository.search(query, currentUserId);
    return records.map((record) => toPublicUserSearchResult(record, currentUserId));
  },
};

function toFriendRequestStatus(
  status: "pending" | "accepted" | "removed" | null,
): FriendRequestStatus {
  if (status === "pending" || status === "accepted") return status;
  return null;
}

function toRequestDirection(
  status: "pending" | "accepted" | "removed" | null,
  requesterId: string | null,
  currentUserId: string,
): FriendRequestDirection {
  if (status !== "pending" || !requesterId) return null;
  if (requesterId === currentUserId) return "sent";
  return "received";
}

function toPublicUserSearchResult(
  record: {
    id: string;
    name: string;
    email: string;
    emailVerified: boolean;
    image: string | null;
    createdAt: Date;
    updatedAt: Date;
    friendshipId: string | null;
    friendshipStatus: "pending" | "accepted" | "removed" | null;
    friendshipRequesterId: string | null;
  },
  currentUserId: string,
): PublicUserSearchResult {
  const friendRequestStatus = toFriendRequestStatus(record.friendshipStatus);

  return {
    ...toPublicUser(record),
    friendRequestStatus,
    friendshipId:
      friendRequestStatus === null ? null : (record.friendshipId ?? null),
    requestDirection: toRequestDirection(
      record.friendshipStatus,
      record.friendshipRequesterId,
      currentUserId,
    ),
  };
}
