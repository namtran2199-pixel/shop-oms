import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const statements = [
  `DROP TABLE IF EXISTS "User" CASCADE`,
  `DROP TABLE IF EXISTS "OrderItem" CASCADE`,
  `DROP TABLE IF EXISTS "Order" CASCADE`,
  `DROP TABLE IF EXISTS "Product" CASCADE`,
  `DROP TABLE IF EXISTS "Customer" CASCADE`,
  `DROP TABLE IF EXISTS "StoreSetting" CASCADE`,
  `DROP TYPE IF EXISTS "UserRole" CASCADE`,
  `DROP TYPE IF EXISTS "OrderStatus" CASCADE`,
  `CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'MANAGER', 'STAFF')`,
  `CREATE TYPE "OrderStatus" AS ENUM ('PAID', 'PROCESSING', 'SHIPPED', 'CANCELLED')`,
  `CREATE TABLE "User" (
    "id" TEXT PRIMARY KEY NOT NULL,
    "username" TEXT NOT NULL UNIQUE,
    "displayName" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'ADMIN',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
  )`,
  `CREATE TABLE "Customer" (
    "id" TEXT PRIMARY KEY NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL UNIQUE,
    "email" TEXT,
    "address" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
  )`,
  `CREATE TABLE "Product" (
    "id" TEXT PRIMARY KEY NOT NULL,
    "name" TEXT NOT NULL,
    "defaultPrice" INTEGER NOT NULL,
    "note" TEXT,
    "icon" TEXT NOT NULL DEFAULT 'Package',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
  )`,
  `CREATE TABLE "Order" (
    "id" TEXT PRIMARY KEY NOT NULL,
    "code" TEXT NOT NULL UNIQUE,
    "customerId" TEXT NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'PROCESSING',
    "subtotal" INTEGER NOT NULL,
    "discount" INTEGER NOT NULL DEFAULT 0,
    "shippingFee" INTEGER NOT NULL DEFAULT 0,
    "tax" INTEGER NOT NULL DEFAULT 0,
    "total" INTEGER NOT NULL,
    "paymentMethod" TEXT,
    "shippingMethod" TEXT,
    "shippingAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Order_customerId_fkey"
      FOREIGN KEY ("customerId") REFERENCES "Customer"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE
  )`,
  `CREATE TABLE "OrderItem" (
    "id" TEXT PRIMARY KEY NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "detail" TEXT,
    "sku" TEXT,
    "quantity" INTEGER NOT NULL,
    "unitPrice" INTEGER NOT NULL,
    CONSTRAINT "OrderItem_orderId_fkey"
      FOREIGN KEY ("orderId") REFERENCES "Order"("id")
      ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "OrderItem_productId_fkey"
      FOREIGN KEY ("productId") REFERENCES "Product"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE
  )`,
  `CREATE TABLE "StoreSetting" (
    "id" TEXT PRIMARY KEY NOT NULL DEFAULT 'default',
    "shopName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "paperSize" TEXT NOT NULL DEFAULT 'A5',
    "showBarcode" BOOLEAN NOT NULL DEFAULT true,
    "autoPrint" BOOLEAN NOT NULL DEFAULT false,
    "shippingUnits" TEXT NOT NULL DEFAULT 'GHTK,GHN,Viettel Post',
    "updatedAt" TIMESTAMP(3) NOT NULL
  )`,
];

async function main() {
  for (const statement of statements) {
    await prisma.$executeRawUnsafe(statement);
  }
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
