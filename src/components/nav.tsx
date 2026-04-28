"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileText, Calendar, BarChart3, ListTodo, Upload } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", label: "Report", icon: FileText },
  { href: "/calendar", label: "Calendar", icon: Calendar },
  { href: "/report", label: "Analytics", icon: BarChart3 },
  { href: "/tasks", label: "Tasks", icon: ListTodo },
  { href: "/import", label: "Import", icon: Upload },
];

export function Nav() {
  const pathname = usePathname();

  return (
    <nav className={cn(
      "fixed z-50 flex",
      "bottom-4 left-1/2 -translate-x-1/2 flex-row gap-1 bg-[var(--color-bg)]/80 backdrop-blur-lg shadow-lg rounded-full px-2 py-1.5",
      "md:bottom-auto md:left-4 md:top-1/2 md:translate-x-0 md:-translate-y-1/2 md:flex-col md:gap-2 md:bg-transparent md:backdrop-blur-none md:shadow-none md:rounded-none md:px-0 md:py-0"
    )}>
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const isActive =
          href === "/"
            ? pathname === "/"
            : pathname.startsWith(href);

        return (
          <Link
            key={href}
            href={href}
            title={label}
            className={cn(
              "w-9 h-9 flex items-center justify-center rounded-full transition-all ease-in duration-100",
              isActive
                ? "bg-[var(--color-accent)] text-white"
                : "text-[var(--color-main)] hover:text-[var(--color-accent)] hover:bg-gray-200/60"
            )}
          >
            <Icon size={16} />
          </Link>
        );
      })}
    </nav>
  );
}
