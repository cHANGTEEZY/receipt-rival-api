export type PublicUser = {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type PublicUserCard = {
  id: string;
  name: string;
  image: string | null;
};

export type FriendRequestStatus = "pending" | "accepted" | null;

export type FriendRequestDirection = "sent" | "received" | null;

export type PublicUserSearchResult = PublicUser & {
  friendRequestStatus: FriendRequestStatus;
  friendshipId: string | null;
    requestDirection: FriendRequestDirection;
};
