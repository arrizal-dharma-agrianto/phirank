import type { UpdatePasswordInput } from "../schemas";

const updatePassword = async (data: UpdatePasswordInput) => {
  const res = await fetch("/api/user/password", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  const result = await res.json();

  if (!res.ok) {
    throw new Error(result.message ?? "Failed to update password.");
  }

  return result;
}

export { updatePassword }