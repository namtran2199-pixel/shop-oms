import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { getOrderDetail } from "@/lib/services";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const order = await getOrderDetail(code);

  if (!order) {
    return NextResponse.json({ error: "Không tìm thấy đơn hàng" }, { status: 404 });
  }

  return NextResponse.json({ data: order });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const prisma = getPrisma();
  const order = await prisma.order.findUnique({
    where: { code },
    select: { id: true },
  });

  if (!order) {
    return NextResponse.json({ error: "Không tìm thấy đơn hàng" }, { status: 404 });
  }

  await prisma.order.delete({ where: { code } });

  return NextResponse.json({ data: { code } });
}
