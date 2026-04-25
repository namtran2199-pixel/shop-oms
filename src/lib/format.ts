import { OrderStatus } from "@prisma/client";

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("vi-VN").format(value) + "đ";
}

export function formatOrderStatus(status: OrderStatus) {
  const labels: Record<OrderStatus, string> = {
    DRAFT: "Phiếu tạm",
    PAID: "Đã thanh toán",
    PROCESSING: "Đang xử lý",
    SHIPPED: "Đang giao",
    CANCELLED: "Đã hủy",
    MERGED: "Đã gộp",
  };

  return labels[status];
}

export function formatOrderTime(date: Date) {
  return new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}
