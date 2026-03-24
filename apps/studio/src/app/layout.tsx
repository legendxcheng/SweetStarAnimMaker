import { NavLink, Outlet } from "react-router-dom";

import { getButtonClassName } from "../styles/button-styles";

export function Layout() {
  return (
    <div className="flex h-screen overflow-hidden bg-(--color-bg-base)">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 bg-(--color-bg-surface) border-r border-(--color-border) flex flex-col">
        {/* Logo */}
        <div className="px-4 py-4 border-b border-(--color-border)">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-(--color-accent) to-(--color-accent-end) flex items-center justify-center shrink-0">
              <span className="text-xs font-bold text-(--color-bg-base)">S</span>
            </div>
            <span className="text-sm font-semibold text-(--color-text-primary)">甜星工坊</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-3">
          <NavLink
            to="/projects"
            className={({ isActive }) =>
              `flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive
                  ? "bg-(--color-accent)/10 text-(--color-accent) border-l-2 border-(--color-accent) pl-[10px]"
                  : "text-(--color-text-muted) hover:text-(--color-text-primary) hover:bg-(--color-bg-elevated)"
              }`
            }
          >
            项目列表
          </NavLink>
        </nav>

        {/* New Project CTA */}
        <div className="px-2 py-3 border-t border-(--color-border)">
          <NavLink
            to="/projects/new"
            className={`flex items-center justify-center w-full no-underline ${getButtonClassName({
              size: "compact",
            })}`}
          >
            + 新建项目
          </NavLink>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto p-6">
        <Outlet />
      </main>
    </div>
  );
}
