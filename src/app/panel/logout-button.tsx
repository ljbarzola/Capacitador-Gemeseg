"use client";

import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { getClientAuth } from "@/lib/firebase/client";

export function LogoutButton() {
  const router = useRouter();

  async function onClick() {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    await signOut(getClientAuth()).catch(() => {});
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-navy hover:bg-zinc-50"
    >
      Salir
    </button>
  );
}
