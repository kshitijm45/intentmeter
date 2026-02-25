import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-[var(--border)] mt-auto" style={{ background: "var(--bg-card)" }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-md bg-orange-600 flex items-center justify-center">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent-fg)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M8 12l3 3 5-5" />
                </svg>
              </div>
              <span className="text-[var(--txt)] font-bold text-lg">Intentmeter</span>
            </div>
            <p className="text-[var(--txt-3)] text-sm leading-relaxed">
              Professional cricket analytics. Decode intent, understand performance.
            </p>
          </div>

          {/* Nav */}
          <div>
            <h4 className="text-[var(--txt)] text-sm font-semibold mb-3 uppercase tracking-wider">Explore</h4>
            <ul className="space-y-2 text-sm text-[var(--txt-3)]">
              {[
                { label: "Players", href: "/players/virat-kohli" },
                { label: "Matchups", href: "/matchup" },
                { label: "Stats Explorer", href: "/explorer" },
                { label: "AI Assistant", href: "/assistant" },
              ].map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="hover:text-orange-600 transition-colors duration-150">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Info */}
          <div>
            <h4 className="text-[var(--txt)] text-sm font-semibold mb-3 uppercase tracking-wider">About</h4>
            <p className="text-[var(--txt-3)] text-sm leading-relaxed">
              Intentmeter uses advanced shot-level and ball-level data across T20 leagues and international cricket to surface meaningful performance insights.
            </p>
          </div>
        </div>

        <div className="border-t border-[var(--border)] mt-8 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-[var(--txt-3)] text-xs">© {new Date().getFullYear()} Intentmeter. All rights reserved.</p>
          <p className="text-[var(--txt-3)] text-xs">Data for demonstration purposes only.</p>
        </div>
      </div>
    </footer>
  );
}
