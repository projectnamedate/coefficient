import { LogoMark } from "@/components/ui/logo";

export function Footer() {
  return (
    <footer className="border-t border-white/[0.06] py-8 mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-beige/40">
          <div className="flex items-center gap-2">
            <LogoMark size={20} className="opacity-50" />
            <span className="font-display text-lavender/60 text-lg">Coefficient</span>
            <span className="text-beige/25">
              by{" "}
              <a
                href="https://mythx.art"
                target="_blank"
                rel="noopener noreferrer"
                className="text-beige/40 hover:text-lavender transition-colors duration-300"
              >
                mythx.art
              </a>
            </span>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <span>Data updates every epoch (~2 days)</span>
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
