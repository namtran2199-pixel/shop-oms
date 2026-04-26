import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const defaultCsvPath = "/Users/namtran/Downloads/DATA TỔNG.xlsx - DATA.csv";

type CustomerSeedRow = {
  name: string;
  phone: string;
  address: string | null;
};

function parseCsvLine(line: string) {
  const cells: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const nextChar = line[index + 1];

    if (char === '"' && inQuotes && nextChar === '"') {
      cell += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      cells.push(cell.trim());
      cell = "";
      continue;
    }

    cell += char;
  }

  cells.push(cell.trim());
  return cells;
}

function normalizePhone(value: string) {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("84")) return `0${digits.slice(2)}`;
  return digits;
}

function normalizeName(value: string, phone: string) {
  const name = value.trim().replace(/\s+/g, " ");
  return name || `Khách ${phone}`;
}

function readCustomerSeedRows(csvPath: string) {
  const csvText = fs.readFileSync(csvPath, "utf8").replace(/^\uFEFF/, "");
  const lines = csvText.split(/\r?\n/).filter((line) => line.trim().length > 0);
  const rows = new Map<string, CustomerSeedRow>();
  let skippedWithoutPhone = 0;
  let duplicatePhones = 0;

  for (const line of lines.slice(1)) {
    const [rawPhone = "", rawName = "", rawAddress = ""] = parseCsvLine(line);
    const phone = normalizePhone(rawPhone);
    if (!phone) {
      skippedWithoutPhone += 1;
      continue;
    }

    if (rows.has(phone)) {
      duplicatePhones += 1;
    }

    rows.set(phone, {
      name: normalizeName(rawName, phone),
      phone,
      address: rawAddress.trim() || null,
    });
  }

  return {
    rows: Array.from(rows.values()),
    skippedWithoutPhone,
    duplicatePhones,
    sourceRowCount: Math.max(0, lines.length - 1),
  };
}

async function main() {
  const shouldDryRun = process.argv.includes("--dry-run");
  const csvPathArg = process.argv.find((arg) => !arg.startsWith("--") && arg !== process.argv[0] && arg !== process.argv[1]);
  const csvPath = csvPathArg ?? process.env.CUSTOMER_CSV_PATH ?? defaultCsvPath;
  const resolvedCsvPath = path.resolve(csvPath);

  if (!fs.existsSync(resolvedCsvPath)) {
    throw new Error(`Không tìm thấy file CSV: ${resolvedCsvPath}`);
  }

  const result = readCustomerSeedRows(resolvedCsvPath);
  const customers = result.rows;

  if (shouldDryRun) {
    console.log(`Parsed ${customers.length} customers from ${resolvedCsvPath}`);
    console.log(`Source rows: ${result.sourceRowCount}`);
    console.log(`Skipped without phone: ${result.skippedWithoutPhone}`);
    console.log(`Duplicate phones merged: ${result.duplicatePhones}`);
    return;
  }

  for (const customer of customers) {
    await prisma.customer.upsert({
      where: { phone: customer.phone },
      update: {
        name: customer.name,
        address: customer.address,
      },
      create: {
        name: customer.name,
        phone: customer.phone,
        address: customer.address,
      },
    });
  }

  console.log(`Seeded ${customers.length} customers from ${resolvedCsvPath}`);
  console.log(`Skipped without phone: ${result.skippedWithoutPhone}`);
  console.log(`Duplicate phones merged: ${result.duplicatePhones}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
