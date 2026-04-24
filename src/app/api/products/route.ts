import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/format";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search")?.trim().toLowerCase() ?? "";
  const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);
  const pageSize = Math.min(
    20,
    Math.max(1, Number(searchParams.get("pageSize") ?? "5") || 5),
  );
  const prisma = getPrisma();
  const rows = await prisma.product.findMany({
    where: search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { note: { contains: search, mode: "insensitive" } },
          ],
        }
      : undefined,
    orderBy: { createdAt: "asc" },
  });
  const filtered = rows.map((product) => ({
    id: product.id,
    name: product.name,
    price: formatCurrency(product.defaultPrice),
    note: product.note ?? "",
    icon: product.icon,
  }));

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * pageSize;
  const pagedProducts = filtered.slice(start, start + pageSize);

  return NextResponse.json({
    data: pagedProducts,
    meta: {
      total,
      page: currentPage,
      pageSize,
      totalPages,
    },
  });
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    name?: string;
    defaultPrice?: number;
    note?: string;
  };

  if (!body.name?.trim() || !body.defaultPrice || body.defaultPrice < 0) {
    return NextResponse.json(
      { error: "Tên sản phẩm và giá mặc định là bắt buộc" },
      { status: 400 },
    );
  }

  const prisma = getPrisma();
  const product = await prisma.product.create({
    data: {
      name: body.name.trim(),
      defaultPrice: Math.round(body.defaultPrice),
      note: body.note?.trim() || null,
      icon: "Package",
    },
  });

  return NextResponse.json({ data: product }, { status: 201 });
}
