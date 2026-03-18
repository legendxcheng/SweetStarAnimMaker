import { Outlet } from "react-router-dom";

export function Layout() {
  return (
    <div className="app-layout">
      <header className="app-header">
        <h1>Sweet Star Studio</h1>
      </header>
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}
