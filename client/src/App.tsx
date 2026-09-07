import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import History from "./pages/History";
import AdminDashboard from "./pages/AdminDashboard";
import AdminManage from "./pages/AdminManage";
import Login from "./pages/Login";
import TableReport from "./pages/TableReport";
import StaffIncentiveStats from "./pages/StaffIncentiveStats";
import LiquorStockReport from "./pages/LiquorStockReport";
import SettlementDashboard from "./pages/SettlementDashboard";
import BranchSettings from "./pages/BranchSettings";
import StaffAdmin from "./pages/StaffAdmin";
import { UpdateBanner } from "./components/UpdateBanner";
import StaffLiquorGuard from "./components/StaffLiquorGuard";
function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      {/* 직원(주류 전용) 계정도 접근 가능한 페이지 */}
      <Route path={"/login"} component={Login} />
      <Route path={"/liquor-stock"} component={LiquorStockReport} />

      {/* 아래는 매니저/관리자 전용 — 직원 계정은 주류 화면으로 되돌립니다 */}
      <Route path={"/"}>
        <StaffLiquorGuard><Home /></StaffLiquorGuard>
      </Route>
      <Route path={"/history"}>
        <StaffLiquorGuard><History /></StaffLiquorGuard>
      </Route>
      <Route path={"/admin"}>
        <StaffLiquorGuard><AdminDashboard /></StaffLiquorGuard>
      </Route>
      <Route path={"/admin/manage"}>
        <StaffLiquorGuard><AdminManage /></StaffLiquorGuard>
      </Route>
      <Route path={"/table-report"}>
        <StaffLiquorGuard><TableReport /></StaffLiquorGuard>
      </Route>
      <Route path={"/staff-incentive"}>
        <StaffLiquorGuard><StaffIncentiveStats /></StaffLiquorGuard>
      </Route>
      <Route path={"/settlement"}>
        <StaffLiquorGuard><SettlementDashboard /></StaffLiquorGuard>
      </Route>
      <Route path={"/branch-settings"}>
        <StaffLiquorGuard><BranchSettings /></StaffLiquorGuard>
      </Route>
      <Route path={"/staff-admin"}>
        <StaffLiquorGuard><StaffAdmin /></StaffLiquorGuard>
      </Route>
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <UpdateBanner />
          <Toaster position="top-center" />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
