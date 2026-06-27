"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { Label } from "@/components/ui/label";
import { ResendOtpButton } from "@/components/resend-otp-button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { PencilSimpleIcon } from "@phosphor-icons/react";

import {
  useSendCurrentEmailOtp,
  useSendNewEmailLink,
  useVerifyCurrentEmailOtp,
} from "../hooks";
import {
  sendNewEmailLinkSchema,
  verifyCurrentEmailOtpSchema,
  type SendNewEmailLinkInput,
  type VerifyCurrentEmailOtpInput,
} from "../schemas";

type UpdateEmailStep =
  | "send-current-confirm"
  | "current-otp"
  | "new-email"
  | "new-link-sent";

type UpdateEmailDialogProps = {
  currentEmail: string;
};

const getErrorMessage = (error: unknown) => {
  return error instanceof Error ? error.message : "Something went wrong";
};

const UpdateEmailDialog = ({ currentEmail }: UpdateEmailDialogProps) => {
  const [open, setOpen] = useState(false);
  const [step, setStep] =
    useState<UpdateEmailStep>("send-current-confirm");
  const [currentEmailToken, setCurrentEmailToken] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const [isTooltipSuppressed, setIsTooltipSuppressed] = useState(false);

  const sendCurrentEmailOtpMutation = useSendCurrentEmailOtp();
  const verifyCurrentEmailOtpMutation = useVerifyCurrentEmailOtp();
  const sendNewEmailLinkMutation = useSendNewEmailLink();

  const currentOtpForm = useForm<VerifyCurrentEmailOtpInput>({
    resolver: zodResolver(verifyCurrentEmailOtpSchema),
    defaultValues: {
      otp: "",
    },
  });

  const newEmailForm = useForm<SendNewEmailLinkInput>({
    resolver: zodResolver(sendNewEmailLinkSchema),
    defaultValues: {
      newEmail: "",
      currentEmailToken: "",
    },
  });

  const resetFlow = () => {
    setStep("send-current-confirm");
    setCurrentEmailToken("");
    setNewEmail("");
    currentOtpForm.reset({ otp: "" });
    newEmailForm.reset({
      newEmail: "",
      currentEmailToken: "",
    });
  };

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);

    if (!nextOpen) {
      resetFlow();
    }
  };

  const handleStart = async () => {
    setTooltipOpen(false);
    setIsTooltipSuppressed(true);
    setOpen(true);
    resetFlow();
  };

  const handleSendCurrentEmailOtp = async () => {
    try {
      await sendCurrentEmailOtpMutation.mutateAsync();
      currentOtpForm.reset({ otp: "" });
      setStep("current-otp");
    } catch {
      return;
    }
  };

  const handleVerifyCurrentOtp = async (
    values: VerifyCurrentEmailOtpInput,
  ) => {
    try {
      const result = await verifyCurrentEmailOtpMutation.mutateAsync(values);

      setCurrentEmailToken(result.currentEmailToken);
      newEmailForm.setValue(
        "currentEmailToken",
        result.currentEmailToken,
      );
      setStep("new-email");
    } catch (error) {
      currentOtpForm.setError("otp", {
        message: getErrorMessage(error),
      });
    }
  };

  const handleSendNewEmailLink = async (
    values: SendNewEmailLinkInput,
  ) => {
    const input = {
      ...values,
      currentEmailToken,
    };

    try {
      await sendNewEmailLinkMutation.mutateAsync(input);

      setNewEmail(input.newEmail);
      setStep("new-link-sent");
    } catch (error) {
      newEmailForm.setError("newEmail", {
        message: getErrorMessage(error),
      });
    }
  };

  const isBusy =
    sendCurrentEmailOtpMutation.isPending ||
    verifyCurrentEmailOtpMutation.isPending ||
    sendNewEmailLinkMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <Tooltip
        open={isTooltipSuppressed ? false : tooltipOpen}
        onOpenChange={(nextOpen) => {
          setTooltipOpen(isTooltipSuppressed ? false : nextOpen);
        }}
      >
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            type="button"
            onClick={handleStart}
            onPointerLeave={() => {
              setIsTooltipSuppressed(false);
              setTooltipOpen(false);
            }}
            disabled={isBusy || !currentEmail}
            aria-label="Update email"
          >
            <PencilSimpleIcon size={18} />
          </Button>
        </TooltipTrigger>
        <TooltipContent sideOffset={6}>Update email</TooltipContent>
      </Tooltip>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Update email</DialogTitle>
          <DialogDescription>
            {step === "send-current-confirm" &&
              `Send an OTP to ${currentEmail} to start updating your email.`}
            {step === "current-otp" &&
              `Enter the OTP sent to ${currentEmail}.`}
            {step === "new-email" && "Enter your new email address."}
            {step === "new-link-sent" &&
              `Open the verification link sent to ${newEmail}.`}
          </DialogDescription>
        </DialogHeader>

        {step === "send-current-confirm" && (
          <div className="grid gap-4">
            <div className="grid gap-1 rounded-none border p-3">
              <p className="text-xs font-medium">Current email</p>
              <p className="text-xs text-muted-foreground">
                {currentEmail}
              </p>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={isBusy}
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={isBusy}
                onClick={handleSendCurrentEmailOtp}
              >
                {sendCurrentEmailOtpMutation.isPending
                  ? "Sending..."
                  : "Send OTP"}
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === "current-otp" && (
          <form
            className="grid gap-4"
            onSubmit={currentOtpForm.handleSubmit(handleVerifyCurrentOtp)}
          >
            <div className="grid gap-2 justify-center">
              <Controller
                name="otp"
                control={currentOtpForm.control}
                render={({ field }) => (
                  <InputOTP
                    maxLength={6}
                    value={field.value}
                    onChange={field.onChange}
                    disabled={isBusy}
                  >
                    <InputOTPGroup className="justify-center w-full">
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                )}
              />
              {currentOtpForm.formState.errors.otp && (
                <p className="text-xs text-destructive">
                  {currentOtpForm.formState.errors.otp.message}
                </p>
              )}
              <ResendOtpButton
                disabled={isBusy}
                onResend={async () => {
                  await sendCurrentEmailOtpMutation.mutateAsync();
                  currentOtpForm.reset({ otp: "" });
                }}
              />
            </div>

            <DialogFooter>
              <Button type="submit" disabled={isBusy}>
                {verifyCurrentEmailOtpMutation.isPending
                  ? "Verifying..."
                  : "Verify OTP"}
              </Button>
            </DialogFooter>
          </form>
        )}

        {step === "new-email" && (
          <form
            className="grid gap-4"
            onSubmit={newEmailForm.handleSubmit(handleSendNewEmailLink)}
          >
            <div className="grid gap-2">
              <Label htmlFor="new-email">New email</Label>
              <Input
                id="new-email"
                type="email"
                placeholder="name@example.com"
                disabled={isBusy}
                {...newEmailForm.register("newEmail")}
              />
              <Input
                type="hidden"
                {...newEmailForm.register("currentEmailToken")}
              />
              {newEmailForm.formState.errors.newEmail && (
                <p className="text-xs text-destructive">
                  {newEmailForm.formState.errors.newEmail.message}
                </p>
              )}
            </div>

            <DialogFooter>
              <Button type="submit" disabled={isBusy}>
                {sendNewEmailLinkMutation.isPending
                  ? "Sending..."
                  : "Send verification link"}
              </Button>
            </DialogFooter>
          </form>
        )}

        {step === "new-link-sent" && (
          <div className="grid gap-4">
            <div className="grid gap-1 rounded-none border p-3">
              <p className="text-xs font-medium">New email</p>
              <p className="text-xs text-muted-foreground">{newEmail}</p>
            </div>
            <div className="grid gap-2">
              <p className="text-sm text-muted-foreground">
                We sent a verification link to your new email. Click that link
                to finish updating your account email.
              </p>
              <ResendOtpButton
                disabled={isBusy || !newEmail || !currentEmailToken}
                label="Resend verification link"
                cooldownLabel="Resend link"
                onResend={async () => {
                  await sendNewEmailLinkMutation.mutateAsync({
                    newEmail,
                    currentEmailToken,
                  });
                }}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={isBusy}
                onClick={() => setOpen(false)}
              >
                Close
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export { UpdateEmailDialog };
