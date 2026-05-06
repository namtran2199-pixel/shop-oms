import { unstable_noStore as noStore } from "next/cache";
import { OrderStatus } from "@prisma/client";
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

const revenueStatuses: OrderStatus[] = [
  OrderStatus.PAID,
  OrderStatus.PROCESSING,
  OrderStatus.SHIPPED,
];

const iconMap = {
  Headphones,
  Package,
  Plug,
  Smartphone,
  Watch,
};

type StatsPeriod = "day" | "month" | "year";

function getVietnamNowParts(date = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(date);

  return {
    year: Number(parts.find((part) => part.type === "year")?.value ?? "1970"),
    month: Number(parts.find((part) => part.type === "month")?.value ?? "1"),
    day: Number(parts.find((part) => part.type === "day")?.value ?? "1"),
  };
}

function getVietnamRange(unit: StatsPeriod, date = new Date()) {
  const { year, month, day } = getVietnamNowParts(date);
  const startUtc =
    unit === "day"
      ? Date.UTC(year, month - 1, day, -7, 0, 0, 0)
      : unit === "month"
        ? Date.UTC(year, month - 1, 1, -7, 0, 0, 0)
        : Date.UTC(year, 0, 1, -7, 0, 0, 0);
  const endUtc =
    unit === "day"
      ? Date.UTC(year, month - 1, day + 1, -7, 0, 0, 0)
      : unit === "month"
        ? Date.UTC(year, month, 1, -7, 0, 0, 0)
        : Date.UTC(year + 1, 0, 1, -7, 0, 0, 0);

  return {
    start: new Date(startUtc),
    end: new Date(endUtc),
  };
}

function getStatsTargetDate(period: StatsPeriod, value?: string) {
  const nowParts = getVietnamNowParts();

  if (!value) {
    return period === "day"
      ? new Date(Date.UTC(nowParts.year, nowParts.month - 1, nowParts.day))
      : period === "month"
        ? new Date(Date.UTC(nowParts.year, nowParts.month - 1, 1))
        : new Date(Date.UTC(nowParts.year, 0, 1));
  }

  if (period === "day") {
    const [year, month, day] = value.split("-").map(Number);
    if (year && month && day) return new Date(Date.UTC(year, month - 1, day));
  }

  if (period === "month") {
    const [year, month] = value.split("-").map(Number);
    if (year && month) return new Date(Date.UTC(year, month - 1, 1));
  }

  if (period === "year") {
    const year = Number(value);
    if (year) return new Date(Date.UTC(year, 0, 1));
  }

  return new Date();
}

function getRangeByTarget(period: StatsPeriod, targetDate: Date) {
  return getVietnamRange(period, targetDate);
}

function formatPeriodLabel(period: StatsPeriod, date: Date) {
  const formatter =
    period === "day"
      ? new Intl.DateTimeFormat("vi-VN", {
          timeZone: "Asia/Ho_Chi_Minh",
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        })
      : period === "month"
        ? new Intl.DateTimeFormat("vi-VN", {
            timeZone: "Asia/Ho_Chi_Minh",
            month: "2-digit",
            year: "numeric",
          })
        : new Intl.DateTimeFormat("vi-VN", {
            timeZone: "Asia/Ho_Chi_Minh",
            year: "numeric",
          });

  return formatter.format(date);
}

function getVietnamHour(date: Date) {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour: "2-digit",
    hour12: false,
  });
  const parts = formatter.formatToParts(date);
  return Number(parts.find((part) => part.type === "hour")?.value ?? "0");
}

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

