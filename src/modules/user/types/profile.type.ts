export type Profile = {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED";
  createdAt: string;
  updatedAt: string;

  isOAuthOnly: boolean;
};