import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const body = (await request.json()) as {
    name?: string;
    defaultPrice?: number;
    note?: string;
  };

  if (!body.name?.trim() || body.defaultPrice == null || body.defaultPrice < 0) {
    return NextResponse.json(
      { error: "Tên sản phẩm và giá mặc định là bắt buộc" },
      { status: 400 },
    );
  }

  const prisma = getPrisma();
  const existingProduct = await prisma.product.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!existingProduct) {
    return NextResponse.json({ error: "Không tìm thấy sản phẩm" }, { status: 404 });
  }

  const product = await prisma.product.update({
    where: { id },
    data: {
      name: body.name.trim(),
      defaultPrice: Math.round(body.defaultPrice),
      note: body.note?.trim() || null,
    },
  });

  return NextResponse.json({ data: product });
}
