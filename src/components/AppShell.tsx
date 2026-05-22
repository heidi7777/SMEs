import type { ReactNode } from "react";
import Sidebar from "./Sidebar";

export default function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="appShell">
      <Sidebar />
      <div className="appMain">{children}</div>
    </div>
  );
}

