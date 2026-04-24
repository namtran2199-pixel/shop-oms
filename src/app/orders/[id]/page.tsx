import { AppShell } from "@/components/app-shell";
import { OrderDetailClient } from "./order-detail-client";

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <AppShell active="orders">
      <OrderDetailClient code={id} />
    </AppShell>
  );
}
