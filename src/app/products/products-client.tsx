"use client";

import { Edit, Headphones, Package, Plug, Search, Smartphone, Watch } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button, Card, TableCard } from "@/components/ui";

type ProductRow = {
  id: string;
  name: string;
  price: string;
  note: string;
  icon: string;
};

type ProductsResponse = {
  data: ProductRow[];
  meta: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
};

type ProductCustomerHistoryRow = {
  id: string;
  orderCode: string;
  customerName: string;
  customerPhone: string;
  quantity: number;
  unitPrice: string;
  lineTotal: string;
  date: string;
};

type ProductHistoryResponse = {
  data: ProductCustomerHistoryRow[];
  meta: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
};

const iconMap = { Headphones, Package, Plug, Smartphone, Watch };

function formatCurrencyInput(value: string) {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  return new Intl.NumberFormat("vi-VN").format(Number(digits)) + "đ";
}

export function ProductsClient() {
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [name, setName] = useState("");
  const [defaultPrice, setDefaultPrice] = useState("");
  const [note, setNote] = useState("");
  const [page, setPage] = useState(1);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [selectedHistoryProduct, setSelectedHistoryProduct] = useState<ProductRow | null>(null);
  const [historyRows, setHistoryRows] = useState<ProductCustomerHistoryRow[]>([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyMeta, setHistoryMeta] = useState({
    total: 0,
    page: 1,
    pageSize: 10,
    totalPages: 1,
  });
  const [meta, setMeta] = useState({
    total: 0,
    page: 1,
    pageSize: 5,
    totalPages: 1,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [searchInput]);

  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    params.set("page", String(page));
    params.set("pageSize", "5");
    return params.toString();
  }, [page, search]);

  async function loadProducts(nextQuery = query) {
    setIsLoading(true);
    const response = await fetch(`/api/products${nextQuery ? `?${nextQuery}` : ""}`);
    const payload = (await response.json()) as ProductsResponse;
    setProducts(payload.data);
    setMeta(payload.meta);
    setIsLoading(false);
  }

  useEffect(() => {
    let active = true;

    async function run() {
      setIsLoading(true);
      const response = await fetch(`/api/products${query ? `?${query}` : ""}`);
      const payload = (await response.json()) as ProductsResponse;
      if (active) {
        setProducts(payload.data);
        setMeta(payload.meta);
        setIsLoading(false);
      }
    }

    run().catch(() => {
      if (active) setIsLoading(false);
    });

    return () => {
      active = false;
    };
  }, [query]);

  async function createProduct() {
    const price = Number(defaultPrice.replace(/\D/g, ""));
    const response = await fetch(
      editingProductId ? `/api/products/${editingProductId}` : "/api/products",
      {
        method: editingProductId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, defaultPrice: price, note }),
      },
    );

    if (!response.ok) return;

    resetForm();
    await loadProducts();
  }

  function resetForm() {
    setEditingProductId(null);
    setName("");
    setDefaultPrice("");
    setNote("");
  }

  function startEditProduct(product: ProductRow) {
    setEditingProductId(product.id);
    setName(product.name);
    setDefaultPrice(formatCurrencyInput(product.price));
    setNote(product.note);
  }

  function loadProductHistory(product: ProductRow) {
    setSelectedHistoryProduct(product);
    setHistoryPage(1);
    setHistoryRows([]);
  }

  useEffect(() => {
    if (!selectedHistoryProduct) return;
    const productId = selectedHistoryProduct.id;

    let active = true;

    async function loadHistoryPage() {
      setIsLoadingHistory(true);
      const response = await fetch(
        `/api/products/${productId}/customers?page=${historyPage}&pageSize=10`,
      );
      const payload = (await response.json()) as ProductHistoryResponse;
      if (!active) return;
      setHistoryRows(payload.data);
      setHistoryMeta(payload.meta);
      setIsLoadingHistory(false);
    }

    loadHistoryPage().catch(() => {
      if (!active) return;
      setIsLoadingHistory(false);
    });

    return () => {
      active = false;
    };
  }, [historyPage, selectedHistoryProduct]);

  return (
    <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="min-w-0 space-y-5">
        <div className="relative max-w-md">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-neutral-gray"
            size={20}
          />
          <input
            className="focus-ring h-10 w-full rounded-full border border-soft-border-gray bg-surface-container-lowest pl-10 pr-4 text-[15px]"
            placeholder="Tìm sản phẩm..."
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
          />
        </div>
        <TableCard
          currentPage={meta.page}
          totalPages={meta.totalPages}
          onPrevious={() => setPage((current) => Math.max(1, current - 1))}
          onNext={() => setPage((current) => Math.min(meta.totalPages, current + 1))}
          onPageChange={setPage}
        >
          <table className="w-full min-w-[720px] text-left">
            <thead className="bg-surface-container-low text-xs uppercase tracking-wide text-secondary-neutral-gray">
              <tr>
                <th className="px-6 py-4 font-medium">Tên sản phẩm</th>
                <th className="px-6 py-4 font-medium">Giá mặc định</th>
                <th className="px-6 py-4 font-medium">Ghi chú</th>
                <th className="px-6 py-4 font-medium">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-soft-border-gray">
              {isLoading ? (
                <tr>
                  <td className="px-6 py-8 text-secondary-neutral-gray" colSpan={4}>
                    Đang tải sản phẩm...
                  </td>
                </tr>
              ) : null}
              {products.map((product) => {
                const Icon = iconMap[product.icon as keyof typeof iconMap] ?? Package;
                return (
                  <tr key={product.id} className="bg-white hover:bg-surface-container-low">
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <span className="grid h-10 w-10 place-items-center rounded-lg bg-surface-container text-action-blue">
                          <Icon size={21} />
                        </span>
                        <span className="font-medium">{product.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5 font-semibold">{product.price}</td>
                    <td className="px-6 py-5 text-secondary-neutral-gray">{product.note}</td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <button
                          className="text-sm font-medium text-action-blue hover:underline"
                          onClick={() => loadProductHistory(product)}
                        >
                          Đã bán cho ai
                        </button>
                        <button
                          className="text-secondary-neutral-gray hover:text-action-blue"
                          onClick={() => startEditProduct(product)}
                        >
                          <Edit size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </TableCard>

        {selectedHistoryProduct ? (
          <TableCard
            className="border border-soft-border-gray"
            currentPage={historyMeta.page}
            totalPages={historyMeta.totalPages}
            onPrevious={() => setHistoryPage((current) => Math.max(1, current - 1))}
            onNext={() =>
              setHistoryPage((current) => Math.min(historyMeta.totalPages, current + 1))
            }
            onPageChange={setHistoryPage}
          >
            <div className="flex items-start justify-between gap-3 border-b border-soft-border-gray px-6 py-5">
              <div>
                <h2 className="text-lg font-semibold">
                  Khách đã mua: {selectedHistoryProduct.name}
                </h2>
                <p className="mt-1 text-sm text-secondary-neutral-gray">
                  Danh sách các khách hàng đã mua sản phẩm này theo từng đơn.
                </p>
              </div>
              <button
                className="text-sm font-medium text-secondary-neutral-gray hover:text-near-black-ink"
                onClick={() => {
                  setSelectedHistoryProduct(null);
                  setHistoryRows([]);
                  setHistoryPage(1);
                }}
              >
                Đóng
              </button>
            </div>

            <table className="w-full min-w-[820px] text-left">
              <thead className="bg-surface-container-low text-xs uppercase tracking-wide text-secondary-neutral-gray">
                <tr>
                  <th className="px-6 py-4 font-medium">Khách hàng</th>
                  <th className="px-6 py-4 font-medium">Mã đơn</th>
                  <th className="px-6 py-4 font-medium">Số lượng</th>
                  <th className="px-6 py-4 font-medium">Đơn giá</th>
                  <th className="px-6 py-4 font-medium">Thành tiền</th>
                  <th className="px-6 py-4 font-medium">Thời gian</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-soft-border-gray">
                {isLoadingHistory ? (
                  <tr>
                    <td className="px-6 py-8 text-secondary-neutral-gray" colSpan={6}>
                      Đang tải lịch sử bán...
                    </td>
                  </tr>
                ) : null}

                {!isLoadingHistory && historyRows.length === 0 ? (
                  <tr>
                    <td className="px-6 py-8 text-secondary-neutral-gray" colSpan={6}>
                      Chưa có khách hàng nào mua sản phẩm này.
                    </td>
                  </tr>
                ) : null}

                {!isLoadingHistory &&
                  historyRows.map((row) => (
                    <tr key={row.id} className="bg-white hover:bg-surface-container-low">
                      <td className="px-6 py-5">
                        <div>
                          <p className="font-medium">{row.customerName}</p>
                          <p className="text-sm text-secondary-neutral-gray">{row.customerPhone}</p>
                        </div>
                      </td>
                      <td className="px-6 py-5 font-medium">{row.orderCode}</td>
                      <td className="px-6 py-5">{row.quantity}</td>
                      <td className="px-6 py-5">{row.unitPrice}</td>
                      <td className="px-6 py-5 font-semibold">{row.lineTotal}</td>
                      <td className="px-6 py-5 text-secondary-neutral-gray">{row.date}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </TableCard>
        ) : null}
      </div>
      <Card className="h-fit p-6">
        <div className="mb-6 flex items-center justify-between gap-3">
          <h2 className="text-xl font-semibold">
            {editingProductId ? "Chỉnh sửa sản phẩm" : "Thêm sản phẩm"}
          </h2>
          {editingProductId ? (
            <button
              className="text-sm font-medium text-secondary-neutral-gray hover:text-near-black-ink"
              onClick={resetForm}
            >
              Hủy
            </button>
          ) : null}
        </div>
        <div className="space-y-5">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-on-surface-variant">
              Tên sản phẩm
            </span>
            <input
              className="focus-ring h-11 w-full rounded-full border border-soft-border-gray bg-white px-4"
              placeholder="Nhập tên sản phẩm"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-on-surface-variant">
              Giá mặc định
            </span>
            <input
              className="focus-ring h-11 w-full rounded-full border border-soft-border-gray bg-white px-4"
              placeholder="0đ"
              value={defaultPrice}
              inputMode="numeric"
              onChange={(event) => setDefaultPrice(formatCurrencyInput(event.target.value))}
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-on-surface-variant">
              Ghi chú (không bắt buộc)
            </span>
            <textarea
              className="focus-ring min-h-28 w-full rounded-xl border border-soft-border-gray bg-white px-4 py-3"
              placeholder="Ghi chú sản phẩm"
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
          </label>
          <Button className="w-full" onClick={createProduct}>
            {editingProductId ? "Cập nhật sản phẩm" : "Lưu sản phẩm"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
