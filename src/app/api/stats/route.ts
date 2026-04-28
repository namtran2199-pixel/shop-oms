import { NextResponse } from "next/server";
import { getStats } from "@/lib/services";

export async function GET() {
  try {
    const stats = await getStats();
    return NextResponse.json({ data: stats });
  } catch (error) {
    console.error("Failed to load stats", error);
    return NextResponse.json(
      { error: "Không thể tải dữ liệu thống kê." },
      { status: 500 },
    );
  }
}
