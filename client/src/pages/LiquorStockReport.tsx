import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useStoreAuth } from "@/hooks/useStoreAuth";
import {
  ArrowDownToLine,
  ArrowLeft,
  ArrowUpFromLine,
  ClipboardList,
  Edit3,
  Package,
  Plus,
  Search,
  Settings,
  SlidersHorizontal,
} from "lucide-react";

type MovementType = "IN" | "OUT" | "ADJUST";

type EntryRow = {
  liquorItemId: number | "";
  quantity: string;
  memo: string;
  itemSearch: string;
};

const CATEGORY_ORDER = ["위스키", "리큐르", "맥주", "기타"];
const LIQUEUR_NAMES = new Set([
  "바톤 보드카",
  "바톤 진",
  "럼",
  "미도리",
  "메론 리큐르",
  "피치 리큐르",
  "아마레토",
  "얼그레이 시럽",
  "그레나딘",
  "모히토 시럽",
  "자몽시럽",
  "청포도 시럽",
  "청포도시럽",
  "수박시럽",
  "앙고스투라",
  "마티니 드라이",
  "드럼부이",
  "말리부",
  "몬테주마 (데킬라)",
  "몬테주마",
  "깔루아",
  "베일리스",
  "트리플섹",
  "바나나 리큐르",
  "블루큐라소",
  "라임주스",
  "피나믹스",
]);
const BEER_NAMES = new Set([
  "카프리",
  "호가든",
  "하이네켄",
  "코로나",
  "기네스",
  "생맥주 1통",
]);
const categoryOf = (item: any): string => {
  const name = String(item?.name ?? "").trim();
  const category = String(item?.category ?? "").trim();
  if (BEER_NAMES.has(name) || category.includes("맥주")) return "맥주";
  if (
    LIQUEUR_NAMES.has(name) ||
    category.includes("리큐르") ||
    category.includes("시럽") ||
    category.includes("진") ||
    category.includes("보드카")
  )
    return "리큐르";
  if (category) return category;
  return "위스키";
};
const groupItemsByCategory = (list: any[]) => {
  const grouped: Record<string, any[]> = {};
  for (const item of list) {
    const cat = categoryOf(item);
    (grouped[cat] ||= []).push(item);
  }
  return Object.entries(grouped).sort(([a], [b]) => {
    const ai = CATEGORY_ORDER.indexOf(a);
    const bi = CATEGORY_ORDER.indexOf(b);
    return (
      (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi) || a.localeCompare(b, "ko")
    );
  });
};

const todayString = () => new Date().toISOString().slice(0, 10);
const won = (n: number) => `₩${Math.round(n || 0).toLocaleString("ko-KR")}`;
const qty = (n: number) =>
  Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/\.00$/, "");

function getQueryParam(name: string) {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get(name);
}

