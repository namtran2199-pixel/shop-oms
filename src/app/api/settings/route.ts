import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { getStoreSettings } from "@/lib/services";

export async function GET() {
  const prisma = getPrisma();
  const [settings, extraCharges] = await Promise.all([
    getStoreSettings(),
    prisma.extraCharge.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  return NextResponse.json({ data: settings ? { ...settings, extraCharges } : null });
}

export async function PUT(request: Request) {
  const body = (await request.json()) as {
    shopName?: string;
    phone?: string;
    paperSize?: string;
    showBarcode?: boolean;
    autoPrint?: boolean;
    extraCharges?: Array<{ id?: string; name?: string; amount?: number | string }>;
  };

  const prisma = getPrisma();
  const settings = await prisma.storeSetting.upsert({
    where: { id: "default" },
    update: {
      shopName: body.shopName?.trim() || "Shop Retail",
      phone: body.phone?.trim() || "",
      paperSize: body.paperSize || "A5",
      showBarcode: Boolean(body.showBarcode),
      autoPrint: Boolean(body.autoPrint),
    },
    create: {
      id: "default",
      shopName: body.shopName?.trim() || "Shop Retail",
      phone: body.phone?.trim() || "",
      paperSize: body.paperSize || "A5",
      showBarcode: Boolean(body.showBarcode),
      autoPrint: Boolean(body.autoPrint),
    },
  });

  if (Array.isArray(body.extraCharges)) {
    await prisma.extraCharge.deleteMany();
    const rows = body.extraCharges
      .map((charge) => ({
        name: charge.name?.trim() ?? "",
        amount:
          typeof charge.amount === "string"
            ? Number(charge.amount.replace(/\D/g, ""))
            : Math.max(0, Math.round(charge.amount ?? 0)),
      }))
      .filter((charge) => charge.name && charge.amount > 0);

    if (rows.length > 0) {
      await prisma.extraCharge.createMany({ data: rows });
    }
  }

  const extraCharges = await prisma.extraCharge.findMany({
    where: { isActive: true },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ data: { ...settings, extraCharges } });
}
