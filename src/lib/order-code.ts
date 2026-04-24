function pad2(value: number) {
  return String(value).padStart(2, "0");
}

function pad4(value: number) {
  return String(value).padStart(4, "0");
}

export function buildOrderCode(date: Date, sequence: number) {
  const month = pad2(date.getMonth() + 1);
  const day = pad2(date.getDate());
  const year = pad2(date.getFullYear() % 100);

  return `ORD-${month}${day}${year}-${pad4(sequence)}`;
}
