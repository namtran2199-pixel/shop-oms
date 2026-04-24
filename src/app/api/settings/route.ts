import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { getStoreSettings } from "@/lib/services";

export async function GET() {
  const settings = await getStoreSettings();
  return NextResponse.json({ data: settings });
}

export async function PUT(request: Request) {
  const body = (await request.json()) as {
    shopName?: string;
    phone?: string;
    paperSize?: string;
    showBarcode?: boolean;
    autoPrint?: boolean;
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

  return NextResponse.json({ data: settings });
}
