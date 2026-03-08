import Link from "next/link";
import { LogoMark } from "@/components/ui/logo";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      <LogoMark size={80} className="opacity-30 mb-8" />
      <h1 className="text-6xl font-bold text-white font-display tracking-tight mb-2">404</h1>
      <p className="text-lg text-beige/50 mb-8">
        This page doesn&apos;t exist — or the pool hasn&apos;t been indexed yet.
      </p>
      <div className="flex items-center gap-4">
        <Link
          href="/"
          className="px-5 py-2.5 rounded-lg bg-lavender/10 text-lavender text-sm font-medium hover:bg-lavender/20 transition-colors"
        >
          View Scorecard
        </Link>
        <Link
          href="/validators"
          className="px-5 py-2.5 rounded-lg bg-white/5 text-beige/60 text-sm font-medium hover:bg-white/10 transition-colors"
        >
          Browse Validators
        </Link>
      </div>
      <p className="text-xs text-beige/20 mt-12 font-mono">
        coefficient.mythx.art ·{" "}
        <a
          href="https://mythx.art"
          target="_blank"
          rel="noopener noreferrer"
          className="text-lavender/30 hover:text-lavender/60 transition-colors"
        >
          by Mythx
        </a>
      </p>
    </div>
  );
}
