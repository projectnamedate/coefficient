"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { LogoMark, LogoWordmark } from "@/components/ui/logo";

const navItems = [
  { href: "/", label: "Scorecard" },
  { href: "/compare", label: "Compare" },
  { href: "/flows", label: "Flows" },
  { href: "/insights", label: "Insights" },
  { href: "/overlap", label: "Overlap" },
  { href: "/simulate", label: "What-If" },
  { href: "/validators", label: "Validators" },
  { href: "/about", label: "About" },
];

export function Header() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

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
            <a
              href="https://mythx.art"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] text-beige/30 font-mono uppercase tracking-wider hidden md:block ml-1 hover:text-lavender transition-colors"
            >
              by Mythx
            </a>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-0.5">
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

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="lg:hidden relative w-8 h-8 flex items-center justify-center"
            aria-label="Toggle menu"
          >
            <div className="flex flex-col gap-1.5">
              <motion.span
                animate={mobileOpen ? { rotate: 45, y: 5 } : { rotate: 0, y: 0 }}
                className="block w-5 h-[1.5px] bg-beige/60 origin-center"
              />
              <motion.span
                animate={mobileOpen ? { opacity: 0 } : { opacity: 1 }}
                className="block w-5 h-[1.5px] bg-beige/60"
              />
              <motion.span
                animate={mobileOpen ? { rotate: -45, y: -5 } : { rotate: 0, y: 0 }}
                className="block w-5 h-[1.5px] bg-beige/60 origin-center"
              />
            </div>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.25, 0.4, 0.25, 1] }}
            className="lg:hidden overflow-hidden border-t border-white/[0.06] bg-dark/95 backdrop-blur-xl"
          >
            <nav className="max-w-7xl mx-auto px-4 py-3 flex flex-col gap-0.5">
              {navItems.map((item, i) => {
                const isActive = pathname === item.href;
                return (
                  <motion.div
                    key={item.href}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                  >
                    <Link
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={`block px-3 py-2.5 rounded-lg text-sm transition-all ${
                        isActive
                          ? "text-lavender font-medium bg-lavender/10"
                          : "text-beige/50 hover:text-white hover:bg-white/[0.04]"
                      }`}
                    >
                      {item.label}
                    </Link>
                  </motion.div>
                );
              })}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
