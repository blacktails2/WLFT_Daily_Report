"use client";

export function PageTitle({ title }: { title: string }) {
  return (
    <div
      className="fixed bottom-6 right-6 text-[28px] sm:text-[36px] md:text-[44px] lg:text-[54px] text-[var(--color-accent)] pointer-events-none select-none"
      style={{
        zIndex: -1,
        fontFamily: '"Doppo Expanded Black", sans-serif',
        fontFeatureSettings: '"ss01", "ss02", "ss03", "ss04", "ss06"',
        letterSpacing: "-0.015em",
        writingMode: "vertical-rl",
        textOrientation: "mixed",
        lineHeight: 1,
      }}
    >
      <span style={{ WebkitTextStroke: "1px var(--color-accent)", WebkitTextFillColor: "transparent" }}>WLPHDR</span>
      <br />
      <span>{title}</span>
    </div>
  );
}
