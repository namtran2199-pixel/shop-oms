import { NextResponse } from "next/server";
import { OrderStatus, Prisma } from "@prisma/client";
import { getPrisma } from "@/lib/prisma";
import { getNextOrderCode } from "@/lib/order-code";
import { getOrders } from "@/lib/services";

const statusMap: Record<string, OrderStatus> = {
  "Phiếu tạm": OrderStatus.DRAFT,
  "Đã thanh toán": OrderStatus.PAID,
  "Đang xử lý": OrderStatus.PROCESSING,
  "Đang giao": OrderStatus.SHIPPED,
  "Đã hủy": OrderStatus.CANCELLED,
  "Đã gộp": OrderStatus.MERGED,
};

type RequestedItem = {
  productId: string;
  quantity: number;
  unitPrice?: number;
  detail?: string;
};

function normalizePhone(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.startsWith("84")) return "0" + digits.slice(2);
  return digits;
}

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim();
}

function getInitialSearchText(value: string) {
  return normalizeText(value)
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0])
    .join("");
}

function isValidVietnamPhone(value: string) {
  return /^0(3|5|7|8|9)\d{8}$/.test(normalizePhone(value));
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search")?.trim() ?? "";
  const status = searchParams.get("status") ?? "Tất cả";
  const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);
  const pageSize = Math.min(
    20,
    Math.max(1, Number(searchParams.get("pageSize") ?? "5") || 5),
  );
  const normalizedSearch = normalizeText(search);
  const normalizedPhoneSearch = normalizePhone(search);
  const orders = await getOrders();
  const filtered = orders.filter((order) => {
    const normalizedCustomer = normalizeText(order.customer);
    const customerInitials = getInitialSearchText(order.customer);
    const matchesSearch =
      !search ||
      order.id.toLowerCase().includes(search.toLowerCase()) ||
      (normalizedSearch.length > 0 &&
        (normalizedCustomer.includes(normalizedSearch) ||
          customerInitials.startsWith(normalizedSearch))) ||
      (normalizedPhoneSearch.length > 0 &&
        normalizePhone(order.phone).includes(normalizedPhoneSearch));
    const matchesStatus = status === "Tất cả" || order.status === status;
    return matchesSearch && matchesStatus;
  });

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * pageSize;
  const pagedOrders = filtered.slice(start, start + pageSize);

  return NextResponse.json({
    data: pagedOrders,
    meta: {
      total,
      page: currentPage,
      pageSize,
      totalPages,
    },
  });
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    customerName?: string;
    phone?: string;
    productId?: string;
    quantity?: number;
    status?: string;
    temporary?: boolean;
    shippingAddress?: string;
    extraChargeIds?: string[];
    items?: Array<{ productId: string; quantity: number; unitPrice?: number; detail?: string }>;
  };

  const requestedItems: RequestedItem[] =
    body.items && body.items.length > 0
        ? body.items.map((item) => ({
          productId: item.productId,
          quantity: Math.max(1, Math.round(item.quantity)),
          unitPrice:
            typeof item.unitPrice === "number" && Number.isFinite(item.unitPrice)
              ? Math.max(0, Math.round(item.unitPrice))
              : undefined,
          detail: item.detail?.trim() || undefined,
        }))
      : body.productId
        ? [{ productId: body.productId, quantity: Math.max(1, Math.round(body.quantity ?? 1)) }]
        : [];

  if (!body.customerName?.trim() || requestedItems.length === 0) {
    return NextResponse.json(
      { error: "Thiếu thông tin khách hàng hoặc sản phẩm" },
      { status: 400 },
    );
  }

  const normalizedPhone = normalizePhone(body.phone ?? "");
  const shippingAddress = body.shippingAddress?.trim() || null;
  if (normalizedPhone && !isValidVietnamPhone(normalizedPhone)) {
    return NextResponse.json(
      { error: "Số điện thoại không hợp lệ" },
      { status: 400 },
    );
  }

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
  const customerData = {
    name: body.customerName.trim(),
    phone: normalizedPhone || null,
    ...(shippingAddress ? { address: shippingAddress } : {}),
  };
  const customer = existingCustomer
    ? await prisma.customer.update({
        where: { id: existingCustomer.id },
        data: customerData,
      })
    : await prisma.customer.create({
        data: customerData,
      });

  const orderItems = requestedItems.map((item) => {
    const product = products.find((row) => row.id === item.productId);
    if (!product) throw new Error("Product not found");
    const quantity = item.quantity;
    const unitPrice = item.unitPrice ?? product.defaultPrice;
    return {
      product,
      quantity,
      unitPrice,
      detail: item.detail?.trim() || product.note || null,
      amount: unitPrice * quantity,
    };
  });
  const subtotal = orderItems.reduce((sum, item) => sum + item.amount, 0);
  const status =
    body.temporary || body.status === "Phiếu tạm"
      ? OrderStatus.DRAFT
      : (body.status ? statusMap[body.status] : undefined) ?? OrderStatus.PROCESSING;
  const extraChargeIds = Array.from(new Set(body.extraChargeIds?.filter(Boolean) ?? []));
  const extraCharges =
    status !== OrderStatus.DRAFT && extraChargeIds.length > 0
      ? await prisma.extraCharge.findMany({
          where: { id: { in: extraChargeIds }, isActive: true },
        })
      : [];
  const extraChargeTotal = extraCharges.reduce((sum, charge) => sum + charge.amount, 0);
  const now = new Date();
  const order = await prisma.$transaction(async (tx) => {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const code = await getNextOrderCode(tx, now, attempt);
      try {
        return await tx.order.create({
          data: {
            code,
            customerId: customer.id,
            status,
            subtotal,
            total: subtotal + extraChargeTotal,
            shippingAddress,
            paymentMethod:
              status === OrderStatus.DRAFT
                ? "Phiếu tạm"
                : status === OrderStatus.PAID
                  ? "Đã thanh toán"
                  : "Chưa ghi nhận",
            items: {
              create: orderItems.map(({ product, quantity, unitPrice, detail }) => ({
                productId: product.id,
                name: product.name,
                detail,
                sku: product.id.slice(-8).toUpperCase(),
                quantity,
                unitPrice,
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

  return NextResponse.json({ data: order }, { status: 201 });
}
