import { DM_Sans } from "next/font/google";

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500"],
});

type StatCardProps = {
  label: string;
  value: string;
};

function StatCard({ label, value }: StatCardProps) {
  return (
    <div className="flex h-20 min-w-[205px] flex-none flex-col justify-center gap-2 rounded-[20px] border border-[rgba(249,249,249,0.1)] bg-[#191a19] px-5 py-[15px] shadow-[0_4px_2px_rgba(0,0,0,0.25)]">
      <p className="truncate text-xs font-medium leading-[1.2] text-[rgba(249,249,249,0.5)]">
        {label}
      </p>
      <p className="whitespace-nowrap text-xl font-normal leading-[1.2] text-[#f9f9f9]">
        {value}
      </p>
    </div>
  );
}

export function HomeStatsStrip() {
  return (
    <aside
      className={`${dmSans.className} pointer-events-none absolute bottom-6 left-6 z-10 flex gap-2.5 overflow-x-auto pb-0.5 scrollbar-none`}
      aria-label="Platform statistics"
    >
      <StatCard label="LPs & Wallets" value="2,400+" />
      <StatCard label="Protocol patterns" value="38+" />
      <StatCard label="Markets & Ecosystems" value="12+" />
    </aside>
  );
}
