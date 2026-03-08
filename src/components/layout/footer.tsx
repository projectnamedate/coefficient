import { LogoMark } from "@/components/ui/logo";

export function Footer() {
  return (
    <footer className="border-t border-white/[0.08] mt-16">
      <div className="accent-line" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-beige/40">
          <div className="flex items-center gap-2.5">
            <LogoMark size={20} className="opacity-50" />
            <span className="font-display text-lavender/70 text-lg tracking-wide">Coefficient</span>
            <span className="text-beige/30">
              by{" "}
              <a
                href="https://mythx.art"
                target="_blank"
                rel="noopener noreferrer"
                className="text-beige/40 hover:text-lavender hover:drop-shadow-[0_0_6px_rgba(181,178,217,0.4)] transition-all duration-300"
              >
                Mythx
              </a>
            </span>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <span>Data updates daily</span>
            <span className="text-beige/15">·</span>
            <span className="text-beige/25">&copy; {new Date().getFullYear()}</span>
            <a
              href="https://github.com/projectnamedate/coefficient"
              target="_blank"
              rel="noopener noreferrer"
              className="text-lavender/40 hover:text-lavender transition-colors duration-300"
            >
              GitHub
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
