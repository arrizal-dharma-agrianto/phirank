import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  sendCurrentEmailOtp,
  sendNewEmailLink,
  verifyCurrentEmailOtp,
} from "../services";

const useSendCurrentEmailOtp = () => {
  return useMutation({
    mutationFn: sendCurrentEmailOtp,
    onSuccess: () => {
      toast.success("OTP sent to your current email", {
        id: "update-email",
      });
    },
    onError: (error) => {
      toast.error(error.message, {
        id: "update-email",
      });
    },
  });
};

const useVerifyCurrentEmailOtp = () => {
  return useMutation({
    mutationFn: verifyCurrentEmailOtp,
    onSuccess: () => {
      toast.success("Current email verified", {
        id: "update-email",
      });
    },
    onError: (error) => {
      toast.error(error.message, {
        id: "update-email",
      });
    },
  });
};

const useSendNewEmailLink = () => {
  return useMutation({
    mutationFn: sendNewEmailLink,
    onSuccess: () => {
      toast.success("Verification link sent to your new email", {
        id: "update-email",
      });
    },
    onError: (error) => {
      toast.error(error.message, {
        id: "update-email",
      });
    },
  });
};

const useSendNewEmailOtp = useSendNewEmailLink;

export {
  useSendCurrentEmailOtp,
  useVerifyCurrentEmailOtp,
  useSendNewEmailLink,
  useSendNewEmailOtp,
};
