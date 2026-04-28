import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { getTripsPage } from "@/lib/services";
import { generateNextTripName } from "@/lib/trips";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);
  const pageSize = Math.min(50, Math.max(1, Number(searchParams.get("pageSize") ?? "10") || 10));
  const trips = await getTripsPage(page, pageSize);
  return NextResponse.json(trips);
}

export async function POST() {
  const prisma = getPrisma();
  const trip = await prisma.trip.create({
    data: {
      name: await generateNextTripName(prisma),
    },
  });

  return NextResponse.json({ data: trip }, { status: 201 });
}
