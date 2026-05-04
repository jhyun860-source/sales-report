import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useStoreAuth } from "@/hooks/useStoreAuth";
import { canEditLiquor, getAccountBranchLabel, isStaffLiquorOnly } from "@/lib/accountAccess";
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
  Trash2,
  LogOut,
  X,
} from "lucide-react";

type MovementType = "IN" | "OUT" | "ADJUST";
type CartRow = { liquorItemId: number; quantity: number; memo?: string };

const CATEGORY_ORDER = ["위스키", "샴페인", "리큐르", "맥주"] as const;
type LiquorCategory = (typeof CATEGORY_ORDER)[number];

const LIQUEUR_NAMES = new Set([
  "바톤 보드카", "바톤 진", "럼", "미도리", "메론 리큐르", "피치 리큐르", "아마레토",
  "얼그레이 시럽", "그레나딘", "모히토 시럽", "자몽시럽", "자몽 시럽", "청포도 시럽", "청포도시럽",
  "수박시럽", "수박 시럽", "앙고스투라", "마티니 드라이", "드럼부이", "말리부", "몬테주마 (데킬라)",
  "몬테주마", "깔루아", "베일리스", "트리플섹", "바나나 리큐르", "블루큐라소", "라임주스", "피나믹스",
]);
const BEER_NAMES = new Set(["카프리", "호가든", "하이네켄", "코로나", "기네스", "생맥주 1통"]);
const CHAMPAGNE_NAMES = new Set([
  "모엣샹동", "모엣샹동 로제", "모엣샹동 메그넘",
  "돔페리뇽", "돔페리뇽 빈티지", "멈 그랑꼬르동", "멈 그랑꼬르동 로제", "아르망디",
]);

const todayString = () => new Date().toISOString().slice(0, 10);
const won = (n: number) => `₩${Math.round(n || 0).toLocaleString("ko-KR")}`;
const qty = (n: number) => Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/\.00$/, "");

function getQueryParam(name: string) {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get(name);
}

function categoryOf(item: any): LiquorCategory {
  const name = String(item?.name ?? "").trim();
  const category = String(item?.category ?? "").trim();
  if (BEER_NAMES.has(name) || category.includes("맥주")) return "맥주";
  if (CHAMPAGNE_NAMES.has(name) || category.includes("샴페인")) return "샴페인";
  if (
    LIQUEUR_NAMES.has(name) || category.includes("리큐르") || category.includes("시럽") ||
    category.includes("진") || category.includes("보드카")
  ) return "리큐르";
  return "위스키";
}

