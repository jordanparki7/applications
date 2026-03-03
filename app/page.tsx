import Link from "next/link";
import Image from "next/image";

const roles = [
  { slug: "behaviours", title: "Behaviours" },
  { slug: "project-manager", title: "Project Manager" },
  { slug: "3d-modeller", title: "3D Modeller" },
  { slug: "texture-artist", title: "Texture Artist" },
];

export default function Home() {
  return (
    <div className="h-screen bg-[#0A0A0A] text-white flex flex-col overflow-auto">
      {/* Header */}
      <header className="shrink-0 border-b border-white/[0.06] px-6 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-center gap-3">
          <Image
            src="/botlogo.svg"
            alt="Logo"
            width={32}
            height={32}
            className="w-8 h-8 rounded-lg"
          />
          <span className="text-[12px] font-medium tracking-widest text-white/40 uppercase">
            Architects Edge
          </span>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 flex items-center justify-center px-5 py-8 sm:py-12">
        <div className="w-full max-w-xl animate-fade-in">
          {/* Title */}
          <h1 className="text-2xl sm:text-3xl font-bold text-center mb-8 tracking-tight">
            Welcome to <span className="text-[#7C3AED]">Architects Edge</span>
          </h1>

          {/* Intro */}
          <div className="text-sm text-white/60 leading-[1.75] space-y-5 mb-8">
            <p>
              This portal will guide you through our application process
              step-by-step &ndash; we want to understand how you think, solve
              problems and communicate your ideas.
            </p>
            <p>
              You&apos;ll encounter questions that require short written responses,
              practical tasks relevant to your chosen role and some personal
              questions to help get to know you better. Each section builds on
              the last, so please read carefully and answer thoughtfully.
            </p>
            <p>
              Please follow the prompts and answer all questions honestly and
              independently. We assess not only accuracy, but also your
              reasoning, clarity and approach.
            </p>
            <p>
              We expect this application process to take approximately 10&ndash;15
              minutes. Once you submit your responses, they will be reviewed and
              you&apos;ll be contacted regarding next steps if appropriate.
            </p>
          </div>

          {/* Divider + prompt */}
          <div className="border-t border-white/[0.06] pt-6 mb-5">
            <p className="text-sm text-white/55 text-center font-medium">
              Please select the role you wish to apply for below
            </p>
          </div>

          {/* Role buttons */}
          <div className="grid grid-cols-2 gap-3 stagger">
            {roles.map((r) => (
              <Link
                key={r.slug}
                href={`/apply/${r.slug}`}
                className="group flex items-center justify-center gap-2.5 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3.5 sm:py-4 text-center transition-all duration-300 hover:border-[#7C3AED]/40 hover:bg-[#7C3AED]/[0.06]"
              >
                <span className="text-[13px] sm:text-sm font-semibold group-hover:text-[#C4B5FD] transition-colors">
                  {r.title}
                </span>
                <span className="text-white/15 group-hover:text-[#7C3AED]/60 group-hover:translate-x-0.5 transition-all text-sm">
                  →
                </span>
              </Link>
            ))}
          </div>

          <p className="text-xs text-white/30 text-center mt-6">
            Estimated time: 10&ndash;15 minutes
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="shrink-0 border-t border-white/[0.06] px-6 py-3">
        <div className="max-w-2xl mx-auto flex flex-col items-center justify-center gap-2 text-[10px] text-white/20">
          <span>© 2026 Architects Edge</span>
          <div className="flex items-center justify-center gap-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.02] whitespace-nowrap" style={{ padding: '6px 20px 6px 14px' }}>
              <Image
                src="/ptlogo.png"
                alt="Official Minecraft Partner"
                width={18}
                height={18}
                className="w-[18px] h-[18px] object-contain"
              />
              <span className="text-[10px] text-white/45">Official Minecraft Partner</span>
            </div>
            <span>Confidential</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
