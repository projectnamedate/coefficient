"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

interface SearchResult {
  type: "pool" | "validator";
  id: string;
  name: string;
  subtitle: string;
}

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Keyboard shortcut: Cmd/Ctrl + K
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery("");
      setResults([]);
      setSelectedIndex(0);
    }
  }, [open]);

  // Debounced search
  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`, {
          signal: controller.signal,
        });
        const data = await res.json();
        setResults([...data.pools, ...data.validators]);
        setSelectedIndex(0);
      } catch {
        // aborted
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [query]);

  function navigate(result: SearchResult) {
    setOpen(false);
    if (result.type === "pool") {
      router.push(`/pool/${result.id}`);
    } else {
      router.push(`/validator/${result.id}`);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter" && results[selectedIndex]) {
      navigate(results[selectedIndex]);
    }
  }

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-beige/40 text-xs hover:bg-white/[0.06] hover:text-beige/60 transition-all"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <span className="hidden sm:inline">Search</span>
        <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-white/[0.06] text-[10px] font-mono text-beige/30">
          <span className="text-[9px]">⌘</span>K
        </kbd>
      </button>

      {/* Search modal */}
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
              onClick={() => setOpen(false)}
            />

            {/* Dialog */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              transition={{ duration: 0.15 }}
              className="fixed top-[20%] left-1/2 -translate-x-1/2 w-full max-w-lg z-[61]"
            >
              <div className="mx-4 bg-dark-deep border border-white/10 rounded-xl shadow-2xl overflow-hidden">
                {/* Input */}
                <div className="flex items-center gap-3 px-4 border-b border-white/[0.06]">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-beige/30 shrink-0">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  <input
                    ref={inputRef}
                    type="text"
                    placeholder="Search pools or validators..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="flex-1 bg-transparent text-white text-sm py-3.5 outline-none placeholder:text-beige/25"
                  />
                  {loading && (
                    <div className="w-4 h-4 border-2 border-lavender/30 border-t-lavender rounded-full animate-spin" />
                  )}
                </div>

                {/* Results */}
                {results.length > 0 && (
                  <div className="max-h-72 overflow-y-auto py-2">
                    {results.map((r, i) => (
                      <button
                        key={`${r.type}-${r.id}`}
                        onClick={() => navigate(r)}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                          i === selectedIndex ? "bg-lavender/10" : "hover:bg-white/[0.04]"
                        }`}
                      >
                        <span className={`text-[10px] font-mono uppercase px-1.5 py-0.5 rounded ${
                          r.type === "pool"
                            ? "bg-lavender/15 text-lavender"
                            : "bg-info/15 text-info"
                        }`}>
                          {r.type === "pool" ? "Pool" : "Val"}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white truncate">{r.name}</p>
                          {r.subtitle && (
                            <p className="text-[11px] text-beige/30 truncate">{r.subtitle}</p>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* Empty state */}
                {query.length >= 2 && !loading && results.length === 0 && (
                  <div className="py-8 text-center text-sm text-beige/30">
                    No results for &ldquo;{query}&rdquo;
                  </div>
                )}

                {/* Hint */}
                {query.length < 2 && (
                  <div className="py-8 text-center text-xs text-beige/20">
                    Type at least 2 characters to search
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
