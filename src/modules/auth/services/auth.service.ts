import type { RegisterInput, LoginInput } from "../schemas";
import { signIn, signOut } from "next-auth/react";

const registerUser = async (
  data: RegisterInput,
) => {
  const res = await fetch("/api/auth/register", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  const result = await res.json();

  if (!res.ok) {
    throw new Error(result.message);
  }

  return result;
}

const loginWithCredentials = async (data: LoginInput) => {
  const result = await signIn("credentials", {
    email: data.email,
    password: data.password,
    redirect: false,
  });

  if (result?.error) {
    throw new Error("Invalid email or password.");
  }

  return result;
}

const logout = async () => {
  return signOut({
    redirect: false,
    callbackUrl: "/login",
  });
}

export { registerUser, loginWithCredentials, logout };
