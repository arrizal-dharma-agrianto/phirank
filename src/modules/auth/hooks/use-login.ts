import { useMutation } from "@tanstack/react-query";
import { loginWithCredentials } from "../services";

export function useLogin() {
  return useMutation({
    mutationFn: loginWithCredentials,
  });
}