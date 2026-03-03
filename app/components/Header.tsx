import Link from "next/link";

export default function Header() {
  return (
    <header className="border-b border-white/[0.06] px-6 py-5 bg-[#0A0A0A]">
      <div className="max-w-3xl mx-auto flex items-center gap-3">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-8 h-8 rounded bg-[#7C3AED] flex items-center justify-center text-xs font-bold tracking-tight text-white">
            AE
          </div>
          <span className="text-[13px] font-medium tracking-widest text-white/40 uppercase group-hover:text-white/60 transition-colors">
            Architects Edge
          </span>
        </Link>
      </div>
    </header>
  );
}
