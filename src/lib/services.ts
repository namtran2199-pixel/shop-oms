import { unstable_noStore as noStore } from "next/cache";
import {
  Headphones,
  Package,
  Plug,
  Smartphone,
  Watch,
} from "lucide-react";
import { getPrisma } from "@/lib/prisma";
import {
  formatCurrency,
  formatOrderDate,
  formatOrderLongDate,
  formatOrderStatus,
  formatOrderTime,
} from "@/lib/format";

const iconMap = {
  Headphones,
  Package,
  Plug,
  Smartphone,
  Watch,
};

export async function getOrders() {
  noStore();
  const prisma = getPrisma();
  const rows = await prisma.order.findMany({
    include: {
      customer: true,
      items: true,
      mergedOrders: {
        select: { code: true },
        orderBy: { createdAt: "asc" },
      },
      mergedInto: {
        select: { code: true },
      },
      extraCharges: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return rows.map((order) => ({
    id: order.code,
    customer: order.customer.name,
    phone: order.customer.phone ?? "",
    total: formatCurrency(order.total),
    status: formatOrderStatus(order.status),
    statusCode: order.status,
    shippingMethod: order.shippingMethod ?? "Chưa chọn",
    time: formatOrderTime(order.createdAt),
    items: order.items.map((item) => item.name).join(", "),
    sourceCodes: order.mergedOrders.map((mergedOrder) => mergedOrder.code),
    mergedIntoCode: order.mergedInto?.code ?? null,
  }));
}

export async function getOrderDetail(code: string) {
  noStore();
  const prisma = getPrisma();
  const [order, storeSettings] = await Promise.all([
    prisma.order.findUnique({
      where: { code },
    include: {
      customer: true,
      mergedInto: { select: { code: true } },
      mergedOrders: {
        select: { code: true },
        orderBy: { createdAt: "asc" },
      },
      extraCharges: true,
      items: {
          include: { product: true },
        },
      },
    }),
    prisma.storeSetting.findUnique({ where: { id: "default" } }),
  ]);

  if (!order) return null;

  return {
    code: order.code,
    createdAtIso: order.createdAt.toISOString(),
    createdAtLabel: formatOrderTime(order.createdAt),
    receiptDateLabel: formatOrderDate(order.createdAt),
    receiptLongDateLabel: formatOrderLongDate(order.createdAt),
    store: {
      name: storeSettings?.shopName ?? "Shop Retail",
      phone: storeSettings?.phone ?? "",
      qrCodeImageUrl: storeSettings?.qrCodeImageUrl ?? null,
      paperSize: storeSettings?.paperSize ?? "A5",
    },
    customer: {
      ...order.customer,
      phone: order.customer.phone ?? "",
    },
    status: formatOrderStatus(order.status),
    statusCode: order.status,
    sourceCodes: order.mergedOrders.map((mergedOrder) => mergedOrder.code),
    mergedIntoCode: order.mergedInto?.code ?? null,
    subtotal: formatCurrency(order.subtotal),
    subtotalValue: order.subtotal,
    shippingFee: formatCurrency(order.shippingFee),
    shippingFeeValue: order.shippingFee,
    tax: formatCurrency(order.tax),
    taxValue: order.tax,
    total: formatCurrency(order.total),
    totalValue: order.total,
    extraChargeTotal: order.extraCharges.reduce((sum, charge) => sum + charge.amount, 0),
    extraCharges: order.extraCharges.map((charge) => ({
      name: charge.name,
      amount: charge.amount,
      amountLabel: formatCurrency(charge.amount),
    })),
    paymentMethod: order.paymentMethod ?? "Chưa ghi nhận",
    shippingMethod: order.shippingMethod ?? "Chưa chọn",
    shippingAddress: order.shippingAddress ?? order.customer.address ?? "Chưa có địa chỉ",
    items: order.items.map((item) => ({
      productId: item.productId,
      name: item.name,
      detail: item.detail ?? "",
      sku: item.sku ?? "",
      qty: item.quantity,
      originalUnitPrice: item.product.defaultPrice,
      unitPrice: item.unitPrice,
      lineTotal: item.unitPrice * item.quantity,
      price: formatCurrency(item.unitPrice * item.quantity),
      icon: iconMap[item.product.icon as keyof typeof iconMap] ?? Package,
    })),
  };
}

export async function getProducts() {
  noStore();
  const prisma = getPrisma();
  const rows = await prisma.product.findMany({
    orderBy: { createdAt: "asc" },
  });

  return rows.map((product) => ({
    id: product.id,
    name: product.name,
    price: formatCurrency(product.defaultPrice),
    note: product.note ?? "",
    icon: iconMap[product.icon as keyof typeof iconMap] ?? Package,
  }));
}

export async function getCustomers() {
  noStore();
  const prisma = getPrisma();
  const rows = await prisma.customer.findMany({
    include: {
      orders: true,
    },
    orderBy: { createdAt: "asc" },
  });

  return rows.map((customer) => {
    const total = customer.orders.reduce((sum, order) => sum + order.total, 0);
    return {
      id: customer.id,
      name: customer.name,
      phone: customer.phone ?? "",
      email: customer.email,
      address: customer.address,
      recent: customer.orders.length ? "Có đơn hàng" : "Chưa có đơn",
      summary: `${customer.orders.length} đơn hàng • Tổng chi tiêu: ${formatCurrency(total)}`,
    };
  });
}

export async function getCustomerDetail(customerId?: string) {
  noStore();
  const prisma = getPrisma();
  const customer = await prisma.customer.findFirst({
    where: customerId ? { id: customerId } : undefined,
    include: {
      orders: {
        include: { items: true },
        orderBy: { createdAt: "desc" },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  if (!customer) return null;

  const total = customer.orders.reduce((sum, order) => sum + order.total, 0);

  return {
    id: customer.id,
    name: customer.name,
    phone: customer.phone ?? "",
    email: customer.email,
    address: customer.address,
    totalSpend: formatCurrency(total),
    orderCount: `${customer.orders.length} đơn`,
    history: customer.orders.map((order) => ({
      code: order.code,
      date: formatOrderTime(order.createdAt),
      product: order.items[0]?.name ?? "Đơn hàng",
      option: order.items[0]?.detail ?? "",
      total: formatCurrency(order.total),
      status: formatOrderStatus(order.status),
    })),
  };
}

export async function getStoreSettings() {
  noStore();
  const prisma = getPrisma();
  return prisma.storeSetting.findUnique({ where: { id: "default" } });
}

export async function getStats() {
  noStore();
  const prisma = getPrisma();
  const orderCount = await prisma.order.count();
  const productCount = await prisma.product.count();
  const customerCount = await prisma.customer.count();
  const paidRevenue = await prisma.order.aggregate({
    where: { status: { not: "CANCELLED" } },
    _sum: { total: true },
  });
  const recentOrders = await prisma.order.findMany({
    take: 5,
    include: { customer: true },
    orderBy: { createdAt: "desc" },
  });
  const topProducts = await prisma.orderItem.groupBy({
    by: ["name"],
    _sum: { quantity: true },
    orderBy: { _sum: { quantity: "desc" } },
    take: 5,
  });
  const cancelledCount = await prisma.order.count({
    where: { status: "CANCELLED" },
  });
  const completedCount = await prisma.order.count({
    where: { status: { not: "CANCELLED" } },
  });
  const averageOrderValue =
    completedCount > 0 ? Math.round((paidRevenue._sum.total ?? 0) / completedCount) : 0;

  return {
    cards: [
      { label: "Doanh thu", value: formatCurrency(paidRevenue._sum.total ?? 0) },
      { label: "Đơn hàng", value: String(orderCount) },
      { label: "Khách hàng", value: String(customerCount) },
      { label: "Sản phẩm", value: String(productCount) },
      { label: "Giá trị đơn TB", value: formatCurrency(averageOrderValue) },
      { label: "Đơn đã hủy", value: String(cancelledCount) },
    ],
    recentOrders: recentOrders.map((order) => ({
      code: order.code,
      customer: order.customer.name,
      total: formatCurrency(order.total),
      status: formatOrderStatus(order.status),
      time: formatOrderTime(order.createdAt),
    })),
    topProducts: topProducts.map((item) => ({
      name: item.name,
      quantity: item._sum.quantity ?? 0,
    })),
  };
}
