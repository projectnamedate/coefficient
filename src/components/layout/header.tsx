"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "Scorecard" },
  { href: "/flows", label: "Stake Flows" },
  { href: "/validators", label: "Validators" },
];

export function Header() {
  const pathname = usePathname();

  return (
    <header className="border-b border-white/[0.06] bg-dark/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          <Link href="/" className="flex items-center gap-2.5 group">
            <span className="font-display text-xl text-lavender tracking-wide group-hover:text-lavender-light transition-colors">
              Coefficient
            </span>
            <span className="text-[10px] text-beige/30 font-mono uppercase tracking-wider hidden sm:block">
              by mythx
            </span>
          </Link>

          <nav className="flex items-center gap-0.5">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-1.5 rounded-md text-sm transition-all duration-200 ${
                    isActive
                      ? "bg-lavender/10 text-lavender font-medium"
                      : "text-beige/50 hover:text-white hover:bg-white/[0.04]"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
}
