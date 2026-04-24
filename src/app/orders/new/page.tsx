import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/ui";
import { CreateOrderClient } from "./create-order-client";

export default function CreateOrderPage() {
  return (
    <AppShell active="create">
      <PageHeader title="Tạo đơn hàng mới" />
      <CreateOrderClient />
    </AppShell>
  );
}
