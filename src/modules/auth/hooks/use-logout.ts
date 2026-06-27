// src/modules/auth/hooks/use-logout.ts

import { useMutation } from "@tanstack/react-query";

import { logout } from "../services";

export function useLogout() {
  return useMutation({
    mutationFn: logout,
  });
}