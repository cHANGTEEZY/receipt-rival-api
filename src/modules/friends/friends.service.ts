import { usersRepository } from "../users/users.repository";
import { friendsRepository } from "./friends.repository";
import type { PublicFriendRequest, PublicFriendship } from "./friends.types";

type ServiceError = {
  ok: false;
  code: string;
  message: string;
  status: 400 | 403 | 404;
};

type ServiceSuccess<T> = { ok: true; data: T };

function toPublicFriendship(
  record: {
    id: string;
    requesterId: string;
    addresseeId: string;
    status: "pending" | "accepted" | "removed";
    requestedAt: Date;
    acceptedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  },
  friend: { id: string; name: string; image: string | null },
): PublicFriendship {
  return {
    id: record.id,
    requesterId: record.requesterId,
    addresseeId: record.addresseeId,
    status: record.status,
    requestedAt: record.requestedAt,
    acceptedAt: record.acceptedAt,
    friend,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

function toPublicRequest(
  record: {
    id: string;
    requesterId: string;
    addresseeId: string;
    status: "pending" | "accepted" | "removed";
    requestedAt: Date;
    createdAt: Date;
  },
  requester: { id: string; name: string; image: string | null },
): PublicFriendRequest {
  return {
    id: record.id,
    requesterId: record.requesterId,
    addresseeId: record.addresseeId,
    status: record.status,
    requestedAt: record.requestedAt,
    requester,
    createdAt: record.createdAt,
  };
}

export const friendsService = {
  async listFriends(userId: string) {
    const rows = await friendsRepository.listAccepted(userId);
    return rows.map((row) => toPublicFriendship(row.friendship, row.friend));
  },

  async listRequests(userId: string) {
    const rows = await friendsRepository.listIncomingPending(userId);
    return rows.map((row) => toPublicRequest(row.friendship, row.requester));
  },

  async sendRequest(
    requesterId: string,
    targetUserId: string,
  ): Promise<ServiceSuccess<PublicFriendship> | ServiceError> {
    if (requesterId === targetUserId) {
      return {
        ok: false,
        code: "VALIDATION_ERROR",
        message: "You cannot send a friend request to yourself",
        status: 400,
      };
    }

    const target = await usersRepository.findById(targetUserId);
    if (!target) {
      return {
        ok: false,
        code: "NOT_FOUND",
        message: "User not found",
        status: 404,
      };
    }

    const existing = await friendsRepository.findPair(requesterId, targetUserId);
    if (existing?.status === "accepted") {
      return {
        ok: false,
        code: "ALREADY_FRIENDS",
        message: "You are already friends with this user",
        status: 400,
      };
    }
    if (existing?.status === "pending") {
      return {
        ok: false,
        code: "REQUEST_PENDING",
        message: "A friend request is already pending",
        status: 400,
      };
    }

    const record =
      existing?.status === "removed"
        ? await friendsRepository.reopenAsPending(
            existing.id,
            requesterId,
            targetUserId,
          )
        : await friendsRepository.createRequest(requesterId, targetUserId);

    if (!record) {
      return {
        ok: false,
        code: "CREATE_FAILED",
        message: "Could not create friend request",
        status: 400,
      };
    }

    return {
      ok: true,
      data: toPublicFriendship(record, {
        id: target.id,
        name: target.name,
        image: target.image,
      }),
    };
  },

  async acceptRequest(
    userId: string,
    friendshipId: string,
  ): Promise<ServiceSuccess<PublicFriendship> | ServiceError> {
    const existing = await friendsRepository.findById(friendshipId);
    if (!existing || existing.status !== "pending") {
      return {
        ok: false,
        code: "NOT_FOUND",
        message: "Friend request not found",
        status: 404,
      };
    }
    if (existing.addresseeId !== userId) {
      return {
        ok: false,
        code: "FORBIDDEN",
        message: "Only the recipient can accept this request",
        status: 403,
      };
    }

    const record = await friendsRepository.accept(friendshipId);
    if (!record) {
      return {
        ok: false,
        code: "UPDATE_FAILED",
        message: "Could not accept friend request",
        status: 400,
      };
    }

    const friend = await usersRepository.findById(record.requesterId);
    if (!friend) {
      return {
        ok: false,
        code: "NOT_FOUND",
        message: "User not found",
        status: 404,
      };
    }

    return {
      ok: true,
      data: toPublicFriendship(record, {
        id: friend.id,
        name: friend.name,
        image: friend.image,
      }),
    };
  },

  async rejectRequest(
    userId: string,
    friendshipId: string,
  ): Promise<ServiceSuccess<{ id: string }> | ServiceError> {
    const existing = await friendsRepository.findById(friendshipId);
    if (!existing || existing.status !== "pending") {
      return {
        ok: false,
        code: "NOT_FOUND",
        message: "Friend request not found",
        status: 404,
      };
    }
    if (existing.addresseeId !== userId) {
      return {
        ok: false,
        code: "FORBIDDEN",
        message: "Only the recipient can reject this request",
        status: 403,
      };
    }

    const record = await friendsRepository.rejectOrRemove(friendshipId);
    if (!record) {
      return {
        ok: false,
        code: "UPDATE_FAILED",
        message: "Could not reject friend request",
        status: 400,
      };
    }

    return { ok: true, data: { id: record.id } };
  },

  async removeFriend(
    userId: string,
    friendUserId: string,
  ): Promise<ServiceSuccess<{ friendUserId: string }> | ServiceError> {
    const existing = await friendsRepository.findPair(userId, friendUserId);
    if (!existing || existing.status !== "accepted") {
      return {
        ok: false,
        code: "NOT_FOUND",
        message: "Friendship not found",
        status: 404,
      };
    }

    const record = await friendsRepository.rejectOrRemove(existing.id);
    if (!record) {
      return {
        ok: false,
        code: "UPDATE_FAILED",
        message: "Could not remove friend",
        status: 400,
      };
    }

    return { ok: true, data: { friendUserId } };
  },

  async areAcceptedFriends(userA: string, userB: string) {
    return friendsRepository.areAcceptedFriends(userA, userB);
  },
};
