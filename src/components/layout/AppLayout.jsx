import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import MobileTopbar from "./MobileTopbar";
import MobileDrawer from "./MobileDrawer";

export default function AppLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop sidebar */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      {/* Mobile topbar + drawer */}
      <MobileTopbar onMenuOpen={() => setDrawerOpen(true)} />
      <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />

      {/* Main content */}
      <main className="md:ml-64 min-h-screen pt-14 md:pt-0">
        <div className="p-4 md:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}