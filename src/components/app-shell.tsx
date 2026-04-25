import Link from "next/link";
import {
  Bell,
  ChartNoAxesColumnIncreasing,
  CircleHelp,
  LogOut,
  Menu,
  Package,
  ReceiptText,
  Settings,
  ShoppingCart,
  Users,
} from "lucide-react";
import type { ReactNode } from "react";

const navItems = [
  { href: "/dashboard", label: "Thống kê", icon: ChartNoAxesColumnIncreasing, key: "dashboard" },
  { href: "/orders/new", label: "Tạo đơn", icon: ShoppingCart, key: "create" },
  { href: "/orders", label: "Đơn hàng", icon: ReceiptText, key: "orders" },
  { href: "/customers", label: "Khách hàng", icon: Users, key: "customers" },
  { href: "/products", label: "Sản phẩm", icon: Package, key: "products" },
  { href: "/settings", label: "Cài đặt", icon: Settings, key: "settings" },
];

export function AppShell({
  active,
  children,
}: {
  active: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background text-on-surface">
      <input id="mobile-sidebar" type="checkbox" className="peer sr-only" />
      <label
        htmlFor="mobile-sidebar"
        className="fixed inset-0 z-40 hidden bg-black/35 peer-checked:block lg:peer-checked:hidden"
        aria-label="Đóng menu"
      />
      <aside className="fixed left-0 top-0 z-50 flex h-screen w-72 max-w-[82vw] -translate-x-full flex-col border-r border-soft-border-gray bg-white transition-transform peer-checked:translate-x-0 lg:w-64 lg:translate-x-0">
        <div className="px-6 py-8">
          <div className="flex items-start justify-between gap-3">
            <Link href="/orders/new" className="block">
            <span className="block text-lg font-bold text-zinc-900">
              Shop Retail
            </span>
            <span className="block text-sm font-medium text-zinc-500">
              Quản trị OMS
            </span>
            </Link>
            <label
              htmlFor="mobile-sidebar"
              className="rounded-full bg-surface-container px-3 py-1 text-sm text-on-surface-variant lg:hidden"
              aria-label="Đóng menu"
            >
              Đóng
            </label>
          </div>
        </div>
        <nav className="flex flex-col gap-1 px-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const selected = active === item.key;
            return (
              <Link
                key={item.key}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  selected
                    ? "bg-zinc-100 text-action-blue"
                    : "text-zinc-500 hover:bg-zinc-100 hover:text-near-black-ink"
                }`}
              >
                <Icon size={20} strokeWidth={1.8} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      <header className="fixed left-0 right-0 top-0 z-40 flex h-16 items-center justify-between border-b border-soft-border-gray bg-white px-5 lg:left-64 lg:px-8">
        <div className="flex items-center gap-3 lg:hidden">
          <label
            htmlFor="mobile-sidebar"
            className="focus-ring inline-flex h-10 w-10 items-center justify-center rounded-full bg-surface-container text-on-surface"
            aria-label="Mở menu"
          >
            <Menu size={20} />
          </label>
          <Link href="/orders/new" className="font-semibold text-near-black-ink">
            Shop Retail
          </Link>
        </div>
        <div className="hidden w-64 lg:block" />
        <div className="flex items-center gap-5">
          <button className="focus-ring text-zinc-600 transition hover:text-action-blue">
            <Bell size={21} />
          </button>
          <button className="focus-ring text-zinc-600 transition hover:text-action-blue">
            <CircleHelp size={21} />
          </button>
          <div className="h-6 w-px bg-soft-border-gray" />
          <form action="/api/auth/logout" method="post">
            <button className="focus-ring flex items-center gap-2 text-sm text-zinc-600 transition hover:text-action-blue">
              <div className="h-8 w-8 rounded-full bg-surface-variant" />
              <span className="hidden sm:inline">Đăng xuất</span>
              <LogOut size={16} />
            </button>
          </form>
        </div>
      </header>

      <main className="min-h-screen pt-16 lg:ml-64">
        <div className="mx-auto max-w-7xl px-4 py-6 md:px-10 md:py-12">
          {children}
        </div>
      </main>
    </div>
  );
}
