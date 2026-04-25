import type { Prisma } from "@prisma/client";

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

function pad4(value: number) {
  return String(value).padStart(4, "0");
}

export function buildOrderCode(date: Date, sequence: number) {
  const month = pad2(date.getMonth() + 1);
  const day = pad2(date.getDate());
  const year = pad2(date.getFullYear() % 100);

  return `ORD-${month}${day}${year}-${pad4(sequence)}`;
}

export function buildOrderCodePrefix(date: Date) {
  const month = pad2(date.getMonth() + 1);
  const day = pad2(date.getDate());
  const year = pad2(date.getFullYear() % 100);

  return `ORD-${month}${day}${year}-`;
}

export function parseOrderCodeSequence(code: string, prefix: string) {
  if (!code.startsWith(prefix)) return 0;
  const sequence = Number(code.slice(prefix.length));
  return Number.isFinite(sequence) ? sequence : 0;
}

export async function getNextOrderCode(
  prisma: Prisma.TransactionClient,
  date: Date,
  offset = 0,
) {
  const prefix = buildOrderCodePrefix(date);
  const latestOrder = await prisma.order.findFirst({
    where: { code: { startsWith: prefix } },
    orderBy: { code: "desc" },
    select: { code: true },
  });
  const nextSequence = parseOrderCodeSequence(latestOrder?.code ?? "", prefix) + 1 + offset;

  return buildOrderCode(date, nextSequence);
}
