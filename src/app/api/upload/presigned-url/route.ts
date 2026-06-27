import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { bucketName, s3Client } from "@/lib/storage";
import { createObjectKey } from "@/modules/upload";

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 20;
const ALLOWED_UPLOAD_FOLDERS = new Set(["temp/avatar"]);
const DEFAULT_ALLOWED_UPLOAD_ORIGINS = ["http://localhost:3000"];
const ALLOWED_CONTENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
];

const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

const POST = async (req: Request) => {
  const originCheck = checkUploadOrigin(req);

  if (!originCheck.allowed) {
    return NextResponse.json(
      { message: "Origin not allowed" },
      { status: 403 },
    );
  }

  const session = await getServerSession(authOptions);
  const ip = getClientIp(req);

  if (!session?.user?.id) {
    console.warn("Unauthorized presigned URL request", { ip });

    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  if (isRateLimited(`${session.user.id}:${ip}`)) {
    console.warn("Rate-limited presigned URL request", {
      ip,
      userId: session.user.id,
    });

    return NextResponse.json(
      { message: "Too many requests" },
      { status: 429 },
    );
  }

  const body = await req.json();

  const fileName = typeof body.fileName === "string" ? body.fileName : null;
  const contentType =
    typeof body.contentType === "string" ? body.contentType : null;
  const folder = typeof body.folder === "string" ? body.folder : null;

  if (!fileName || !contentType || !folder) {
    return NextResponse.json({ message: "Bad request" }, { status: 400 });
  }

  if (!canUploadToFolder(folder)) {
    console.warn("Forbidden presigned URL request", {
      folder,
      ip,
      userId: session.user.id,
    });

    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const key = createObjectKey(folder, fileName);

  if (!ALLOWED_CONTENT_TYPES.includes(contentType)) {
    return NextResponse.json(
      { message: "Content type not allowed" },
      { status: 400 },
    );
  }

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    ContentType: contentType,
  });

  const signedUrl = await getSignedUrl(s3Client, command, {
    expiresIn: 60,
  });

  return NextResponse.json(
    {
      key,
      signedUrl,
    },
    {
      headers: getCorsHeaders(originCheck.origin),
    },
  );
};

const OPTIONS = (req: Request) => {
  const originCheck = checkUploadOrigin(req);

  if (!originCheck.allowed) {
    return new NextResponse(null, { status: 403 });
  }

  return new NextResponse(null, {
    status: 204,
    headers: getCorsHeaders(originCheck.origin),
  });
};

const canUploadToFolder = (folder: string) => ALLOWED_UPLOAD_FOLDERS.has(folder);

const getAllowedUploadOrigins = () => {
  const configured = process.env.S3_UPLOAD_ALLOWED_ORIGINS?.split(",")
    .map((origin) => origin.trim().replace(/\/+$/, ""))
    .filter(Boolean);

  if (configured?.length) return configured;

  return Array.from(
    new Set(
      [process.env.NEXTAUTH_URL, ...DEFAULT_ALLOWED_UPLOAD_ORIGINS].filter(
        Boolean,
      ).map((origin) => origin?.replace(/\/+$/, "")) as string[],
    ),
  );
};

const checkUploadOrigin = (req: Request) => {
  const origin = req.headers.get("origin");

  if (!origin) {
    return { allowed: true, origin: null };
  }

  const allowedOrigins = getAllowedUploadOrigins();
  const allowed = allowedOrigins.includes(origin);

  return { allowed, origin };
};

const getCorsHeaders = (origin: string | null) => {
  const allowedOrigins = getAllowedUploadOrigins();
  const allowOrigin =
    origin && allowedOrigins.includes(origin)
      ? origin
      : allowedOrigins.includes("*")
        ? "*"
        : undefined;

  const headers = new Headers({
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "3600",
    Vary: "Origin",
  });

  if (allowOrigin) {
    headers.set("Access-Control-Allow-Origin", allowOrigin);
    headers.set("Access-Control-Allow-Credentials", "true");
  }

  return headers;
};

const getClientIp = (req: Request) => {
  const forwardedFor = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();

  return forwardedFor || req.headers.get("x-real-ip") || "unknown";
};

const isRateLimited = (key: string) => {
  const now = Date.now();
  const current = rateLimitStore.get(key);

  if (!current || current.resetAt <= now) {
    cleanupRateLimitStore(now);
    rateLimitStore.set(key, {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW_MS,
    });

    return false;
  }

  current.count += 1;

  return current.count > RATE_LIMIT_MAX_REQUESTS;
};

const cleanupRateLimitStore = (now: number) => {
  for (const [key, value] of rateLimitStore.entries()) {
    if (value.resetAt <= now) {
      rateLimitStore.delete(key);
    }
  }
};

export { OPTIONS, POST };
