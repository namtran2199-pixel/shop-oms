import { AppShell } from "@/components/app-shell";
import { OrderDetailClient } from "./order-detail-client";

export default async function OrderDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ batch?: string | string[] }>;
}) {
  const { id } = await params;
  const { batch } = await searchParams;
  const batchCodes = parseBatchCodes(batch, id);

  return (
    <AppShell active="orders">
      <OrderDetailClient code={id} batchCodes={batchCodes} />
    </AppShell>
  );
}

function parseBatchCodes(batch: string | string[] | undefined, currentCode: string) {
  const rawValues = Array.isArray(batch) ? batch : batch ? [batch] : [];
  const parsedCodes = rawValues
    .flatMap((value) => value.split(","))
    .map((value) => value.trim())
    .filter(Boolean);

  if (parsedCodes.includes(currentCode)) {
    return Array.from(new Set(parsedCodes));
  }

  return [...Array.from(new Set(parsedCodes)), currentCode];
}
