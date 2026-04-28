import { Prisma, PrismaClient } from "@prisma/client";

const VIETNAM_TIME_ZONE = "Asia/Ho_Chi_Minh";

type PrismaLike = PrismaClient | Prisma.TransactionClient;

function getDateParts(date = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: VIETNAM_TIME_ZONE,
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });

  const parts = formatter.formatToParts(date);
  const day = parts.find((part) => part.type === "day")?.value ?? "01";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const year = parts.find((part) => part.type === "year")?.value ?? "00";

  return { day, month, year };
}

export function buildTripBaseName(date = new Date()) {
  const { day, month, year } = getDateParts(date);
  return `Chuyến ${day}/${month}/${year}`;
}

export async function generateNextTripName(prisma: PrismaLike, date = new Date()) {
  const baseName = buildTripBaseName(date);
  const rows = await prisma.trip.findMany({
    where: {
      OR: [
        { name: baseName },
        { name: { startsWith: `${baseName}-` } },
      ],
    },
    select: { name: true },
  });

  if (rows.length === 0) return baseName;

  const suffixes = new Set(
    rows
      .map(({ name }) => {
        if (name === baseName) return 0;
        const suffix = Number(name.slice(baseName.length + 1));
        return Number.isFinite(suffix) ? suffix : null;
      })
      .filter((value): value is number => value !== null),
  );

  let nextSuffix = 1;
  while (suffixes.has(nextSuffix)) {
    nextSuffix += 1;
  }

  return `${baseName}-${nextSuffix}`;
}

export async function getLatestTrip(prisma: PrismaLike) {
  return prisma.trip.findFirst({
    orderBy: [{ createdAt: "desc" }, { name: "desc" }],
  });
}

export async function resolveTripId(prisma: PrismaLike, tripId?: string | null) {
  if (tripId) {
    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      select: { id: true },
    });
    return trip?.id ?? null;
  }

  const latestTrip = await getLatestTrip(prisma);
  return latestTrip?.id ?? null;
}
