import type {
  SendNewEmailLinkInput,
  SendNewEmailOtpInput,
  VerifyCurrentEmailOtpInput,
} from "../schemas";

const postJson = async <TResponse, TBody = unknown>(
  url: string,
  body?: TBody,
): Promise<TResponse> => {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message ?? "Request failed.");
  }

  return data;
};

const sendCurrentEmailOtp = async () =>
  postJson<{ message: string }>("/api/user/email/send-current-otp");

const verifyCurrentEmailOtp = async (
  data: VerifyCurrentEmailOtpInput,
) =>
  postJson<{ currentEmailToken: string }>(
    "/api/user/email/verify-current-otp",
    data,
  );

const sendNewEmailLink = async (data: SendNewEmailLinkInput) =>
  postJson<{ message: string }>("/api/user/email/send-new-link", data);

const sendNewEmailOtp = async (data: SendNewEmailOtpInput) =>
  sendNewEmailLink(data);

export {
  sendCurrentEmailOtp,
  verifyCurrentEmailOtp,
  sendNewEmailLink,
  sendNewEmailOtp,
};
