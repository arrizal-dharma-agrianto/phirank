import { NextResponse } from "next/server";

const POST = async () => {
  return NextResponse.json(
    { message: "New email verification now uses a verification link" },
    { status: 410 },
  );
};

export { POST };
