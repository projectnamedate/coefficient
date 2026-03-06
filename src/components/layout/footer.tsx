export function Footer() {
  return (
    <footer className="border-t border-white/10 py-6 mt-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-beige/50">
          <div className="flex items-center gap-2">
            <span className="font-display text-lavender/70">Coefficient</span>
            <span>by mythx</span>
          </div>
          <div className="flex items-center gap-4">
            <span>Data updates every epoch (~2 days)</span>
            <a
              href="https://github.com/projectnamedate/coefficient"
              target="_blank"
              rel="noopener noreferrer"
              className="text-info hover:text-lavender transition-colors"
            >
              GitHub
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
