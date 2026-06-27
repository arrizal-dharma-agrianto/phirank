const ensureProtocol = (value: string) => {
  const trimmed = value.trim();

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  return `https://${trimmed}`;
};

const normalizeWebsiteUrl = (value: string) => {
  const url = new URL(ensureProtocol(value));
  url.hash = "";
  url.search = "";

  const domain = url.hostname.replace(/^www\./i, "").toLowerCase();
  const startUrl = `${url.protocol}//${url.host}${url.pathname === "/" ? "" : url.pathname}`;

  return {
    domain,
    startUrl,
    origin: `${url.protocol}//${url.host}`,
  };
};

export { normalizeWebsiteUrl };
