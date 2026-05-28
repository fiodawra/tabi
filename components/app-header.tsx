"use client";

import Link from "next/link";
import { HeaderAuth } from "@/components/header-auth";
import { HeaderSearch } from "@/components/header-search";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { ModeToggle } from "@/components/mode-toggle";
import { Separator } from "./ui/separator";

export function AppHeader() {
  return (
    <header className="flex h-12 justify-between items-center gap-3 p-4 bg-sidebar">
      <Link href="/">
        <h1 className="text-lg font-bold text-foreground">Tabi</h1>
      </Link>
      <div className="flex items-center gap-3">
        <HeaderSearch />

        <LocaleSwitcher />

        <ModeToggle />

        <HeaderAuth />
      </div>
    </header>
  );
}
