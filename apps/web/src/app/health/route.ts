import { NextResponse } from "next/server";
import { prismaAdmin } from "@shopos/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const started = Date.now();
  let dbUp = false;
  try {
    await prismaAdmin.$queryRaw`SELECT 1`;
    dbUp = true;
  } catch {
    dbUp = false;
  }

  const latencyMs = Date.now() - started;
  const status = dbUp ? 200 : 503;
  return NextResponse.json(
    { ok: dbUp, db: dbUp ? "up" : "down", latencyMs },
    { status },
  );
}
