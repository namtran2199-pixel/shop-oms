import { getOrderDetail } from "@/lib/services";
import { PrintOrdersClient } from "./print-page-client";

export default async function OrdersPrintPage({
  searchParams,
}: {
  searchParams: Promise<{ codes?: string | string[] }>;
}) {
  const { codes } = await searchParams;
  const parsedCodes = parseCodes(codes);

  const orders = await Promise.all(parsedCodes.map((code) => getOrderDetail(code)));
  const printableOrders = orders.filter(isPrintableOrder);

  return <PrintOrdersClient orders={printableOrders} />;
}

function isPrintableOrder(
  order: Awaited<ReturnType<typeof getOrderDetail>>,
): order is NonNullable<Awaited<ReturnType<typeof getOrderDetail>>> {
  return Boolean(order) && order.status !== "Đã gộp";
}

function parseCodes(rawCodes: string | string[] | undefined) {
  const values = Array.isArray(rawCodes) ? rawCodes : rawCodes ? [rawCodes] : [];

  return Array.from(
    new Set(
      values
        .flatMap((value) => value.split(","))
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  );
}
