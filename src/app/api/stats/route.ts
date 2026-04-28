import { NextResponse } from "next/server";
import { getStats } from "@/lib/services";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period");
    const periodValue = searchParams.get("periodValue") ?? undefined;
    const stats = await getStats(
      period === "day" || period === "month" || period === "year" ? period : "month",
      periodValue,
    );
    return NextResponse.json({ data: stats });
  } catch (error) {
    console.error("Failed to load stats", error);
    return NextResponse.json(
      { error: "Không thể tải dữ liệu thống kê." },
      { status: 500 },
    );
  }
}
