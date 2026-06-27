import type { Profile } from "../types";
import type { UpdateProfileInput } from "../schemas";

const getProfile = async (): Promise<Profile> => {
  const res = await fetch("/api/user/profile");

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message ?? "Failed to fetch profile.");
  }

  return data;
}

const updateProfile = async (
  data: UpdateProfileInput,
): Promise<Profile> => {
  const res = await fetch("/api/user/profile", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  const result = await res.json();

  if (!res.ok) {
    throw new Error(result.message ?? "Failed to update profile.");
  }

  return result;
}

const deleteAccount = async () => {
  const res = await fetch("/api/user/profile", {
    method: "DELETE",
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message ?? "Failed to delete account.");
  }

  return data;
}

export { getProfile, updateProfile, deleteAccount };