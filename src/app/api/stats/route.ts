import { NextResponse } from "next/server";
import { getStats } from "@/lib/services";

export async function GET() {
  const stats = await getStats();
  return NextResponse.json({ data: stats });
}
