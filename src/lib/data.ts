import {
  Headphones,
  Package,
  Plug,
  Smartphone,
  Watch,
} from "lucide-react";

export const orders = [
  {
    id: "ORD-2023-9942",
    customer: "Nguyễn Văn A",
    phone: "090 123 4567",
    total: "41.180.000đ",
    status: "Đã thanh toán",
    time: "10:45, hôm nay",
    items: "MacBook Pro 14-inch, AirPods Max",
  },
  {
    id: "ORD-2023-9941",
    customer: "Trần Thị B",
    phone: "091 987 6543",
    total: "34.990.000đ",
    status: "Đang xử lý",
    time: "09:15, hôm nay",
    items: "iPhone 15 Pro Max 256GB",
  },
  {
    id: "ORD-2023-9938",
    customer: "Lê Văn C",
    phone: "098 765 4321",
    total: "6.190.000đ",
    status: "Đang giao",
    time: "Hôm qua",
    items: "AirPods Pro Gen 2",
  },
  {
    id: "ORD-2023-9935",
    customer: "Phạm Thị D",
    phone: "093 456 7890",
    total: "2.100.000đ",
    status: "Đã hủy",
    time: "Hôm qua",
    items: "MagSafe Charger",
  },
  {
    id: "ORD-2023-9929",
    customer: "Hoàng Văn E",
    phone: "097 112 2334",
    total: "1.490.000đ",
    status: "Đã thanh toán",
    time: "24/10/2023",
    items: "FineWoven Wallet",
  },
];

export const products = [
  {
    name: "iPhone 15 Pro FineWoven Case",
    price: "1.690.000đ",
    note: "Dòng phụ kiện tiêu chuẩn.",
    icon: Smartphone,
  },
  {
    name: "20W USB-C Power Adapter",
    price: "590.000đ",
    note: "Sản phẩm bán chạy.",
    icon: Plug,
  },
  {
    name: "AirPods Pro (2nd generation)",
    price: "6.190.000đ",
    note: "Bao gồm hộp sạc USB-C.",
    icon: Headphones,
  },
  {
    name: "Magnetic Link Band",
    price: "2.490.000đ",
    note: "Phù hợp phiên bản 41mm và 45mm.",
    icon: Watch,
  },
];

export const customers = [
  {
    name: "Nguyễn Văn An",
    phone: "090 123 4567",
    recent: "Hôm nay",
    summary: "12 đơn hàng • Tổng chi tiêu: 45.000.000đ",
  },
  {
    name: "Trần Thị Bích",
    phone: "098 765 4321",
    recent: "Hôm qua",
    summary: "3 đơn hàng • Tổng chi tiêu: 12.500.000đ",
  },
  {
    name: "Lê Hoàng Nam",
    phone: "091 234 5678",
    recent: "2 ngày trước",
    summary: "1 đơn hàng • Tổng chi tiêu: 2.100.000đ",
  },
  {
    name: "Phạm Quang Hưng",
    phone: "093 456 7890",
    recent: "1 tuần trước",
    summary: "5 đơn hàng • Tổng chi tiêu: 18.000.000đ",
  },
];

export const customerHistory = [
  {
    code: "ORD-2023-9941",
    date: "12/10/2023",
    product: "iPhone 15 Pro Max 256GB",
    option: "Titan tự nhiên",
    total: "34.990.000đ",
    status: "Đã thanh toán",
  },
  {
    code: "ORD-2023-9877",
    date: "05/09/2023",
    product: "AirPods Pro (Gen 2)",
    option: "Hộp sạc USB-C",
    total: "6.190.000đ",
    status: "Đã thanh toán",
  },
  {
    code: "ORD-2023-9721",
    date: "15/07/2023",
    product: "Ví FineWoven",
    option: "Màu Midnight",
    total: "1.490.000đ",
    status: "Đã thanh toán",
  },
];

export const orderItems = [
  {
    name: "MacBook Pro 14-inch",
    detail: "Đen không gian, M3 Pro, RAM 18GB, SSD 512GB",
    sku: "MBP14-M3P-SB",
    qty: 1,
    price: "34.990.000đ",
    icon: Package,
  },
  {
    name: "AirPods Max",
    detail: "Màu bạc",
    sku: "APM-SLV",
    qty: 1,
    price: "6.190.000đ",
    icon: Headphones,
  },
];
