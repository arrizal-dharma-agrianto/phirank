const DEFAULT_AUTH_CALLBACK_URL = "/dashboard";

const sanitizeCallbackUrl = (
  callbackUrl: string | null | undefined,
): string => {
  if (!callbackUrl) {
    return DEFAULT_AUTH_CALLBACK_URL;
  }

  if (!callbackUrl.startsWith("/") || callbackUrl.startsWith("//")) {
    return DEFAULT_AUTH_CALLBACK_URL;
  }

  try {
    const url = new URL(callbackUrl, "http://localhost");

    if (url.origin !== "http://localhost") {
      return DEFAULT_AUTH_CALLBACK_URL;
    }

    if (!url.pathname.startsWith("/") || url.pathname.startsWith("//")) {
      return DEFAULT_AUTH_CALLBACK_URL;
    }

    if (url.pathname.includes("\\")) {
      return DEFAULT_AUTH_CALLBACK_URL;
    }

    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return DEFAULT_AUTH_CALLBACK_URL;
  }
};

export { DEFAULT_AUTH_CALLBACK_URL, sanitizeCallbackUrl };
