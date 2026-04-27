import { NextResponse } from "next/server";
import { OrderStatus } from "@prisma/client";
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

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const body = (await request.json()) as {
    items?: Array<{ productId: string; quantity: number; unitPrice?: number }>;
  };

  const requestedItems =
    body.items?.map((item) => ({
      productId: item.productId,
      quantity: Math.max(1, Math.round(item.quantity)),
      unitPrice:
        typeof item.unitPrice === "number" && Number.isFinite(item.unitPrice)
          ? Math.max(0, Math.round(item.unitPrice))
          : undefined,
    })) ?? [];

  if (requestedItems.length === 0) {
    return NextResponse.json({ error: "Phiếu tạm phải có ít nhất 1 sản phẩm." }, { status: 400 });
  }

  const prisma = getPrisma();
  const order = await prisma.order.findUnique({
    where: { code },
    include: { extraCharges: true },
  });

  if (!order) {
    return NextResponse.json({ error: "Không tìm thấy đơn hàng" }, { status: 404 });
  }

  if (order.status !== OrderStatus.DRAFT) {
    return NextResponse.json(
      { error: "Chỉ có thể chỉnh sửa phiếu tạm." },
      { status: 400 },
    );
  }

  const uniqueProductIds = Array.from(new Set(requestedItems.map((item) => item.productId)));
  const products = await prisma.product.findMany({
    where: { id: { in: uniqueProductIds } },
  });

  if (products.length !== uniqueProductIds.length) {
    return NextResponse.json(
      { error: "Một hoặc nhiều sản phẩm không tồn tại." },
      { status: 404 },
    );
  }

  const nextItems = requestedItems.map((item) => {
    const product = products.find((row) => row.id === item.productId);
    if (!product) throw new Error("Product not found");

    const unitPrice = item.unitPrice ?? product.defaultPrice;
    return {
      productId: product.id,
      name: product.name,
      detail: product.note,
      sku: product.id.slice(-8).toUpperCase(),
      quantity: item.quantity,
      unitPrice,
      amount: unitPrice * item.quantity,
    };
  });

  const subtotal = nextItems.reduce((sum, item) => sum + item.amount, 0);
  const extraChargeTotal = order.extraCharges.reduce((sum, charge) => sum + charge.amount, 0);
  const total = subtotal + order.shippingFee + order.tax + extraChargeTotal - order.discount;

  await prisma.$transaction(async (tx) => {
    await tx.orderItem.deleteMany({ where: { orderId: order.id } });
    await tx.order.update({
      where: { id: order.id },
      data: {
        subtotal,
        total,
        items: {
          create: nextItems.map((item) => ({
            productId: item.productId,
            name: item.name,
            detail: item.detail,
            sku: item.sku,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
          })),
        },
      },
    });
  });

  const updatedOrder = await getOrderDetail(code);

  return NextResponse.json({ data: updatedOrder });
}
