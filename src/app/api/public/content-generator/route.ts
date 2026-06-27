import { NextResponse } from "next/server";

const corsHeaders = (origin: string) => ({
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Origin": origin,
  "Access-Control-Max-Age": "86400",
  Vary: "Origin",
});

const OPTIONS = async (req: Request) => {
  const origin = req.headers.get("origin");

  if (!origin) {
    return new Response(null, { status: 204 });
  }

  return new Response(null, {
    status: 204,
    headers: corsHeaders(origin),
  });
};

const POST = async (req: Request) => {
  const origin = req.headers.get("origin");
  const responseOrigin = origin ?? "*";

  return NextResponse.json(
    {
      message:
        "Public content generation is disabled. Generate content in phirank and publish it through a configured webhook.",
    },
    { status: 410, headers: corsHeaders(responseOrigin) },
  );
};

export { OPTIONS, POST };
