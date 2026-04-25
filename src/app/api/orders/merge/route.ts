import { NextResponse } from "next/server";
import { OrderStatus, Prisma } from "@prisma/client";
import { getPrisma } from "@/lib/prisma";
import { getNextOrderCode } from "@/lib/order-code";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    orderCodes?: string[];
    extraChargeIds?: string[];
  };
  const orderCodes = Array.from(new Set(body.orderCodes?.filter(Boolean) ?? []));
  const extraChargeIds = Array.from(new Set(body.extraChargeIds?.filter(Boolean) ?? []));

  if (orderCodes.length < 2) {
    return NextResponse.json(
      { error: "Cần chọn ít nhất 2 phiếu tạm để gộp đơn." },
      { status: 400 },
    );
  }

  const prisma = getPrisma();
  const tempOrders = await prisma.order.findMany({
    where: {
      code: { in: orderCodes },
      status: OrderStatus.DRAFT,
    },
    include: {
      customer: true,
      items: true,
    },
    orderBy: { createdAt: "asc" },
  });

  if (tempOrders.length !== orderCodes.length) {
    return NextResponse.json(
      { error: "Một hoặc nhiều phiếu đã được xử lý, không thể gộp." },
      { status: 409 },
    );
  }

  const customerPhone = normalizePhone(tempOrders[0].customer.phone);
  const hasSameCustomer = tempOrders.every(
    (order) => normalizePhone(order.customer.phone) === customerPhone,
  );

  if (!hasSameCustomer) {
    return NextResponse.json(
      { error: "Chỉ có thể gộp các phiếu tạm cùng số điện thoại khách hàng." },
      { status: 400 },
    );
  }

  const customerId = tempOrders[0].customerId;
  const groupedItems = new Map<
    string,
    {
      productId: string;
      name: string;
      detail: string | null;
      sku: string | null;
      quantity: number;
      unitPrice: number;
    }
  >();

  tempOrders.forEach((order) => {
    order.items.forEach((item) => {
      const key = `${item.productId}:${item.unitPrice}`;
      const current = groupedItems.get(key);
      if (current) {
        current.quantity += item.quantity;
        return;
      }

      groupedItems.set(key, {
        productId: item.productId,
        name: item.name,
        detail: item.detail,
        sku: item.sku,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      });
    });
  });

  const items = Array.from(groupedItems.values());
  const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const extraCharges =
    extraChargeIds.length > 0
      ? await prisma.extraCharge.findMany({
          where: { id: { in: extraChargeIds }, isActive: true },
        })
      : [];
  const extraChargeTotal = extraCharges.reduce((sum, charge) => sum + charge.amount, 0);
  const now = new Date();

  const mergedOrder = await prisma.$transaction(async (tx) => {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const code = await getNextOrderCode(tx, now, attempt);
      try {
        const createdOrder = await tx.order.create({
          data: {
            code,
            customerId,
            status: OrderStatus.PROCESSING,
            subtotal,
            total: subtotal + extraChargeTotal,
            paymentMethod: "Chưa ghi nhận",
            items: {
              create: items.map((item) => ({
                productId: item.productId,
                name: item.name,
                detail: item.detail,
                sku: item.sku,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
              })),
            },
            extraCharges: {
              create: extraCharges.map((charge) => ({
                extraChargeId: charge.id,
                name: charge.name,
                amount: charge.amount,
              })),
            },
          },
        });

        await tx.order.updateMany({
          where: { code: { in: orderCodes } },
          data: {
            status: OrderStatus.MERGED,
            mergedIntoId: createdOrder.id,
          },
        });

        return createdOrder;
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002" &&
          attempt < 2
        ) {
          continue;
        }
        throw error;
      }
    }

    throw new Error("Không thể tạo mã đơn gộp.");
  });

  return NextResponse.json({ data: { code: mergedOrder.code } }, { status: 201 });
}

function normalizePhone(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.startsWith("84")) return "0" + digits.slice(2);
  return digits;
}
