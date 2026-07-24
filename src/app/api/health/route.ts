// Healthcheck usado pelo Docker Compose e monitoramento externo
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { SYSTEM_NAME, SYSTEM_RELEASE, SYSTEM_VERSION } from "@/lib/system-version";

export const dynamic = "force-dynamic";

export async function GET() {
  const checkedAt = new Date().toISOString();
  try {
    await prisma.$queryRaw`SELECT 1`;
    const response = NextResponse.json({
      ok: true,
      db: "up",
      system: SYSTEM_NAME,
      release: SYSTEM_RELEASE,
      version: SYSTEM_VERSION,
      checkedAt,
    });
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch {
    const response = NextResponse.json({
      ok: false,
      db: "down",
      system: SYSTEM_NAME,
      release: SYSTEM_RELEASE,
      version: SYSTEM_VERSION,
      checkedAt,
    }, { status: 503 });
    response.headers.set("Cache-Control", "no-store");
    return response;
  }
}
