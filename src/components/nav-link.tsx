"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

// "header": enlaces sobre el encabezado azul marino. "tab": pestañas de una sección.
export function NavLink({
  href,
  exact,
  variant = "tab",
  children,
}: {
  href: string;
  exact?: boolean;
  variant?: "header" | "tab";
  children: ReactNode;
}) {
  const pathname = usePathname();
  const active = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
  const style =
    variant === "header"
      ? active
        ? "border-brand text-white"
        : "border-transparent text-white/70 hover:text-white"
      : active
        ? "border-brand text-navy"
        : "border-transparent text-zinc-600 hover:border-zinc-300 hover:text-navy";
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`whitespace-nowrap border-b-2 px-1 py-2 text-sm font-semibold transition-colors ${style}`}
    >
      {children}
    </Link>
  );
}