export async function getProductCustomerHistory(productId: string, page = 1, pageSize = 10) {
  noStore();
  const prisma = getPrisma();
  const safePageSize = Math.min(50, Math.max(1, pageSize));
  const where = {
    productId,
    order: {
      status: { in: revenueStatuses },
    },
  };
  const total = await prisma.orderItem.count({ where });
  const totalPages = Math.max(1, Math.ceil(total / safePageSize));
  const currentPage = Math.min(Math.max(page, 1), totalPages);
  const rows = await prisma.orderItem.findMany({
    where,
    include: {
      order: {
        include: {
          customer: true,
        },
      },
    },
    orderBy: { order: { createdAt: "desc" } },
    skip: (currentPage - 1) * safePageSize,
    take: safePageSize,
  });

  return {
    data: rows.map((item) => ({
      id: item.id,
      orderCode: item.order.code,
      customerName: item.order.customer.name,
      customerPhone: item.order.customer.phone ?? "",
      quantity: item.quantity,
      unitPrice: formatCurrency(item.unitPrice),
      lineTotal: formatCurrency(item.unitPrice * item.quantity),
      date: formatOrderTime(item.order.createdAt),
    })),
    meta: {
      total,
      page: currentPage,
      pageSize: safePageSize,
      totalPages,
    },
  };
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

export async function getStats(period: StatsPeriod = "month", periodValue?: string) {
  noStore();
  const prisma = getPrisma();
  const targetDate = getStatsTargetDate(period, periodValue);
  const selectedRange = getRangeByTarget(period, targetDate);
  const orderCount = await prisma.order.count({
    where: { status: { in: revenueStatuses } },
  });
  const productCount = await prisma.product.count();
  const customerCount = await prisma.customer.count();
  const paidRevenue = await prisma.order.aggregate({
    where: { status: { in: revenueStatuses } },
    _sum: { subtotal: true },
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
    where: { status: { in: revenueStatuses } },
  });
  const averageOrderValue =
    completedCount > 0 ? Math.round((paidRevenue._sum.subtotal ?? 0) / completedCount) : 0;
  const periodOrders = await prisma.order.findMany({
    where: {
      status: { in: revenueStatuses },
      createdAt: { gte: selectedRange.start, lt: selectedRange.end },
    },
    include: {
      items: true,
    },
    orderBy: { createdAt: "asc" },
  });

  const revenueSeries =
    period === "day"
      ? Array.from({ length: 24 }, (_, hour) => {
          const rows = periodOrders.filter((order) => getVietnamHour(order.createdAt) === hour);
          const revenue = rows.reduce((sum, order) => sum + order.subtotal, 0);

          return {
            label: `${String(hour).padStart(2, "0")}:00`,
            revenue,
            revenueLabel: formatCurrency(revenue),
            orders: rows.length,
          };
        })
      : period === "month"
        ? (() => {
            const parts = getVietnamNowParts(targetDate);
            const daysInMonth = new Date(parts.year, parts.month, 0).getDate();

            return Array.from({ length: daysInMonth }, (_, index) => {
              const day = index + 1;
              const rows = periodOrders.filter((order) => getVietnamNowParts(order.createdAt).day === day);
              const revenue = rows.reduce((sum, order) => sum + order.subtotal, 0);

              return {
                label: String(day),
                revenue,
                revenueLabel: formatCurrency(revenue),
                orders: rows.length,
              };
            });
          })()
        : Array.from({ length: 12 }, (_, index) => {
            const month = index + 1;
            const rows = periodOrders.filter((order) => getVietnamNowParts(order.createdAt).month === month);
            const revenue = rows.reduce((sum, order) => sum + order.subtotal, 0);

            return {
              label: `T${month}`,
              revenue,
              revenueLabel: formatCurrency(revenue),
              orders: rows.length,
            };
          });

  const topProductsInPeriod = Array.from(
    periodOrders
      .flatMap((order) => order.items)
      .reduce((map, item) => {
        map.set(item.name, (map.get(item.name) ?? 0) + item.quantity);
        return map;
      }, new Map<string, number>())
      .entries(),
  )
    .map(([name, quantity]) => ({ name, quantity }))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5);

  return {
    cards: [
      { label: "Doanh thu", value: formatCurrency(paidRevenue._sum.subtotal ?? 0) },
      { label: "Đơn hàng", value: String(orderCount) },
      { label: "Khách hàng", value: String(customerCount) },
      { label: "Sản phẩm", value: String(productCount) },
      { label: "Giá trị đơn TB", value: formatCurrency(averageOrderValue) },
      { label: "Đơn đã hủy", value: String(cancelledCount) },
    ],
    chartFilter: {
      period,
      periodLabel: formatPeriodLabel(period, targetDate),
      periodValue:
        period === "day"
          ? `${getVietnamNowParts(targetDate).year}-${String(getVietnamNowParts(targetDate).month).padStart(2, "0")}-${String(getVietnamNowParts(targetDate).day).padStart(2, "0")}`
          : period === "month"
            ? `${getVietnamNowParts(targetDate).year}-${String(getVietnamNowParts(targetDate).month).padStart(2, "0")}`
            : String(getVietnamNowParts(targetDate).year),
    },
    charts: {
      revenueSeries,
      topProductsSeries: topProductsInPeriod,
      periodRevenue: formatCurrency(periodOrders.reduce((sum, order) => sum + order.subtotal, 0)),
      periodOrderCount: periodOrders.length,
    },
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
