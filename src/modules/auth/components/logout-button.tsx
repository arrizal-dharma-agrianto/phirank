"use client";

import type { ComponentProps } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

import { useLogout } from "../hooks/use-logout";

type LogoutButtonProps = Omit<
  ComponentProps<typeof Button>,
  "onClick" | "disabled"
>;

export function LogoutButton({
  children,
  type,
  variant = "destructive",
  ...props
}: LogoutButtonProps) {
  const router = useRouter();
  const logoutMutation = useLogout();

  const onLogout = () => {
    logoutMutation.mutate(undefined, {
      onSuccess: (result) => {
        toast.success("Logout successful", {
          description: "You have been signed out.",
        });

        router.push(result.url ?? "/login");
        router.refresh();
      },

      onError: (error) => {
        toast("Logout failed. Please try again.", {
          description: error instanceof Error ? error.message : undefined,
        });
      },
    });
  };

  return (
    <Button
      type={type ?? "button"}
      variant={variant}
      onClick={onLogout}
      disabled={logoutMutation.isPending}
      {...props}
    >
      {logoutMutation.isPending
        ? "Logging out..."
        : (children ?? "Logout")}
    </Button>
  );
}
