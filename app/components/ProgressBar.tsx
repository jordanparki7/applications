"use client";

const STEPS = ["Screening", "Interview", "Competency", "Future"];

export default function ProgressBar({ current }: { current: number }) {
  const pct = ((current + 1) / STEPS.length) * 100;

  return (
    <div className="mb-10">
      <div className="flex justify-between text-[11px] font-medium mb-2">
        {STEPS.map((s, i) => (
          <span
            key={s}
            className={
              i <= current ? "text-[#8B5CF6]" : "text-white/20"
            }
          >
            {s}
          </span>
        ))}
      </div>
      <div className="h-[3px] bg-white/[0.06] rounded-full overflow-hidden">
        <div
          className="h-full bg-[#7C3AED] rounded-full transition-all duration-700 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
