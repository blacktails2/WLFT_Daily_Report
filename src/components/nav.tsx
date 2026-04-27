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
    <nav className="fixed left-4 top-1/2 -translate-y-1/2 z-50 flex flex-col gap-2">
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
