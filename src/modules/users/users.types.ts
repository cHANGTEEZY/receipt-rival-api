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
