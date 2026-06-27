import { useMutation } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

import { registerUser } from "../services";
import { sanitizeCallbackUrl } from "../utils";

const useRegister = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = sanitizeCallbackUrl(searchParams.get("callbackUrl"));

  return useMutation({
    mutationFn: registerUser,

    onSuccess: (_, variables) => {
      toast.success(
        "Account created successfully. Please verify your email.",
      );

      const nextSearchParams = new URLSearchParams({ email: variables.email });
      nextSearchParams.set("callbackUrl", callbackUrl);

      router.push(`/verify-otp?${nextSearchParams.toString()}`);
    },

    onError: (error) => {
      toast.error("Failed to create account", {
        description: error instanceof Error ? error.message : undefined,
      });
    },
  });
};

export { useRegister };
