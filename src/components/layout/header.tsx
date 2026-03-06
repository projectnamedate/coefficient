"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { LogoMark, LogoWordmark } from "@/components/ui/logo";

const navItems = [
  { href: "/", label: "Scorecard" },
  { href: "/flows", label: "Stake Flows" },
  { href: "/validators", label: "Validators" },
  { href: "/about", label: "About" },
];

export function Header() {
  const pathname = usePathname();

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: [0.25, 0.4, 0.25, 1] }}
      className="border-b border-white/[0.06] bg-dark/80 backdrop-blur-xl sticky top-0 z-50"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          <Link href="/" className="flex items-center gap-2.5 group">
            <LogoMark size={28} className="transition-transform duration-300 group-hover:scale-110" />
            <LogoWordmark className="hidden sm:block" />
            <span className="text-[10px] text-beige/30 font-mono uppercase tracking-wider hidden md:block ml-1">
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
                  className={`relative px-3 py-1.5 rounded-md text-sm transition-all duration-200 ${
                    isActive
                      ? "text-lavender font-medium"
                      : "text-beige/50 hover:text-white hover:bg-white/[0.04]"
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="nav-active"
                      className="absolute inset-0 rounded-md bg-lavender/10"
                      transition={{ type: "spring", stiffness: 500, damping: 35 }}
                    />
                  )}
                  <span className="relative">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </motion.header>
  );
}
