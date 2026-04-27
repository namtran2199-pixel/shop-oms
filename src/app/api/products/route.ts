import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/format";

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim();
}

function getInitialSearchText(value: string) {
  return normalizeText(value)
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0])
    .join("");
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search")?.trim() ?? "";
  const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);
  const pageSizeParam = searchParams.get("pageSize") ?? "5";
  const pageSize =
    pageSizeParam === "all"
      ? null
      : Math.min(100, Math.max(1, Number(pageSizeParam) || 5));
  const normalizedSearch = normalizeText(search);
  const prisma = getPrisma();
  const rows = await prisma.product.findMany({
    orderBy: { createdAt: "asc" },
  });
  const filtered = rows
    .filter((product) => {
      if (!normalizedSearch) return true;

      const normalizedName = normalizeText(product.name);
      const normalizedNote = normalizeText(product.note ?? "");
      const initials = getInitialSearchText(product.name);

      return (
        normalizedName.includes(normalizedSearch) ||
        normalizedNote.includes(normalizedSearch) ||
        initials.startsWith(normalizedSearch)
      );
    })
    .map((product) => ({
      id: product.id,
      name: product.name,
      price: formatCurrency(product.defaultPrice),
      note: product.note ?? "",
      icon: product.icon,
    }));

  const total = filtered.length;
  const totalPages = pageSize ? Math.max(1, Math.ceil(total / pageSize)) : 1;
  const currentPage = pageSize ? Math.min(page, totalPages) : 1;
  const start = pageSize ? (currentPage - 1) * pageSize : 0;
  const pagedProducts = pageSize ? filtered.slice(start, start + pageSize) : filtered;

  return NextResponse.json({
    data: pagedProducts,
    meta: {
      total,
      page: currentPage,
      pageSize: pageSize ?? total,
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
