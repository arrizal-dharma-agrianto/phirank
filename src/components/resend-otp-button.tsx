"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

type ResendOtpButtonProps = {
  onResend: () => Promise<unknown>;
  disabled?: boolean;
  cooldownSeconds?: number;
  label?: string;
  cooldownLabel?: string;
};

const ResendOtpButton = ({
  onResend,
  disabled = false,
  cooldownSeconds = 60,
  label = "Resend OTP",
  cooldownLabel = "Resend OTP",
}: ResendOtpButtonProps) => {
  const [remainingSeconds, setRemainingSeconds] =
    useState(cooldownSeconds);
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    if (remainingSeconds <= 0) {
      return;
    }

    const timer = window.setInterval(() => {
      setRemainingSeconds((seconds) => Math.max(seconds - 1, 0));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [remainingSeconds]);

  const handleResend = async () => {
    setIsResending(true);

    try {
      await onResend();
      setRemainingSeconds(cooldownSeconds);
    } catch {
      return;
    } finally {
      setIsResending(false);
    }
  };

  const isCoolingDown = remainingSeconds > 0;

  return (
    <Button
      type="button"
      variant="link"
      className="h-auto px-0 text-xs"
      disabled={disabled || isResending || isCoolingDown}
      onClick={handleResend}
    >
      {isCoolingDown
        ? `${cooldownLabel} in ${remainingSeconds}s`
        : isResending
          ? "Sending..."
          : label}
    </Button>
  );
};

export { ResendOtpButton };
