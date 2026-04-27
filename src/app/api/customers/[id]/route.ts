import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const prisma = getPrisma();

  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      orders: {
        select: { id: true },
        take: 1,
      },
    },
  });

  if (!customer) {
    return NextResponse.json({ error: "Không tìm thấy khách hàng." }, { status: 404 });
  }

  if (customer.orders.length > 0) {
    return NextResponse.json(
      { error: "Không thể xóa khách hàng đã có đơn hàng." },
      { status: 400 },
    );
  }

  await prisma.customer.delete({ where: { id } });

  return NextResponse.json({ data: { id } });
}
