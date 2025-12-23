import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppLayout } from "./layouts/AppLayout";
import { FounderDashboard } from "./pages/FounderDashboard";

import { ProjectDetail } from "./pages/ProjectDetail";
import { ClientPortalPage } from "./pages/ClientPortalPage"; // Legacy/Public?
import { PartnerPortal } from "./pages/portals/PartnerPortal";
import { ClientPortfolio } from "./pages/portals/ClientPortfolio"; // [NEW]
import { ClientProjectPortal } from "./pages/portals/ClientProjectPortal"; // [NEW]
import { SitePortal } from "./pages/portals/SitePortal"; // [NEW]
import { SiteProjectSelector } from "./pages/portals/SiteProjectSelector"; // [NEW]
import DesignStudio from "./pages/portals/DesignStudio"; // [NEW]
import PMDashboard from "./pages/portals/PMDashboard"; // [NEW]
import LedgerPortal from "./pages/portals/LedgerPortal"; // [NEW]
import TitanTreasury from "./pages/command/TitanTreasury"; // [NEW]
import ProcurementPortal from "./pages/portals/ProcurementPortal"; // [NEW]
import GlobalTaskPortal from "./pages/portals/GlobalTaskPortal"; // [NEW]
import GlobalStocksPortal from "./pages/portals/GlobalStocksPortal"; // [NEW]
import { SiteFeedPortal } from "./pages/portals/SiteFeedPortal"; // [NEW]
import { UserDirectory } from "./pages/command/UserDirectory"; // [NEW]

import { RoleRouter } from "./components/auth/RoleRouter";
import { LoginScreen } from "./pages/LoginScreen";
import { useTitanAuth as useAuth } from "./hooks/useTitanAuth";
import type { ReactNode } from "react";

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="h-screen w-full bg-zinc-950 flex items-center justify-center text-yellow-500 animate-pulse font-mono tracking-widest">LOADING TITAN OS...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <>
      <BrowserRouter>
        <Routes>
          {/* PUBLIC/PORTAL ROUTES (Outside Main Layout) */}
          <Route path="/portal/:projectId" element={<ClientPortalPage />} />
          <Route path="/portal/partner/:projectId" element={<PartnerPortal />} />

          {/* CLIENT PORTAL ROUTES */}
          <Route path="/portal/client/portfolio" element={<ProtectedRoute><ClientPortfolio /></ProtectedRoute>} />
          <Route path="/portal/client/:projectId" element={<ProtectedRoute><ClientProjectPortal /></ProtectedRoute>} />

          {/* AUTH ROUTE */}
          <Route path="/login" element={<LoginScreen />} />

          {/* INTERNAL APP ROUTES (Inside AppLayout) */}
          <Route element={<AppLayout />}>


            {/* ROOT: The Traffic Controller */}
            <Route path="/" element={<RoleRouter />} />

            {/* FOUNDER DASHBOARD */}
            <Route path="/command/dashboard" element={
              <ProtectedRoute>
                <FounderDashboard />
              </ProtectedRoute>
            } />

            {/* ARCHITECT STUDIO */}
            <Route path="/studio/dashboard" element={
              <ProtectedRoute>
                <DesignStudio />
              </ProtectedRoute>
            } />

            {/* DIRECTORY */}
            <Route path="/command/directory" element={
              <ProtectedRoute>
                <UserDirectory />
              </ProtectedRoute>
            } />

            <Route path="/project/:id" element={
              <ProtectedRoute>
                <ProjectDetail />
              </ProtectedRoute>
            } />

            {/* SITE & OPS PORTALS */}
            <Route path="/portal/site" element={<ProtectedRoute><SiteProjectSelector /></ProtectedRoute>} />
            <Route path="/portal/site/:id" element={<ProtectedRoute><SitePortal /></ProtectedRoute>} />
            <Route path="/portal/ops/:id" element={<ProtectedRoute><PMDashboard /></ProtectedRoute>} />

            {/* BACK OFFICE PORTALS */}
            <Route path="/portal/ledger" element={<ProtectedRoute><LedgerPortal /></ProtectedRoute>} />
            <Route path="/portal/store" element={<ProtectedRoute><ProcurementPortal /></ProtectedRoute>} />



            <Route path="/portal/ledger/:id" element={<ProtectedRoute><ProjectDetail /></ProtectedRoute>} />

            {/* GLOBAL COMMAND (GOD TIER) */}
            <Route path="/command/ledger" element={<ProtectedRoute><TitanTreasury /></ProtectedRoute>} />
            <Route path="/command/global-tasks" element={<ProtectedRoute><GlobalTaskPortal /></ProtectedRoute>} />
            <Route path="/portal/global-stocks" element={<ProtectedRoute><GlobalStocksPortal /></ProtectedRoute>} />
            <Route path="/portal/activity-feed" element={<ProtectedRoute><SiteFeedPortal /></ProtectedRoute>} />
            {/* Redundant, but keeping as alias if needed, or remove. I'll remove it to be clean as /command/directory is canonical now */}

          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </>
  );
}
