import type { ReactNode } from "react";
import Sidebar from "./Sidebar";

export default function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="appShell flex h-full w-full overflow-hidden">
      <Sidebar />
      <div className="appMain">{children}</div>
    </div>
  );
}

