const getPublicObjectUrl = (key: string) => {
  if (!key) return "";

  const normalizedKey = normalizeObjectKey(key);

  if (normalizedKey.startsWith("http")) {
    return normalizedKey;
  }

  const baseUrl = process.env.NEXT_PUBLIC_S3_PUBLIC_URL;
  if (!baseUrl) {
    throw new Error("NEXT_PUBLIC_S3_PUBLIC_URL is not configured");
  }

  const normalizedBase = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
  return `${normalizedBase}/${normalizedKey}`;
};

const normalizeObjectKey = (key: string) => {
  if (!key.startsWith("http")) {
    return key;
  }

  try {
    const url = new URL(key);
    const publicBase = process.env.NEXT_PUBLIC_S3_PUBLIC_URL;
    const publicOrigin = publicBase ? new URL(publicBase).origin : null;
    if (!publicOrigin || url.origin !== publicOrigin) {
      return key;
    }

    const objectKey = decodeURIComponent(url.pathname.replace(/^\/+/, ""));

    if (
      objectKey.startsWith("avatar/") ||
      objectKey.startsWith("temp/avatar/")
    ) {
      return objectKey;
    }
  } catch {
    return key;
  }

  return key;
};

export { getPublicObjectUrl };
