"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

// Enlace del menú del curso que resalta la actividad abierta.
export function ItemLink({ href, children }: { href: string; children: ReactNode }) {
  const current = usePathname() === href;
  return (
    <Link
      href={href}
      aria-current={current ? "page" : undefined}
      className={`flex items-start gap-2.5 rounded-md border-l-2 px-2 py-1.5 ${
        current ? "border-brand bg-zinc-100 font-semibold text-navy" : "border-transparent text-zinc-700 hover:bg-zinc-100"
      }`}
    >
      {children}
    </Link>
  );
}
