export type FriendshipStatus = "pending" | "accepted" | "removed";

export type PublicFriendship = {
  id: string;
  requesterId: string;
  addresseeId: string;
  status: FriendshipStatus;
  requestedAt: Date;
  acceptedAt: Date | null;
  friend: {
    id: string;
    name: string;
    image: string | null;
  };
  createdAt: Date;
  updatedAt: Date;
};

export type PublicFriendRequest = {
  id: string;
  requesterId: string;
  addresseeId: string;
  status: FriendshipStatus;
  requestedAt: Date;
  requester: {
    id: string;
    name: string;
    image: string | null;
  };
  createdAt: Date;
};
