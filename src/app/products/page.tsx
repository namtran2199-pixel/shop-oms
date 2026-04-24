import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/ui";
import { ProductsClient } from "./products-client";

export default function ProductsPage() {
  return (
    <AppShell active="products">
      <PageHeader title="Sản phẩm" description="Quản lý danh mục sản phẩm của cửa hàng." />
      <ProductsClient />
    </AppShell>
  );
}
