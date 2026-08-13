import { ImageUploadError } from "../../lib/file-upload";
import {
  deleteUserAvatarImage,
  isImageKitFileId,
  uploadUserAvatarImage,
} from "../../lib/file-upload";
import { usersRepository } from "./users.repository";
import type {
  FriendRequestDirection,
  FriendRequestStatus,
  PublicUser,
  PublicUserCard,
  PublicUserSearchResult,
} from "./users.types";

type ServiceError = {
  ok: false;
  code: string;
  message: string;
  status: 400 | 403 | 404 | 502;
};

type ServiceSuccess<T> = { ok: true; data: T };

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

  async updateProfile(
    userId: string,
    name: string,
  ): Promise<ServiceSuccess<PublicUser> | ServiceError> {
    const record = await usersRepository.updateProfile(userId, { name });
    if (!record) {
      return {
        ok: false,
        code: "NOT_FOUND",
        message: "User not found",
        status: 404,
      };
    }
    return { ok: true, data: toPublicUser(record) };
  },

  async uploadAvatar(
    userId: string,
    file: File,
  ): Promise<ServiceSuccess<PublicUser> | ServiceError> {
    const existing = await usersRepository.findById(userId);
    if (!existing) {
      return {
        ok: false,
        code: "NOT_FOUND",
        message: "User not found",
        status: 404,
      };
    }

    try {
      const uploaded = await uploadUserAvatarImage({
        userId,
        file,
        fileName: file.name,
      });

      if (existing.image && isImageKitFileId(existing.image)) {
        await deleteUserAvatarImage(existing.image);
      }

      const record = await usersRepository.updateProfile(userId, {
        image: uploaded.url,
      });
      if (!record) {
        return {
          ok: false,
          code: "UPDATE_FAILED",
          message: "Could not save avatar",
          status: 400,
        };
      }

      return { ok: true, data: toPublicUser(record) };
    } catch (error) {
      if (error instanceof ImageUploadError) {
        return {
          ok: false,
          code: error.code,
          message: error.message,
          status: error.status,
        };
      }
      return {
        ok: false,
        code: "IMAGE_UPLOAD_FAILED",
        message: "Failed to upload avatar image",
        status: 502,
      };
    }
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
