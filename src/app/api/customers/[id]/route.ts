import { NextResponse } from "next/server";
import {
  CUSTOMER_PHONE_NULLABLE_MESSAGE,
  isCustomerPhoneNullConstraintError,
} from "@/lib/customer-phone-db";
import { getPrisma } from "@/lib/prisma";

function normalizePhone(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.startsWith("84")) return "0" + digits.slice(2);
  return digits;
}

function isValidVietnamPhone(value: string) {
  return /^0(3|5|7|8|9)\d{8}$/.test(normalizePhone(value));
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
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
    return NextResponse.json({ error: "Tên khách hàng là bắt buộc." }, { status: 400 });
  }

  if (phone && !isValidVietnamPhone(phone)) {
    return NextResponse.json(
      { error: "Số điện thoại phải đúng định dạng di động Việt Nam." },
      { status: 400 },
    );
  }

  const prisma = getPrisma();
  const existingCustomer = await prisma.customer.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!existingCustomer) {
    return NextResponse.json({ error: "Không tìm thấy khách hàng." }, { status: 404 });
  }

  const duplicatedCustomer = phone
    ? await prisma.customer.findFirst({
        where: {
          id: { not: id },
          phone,
        },
        select: { id: true },
      })
    : null;

  if (duplicatedCustomer) {
    return NextResponse.json(
      { error: "Số điện thoại này đã tồn tại trong danh sách khách hàng." },
      { status: 409 },
    );
  }

  let customer;
  try {
    customer = await prisma.customer.update({
      where: { id },
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
    throw error;
  }

  return NextResponse.json({
    data: {
      id: customer.id,
      name: customer.name,
      phone: customer.phone ?? "",
      email: customer.email,
      address: customer.address,
    },
  });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const prisma = getPrisma();

  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      orders: {
        select: { id: true },
        take: 1,
      },
    },
  });

  if (!customer) {
    return NextResponse.json({ error: "Không tìm thấy khách hàng." }, { status: 404 });
  }

  if (customer.orders.length > 0) {
    return NextResponse.json(
      { error: "Không thể xóa khách hàng đã có đơn hàng." },
      { status: 400 },
    );
  }

  await prisma.customer.delete({ where: { id } });

  return NextResponse.json({ data: { id } });
}
