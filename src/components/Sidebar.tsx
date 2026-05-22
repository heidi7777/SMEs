"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const nav = [
  { href: "/", label: "Dashboard" },
  { href: "/creative", label: "创意工坊" },
  { href: "/visual", label: "视觉车间" },
  { href: "/comms", label: "沟通台" },
  { href: "/marketing", label: "营销工坊" },
  { href: "/assets", label: "资产库" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sidebar">
      <div className="sidebarBrand">
        <div className="sidebarLogo">trea</div>
        <div className="sidebarSub">AI 业务工作台 · MVP</div>
      </div>

      <nav className="sidebarNav">
        {nav.map((item) => {
          const active = pathname === item.href;
          return (
            <Link key={item.href} href={item.href} className={`sidebarItem ${active ? "isActive" : ""}`}>
              <span className="sidebarItemLabel">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

