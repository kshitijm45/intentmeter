import Link from "next/link";

export default function FeatureCard({ icon, title, description, href }) {
  return (
    <Link href={href} className="group block">
      <div
        className="h-full rounded-xl p-6 border transition-all duration-200"
        style={{
          background: "var(--bg-card)",
          borderColor: "var(--border)",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--accent-border)"; e.currentTarget.style.background = "var(--bg-input)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.background = "var(--bg-card)"; }}
      >
        <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-4 bg-[var(--accent-bg)] border border-[var(--accent-border)]">
          {icon}
        </div>
        <h3 className="text-[var(--txt)] font-semibold text-base mb-2 group-hover:text-orange-600 transition-colors duration-200">
          {title}
        </h3>
        <p className="text-[var(--txt-3)] text-sm leading-relaxed">{description}</p>
        <div className="mt-4 flex items-center gap-1 text-orange-600 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <span>Explore</span>
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </Link>
  );
}
