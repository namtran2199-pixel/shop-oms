import { NextResponse } from "next/server";
import { OrderStatus, Prisma } from "@prisma/client";
import { getPrisma } from "@/lib/prisma";
import { getNextOrderCode } from "@/lib/order-code";

function normalizePhone(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.startsWith("84")) return "0" + digits.slice(2);
  return digits;
}

function isValidVietnamPhone(value: string) {
  return /^0(3|5|7|8|9)\d{8}$/.test(normalizePhone(value));
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    customerName?: string;
    phone?: string;
    items?: Array<{ productId: string; quantity: number }>;
  };

  if (!body.customerName?.trim() || !body.items?.length) {
    return NextResponse.json(
      { error: "Thiếu thông tin khách hàng hoặc sản phẩm" },
      { status: 400 },
    );
  }

  const normalizedPhone = normalizePhone(body.phone ?? "");
  if (normalizedPhone && !isValidVietnamPhone(normalizedPhone)) {
    return NextResponse.json({ error: "Số điện thoại không hợp lệ" }, { status: 400 });
  }

  const requestedItems = body.items.map((item) => ({
    productId: item.productId,
    quantity: Math.max(1, Math.round(item.quantity)),
  }));
  const prisma = getPrisma();
  const products = await prisma.product.findMany({
    where: { id: { in: requestedItems.map((item) => item.productId) } },
  });

  if (products.length !== requestedItems.length) {
    return NextResponse.json(
      { error: "Một hoặc nhiều sản phẩm không tồn tại" },
      { status: 404 },
    );
  }

  const existingCustomers = await prisma.customer.findMany({
    select: { id: true, phone: true },
  });
  const existingCustomer = normalizedPhone
    ? existingCustomers.find((customer) => normalizePhone(customer.phone ?? "") === normalizedPhone)
    : null;
  const customer = existingCustomer
    ? await prisma.customer.update({
        where: { id: existingCustomer.id },
        data: { name: body.customerName.trim(), phone: normalizedPhone },
      })
    : await prisma.customer.create({
        data: {
          name: body.customerName.trim(),
          phone: normalizedPhone || null,
        },
      });

  const orderItems = requestedItems.map((item) => {
    const product = products.find((row) => row.id === item.productId);
    if (!product) throw new Error("Product not found");
    return {
      product,
      quantity: item.quantity,
      amount: product.defaultPrice * item.quantity,
    };
  });
  const subtotal = orderItems.reduce((sum, item) => sum + item.amount, 0);
  const now = new Date();

  const order = await prisma.$transaction(async (tx) => {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const code = await getNextOrderCode(tx, now, attempt);
      try {
        return await tx.order.create({
          data: {
            code,
            customerId: customer.id,
            status: OrderStatus.PROCESSING,
            subtotal,
            total: subtotal,
            paymentMethod: "Chưa ghi nhận",
            items: {
              create: orderItems.map(({ product, quantity }) => ({
                productId: product.id,
                name: product.name,
                detail: product.note,
                sku: product.id.slice(-8).toUpperCase(),
                quantity,
                unitPrice: product.defaultPrice,
              })),
            },
          },
        });
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

    throw new Error("Không thể tạo mã đơn hàng.");
  });

  return NextResponse.json({ data: { code: order.code } }, { status: 201 });
}