export default function LiquorStockReport() {
  const [, navigate] = useLocation();
  const { user, loading } = useStoreAuth();
  const utils = trpc.useUtils();
  const initialBranch = getQueryParam("branchId");
  const initialDate =
    getQueryParam("date") ||
    localStorage.getItem("selectedDate") ||
    todayString();

  const [date, setDate] = useState(initialDate);
  const [selectedBranchId, setSelectedBranchId] = useState<number | undefined>(
    initialBranch ? Number(initialBranch) : undefined,
  );
  const [tab, setTab] = useState<"home" | "items" | "history" | "admin">(
    "home",
  );
  const [search, setSearch] = useState("");
  const [movementType, setMovementType] = useState<MovementType>("OUT");
  const [entryRows, setEntryRows] = useState<EntryRow[]>([
    { liquorItemId: "", quantity: "", memo: "", itemSearch: "" },
  ]);
  const [newItem, setNewItem] = useState({
    name: "",
    category: "위스키",
    unitCost: "",
  });
  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  const [stockEdit, setStockEdit] = useState<{
    itemId: number;
    value: string;
  } | null>(null);

  const isAdmin = user?.role === "admin";
  const effectiveBranchId = isAdmin
    ? selectedBranchId
    : (user?.branchId ?? undefined);

  const overview = trpc.liquor.overview.useQuery(
    { date, branchId: effectiveBranchId, includeInactive: isAdmin },
    { enabled: !!user },
  );
  const upsertItem = trpc.liquor.upsertItem.useMutation({
    onSuccess: () => {
      utils.liquor.overview.invalidate();
      setNewItem({ name: "", category: "위스키", unitCost: "" });
      setEditingItemId(null);
      toast.success("주류 품목이 저장되었습니다");
    },
    onError: (e) => toast.error(e.message),
  });
  const recordMovement = trpc.liquor.recordMovement.useMutation({
    onSuccess: () => {
      utils.liquor.overview.invalidate();
      setEntryRows([
        { liquorItemId: "", quantity: "", memo: "", itemSearch: "" },
      ]);
      toast.success(
        `${movementType === "OUT" ? "출고" : movementType === "IN" ? "입고" : "조정"} 저장 완료`,
      );
    },
    onError: (e) => toast.error(e.message),
  });
  const setStock = trpc.liquor.setStock.useMutation({
    onSuccess: () => {
      utils.liquor.overview.invalidate();
      setStockEdit(null);
      toast.success("현재 재고가 수정되었습니다");
    },
    onError: (e) => toast.error(e.message),
  });

  const data = overview.data;
  const branches = data?.branches ?? [];
  const items = data?.items ?? [];
  const inventories = data?.inventories ?? [];
  const movements = data?.movements ?? [];
  const selectedBranch =
    branches.find((b) => b.id === effectiveBranchId) ?? branches[0];

  const stockByItem = useMemo(() => {
    const map = new Map<number, number>();
    for (const inv of inventories) {
      map.set(inv.liquorItemId, Number(inv.currentStock || 0));
    }
    return map;
  }, [inventories]);

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter(
      (item) =>
        !q ||
        item.name.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q),
    );
  }, [items, search]);

  const groupedFilteredItems = useMemo(
    () => groupItemsByCategory(filteredItems),
    [filteredItems],
  );
  const groupedAllItems = useMemo(() => groupItemsByCategory(items), [items]);

  const getEntryMatches = (query: string) => {
    const q = query.trim().toLowerCase();
    const matched = q
      ? items.filter(
          (item) =>
            String(item.name).toLowerCase().includes(q) ||
            String(item.category).toLowerCase().includes(q),
        )
      : items;
    return groupItemsByCategory(matched).map(
      ([category, categoryItems]) =>
        [category, categoryItems.slice(0, 8)] as [string, any[]],
    );
  };

  const selectedItemName = (id: number | "") => {
    if (!id) return "";
    return items.find((item) => item.id === Number(id))?.name ?? "";
  };

  if (loading || overview.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500">
        주류 재고 불러오는 중...
      </div>
    );
  }
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        로그인이 필요합니다
      </div>
    );
  }

  const addEntryRow = () =>
    setEntryRows((prev) => [
      ...prev,
      { liquorItemId: "", quantity: "", memo: "", itemSearch: "" },
    ]);
  const updateEntryRow = (idx: number, patch: Partial<EntryRow>) =>
    setEntryRows((prev) =>
      prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)),
    );
  const submitMovement = () => {
    const branchId = effectiveBranchId ?? branches[0]?.id;
    if (!branchId) return toast.error("지점을 선택해주세요");
    const rows = entryRows
      .filter((r) => r.liquorItemId && Number(r.quantity) !== 0)
      .map((r) => ({
        liquorItemId: Number(r.liquorItemId),
        quantity: Number(r.quantity),
        memo: r.memo || undefined,
      }));
    if (rows.length === 0)
      return toast.error("출고/입고 품목과 수량을 입력해주세요");
    recordMovement.mutate({ branchId, date, type: movementType, items: rows });
  };

  const saveItem = () => {
    if (!newItem.name.trim()) return toast.error("주류명을 입력해주세요");
    upsertItem.mutate({
      id: editingItemId || undefined,
      name: newItem.name.trim(),
      category: newItem.category.trim() || "기타",
      unitCost: Number(newItem.unitCost || 0),
      isActive: true,
    });
  };

  const outMovements = movements.filter((m) => m.type === "OUT");
  const inMovements = movements.filter((m) => m.type === "IN");
  const totalStock = data?.totals.stock ?? 0;
  const totalOutQty = data?.totals.outQty ?? 0;
  const totalInQty = data?.totals.inQty ?? 0;
  const totalOutCost = data?.totals.outCost ?? 0;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950 pb-24">
      <div className="sticky top-0 z-20 bg-white border-b border-slate-200">
        <div className="flex items-center justify-between px-4 h-14">
          <button
            onClick={() => navigate("/")}
            className="p-2 -ml-2 rounded-full hover:bg-slate-100"
          >
            <ArrowLeft size={22} />
          </button>
          <div className="font-bold text-lg">주류 출고현황</div>
          <button
            onClick={() => setTab(isAdmin ? "admin" : "items")}
            className="p-2 -mr-2 rounded-full hover:bg-slate-100"
          >
            <Settings size={22} />
          </button>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-4 max-w-3xl mx-auto">
        <div className="flex gap-2">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="flex-1 h-11 px-3 rounded-xl bg-white border border-slate-200 font-semibold"
          />
          {isAdmin && (
            <select
              value={effectiveBranchId ?? ""}
              onChange={(e) =>
                setSelectedBranchId(
                  e.target.value ? Number(e.target.value) : undefined,
                )
              }
              className="flex-1 h-11 px-3 rounded-xl bg-white border border-slate-200 font-semibold"
            >
              <option value="">전체 지점</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          )}
        </div>

        <div
          className="rounded-2xl p-5 text-white shadow-lg"
          style={{ background: "linear-gradient(135deg, #4f63ff, #5877ff)" }}
        >
          <div className="flex items-center gap-2 text-lg font-bold">
            <span>{selectedBranch?.name ?? "전체"}</span>
            <span className="opacity-60">{date}</span>
          </div>
          <div
            className={`grid ${isAdmin ? "grid-cols-4" : "grid-cols-3"} gap-2 mt-6 text-center`}
          >
            <div>
              <div className="text-2xl font-bold">{qty(totalStock)}</div>
              <div className="text-xs opacity-75 mt-1">총 재고</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{qty(totalInQty)}</div>
              <div className="text-xs opacity-75 mt-1">입고</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{qty(totalOutQty)}</div>
              <div className="text-xs opacity-75 mt-1">출고</div>
            </div>
            {isAdmin && (
              <div>
                <div className="text-base font-bold mt-1">
                  {won(totalOutCost)}
                </div>
                <div className="text-xs opacity-75 mt-1">출고원가</div>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-4 bg-white rounded-2xl p-1 shadow-sm border border-slate-100">
          {[
            ["home", "홈"],
            ["items", "제품"],
            ["history", "히스토리"],
            ["admin", isAdmin ? "관리" : "재고"],
          ].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key as any)}
              className={`h-10 rounded-xl text-sm font-bold ${tab === key ? "bg-blue-600 text-white" : "text-slate-500"}`}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === "home" && (
          <>
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
              <div className="flex items-center gap-2 mb-3">
                <Search size={19} className="text-slate-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="제품 검색"
                  className="flex-1 outline-none text-base"
                />
              </div>
              <div className="max-h-72 overflow-y-auto space-y-4">
                {groupedFilteredItems.map(([category, categoryItems]) => (
                  <div key={category}>
                    <div className="sticky top-0 bg-white/95 py-2 text-sm font-black text-slate-700 border-b border-slate-100">
                      {category}
                    </div>
                    <div className="divide-y divide-slate-100">
                      {categoryItems.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between py-3"
                        >
                          <div>
                            <div className="font-semibold">{item.name}</div>
                            <div className="text-xs text-slate-500">
                              {categoryOf(item)}
                              {isAdmin
                                ? ` · ${won(Number(item.unitCost || 0))}`
                                : ""}
                            </div>
                          </div>
                          <div className="text-xl font-bold text-blue-600">
                            {qty(stockByItem.get(item.id) ?? 0)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
              <div className="text-xl font-black mb-4">입고 / 출고</div>
              <div className="grid grid-cols-3 gap-2 mb-4">
                <button
                  onClick={() => setMovementType("IN")}
                  className={`h-11 rounded-xl font-bold bg-transparent flex items-center justify-center gap-1.5 ${movementType === "IN" ? "text-blue-700 underline underline-offset-4" : "text-slate-700"}`}
                >
                  <ArrowDownToLine size={17} />
                  <span>입고</span>
                </button>
                <button
                  onClick={() => setMovementType("OUT")}
                  className={`h-11 rounded-xl font-bold bg-transparent flex items-center justify-center gap-1.5 ${movementType === "OUT" ? "text-red-700 underline underline-offset-4" : "text-slate-700"}`}
                >
                  <ArrowUpFromLine size={17} />
                  <span>출고</span>
                </button>
                <button
                  onClick={() => setMovementType("ADJUST")}
                  className={`h-11 rounded-xl font-bold bg-transparent flex items-center justify-center gap-1.5 ${movementType === "ADJUST" ? "text-emerald-700 underline underline-offset-4" : "text-slate-700"}`}
                >
                  <SlidersHorizontal size={17} />
                  <span>조정</span>
                </button>
              </div>
              <div className="space-y-3">
                {entryRows.map((row, idx) => {
                  const entryMatches = getEntryMatches(row.itemSearch);
                  const chosenName = selectedItemName(row.liquorItemId);
                  return (
                    <div
                      key={idx}
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-3"
                    >
                      <div className="grid grid-cols-[1fr_74px] gap-2">
                        <div className="relative">
                          <input
                            value={row.itemSearch || chosenName}
                            onChange={(e) =>
                              updateEntryRow(idx, {
                                itemSearch: e.target.value,
                                liquorItemId: "",
                              })
                            }
                            onFocus={() => {
                              if (!row.itemSearch && chosenName)
                                updateEntryRow(idx, { itemSearch: chosenName });
                            }}
                            placeholder="주류명 검색 (예: 글렌, 카프리)"
                            className="w-full h-11 px-3 rounded-xl border border-slate-200 bg-white min-w-0 outline-none focus:ring-2 focus:ring-blue-100"
                          />
                        </div>
                        <input
                          value={row.quantity}
                          onChange={(e) =>
                            updateEntryRow(idx, {
                              quantity: e.target.value.replace(/[^0-9.-]/g, ""),
                            })
                          }
                          placeholder="수량"
                          className="h-11 px-3 rounded-xl border border-slate-200 text-right bg-white"
                        />
                      </div>
                      {(row.itemSearch || !row.liquorItemId) && (
                        <div className="mt-2 max-h-56 overflow-y-auto rounded-xl border border-slate-100 bg-white">
                          {entryMatches.length === 0 && (
                            <div className="px-3 py-3 text-sm text-slate-400">
                              검색 결과 없음
                            </div>
                          )}
                          {entryMatches.map(([category, categoryItems]) => (
                            <div key={category}>
                              <div className="px-3 py-2 text-xs font-black text-slate-500 bg-slate-50">
                                {category}
                              </div>
                              {categoryItems.map((item) => (
                                <button
                                  key={item.id}
                                  type="button"
                                  onClick={() =>
                                    updateEntryRow(idx, {
                                      liquorItemId: item.id,
                                      itemSearch: item.name,
                                    })
                                  }
                                  className={`w-full text-left px-3 py-2 border-t border-slate-50 ${row.liquorItemId === item.id ? "bg-blue-50 text-blue-700 font-black" : "hover:bg-slate-50"}`}
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="truncate">
                                      {item.name}
                                    </span>
                                    <span className="text-xs text-slate-400 shrink-0">
                                      재고 {qty(stockByItem.get(item.id) ?? 0)}
                                    </span>
                                  </div>
                                </button>
                              ))}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={addEntryRow}
                  className="flex-1 h-11 rounded-xl bg-slate-100 font-bold"
                >
                  <Plus className="inline mr-1" size={17} />
                  품목 추가
                </button>
                <button
                  disabled={recordMovement.isPending}
                  onClick={submitMovement}
                  className="flex-1 h-11 rounded-xl bg-blue-600 text-white font-bold"
                >
                  저장
                </button>
              </div>
            </div>

            <BranchOutDetails movements={outMovements} isAdmin={isAdmin} />
          </>
        )}

        {tab === "items" && (
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <div className="text-xl font-black">제품 목록</div>
              <div className="text-sm text-slate-500">{items.length}개</div>
            </div>
            <div className="flex items-center gap-2 mb-3 bg-slate-100 rounded-xl px-3 h-11">
              <Search size={18} className="text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="제품 이름, 카테고리 검색"
                className="bg-transparent outline-none flex-1"
              />
            </div>
            <div className="space-y-5">
              {groupedFilteredItems.map(([category, categoryItems]) => (
                <div key={category}>
                  <div className="text-base font-black text-slate-800 mb-2 px-1">
                    {category}
                  </div>
                  <div className="divide-y divide-slate-100 rounded-xl border border-slate-100 overflow-hidden">
                    {categoryItems.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between py-4 px-2 bg-white"
                      >
                        <div>
                          <div className="font-bold">{item.name}</div>
                          <div className="text-xs text-slate-500">
                            {isAdmin
                              ? `${won(Number(item.unitCost || 0))} · `
                              : ""}
                            {categoryOf(item)}
                          </div>
                        </div>
                        <div className="text-2xl font-bold text-blue-600">
                          {qty(stockByItem.get(item.id) ?? 0)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "history" && (
          <HistoryList movements={movements} isAdmin={isAdmin} />
        )}

        {tab === "admin" && (
          <div className="space-y-4">
            {isAdmin && (
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
                <div className="text-xl font-black mb-3">
                  주류 등록 / 단가 수정
                </div>
                <input
                  value={newItem.name}
                  onChange={(e) =>
                    setNewItem((v) => ({ ...v, name: e.target.value }))
                  }
                  placeholder="주류명"
                  className="w-full h-11 px-3 mb-2 rounded-xl border border-slate-200"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    value={newItem.category}
                    onChange={(e) =>
                      setNewItem((v) => ({ ...v, category: e.target.value }))
                    }
                    placeholder="카테고리"
                    className="h-11 px-3 rounded-xl border border-slate-200"
                  />
                  <input
                    value={newItem.unitCost}
                    onChange={(e) =>
                      setNewItem((v) => ({
                        ...v,
                        unitCost: e.target.value.replace(/[^0-9]/g, ""),
                      }))
                    }
                    placeholder="단가"
                    className="h-11 px-3 rounded-xl border border-slate-200 text-right"
                  />
                </div>
                <button
                  onClick={saveItem}
                  disabled={upsertItem.isPending}
                  className="w-full h-11 mt-3 rounded-xl bg-blue-600 text-white font-bold"
                >
                  {editingItemId ? "수정 저장" : "제품 등록"}
                </button>
              </div>
            )}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
              <div className="text-xl font-black mb-3">현재 재고 보정</div>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {groupedFilteredItems.map(([category, categoryItems]) => (
                  <div key={category}>
                    <div className="text-sm font-black text-slate-700 mb-1">
                      {category}
                    </div>
                    <div className="divide-y divide-slate-100">
                      {categoryItems.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center gap-2 py-2 border-b border-slate-100"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="font-bold truncate">
                              {item.name}
                            </div>
                            <div className="text-xs text-slate-500">
                              {categoryOf(item)}
                              {isAdmin
                                ? ` · ${won(Number(item.unitCost || 0))}`
                                : ""}
                            </div>
                          </div>
                          {isAdmin ? (
                            <input
                              value={
                                stockEdit?.itemId === item.id && stockEdit
                                  ? stockEdit.value
                                  : String(stockByItem.get(item.id) ?? 0)
                              }
                              onChange={(e) =>
                                setStockEdit({
                                  itemId: item.id,
                                  value: e.target.value.replace(
                                    /[^0-9.-]/g,
                                    "",
                                  ),
                                })
                              }
                              className="w-20 h-10 rounded-xl border border-slate-200 text-right px-2"
                            />
                          ) : (
                            <div className="w-20 text-right text-xl font-bold text-blue-600">
                              {qty(stockByItem.get(item.id) ?? 0)}
                            </div>
                          )}
                          {isAdmin && (
                            <button
                              onClick={() => {
                                const branchId =
                                  effectiveBranchId ?? branches[0]?.id;
                                if (!branchId)
                                  return toast.error("지점 선택 필요");
                                setStock.mutate({
                                  branchId,
                                  liquorItemId: item.id,
                                  currentStock: Number(
                                    stockEdit?.itemId === item.id && stockEdit
                                      ? stockEdit.value
                                      : (stockByItem.get(item.id) ?? 0),
                                  ),
                                })
                              }}
                              className="h-10 px-3 rounded-xl bg-slate-900 text-white text-sm"
                            >
                              저장
                            </button>
                          )}
                          {isAdmin && (
                            <button
                              onClick={() => {
                                setEditingItemId(item.id);
                                setNewItem({
                                  name: item.name,
                                  category: categoryOf(item),
                                  unitCost: String(item.unitCost || 0),
                                });
                                window.scrollTo({ top: 0, behavior: "smooth" });
                              }}
                              className="h-10 px-2 rounded-xl bg-slate-100"
                            >
                              <Edit3 size={16} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function BranchOutDetails({
  movements,
  isAdmin,
}: {
  movements: any[];
  isAdmin: boolean;
}) {
  if (!movements || movements.length === 0) return null;
  const grouped = movements.reduce<Record<string, any[]>>((acc, m) => {
    const key = m.branchName || "지점";
    (acc[key] ||= []).push(m);
    return acc;
  }, {});
  const branchNames = Object.keys(grouped).sort();

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
      <div className="text-xl font-black mb-3">지점별 출고 내역</div>
      <div className="space-y-5">
        {branchNames.map((branchName) => {
          const rows = grouped[branchName];
          const totalQty = rows.reduce(
            (sum, m) => sum + Math.abs(Number(m.quantity || 0)),
            0,
          );
          const totalCost = rows.reduce(
            (sum, m) => sum + Number(m.totalCost || 0),
            0,
          );
          return (
            <div
              key={branchName}
              className="border-t border-slate-100 pt-3 first:border-t-0 first:pt-0"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="font-black">{branchName}</div>
                <div className="text-sm text-slate-500">
                  총 {qty(totalQty)}병
                </div>
              </div>
              <div className="space-y-2">
                {rows.map((m, idx) => (
                  <div
                    key={`${m.id ?? idx}-${idx}`}
                    className="flex items-center justify-between text-sm"
                  >
                    <div className="min-w-0 pr-3">
                      <div className="font-semibold truncate">{m.itemName}</div>
                      {m.memo && (
                        <div className="text-xs text-slate-400 truncate">
                          {m.memo}
                        </div>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-black text-red-500">
                        -{qty(Math.abs(Number(m.quantity || 0)))}병
                      </div>
                      {isAdmin && (
                        <div className="text-xs text-slate-500">
                          {won(Number(m.totalCost || 0))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {isAdmin && (
                <div className="mt-3 pt-2 border-t border-slate-100 flex justify-between text-sm">
                  <span className="text-slate-500">출고 원가 합계</span>
                  <span className="font-black">{won(totalCost)}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function HistoryList({
  movements,
  isAdmin,
}: {
  movements: any[];
  isAdmin: boolean;
}) {
  const grouped = movements.reduce<Record<string, any[]>>((acc, m) => {
    (acc[m.date] ||= []).push(m);
    return acc;
  }, {});
  const dates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));
  if (dates.length === 0)
    return (
      <div className="bg-white rounded-2xl p-8 text-center text-slate-500">
        선택한 날짜의 입고/출고 내역이 없습니다
      </div>
    );
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
      <div className="flex items-center gap-2 text-xl font-black mb-4">
        <ClipboardList size={22} />
        히스토리
      </div>
      {dates.map((date) => (
        <div key={date} className="mb-6">
          <div className="text-slate-500 font-semibold mb-3">{date}</div>
          <div className="space-y-3">
            {grouped[date].map((m) => (
              <div key={m.id} className="flex items-center justify-between">
                <div className="flex items-start gap-3">
                  <div
                    className={`mt-1 ${m.type === "OUT" ? "text-red-500" : m.type === "IN" ? "text-blue-500" : "text-emerald-500"}`}
                  >
                    {m.type === "OUT" ? (
                      <ArrowUpFromLine size={20} />
                    ) : m.type === "IN" ? (
                      <ArrowDownToLine size={20} />
                    ) : (
                      <SlidersHorizontal size={20} />
                    )}
                  </div>
                  <div>
                    <div className="font-black">
                      {m.type === "OUT"
                        ? "출고"
                        : m.type === "IN"
                          ? "입고"
                          : "조정"}
                    </div>
                    <div className="text-sm text-slate-500">{m.itemName}</div>
                    <div className="text-xs text-slate-400">
                      {m.branchName}
                      {isAdmin ? ` · ${won(Number(m.totalCost || 0))}` : ""}
                    </div>
                  </div>
                </div>
                <div
                  className={`font-black ${m.type === "OUT" ? "text-red-500" : "text-blue-500"}`}
                >
                  {m.quantity > 0 ? "+" : ""}
                  {qty(Number(m.quantity || 0))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
