import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/ui";
import { CreateOrderClient } from "./create-order-client";

export default async function CreateOrderPage({
  searchParams,
}: {
  searchParams?: Promise<{ phone?: string }>;
}) {
  const resolvedSearchParams = await searchParams;

  return (
    <AppShell active="create">
      <div className="screen-only">
        <PageHeader
          title="Tạo phiếu đặt hàng"
          description="Lưu phiếu tạm cho từng lần khách đặt, sau đó gộp phiếu khi chuẩn bị ship."
        />
      </div>
      <CreateOrderClient initialPhone={resolvedSearchParams?.phone ?? ""} />
    </AppShell>
  );
}