export default function LiquorStockReport() {
  const [, navigate] = useLocation();
  const { user, loading, logout } = useStoreAuth();
  const utils = trpc.useUtils();
  const initialBranch = getQueryParam("branchId");
  const initialDate = getQueryParam("date") || localStorage.getItem("selectedDate") || todayString();

  const [date, setDate] = useState(initialDate);
  const [selectedBranchId, setSelectedBranchId] = useState<number | undefined>(initialBranch ? Number(initialBranch) : undefined);
  const [tab, setTab] = useState<"home" | "items" | "history" | "admin">("home");
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<LiquorCategory>("위스키");
  const [sortMode, setSortMode] = useState<"stockDesc" | "stockAsc" | "nameAsc" | "nameDesc">("stockDesc");
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [productEditorOpen, setProductEditorOpen] = useState(false);
  const [newItem, setNewItem] = useState({ name: "", category: "위스키", unitCost: "", initialStock: "" });
  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  const [stockEdit, setStockEdit] = useState<{ itemId: number; value: string } | null>(null);

  const [actionMode, setActionMode] = useState<MovementType | null>(null);
  const [actionSearch, setActionSearch] = useState("");
  const [actionCategory, setActionCategory] = useState<LiquorCategory>("위스키");
  const [cart, setCart] = useState<CartRow[]>([]);
  const [actionMemo, setActionMemo] = useState("");

  const [historyStart, setHistoryStart] = useState("2000-01-01");
  const [historyEnd, setHistoryEnd] = useState(todayString());
  const [historySearch, setHistorySearch] = useState("");
  const [historyType, setHistoryType] = useState<"ALL" | MovementType>("ALL");
  const [editingMovement, setEditingMovement] = useState<any | null>(null);

  const isAdmin = user?.role === "admin";
  const isStaffOnly = isStaffLiquorOnly(user?.loginId);
  const canModifyLiquor = canEditLiquor(user?.loginId, user?.role);
  const effectiveBranchId = isAdmin ? selectedBranchId : (user?.branchId ?? undefined);

  const handleStaffLogout = () => {
    // 서버 쿠키 로그아웃 + 프론트에 남아 있을 수 있는 지점/계정 캐시를 같이 제거
    try {
      localStorage.removeItem("store_token");
      localStorage.removeItem("currentUser");
      localStorage.removeItem("user");
      localStorage.removeItem("auth");
      localStorage.removeItem("role");
      localStorage.removeItem("branch");
      localStorage.removeItem("branchCode");
      sessionStorage.clear();
    } catch {}
    logout();
    navigate("/login");
  };

  const overview = trpc.liquor.overview.useQuery(
    { date, branchId: effectiveBranchId, includeInactive: false },
    { enabled: !!user, retry: false },
  );

  const historyQuery = trpc.liquor.history.useQuery(
    { startDate: historyStart, endDate: historyEnd, branchId: effectiveBranchId, keyword: historySearch.trim() || undefined, type: historyType === "ALL" ? undefined : historyType },
    { enabled: !!user && tab === "history", retry: false },
  );

  const upsertItem = trpc.liquor.upsertItem.useMutation({
    onSuccess: () => {
      utils.liquor.overview.invalidate();
      utils.liquor.history.invalidate();
      setNewItem({ name: "", category: "위스키", unitCost: "", initialStock: "" });
      setEditingItemId(null);
      setProductEditorOpen(false);
      toast.success("주류 품목이 저장되었습니다");
    },
    onError: (e) => toast.error(e.message),
  });

  const recordMovement = trpc.liquor.recordMovement.useMutation({
    onSuccess: () => {
      utils.liquor.overview.invalidate();
      utils.liquor.history.invalidate();
      setCart([]);
      setActionMemo("");
      setActionSearch("");
      setActionMode(null);
      toast.success("입고/출고 내역이 저장되었습니다");
    },
    onError: (e) => toast.error(e.message),
  });

  const setStock = trpc.liquor.setStock.useMutation({
    onSuccess: () => {
      utils.liquor.overview.invalidate();
      utils.liquor.history.invalidate();
      setStockEdit(null);
      toast.success("현재 재고가 수정되었습니다");
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteItem = trpc.liquor.deleteItem.useMutation({
    onSuccess: () => {
      utils.liquor.overview.invalidate();
      utils.liquor.history.invalidate();
      setSelectedItem(null);
      setProductEditorOpen(false);
      toast.success(isAdmin ? "제품이 삭제되었습니다" : "이 지점 제품 목록에서 숨김 처리되었습니다");
    },
    onError: (e) => toast.error(e.message),
  });


  const updateMovement = trpc.liquor.updateMovement.useMutation({
    onSuccess: () => {
      utils.liquor.overview.invalidate();
      utils.liquor.history.invalidate();
      setEditingMovement(null);
      toast.success("히스토리가 수정되었습니다");
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMovement = trpc.liquor.deleteMovement.useMutation({
    onSuccess: () => {
      utils.liquor.overview.invalidate();
      utils.liquor.history.invalidate();
      toast.success("히스토리가 삭제되었습니다");
    },
    onError: (e) => toast.error(e.message),
  });

  const data = overview.data;
  const branches = data?.branches ?? [];
  const items = data?.items ?? [];
  const inventories = data?.inventories ?? [];
  const movements = data?.movements ?? [];
  const selectedBranch = branches.find((b: any) => b.id === effectiveBranchId) ?? branches[0];

  const stockByItem = useMemo(() => {
    const map = new Map<number, number>();
    for (const inv of inventories) map.set(inv.liquorItemId, Number(inv.currentStock || 0));
    return map;
  }, [inventories]);

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return [...items]
      .filter((item) => categoryOf(item) === activeCategory)
      .filter((item) => !q || String(item.name).toLowerCase().includes(q) || String(item.category ?? "").toLowerCase().includes(q))
      .sort((a, b) => sortItems(a, b, sortMode, stockByItem));
  }, [items, search, activeCategory, sortMode, stockByItem]);

  const actionItems = useMemo(() => {
    const q = actionSearch.trim().toLowerCase();
    return [...items]
      .filter((item) => categoryOf(item) === actionCategory)
      .filter((item) => !q || String(item.name).toLowerCase().includes(q) || String(item.category ?? "").toLowerCase().includes(q))
      .sort((a, b) => sortItems(a, b, "nameAsc", stockByItem));
  }, [items, actionSearch, actionCategory, stockByItem]);

  const visibleMovements = historyQuery.data?.movements ?? movements;

  const totalStock = data?.totals.stock ?? 0;
  const totalOutQty = data?.totals.outQty ?? 0;
  const totalInQty = data?.totals.inQty ?? 0;
  const totalOutCost = data?.totals.outCost ?? 0;

  const openAction = (type: MovementType, item?: any) => {
    setActionMode(type);
    setActionSearch("");
    setActionCategory(item ? categoryOf(item) : activeCategory);
    setCart(item ? [{ liquorItemId: item.id, quantity: 1 }] : []);
    setActionMemo("");
  };

  const saveItem = () => {
    if (!newItem.name.trim()) return toast.error("주류명을 입력해주세요");
    const branchId = effectiveBranchId;
    if (!canModifyLiquor) return toast.error("주류 수정 권한이 없습니다");
    if (!isAdmin && !branchId) return toast.error("지점을 선택해주세요");
    if (isAdmin && !branchId && Number(newItem.initialStock || 0) !== 0) return toast.error("수량까지 넣으려면 먼저 지점을 선택해주세요");
    upsertItem.mutate({
      id: editingItemId || undefined,
      name: newItem.name.trim(),
      category: newItem.category.trim() || "위스키",
      unitCost: isAdmin ? Number(newItem.unitCost || 0) : 0,
      initialStock: Number(newItem.initialStock || 0),
      branchId,
      isActive: true,
    });
  };

  const openNewProduct = () => {
    setEditingItemId(null);
    setNewItem({ name: "", category: activeCategory, unitCost: "", initialStock: "" });
    setProductEditorOpen(true);
  };

  const openEditProduct = (item: any) => {
    setEditingItemId(item.id);
    setNewItem({
      name: item.name,
      category: categoryOf(item),
      unitCost: isAdmin ? String(item.unitCost || 0) : "",
      initialStock: String(stockByItem.get(item.id) ?? 0),
    });
    setProductEditorOpen(true);
  };

  const handleDeleteProduct = (item: any) => {
    const message = isAdmin ? `${item.name} 제품을 전체 지점에서 비활성화할까요?` : `${item.name} 제품을 현재 지점 목록에서 숨길까요?`;
    if (!window.confirm(message)) return;
    if (!canModifyLiquor) return toast.error("주류 삭제 권한이 없습니다");
    deleteItem.mutate({ id: item.id, branchId: effectiveBranchId });
  };

  const changeCartQty = (itemId: number, delta: number) => {
    setCart((prev) => {
      const found = prev.find((row) => row.liquorItemId === itemId);
      if (!found) return [...prev, { liquorItemId: itemId, quantity: delta }].filter((row) => row.quantity !== 0);
      return prev.map((row) => row.liquorItemId === itemId ? { ...row, quantity: row.quantity + delta } : row).filter((row) => row.quantity !== 0);
    });
  };

  const setCartQty = (itemId: number, value: number) => {
    setCart((prev) => {
      const found = prev.find((row) => row.liquorItemId === itemId);
      if (!found) return value === 0 ? prev : [...prev, { liquorItemId: itemId, quantity: value }];
      return prev.map((row) => row.liquorItemId === itemId ? { ...row, quantity: value } : row).filter((row) => row.quantity !== 0);
    });
  };


  const removeCartItem = (itemId: number) => {
    setCart((prev) => prev.filter((row) => row.liquorItemId !== itemId));
  };

  const getCartQty = (itemId: number) => cart.find((row) => row.liquorItemId === itemId)?.quantity ?? 0;
  const cartItemName = (itemId: number) => items.find((item) => item.id === itemId)?.name ?? "삭제된 품목";

  const previewStock = (item: any) => {
    const current = stockByItem.get(item.id) ?? 0;
    const rawQty = getCartQty(item.id);
    if (!actionMode) return current;
    const signed = actionMode === "OUT" ? -Math.abs(rawQty) : actionMode === "IN" ? Math.abs(rawQty) : rawQty;
    return current + signed;
  };

  const submitCart = () => {
    if (!actionMode) return;
    const branchId = effectiveBranchId;
    if (!branchId) return toast.error("지점을 선택해주세요");
    const rows = cart.filter((row) => row.liquorItemId && Number(row.quantity) !== 0).map((row) => ({
      liquorItemId: row.liquorItemId,
      quantity: Number(row.quantity),
      memo: row.memo || actionMemo || undefined,
    }));
    if (rows.length === 0) return toast.error("제품을 1개 이상 담아주세요");
    recordMovement.mutate({ branchId, date, type: actionMode, items: rows, memo: actionMemo || undefined });
  };

  if (loading || overview.isLoading) return <LoadingState />;
  if (overview.error) return <ErrorState message={overview.error.message} retry={() => overview.refetch()} />;
  if (!user) return <div className="min-h-screen flex items-center justify-center bg-slate-50">로그인이 필요합니다</div>;

  if (actionMode) {
    return (
      <TransactionScreen
        mode={actionMode}
        setMode={setActionMode}
        close={() => setActionMode(null)}
        date={date}
        setDate={setDate}
        selectedBranch={selectedBranch}
        branches={branches}
        isAdmin={isAdmin}
        effectiveBranchId={effectiveBranchId}
        selectedBranchId={selectedBranchId}
        setSelectedBranchId={setSelectedBranchId}
        search={actionSearch}
        setSearch={setActionSearch}
        category={actionCategory}
        setCategory={setActionCategory}
        items={actionItems}
        stockByItem={stockByItem}
        getCartQty={getCartQty}
        changeCartQty={changeCartQty}
        setCartQty={setCartQty}
        previewStock={previewStock}
        cart={cart}
        cartItemName={cartItemName}
        removeCartItem={removeCartItem}
        memo={actionMemo}
        setMemo={setActionMemo}
        submitCart={submitCart}
        isSaving={recordMovement.isPending}
      />
    );
  }

  if (selectedItem) {
    return (
      <>
        <ProductDetail
          item={selectedItem}
          back={() => setSelectedItem(null)}
          selectedBranch={selectedBranch}
          stock={stockByItem.get(selectedItem.id) ?? 0}
          isAdmin={isAdmin}
          openEdit={() => openEditProduct(selectedItem)}
          deleteProduct={() => handleDeleteProduct(selectedItem)}
          openAction={(type: MovementType) => openAction(type, selectedItem)}
        />
        {productEditorOpen && (
          <ProductEditorModal
            isAdmin={isAdmin}
            newItem={newItem}
            setNewItem={setNewItem}
            editingItemId={editingItemId}
            saveItem={saveItem}
            close={() => setProductEditorOpen(false)}
            pending={upsertItem.isPending}
          />
        )}
      </>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950 pb-24">
      <Header
        title="주류 출고현황"
        back={() => navigate("/")}
        right={
          isStaffOnly ? (
            <button onClick={handleStaffLogout} className="h-9 px-3 rounded-xl bg-slate-100 text-slate-700 text-sm font-black flex items-center gap-1">
              <LogOut size={16} />로그아웃
            </button>
          ) : (
            <button onClick={() => setTab(isAdmin ? "admin" : "items")} className="p-2 -mr-2 rounded-full hover:bg-slate-100"><Settings size={22} /></button>
          )
        }
      />
      <div className="px-4 pt-4 space-y-4 max-w-3xl mx-auto">
        <div className="flex gap-2">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="flex-1 h-11 px-3 rounded-xl bg-white border border-slate-200 font-semibold" />
          {isAdmin && (
            <select value={effectiveBranchId ?? ""} onChange={(e) => setSelectedBranchId(e.target.value ? Number(e.target.value) : undefined)} className="flex-1 h-11 px-3 rounded-xl bg-white border border-slate-200 font-semibold">
              <option value="">전체 지점</option>
              {branches.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          )}
        </div>

        <SummaryCard branchName={getAccountBranchLabel(user?.loginId) ?? selectedBranch?.name ?? "전체"} date={date} totalStock={totalStock} totalInQty={totalInQty} totalOutQty={totalOutQty} totalOutCost={totalOutCost} isAdmin={isAdmin} />
        <NavTabs tab={tab} setTab={setTab} isAdmin={isAdmin} isStaffOnly={isStaffOnly} />

        {tab === "home" && (
          <HomePanel
            openNewProduct={openNewProduct}
            openAction={openAction}
            setTab={setTab}
          />
        )}

        {tab === "items" && (
          <ItemsPanel
            search={search}
            setSearch={setSearch}
            activeCategory={activeCategory}
            setActiveCategory={setActiveCategory}
            sortMode={sortMode}
            setSortMode={setSortMode}
            filteredItems={filteredItems}
            stockByItem={stockByItem}
            isAdmin={isAdmin}
            openNewProduct={openNewProduct}
            openItem={setSelectedItem}
          />
        )}

        {tab === "history" && (
          <HistoryPanel
            historyStart={historyStart}
            setHistoryStart={setHistoryStart}
            historyEnd={historyEnd}
            setHistoryEnd={setHistoryEnd}
            historySearch={historySearch}
            setHistorySearch={setHistorySearch}
            historyType={historyType}
            setHistoryType={setHistoryType}
            movements={visibleMovements}
            isAdmin={isAdmin}
            loading={historyQuery.isLoading}
            onEditMovement={setEditingMovement}
            onDeleteMovement={(movement: any) => {
              if (!window.confirm(`${movement.itemName} 히스토리를 삭제할까요? 삭제하면 재고도 원래대로 복구됩니다.`)) return;
              deleteMovement.mutate({ id: movement.id });
            }}
          />
        )}

        {tab === "admin" && (
          <AdminPanel
            isAdmin={isAdmin}
            newItem={newItem}
            setNewItem={setNewItem}
            editingItemId={editingItemId}
            saveItem={saveItem}
            upsertPending={upsertItem.isPending}
            search={search}
            setSearch={setSearch}
            activeCategory={activeCategory}
            setActiveCategory={setActiveCategory}
            sortMode={sortMode}
            setSortMode={setSortMode}
            filteredItems={filteredItems}
            stockByItem={stockByItem}
            stockEdit={stockEdit}
            setStockEdit={setStockEdit}
            setStock={(item: any, value: string) => {
              const branchId = effectiveBranchId;
              if (!branchId) return toast.error("지점을 선택해주세요");
              if (!canModifyLiquor) return toast.error("재고 수정 권한이 없습니다");
              setStock.mutate({ branchId, liquorItemId: item.id, currentStock: Number(value || 0) });
            }}
            setEditingItem={openEditProduct}
            deleteProduct={handleDeleteProduct}
            canModifyLiquor={canModifyLiquor}
          />
        )}
      </div>
      {productEditorOpen && <ProductEditorModal isAdmin={isAdmin} newItem={newItem} setNewItem={setNewItem} editingItemId={editingItemId} saveItem={saveItem} close={() => setProductEditorOpen(false)} pending={upsertItem.isPending} />}
      {editingMovement && (
        <MovementEditorModal
          movement={editingMovement}
          close={() => setEditingMovement(null)}
          pending={updateMovement.isPending}
          save={(payload: any) => updateMovement.mutate(payload)}
        />
      )}
    </div>
  );
}

function sortItems(a: any, b: any, sortMode: string, stockByItem: Map<number, number>) {
  const aStock = stockByItem.get(a.id) ?? 0;
  const bStock = stockByItem.get(b.id) ?? 0;
  if (sortMode === "stockDesc") return bStock - aStock || String(a.name).localeCompare(String(b.name), "ko");
  if (sortMode === "stockAsc") return aStock - bStock || String(a.name).localeCompare(String(b.name), "ko");
  if (sortMode === "nameDesc") return String(b.name).localeCompare(String(a.name), "ko");
  return String(a.name).localeCompare(String(b.name), "ko");
}

function Header({ title, back, right }: { title: string; back: () => void; right?: ReactNode }) {
  return <div className="sticky top-0 z-20 bg-white border-b border-slate-200"><div className="flex items-center justify-between px-4 h-14"><button onClick={back} className="p-2 -ml-2 rounded-full hover:bg-slate-100"><ArrowLeft size={22} /></button><div className="font-black text-lg truncate px-2">{title}</div><div className="min-w-10 flex justify-end">{right}</div></div></div>;
}

function LoadingState() {
  return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500">주류 재고 불러오는 중...</div>;
}

function ErrorState({ message, retry }: { message: string; retry: () => void }) {
  return <div className="min-h-screen flex items-center justify-center bg-slate-50 px-6"><div className="bg-white rounded-2xl p-6 text-center shadow-sm border border-slate-100"><div className="font-black text-lg mb-2">주류 재고를 불러오지 못했습니다</div><div className="text-sm text-slate-500 mb-4">{message}</div><button onClick={retry} className="h-11 px-5 rounded-xl bg-blue-600 text-white font-black">다시 불러오기</button></div></div>;
}

function SummaryCard({ branchName, date, totalStock, totalInQty, totalOutQty, totalOutCost, isAdmin }: any) {
  return <div className="rounded-3xl p-5 text-white shadow-lg" style={{ background: "linear-gradient(135deg, #4f63ff, #5877ff)" }}><div className="flex items-center gap-2 text-lg font-black"><span>{branchName}</span><span className="opacity-60">{date}</span></div><div className={`grid ${isAdmin ? "grid-cols-4" : "grid-cols-3"} gap-2 mt-6 text-center`}><SummaryMetric value={qty(totalStock)} label="총 재고" /><SummaryMetric value={qty(totalInQty)} label="입고" /><SummaryMetric value={qty(totalOutQty)} label="출고" />{isAdmin && <SummaryMetric value={won(totalOutCost)} label="출고원가" small />}</div></div>;
}
function SummaryMetric({ value, label, small }: { value: string; label: string; small?: boolean }) {
  return <div><div className={`font-black ${small ? "text-base" : "text-3xl"}`}>{value}</div><div className="text-xs opacity-70 mt-1">{label}</div></div>;
}

function NavTabs({ tab, setTab, isAdmin, isStaffOnly }: any) {
  // 직원 전용 계정도 매니저와 동일하게 히스토리를 볼 수 있게 한다.
  // 단, 이 페이지 자체가 주류 전용이므로 매출/정산/인센 메뉴는 노출되지 않는다.
  const tabs = [["home", "홈"], ["items", "제품"], ["history", "히스토리"], ["admin", isAdmin ? "관리" : "재고"]];
  return <div className="grid grid-cols-4 bg-white rounded-2xl p-1 shadow-sm border border-slate-100">{tabs.map(([key, label]) => <button key={key} onClick={() => setTab(key as any)} className={`h-10 rounded-xl text-sm font-black ${tab === key ? "bg-blue-600 text-white" : "text-slate-500"}`}>{label}</button>)}</div>;
}

function HomePanel({ openNewProduct, openAction, setTab }: any) {
  return <div className="space-y-4">
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
      <button onClick={() => setTab("items")} className="w-full flex items-center gap-3 h-12 px-2 rounded-xl bg-slate-50 text-left"><Search size={22} className="text-slate-400" /><span className="text-slate-400 text-lg">제품 검색</span></button>
    </div>
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
      <div className="text-2xl font-black mb-5">제품 등록</div>
      <button onClick={openNewProduct} className="w-full flex items-center justify-between h-12"><span className="flex items-center gap-3 text-lg font-bold"><Package className="text-slate-500" />제품 등록하기</span><span className="text-slate-400 text-2xl">›</span></button>
    </div>
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
      <div className="text-2xl font-black mb-5">입고 / 출고</div>
      <ActionMenuButton type="IN" label="입고하기" onClick={() => openAction("IN")} />
      <ActionMenuButton type="OUT" label="출고하기" onClick={() => openAction("OUT")} />
      <ActionMenuButton type="ADJUST" label="조정하기" onClick={() => openAction("ADJUST")} />
    </div>
  </div>;
}
function ActionMenuButton({ type, label, onClick }: { type: MovementType; label: string; onClick: () => void }) {
  return <button onClick={onClick} className="w-full flex items-center justify-between h-14"><span className="flex items-center gap-3 text-lg font-bold"><MovementIcon type={type} />{label}</span><span className="text-slate-400 text-2xl">›</span></button>;
}

function ItemsPanel({ search, setSearch, activeCategory, setActiveCategory, sortMode, setSortMode, filteredItems, stockByItem, isAdmin, openNewProduct, openItem }: any) {
  return <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100"><div className="flex items-center justify-between mb-3"><div className="text-xl font-black">제품 목록</div><button onClick={openNewProduct} className="h-9 px-3 rounded-xl bg-blue-600 text-white text-sm font-black flex items-center gap-1"><Plus size={16}/>제품 추가</button></div><SearchInput value={search} onChange={setSearch} placeholder="제품 이름 검색" /><CategoryTabs activeCategory={activeCategory} setActiveCategory={setActiveCategory} /><SortSelect sortMode={sortMode} setSortMode={setSortMode} /><div className="divide-y divide-slate-100 rounded-xl border border-slate-100 overflow-hidden max-h-[60vh] overflow-y-auto">{filteredItems.map((item: any) => <ProductRow key={item.id} item={item} stock={stockByItem.get(item.id) ?? 0} isAdmin={isAdmin} onClick={() => openItem(item)} />)}</div></div>;
}
function ProductRow({ item, stock, isAdmin, onClick }: any) {
  return <button onClick={onClick} className="w-full flex items-center justify-between py-4 px-3 bg-white text-left hover:bg-slate-50"><div className="flex items-center gap-3 min-w-0"><div className="w-12 h-12 rounded-xl bg-slate-200 flex items-center justify-center shrink-0"><Package className="text-slate-400" size={22}/></div><div className="min-w-0"><div className="font-bold truncate">{item.name}</div><div className="text-xs text-slate-500">{categoryOf(item)}{isAdmin ? ` · ${won(Number(item.unitCost || 0))}` : ""}</div></div></div><div className="text-2xl font-black text-blue-600">{qty(stock)}</div></button>;
}
function SearchInput({ value, onChange, placeholder }: any) {
  return <div className="flex items-center gap-2 mb-3 bg-slate-100 rounded-xl px-3 h-11"><Search size={18} className="text-slate-400"/><input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="bg-transparent outline-none flex-1" />{value && <button type="button" onClick={() => onChange("")} className="w-7 h-7 rounded-full bg-slate-300/70 text-slate-600 flex items-center justify-center"><X size={16}/></button>}</div>;
}
function CategoryTabs({ activeCategory, setActiveCategory }: any) {
  return <div className="grid grid-cols-4 gap-1 mb-3 bg-slate-100 rounded-xl p-1">{CATEGORY_ORDER.map((cat) => <button key={cat} onClick={() => setActiveCategory(cat)} className={`h-9 rounded-lg text-xs font-black ${activeCategory === cat ? "bg-white text-blue-600 shadow-sm" : "text-slate-500"}`}>{cat}</button>)}</div>;
}
function SortSelect({ sortMode, setSortMode }: any) {
  return <select value={sortMode} onChange={(e) => setSortMode(e.target.value)} className="w-full h-10 mb-3 rounded-xl border border-slate-200 px-3 text-sm font-bold bg-white"><option value="stockDesc">재고 많은순</option><option value="stockAsc">재고 적은순</option><option value="nameAsc">이름 오름차순</option><option value="nameDesc">이름 내림차순</option></select>;
}

function TransactionScreen(props: any) {
  const { mode, setMode, close, date, setDate, selectedBranch, branches, isAdmin, effectiveBranchId, setSelectedBranchId, search, setSearch, category, setCategory, items, stockByItem, getCartQty, changeCartQty, setCartQty, previewStock, cart, cartItemName, removeCartItem, memo, setMemo, submitCart, isSaving } = props;
  const title = mode === "OUT" ? "출고" : mode === "IN" ? "입고" : "조정";
  const accentClass = mode === "OUT" ? "text-red-500" : mode === "IN" ? "text-emerald-600" : "text-slate-700";
  const lineClass = mode === "OUT" ? "bg-red-400" : mode === "IN" ? "bg-emerald-500" : "bg-slate-400";

  return (
    <div className="min-h-screen bg-white text-slate-950 pb-28">
      <Header title={title} back={close} right={null}/>
      <div className="max-w-3xl mx-auto px-4 py-5 space-y-4">
        <div className={`text-4xl font-black ${accentClass}`}>{title}</div>
        <div className={`h-1 rounded-full ${lineClass}`} />

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <InfoRow
            label="날짜"
            value={<input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full text-right outline-none font-black bg-transparent" />}
          />
          <InfoRow
            label="위치"
            value={isAdmin ? (
              <select value={effectiveBranchId ?? ""} onChange={(e) => setSelectedBranchId(e.target.value ? Number(e.target.value) : undefined)} className="w-full text-right outline-none font-black bg-white">
                <option value="">지점 선택</option>
                {branches.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            ) : selectedBranch?.name ?? "기본 위치"}
          />
          <InfoRow label="제품" value={`${cart.length}품목 / ${qty(cart.reduce((sum: number, row: CartRow) => sum + Math.abs(Number(row.quantity || 0)), 0))}개`} />
          <InfoRow
            label="메모"
            value={<input value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="작성" className="w-full text-right outline-none font-black bg-transparent" />}
          />
        </div>

        <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100">
          <SearchInput value={search} onChange={setSearch} placeholder="제품 이름 검색" />
          <CategoryTabs activeCategory={category} setActiveCategory={setCategory} />
          <div className="max-h-[42vh] overflow-y-auto divide-y divide-slate-100 bg-white rounded-xl border border-slate-100">
            {items.map((item: any) => {
              const inCart = getCartQty(item.id);
              const current = stockByItem.get(item.id) ?? 0;
              const after = previewStock(item);
              return (
                <div key={item.id} className="px-3 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="font-black truncate">{item.name}</div>
                      <div className="text-xs text-slate-500">현재 {qty(current)} → <span className={after < current ? "text-red-500 font-black" : after > current ? "text-emerald-600 font-black" : "text-slate-500"}>{qty(after)}</span></div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button onClick={() => changeCartQty(item.id, -1)} className="w-9 h-9 rounded-full bg-slate-100 font-black text-xl">−</button>
                      <input value={inCart || ""} onChange={(e) => setCartQty(item.id, Number(e.target.value.replace(/[^0-9.-]/g, "") || 0))} inputMode="decimal" placeholder="0" className="w-12 h-9 text-center rounded-lg border border-slate-200 font-black"/>
                      <button onClick={() => changeCartQty(item.id, 1)} className="w-9 h-9 rounded-full bg-blue-50 text-blue-600 font-black text-xl">+</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <CartSummary mode={mode} cart={cart} cartItemName={cartItemName} changeCartQty={changeCartQty} removeCartItem={removeCartItem} />
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 max-w-3xl mx-auto">
          <button onClick={submitCart} disabled={isSaving || cart.length === 0} className="w-full h-14 rounded-2xl bg-blue-600 text-white font-black text-lg disabled:opacity-40">{isSaving ? "저장 중..." : `${title} 완료`}</button>
        </div>
      </div>
    </div>
  );
}

function CartSummary({ mode, cart, cartItemName, changeCartQty, removeCartItem }: any) {
  if (cart.length === 0) return <div className="bg-white rounded-2xl p-6 text-center text-slate-400 border border-slate-100">제품을 담으면 여기에 한 번에 표시됩니다</div>;
  const title = mode === "OUT" ? "출고 장바구니" : mode === "IN" ? "입고 장바구니" : "조정 장바구니";
  return <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
    <div className="font-black text-xl mb-3">{title}</div>
    <div className="space-y-2">
      {cart.map((row: CartRow) => <div key={row.liquorItemId} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2">
        <div className="font-bold truncate flex-1">{cartItemName(row.liquorItemId)}</div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={() => changeCartQty(row.liquorItemId, -1)} className="w-8 h-8 rounded-full bg-white border border-slate-200 font-black">−</button>
          <div className="w-12 text-center font-black">{qty(row.quantity)}병</div>
          <button onClick={() => changeCartQty(row.liquorItemId, 1)} className="w-8 h-8 rounded-full bg-white border border-slate-200 font-black">+</button>
          <button onClick={() => removeCartItem(row.liquorItemId)} className="w-8 h-8 rounded-full bg-red-50 text-red-500 flex items-center justify-center" title="장바구니에서 삭제"><X size={16}/></button>
        </div>
      </div>)}
    </div>
  </div>;
}

function ProductDetail({ item, back, selectedBranch, stock, isAdmin, openEdit, deleteProduct, openAction }: any) {
  return <div className="min-h-screen bg-slate-50 text-slate-950 pb-24"><Header title="제품 정보" back={back} right={<button onClick={openEdit} className="p-2 -mr-2 rounded-full hover:bg-slate-100"><Settings size={22}/></button>} /><div className="max-w-3xl mx-auto"><div className="bg-white p-5 flex items-center gap-5 border-b border-slate-100"><div className="w-24 h-24 rounded-2xl bg-slate-200 flex items-center justify-center"><Package className="text-slate-400" size={36}/></div><div className="min-w-0"><div className="text-2xl font-black truncate">{item.name}</div><div className="text-sm text-slate-500 mt-2">{categoryOf(item)}</div>{isAdmin && <div className="text-sm text-slate-500 mt-1">단가 {won(Number(item.unitCost || 0))}</div>}</div></div><div className="bg-white mt-3 divide-y divide-slate-100"><InfoRow label="지점" value={selectedBranch?.name ?? "전체"}/><InfoRow label="현재 재고" value={`${qty(stock)}병`} valueClass="text-blue-600 font-black text-2xl"/><InfoRow label="분류" value={categoryOf(item)}/></div><div className="bg-white mt-3 p-4 rounded-2xl mx-4 border border-slate-100 shadow-sm"><button onClick={openEdit} className="w-full h-12 rounded-xl bg-slate-900 text-white font-black flex items-center justify-center gap-2"><Settings size={18}/>제품 설정/수정</button><button onClick={deleteProduct} className="w-full h-12 mt-2 rounded-xl bg-red-50 text-red-600 font-black flex items-center justify-center gap-2"><Trash2 size={18}/>{isAdmin ? "제품 삭제" : "내 지점에서 숨김"}</button></div><div className="fixed left-0 right-0 bottom-0 z-30 bg-white border-t border-slate-200 p-4 max-w-3xl mx-auto"><div className="grid grid-cols-3 gap-2"><button onClick={() => openAction("IN")} className="h-12 rounded-2xl bg-emerald-50 text-emerald-700 font-black flex items-center justify-center gap-1"><ArrowDownToLine size={18}/>입고</button><button onClick={() => openAction("OUT")} className="h-12 rounded-2xl bg-red-50 text-red-600 font-black flex items-center justify-center gap-1"><ArrowUpFromLine size={18}/>출고</button><button onClick={() => openAction("ADJUST")} className="h-12 rounded-2xl bg-slate-100 text-slate-700 font-black flex items-center justify-center gap-1"><SlidersHorizontal size={18}/>조정</button></div></div></div></div>;
}

function InfoRow({ label, value, valueClass = "font-bold" }: any) {
  return (
    <div className="flex items-center gap-4 min-h-[64px] px-4 border-b border-slate-100 last:border-b-0">
      <div className="w-20 shrink-0 whitespace-nowrap text-slate-500 font-bold tracking-tight">{label}</div>
      <div className={`flex-1 min-w-0 text-right break-keep ${valueClass}`}>{value}</div>
    </div>
  );
}

function HistoryPanel({ historyStart, setHistoryStart, historyEnd, setHistoryEnd, historySearch, setHistorySearch, historyType, setHistoryType, movements, isAdmin, loading, onEditMovement, onDeleteMovement }: any) {
  const [filterOpen, setFilterOpen] = useState(false);
  const hasFilter = historyType !== "ALL" || historySearch.trim() || historyStart !== "2000-01-01" || historyEnd !== todayString();
  return <div className="space-y-4">
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex items-center justify-between">
      <div>
        <div className="text-xl font-black">히스토리</div>
        <div className="text-xs text-slate-400 mt-1">최근 입고/출고/조정 내역이 날짜별로 표시됩니다</div>
      </div>
      <button onClick={() => setFilterOpen(true)} className={`h-10 px-4 rounded-xl font-black flex items-center gap-2 ${hasFilter ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700"}`}>
        <SlidersHorizontal size={17}/>필터
      </button>
    </div>
    <HistoryList movements={movements} isAdmin={isAdmin} loading={loading} onEditMovement={onEditMovement} onDeleteMovement={onDeleteMovement}/>
    {filterOpen && <HistoryFilterModal
      close={() => setFilterOpen(false)}
      reset={() => { setHistoryType("ALL"); setHistoryStart("2000-01-01"); setHistoryEnd(todayString()); setHistorySearch(""); }}
      historyType={historyType}
      setHistoryType={setHistoryType}
      historyStart={historyStart}
      setHistoryStart={setHistoryStart}
      historyEnd={historyEnd}
      setHistoryEnd={setHistoryEnd}
      historySearch={historySearch}
      setHistorySearch={setHistorySearch}
    />}
  </div>;
}

function HistoryFilterModal({ close, reset, historyType, setHistoryType, historyStart, setHistoryStart, historyEnd, setHistoryEnd, historySearch, setHistorySearch }: any) {
  const typeTabs: Array<["ALL" | MovementType, string]> = [["ALL", "전체"], ["IN", "입고"], ["OUT", "출고"], ["ADJUST", "조정"]];
  return <div className="fixed inset-0 z-50 bg-white text-slate-950 flex flex-col">
    <div className="h-14 px-4 border-b border-slate-200 flex items-center justify-between shrink-0">
      <button onClick={close} className="p-2 -ml-2 rounded-full"><X size={24}/></button>
      <div className="text-xl font-black">필터</div>
      <button onClick={reset} className="font-bold text-slate-700">초기화</button>
    </div>
    <div className="flex-1 overflow-y-auto px-5 py-6 space-y-8">
      <section>
        <div className="text-2xl font-black mb-4">거래 종류</div>
        <div className="grid grid-cols-4 border border-blue-600 rounded-lg overflow-hidden">
          {typeTabs.map(([key, label]) => <button key={key} onClick={() => setHistoryType(key)} className={`h-12 font-bold border-r border-blue-600 last:border-r-0 ${historyType === key ? "bg-blue-600 text-white" : "bg-white text-blue-600"}`}>{label}</button>)}
        </div>
      </section>
      <section>
        <div className="text-2xl font-black mb-4">기간</div>
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <input type="date" value={historyStart === "2000-01-01" ? "" : historyStart} onChange={(e) => setHistoryStart(e.target.value || "2000-01-01")} className="h-14 px-4 rounded-xl bg-white border border-slate-200 shadow-sm font-bold" />
          <span className="font-black text-slate-400">-</span>
          <input type="date" value={historyEnd} onChange={(e) => setHistoryEnd(e.target.value || todayString())} className="h-14 px-4 rounded-xl bg-white border border-slate-200 shadow-sm font-bold" />
        </div>
      </section>
      <section>
        <div className="text-2xl font-black mb-4">제품</div>
        <SearchInput value={historySearch} onChange={setHistorySearch} placeholder="제품명 검색" />
      </section>
    </div>
    <div className="p-5 border-t border-slate-100 shrink-0">
      <button onClick={close} className="w-full h-14 rounded-2xl bg-blue-600 text-white text-lg font-black">필터 적용</button>
    </div>
  </div>;
}

function movementBatchKey(m: any): string {
  const created = String(m.createdAt || "").slice(0, 16);
  return `${m.date}|${m.type}|${m.branchId}|${m.createdBy || ""}|${m.memo || ""}|${created}`;
}

function HistoryList({ movements, isAdmin, loading, onEditMovement, onDeleteMovement }: { movements: any[]; isAdmin: boolean; loading?: boolean; onEditMovement?: (m: any) => void; onDeleteMovement?: (m: any) => void }) {
  const [detailGroup, setDetailGroup] = useState<any[] | null>(null);
  if (loading) return <div className="bg-white rounded-2xl p-8 text-center text-slate-500">히스토리 불러오는 중...</div>;

  const byDate = movements.reduce<Record<string, Record<string, any[]>>>((acc, m) => {
    const date = m.date;
    const key = movementBatchKey(m);
    (acc[date] ||= {});
    (acc[date][key] ||= []).push(m);
    return acc;
  }, {});
  const dates = Object.keys(byDate).sort((a, b) => b.localeCompare(a));
  if (dates.length === 0) return <div className="bg-white rounded-2xl p-8 text-center text-slate-500">조건에 맞는 입고/출고 내역이 없습니다</div>;

  return <div className="space-y-7">
    {dates.map((date) => {
      const groups = Object.values(byDate[date]).sort((a, b) => String(b[0]?.createdAt || "").localeCompare(String(a[0]?.createdAt || "")));
      return <div key={date}>
        <div className="text-slate-500 font-bold text-lg mb-3 px-1">{formatKoreanDate(date)}</div>
        <div className="space-y-4">
          {groups.map((group) => <HistoryBatchCard key={movementBatchKey(group[0])} group={group} isAdmin={isAdmin} onClick={() => setDetailGroup(group)} />)}
        </div>
      </div>;
    })}
    {detailGroup && <HistoryDetailView group={detailGroup} isAdmin={isAdmin} close={() => setDetailGroup(null)} onEditMovement={onEditMovement} onDeleteMovement={onDeleteMovement} />}
  </div>;
}

function HistoryBatchCard({ group, isAdmin, onClick }: { group: any[]; isAdmin: boolean; onClick: () => void }) {
  const first = group[0];
  const type = first.type;
  const totalQty = group.reduce((sum, m) => sum + Number(m.quantity || 0), 0);
  const totalAbsQty = group.reduce((sum, m) => sum + Math.abs(Number(m.quantity || 0)), 0);
  const totalCost = group.reduce((sum, m) => sum + Math.abs(Number(m.totalCost || 0)), 0);
  const itemCount = group.length;
  const label = type === "OUT" ? "출고" : type === "IN" ? "입고" : "조정";
  const color = type === "OUT" ? "text-red-500" : type === "IN" ? "text-emerald-600" : "text-slate-700";
  return <button onClick={onClick} className="w-full text-left bg-white rounded-3xl p-4 shadow-sm border border-slate-100 flex items-start justify-between gap-3 active:scale-[0.99] transition">
    <div className="flex items-start gap-3 min-w-0">
      <MovementIcon type={type}/>
      <div className="min-w-0">
        <div className={`font-black text-2xl ${color}`}>{label}</div>
        <div className="text-lg font-black text-slate-900 mt-2">{first.branchName || "기본 위치"}</div>
        <div className="text-lg font-black text-slate-900 mt-2">{itemCount}품목 / {totalQty > 0 ? "+" : ""}{qty(totalQty)}개</div>
        <div className="text-lg text-slate-500 mt-2 truncate max-w-[240px]">{first.itemName}</div>
        {isAdmin && type === "OUT" && <div className="text-sm font-bold text-slate-500 mt-2">출고 원가 {won(totalCost)}</div>}
      </div>
    </div>
    <div className={`text-xl font-black shrink-0 ${color}`}>{type === "OUT" ? "-" : type === "IN" ? "+" : ""}{qty(totalAbsQty)}</div>
  </button>;
}

function HistoryDetailView({ group, isAdmin, close, onEditMovement, onDeleteMovement }: any) {
  const first = group[0];
  const type = first.type;
  const label = type === "OUT" ? "출고" : type === "IN" ? "입고" : "조정";
  const color = type === "OUT" ? "text-red-500" : type === "IN" ? "text-emerald-600" : "text-slate-700";
  const totalQty = group.reduce((sum: number, m: any) => sum + Number(m.quantity || 0), 0);
  const totalCost = group.reduce((sum: number, m: any) => sum + Math.abs(Number(m.totalCost || 0)), 0);
  return <div className="fixed inset-0 z-50 bg-white text-slate-950 overflow-y-auto">
    <Header title="상세 내역" back={close} right={<span/>}/>
    <div className="max-w-3xl mx-auto p-5 pb-20">
      <div className={`text-4xl font-black ${color}`}>{label}</div>
      <div className={`h-1 rounded-full mt-5 ${type === "OUT" ? "bg-red-400" : type === "IN" ? "bg-emerald-500" : "bg-slate-400"}`} />
      <div className="bg-white mt-4 divide-y divide-slate-100 border-b border-slate-100">
        <InfoRow label="위치" value={first.branchName || "기본 위치"}/>
        <InfoRow label={`${label}일`} value={formatKoreanDateTime(first.date, first.createdAt)}/>
        <InfoRow label="수정/처리자" value={formatMovementCreator(first)}/>
        <InfoRow label="합계" value={`${group.length}품목 / ${totalQty > 0 ? "+" : ""}${qty(totalQty)}개`}/>
        {isAdmin && type === "OUT" && <InfoRow label="출고 원가" value={won(totalCost)} valueClass="font-black text-red-500"/>}
      </div>
      <div className="mt-5 space-y-4">
        {group.map((m: any) => <div key={m.id} className="flex items-center justify-between gap-3 py-3 border-b border-slate-100">
          <div className="w-14 h-14 rounded-xl bg-slate-200 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-xl font-black truncate">{m.itemName}</div>
            <div className="text-sm text-slate-500 mt-1">0 | 0 | {categoryOf(m)}</div>
            <div className="text-sm text-slate-400 mt-1 truncate">처리자: {formatMovementCreator(m)}</div>
            {m.memo && <div className="text-sm text-slate-400 mt-1 truncate">메모: {m.memo}</div>}
            {isAdmin && type === "OUT" && <div className="text-xs text-slate-400 mt-1">원가 {won(Math.abs(Number(m.totalCost || 0)))}</div>}
          </div>
          <div className={`text-xl font-black shrink-0 ${color}`}>{Number(m.quantity) > 0 ? "+" : ""}{qty(Number(m.quantity || 0))}</div>
          <div className="flex flex-col gap-1 shrink-0">
            <button onClick={() => onEditMovement?.(m)} className="h-8 px-2 rounded-lg bg-slate-100 text-xs font-black">수정</button>
            <button onClick={() => onDeleteMovement?.(m)} className="h-8 px-2 rounded-lg bg-red-50 text-red-500 text-xs font-black">삭제</button>
          </div>
        </div>)}
      </div>
      <div className="mt-8 text-xl text-slate-400">메모</div>
      {first.memo && <div className="mt-3 text-slate-700">{first.memo}</div>}
    </div>
  </div>;
}

function formatMovementCreator(movement: any) {
  const name = movement?.createdByLoginId || movement?.createdByDisplayName || movement?.creatorLoginId || movement?.creatorName;
  const role = movement?.createdByRole === "admin" ? "관리자" : "직원/매니저";
  return name ? `${name} / ${role}` : "기록 없음";
}

function formatKoreanDate(date: string) {
  const [y, m, d] = String(date).split("-");
  if (!y || !m || !d) return date;
  return `${Number(y)}년 ${Number(m)}월 ${Number(d)}일`;
}

function formatKoreanDateTime(date: string, createdAt?: string) {
  if (!createdAt) return formatKoreanDate(date);
  const dt = new Date(createdAt);
  if (Number.isNaN(dt.getTime())) return formatKoreanDate(date);
  const ampm = dt.getHours() < 12 ? "오전" : "오후";
  const h = dt.getHours() % 12 || 12;
  const min = String(dt.getMinutes()).padStart(2, "0");
  return `${formatKoreanDate(date)} ${ampm} ${h}:${min}`;
}

function MovementIcon({ type }: { type: string }) {
  if (type === "OUT") return <div className="mt-1 text-red-500"><ArrowUpFromLine size={24}/></div>;
  if (type === "IN") return <div className="mt-1 text-emerald-600"><ArrowDownToLine size={24}/></div>;
  return <div className="mt-1 text-slate-500"><SlidersHorizontal size={24}/></div>;
}

function ProductEditorModal({ isAdmin, newItem, setNewItem, editingItemId, saveItem, close, pending }: any) {
  return <div className="fixed inset-0 z-50 bg-black/45 flex items-end justify-center"><div className="w-full max-w-md bg-white rounded-t-3xl p-5 shadow-2xl"><div className="flex items-center justify-between mb-4"><div className="text-xl font-black">{editingItemId ? "제품 수정" : "제품 추가"}</div><button onClick={close} className="p-2 rounded-full bg-slate-100"><X size={20}/></button></div><div className="space-y-3"><div><div className="text-xs font-bold text-slate-500 mb-1">제품명</div><input value={newItem.name} onChange={(e) => setNewItem((v: any) => ({ ...v, name: e.target.value }))} placeholder="예: 글렌리벳 12y" className="w-full h-12 px-3 rounded-xl border border-slate-200 outline-none"/></div><div className="grid grid-cols-2 gap-2"><div><div className="text-xs font-bold text-slate-500 mb-1">카테고리</div><select value={newItem.category} onChange={(e) => setNewItem((v: any) => ({ ...v, category: e.target.value }))} className="w-full h-12 px-3 rounded-xl border border-slate-200 bg-white outline-none">{CATEGORY_ORDER.map((cat) => <option key={cat} value={cat}>{cat}</option>)}</select></div><div><div className="text-xs font-bold text-slate-500 mb-1">현재 수량</div><input value={newItem.initialStock} onChange={(e) => setNewItem((v: any) => ({ ...v, initialStock: e.target.value.replace(/[^0-9.-]/g, "") }))} inputMode="decimal" placeholder="0" className="w-full h-12 px-3 rounded-xl border border-slate-200 outline-none text-right"/></div></div>{isAdmin && <div><div className="text-xs font-bold text-slate-500 mb-1">원가/단가</div><input value={newItem.unitCost} onChange={(e) => setNewItem((v: any) => ({ ...v, unitCost: e.target.value.replace(/[^0-9]/g, "") }))} inputMode="numeric" placeholder="관리자만 입력" className="w-full h-12 px-3 rounded-xl border border-slate-200 outline-none text-right"/></div>}{!isAdmin && <div className="text-xs text-slate-400 leading-5">지점 계정은 제품명, 카테고리, 현재 수량만 등록할 수 있습니다. 원가/단가는 관리자만 관리합니다.</div>}<button onClick={saveItem} disabled={pending} className="w-full h-12 rounded-2xl bg-blue-600 text-white font-black text-lg disabled:opacity-50">{pending ? "저장 중..." : editingItemId ? "수정 저장" : "제품 추가"}</button></div></div></div>;
}

function MovementEditorModal({ movement, close, save, pending }: any) {
  const [editDate, setEditDate] = useState(movement.date || todayString());
  const [editQty, setEditQty] = useState(String(Math.abs(Number(movement.quantity || 0))));
  const [editMemo, setEditMemo] = useState(movement.memo || "");
  const typeLabel = movement.type === "OUT" ? "출고" : movement.type === "IN" ? "입고" : "조정";
  return <div className="fixed inset-0 z-50 bg-black/45 flex items-end justify-center">
    <div className="w-full max-w-md bg-white rounded-t-3xl p-5 shadow-2xl">
      <div className="flex items-center justify-between mb-4">
        <div className="text-xl font-black">히스토리 수정</div>
        <button onClick={close} className="p-2 rounded-full bg-slate-100"><X size={20}/></button>
      </div>
      <div className="space-y-3">
        <div className="rounded-2xl bg-slate-50 p-3">
          <div className="text-sm text-slate-500 font-bold">{typeLabel}</div>
          <div className="text-lg font-black truncate">{movement.itemName}</div>
        </div>
        <div>
          <div className="text-xs font-bold text-slate-500 mb-1">날짜</div>
          <input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} className="w-full h-12 px-3 rounded-xl border border-slate-200 outline-none" />
        </div>
        <div>
          <div className="text-xs font-bold text-slate-500 mb-1">수량</div>
          <input value={editQty} onChange={(e) => setEditQty(e.target.value.replace(/[^0-9.-]/g, ""))} inputMode="decimal" className="w-full h-12 px-3 rounded-xl border border-slate-200 outline-none text-right font-black" />
          <div className="text-xs text-slate-400 mt-1">출고/입고는 양수로 입력하면 자동으로 방향이 반영됩니다.</div>
        </div>
        <div>
          <div className="text-xs font-bold text-slate-500 mb-1">메모</div>
          <input value={editMemo} onChange={(e) => setEditMemo(e.target.value)} placeholder="메모" className="w-full h-12 px-3 rounded-xl border border-slate-200 outline-none" />
        </div>
        <button onClick={() => save({ id: movement.id, date: editDate, quantity: Number(editQty || 0), memo: editMemo || undefined })} disabled={pending} className="w-full h-12 rounded-2xl bg-blue-600 text-white font-black text-lg disabled:opacity-50">{pending ? "저장 중..." : "수정 저장"}</button>
      </div>
    </div>
  </div>;
}

function AdminPanel(props: any) {
  const { isAdmin, canModifyLiquor, newItem, setNewItem, editingItemId, saveItem, upsertPending, search, setSearch, activeCategory, setActiveCategory, sortMode, setSortMode, filteredItems, stockByItem, stockEdit, setStockEdit, setStock, setEditingItem, deleteProduct } = props;
  return <div className="space-y-4">{canModifyLiquor && <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100"><div className="text-xl font-black mb-3">주류 등록 / 수정</div><input value={newItem.name} onChange={(e) => setNewItem((v: any) => ({ ...v, name: e.target.value }))} placeholder="주류명" className="w-full h-11 px-3 mb-2 rounded-xl border border-slate-200"/><div className="grid grid-cols-2 gap-2"><select value={newItem.category} onChange={(e) => setNewItem((v: any) => ({ ...v, category: e.target.value }))} className="h-11 px-3 rounded-xl border border-slate-200 bg-white">{CATEGORY_ORDER.map((cat) => <option key={cat} value={cat}>{cat}</option>)}</select>{isAdmin && <input value={newItem.unitCost} onChange={(e) => setNewItem((v: any) => ({ ...v, unitCost: e.target.value.replace(/[^0-9]/g, "") }))} placeholder="단가" className="h-11 px-3 rounded-xl border border-slate-200 text-right"/>}</div><button onClick={saveItem} disabled={upsertPending} className="w-full h-11 mt-3 rounded-xl bg-blue-600 text-white font-bold">{editingItemId ? "수정 저장" : "제품 등록"}</button></div>}<div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100"><div className="text-xl font-black mb-3">현재 재고 보정</div><SearchInput value={search} onChange={setSearch} placeholder="제품 이름 검색"/><CategoryTabs activeCategory={activeCategory} setActiveCategory={setActiveCategory}/><SortSelect sortMode={sortMode} setSortMode={setSortMode}/><div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">{filteredItems.map((item: any) => <div key={item.id} className="flex items-center gap-2 py-2"><div className="flex-1 min-w-0"><div className="font-bold truncate">{item.name}</div><div className="text-xs text-slate-500">{categoryOf(item)}{isAdmin ? ` · ${won(Number(item.unitCost || 0))}` : ""}</div></div>{canModifyLiquor ? <input value={stockEdit?.itemId === item.id ? stockEdit?.value ?? "" : String(stockByItem.get(item.id) ?? 0)} onChange={(e) => setStockEdit({ itemId: item.id, value: e.target.value.replace(/[^0-9.-]/g, "") })} className="w-20 h-10 rounded-xl border border-slate-200 text-right px-2"/> : <div className="w-20 text-right text-xl font-bold text-blue-600">{qty(stockByItem.get(item.id) ?? 0)}</div>}{canModifyLiquor && <button onClick={() => setStock(item, stockEdit?.itemId === item.id ? stockEdit?.value : String(stockByItem.get(item.id) ?? 0))} className="h-10 px-3 rounded-xl bg-blue-600 text-white text-sm font-bold">저장</button>}{canModifyLiquor && <button onClick={() => setEditingItem(item)} className="h-10 px-2 rounded-xl bg-slate-100" title="제품 수정"><Edit3 size={16}/></button>}{canModifyLiquor && <button onClick={() => deleteProduct(item)} className="h-10 px-2 rounded-xl bg-red-50 text-red-600" title="제품 삭제"><Trash2 size={16}/></button>}</div>)}</div></div></div>;
}
