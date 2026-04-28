import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const VIETNAM_TIME_ZONE = "Asia/Ho_Chi_Minh";

function getTripDateParts(date: Date) {
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

function buildTripBaseName(date: Date) {
  const { day, month, year } = getTripDateParts(date);
  return `Chuyến ${day}/${month}/${year}`;
}

async function constraintExists(name: string) {
  const rows = await prisma.$queryRaw<Array<{ exists: boolean }>>`
    SELECT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = ${name}
    ) AS "exists"
  `;

  return rows[0]?.exists ?? false;
}

async function ensureTripTable() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "Trip" (
      "id" TEXT PRIMARY KEY NOT NULL,
      "name" TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS "Trip_name_key"
    ON "Trip"("name")
  `);
}

async function ensureTripColumnAndForeignKey() {
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "Order"
    ADD COLUMN IF NOT EXISTS "tripId" TEXT
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "Order_tripId_idx"
    ON "Order"("tripId")
  `);

  if (!(await constraintExists("Order_tripId_fkey"))) {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "Order"
      ADD CONSTRAINT "Order_tripId_fkey"
      FOREIGN KEY ("tripId") REFERENCES "Trip"("id")
      ON DELETE SET NULL ON UPDATE CASCADE
    `);
  }
}

async function ensureTripForDate(
  createdAt: Date,
  tripsByName: Map<string, string>,
) {
  const baseName = buildTripBaseName(createdAt);
  const existingTripId = tripsByName.get(baseName);
  if (existingTripId) return existingTripId;

  const trip = await prisma.trip.create({
    data: {
      name: baseName,
    },
    select: { id: true, name: true },
  });

  tripsByName.set(trip.name, trip.id);
  return trip.id;
}

async function backfillOrderTrips() {
  const orders = await prisma.order.findMany({
    where: { tripId: null },
    select: {
      id: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  });

  if (orders.length === 0) {
    console.log('No backfill needed: all orders already have "tripId".');
    return;
  }

  const existingTrips = await prisma.trip.findMany({
    select: { id: true, name: true },
    orderBy: { createdAt: "asc" },
  });
  const tripsByName = new Map(existingTrips.map((trip) => [trip.name, trip.id]));
  const orderIdsByTripId = new Map<string, string[]>();

  for (const order of orders) {
    const tripId = await ensureTripForDate(order.createdAt, tripsByName);
    const current = orderIdsByTripId.get(tripId) ?? [];
    current.push(order.id);
    orderIdsByTripId.set(tripId, current);
  }

  for (const [tripId, orderIds] of orderIdsByTripId.entries()) {
    await prisma.order.updateMany({
      where: { id: { in: orderIds } },
      data: { tripId },
    });
  }

  console.log(
    `Backfilled ${orders.length} orders into ${orderIdsByTripId.size} trips.`,
  );
}

async function main() {
  await ensureTripTable();
  await ensureTripColumnAndForeignKey();
  await backfillOrderTrips();
  console.log('Migration complete: "Trip" support is ready.');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
