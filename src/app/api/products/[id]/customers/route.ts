import { NextResponse } from "next/server";
import { getProductCustomerHistory } from "@/lib/services";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);
  const pageSize = Math.min(50, Math.max(1, Number(searchParams.get("pageSize") ?? "10") || 10));
  const rows = await getProductCustomerHistory(id, page, pageSize);

  return NextResponse.json(rows);
}
