import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import {
  CUSTOMER_PHONE_NULLABLE_MESSAGE,
  isCustomerPhoneNullConstraintError,
} from "@/lib/customer-phone-db";
import { getPrisma } from "@/lib/prisma";
import { getCustomerDetail, getCustomers } from "@/lib/services";

function normalizePhone(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.startsWith("84")) return "0" + digits.slice(2);
  return digits;
}

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();
}

function getInitialSearchText(value: string) {
  return normalizeText(value)
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0])
    .join("");
}

function isValidVietnamPhone(value: string) {
  return /^0(3|5|7|8|9)\d{8}$/.test(normalizePhone(value));
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const selectedId = searchParams.get("selectedId") ?? undefined;
  const search = searchParams.get("search")?.trim().toLowerCase() ?? "";
  const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);
  const pageSize = Math.min(
    20,
    Math.max(1, Number(searchParams.get("pageSize") ?? "5") || 5),
  );
  const searchPhone = normalizePhone(search);
  const searchText = normalizeText(search);
  const customers = await getCustomers();
  const filtered = search
    ? customers.filter(
        (customer) => {
          const normalizedName = normalizeText(customer.name);
          const initials = getInitialSearchText(customer.name);
          const matchesName =
            searchText.length > 0 &&
            (normalizedName.includes(searchText) || initials.startsWith(searchText));
          const matchesPhone =
            searchPhone.length > 0 && normalizePhone(customer.phone).includes(searchPhone);

          return matchesName || matchesPhone;
        },
      )
    : customers;

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * pageSize;
  const pagedCustomers = filtered.slice(start, start + pageSize);

  const selectedCustomerId = filtered.some((customer) => customer.id === selectedId)
    ? selectedId
    : filtered[0]?.id;
  const selectedCustomer = selectedCustomerId
    ? await getCustomerDetail(selectedCustomerId)
    : null;

  return NextResponse.json({
    data: {
      customers: pagedCustomers,
      selectedCustomer,
      meta: {
        total,
        page: currentPage,
        pageSize,
        totalPages,
      },
    },
  });
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    name?: string;
    phone?: string;
    email?: string;
    address?: string;
  };

  const name = body.name?.trim() ?? "";
  const phone = normalizePhone(body.phone ?? "");
  const email = body.email?.trim() || null;
  const address = body.address?.trim() || null;

  if (!name) {
    return NextResponse.json(
      { error: "Tên khách hàng là bắt buộc." },
      { status: 400 },
    );
  }

  if (phone && !isValidVietnamPhone(phone)) {
    return NextResponse.json(
      { error: "Số điện thoại phải đúng định dạng di động Việt Nam." },
      { status: 400 },
    );
  }

  const prisma = getPrisma();
  const existingCustomers = await prisma.customer.findMany({
    select: { id: true, phone: true },
  });
  const duplicatedCustomer = phone
    ? existingCustomers.find((customer) => normalizePhone(customer.phone ?? "") === phone)
    : null;

  if (duplicatedCustomer) {
    return NextResponse.json(
      { error: "Số điện thoại này đã tồn tại trong danh sách khách hàng." },
      { status: 409 },
    );
  }

  let customer;
  try {
    customer = await prisma.customer.create({
      data: {
        name,
        phone: phone || null,
        email,
        address,
      },
    });
  } catch (error) {
    if (isCustomerPhoneNullConstraintError(error)) {
      return NextResponse.json(
        { error: CUSTOMER_PHONE_NULLABLE_MESSAGE },
        { status: 500 },
      );
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      throw error;
    }

    throw error;
  }

  return NextResponse.json(
    {
      data: {
        id: customer.id,
        name: customer.name,
        phone: customer.phone ?? "",
        email: customer.email,
        address: customer.address,
      },
    },
    { status: 201 },
  );
}
