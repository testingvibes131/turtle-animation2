import Image from "next/image";
import { CaseStudyQuoteText } from "@/features/home/components/CaseStudyQuoteText";
import type { CaseStudyThirdCard as CaseStudyThirdCardData } from "@/features/home/data/caseStudies";

type Props = {
  card: CaseStudyThirdCardData;
};

export function CaseStudyThirdCard({ card }: Props) {
  if (card.kind === "empty") {
    return <div className="h-full min-h-0" aria-hidden />;
  }

  if (card.kind === "applications") {
    return (
      <div className="flex h-full min-h-0 flex-col">
        <div
          className="flex min-h-0 flex-1 flex-col justify-center"
          style={{
            padding:
              "clamp(14px, 1.4vw, 20px) clamp(14px, 1.4vw, 20px) clamp(8px, 0.8vw, 12px) clamp(14px, 1.4vw, 20px)",
          }}
        >
          <ul className="flex w-full flex-col">
            {card.applications.map((app, index) => (
              <li
                key={app.name}
                className={[
                  "flex items-center",
                  index < card.applications.length - 1
                    ? "border-b border-dotted border-white/15"
                    : "",
                ].join(" ")}
                style={{
                  gap: "clamp(10px, 0.9vw, 14px)",
                  padding: "clamp(10px, 1vw, 14px) 0",
                }}
              >
                <Image
                  src={app.logo}
                  alt=""
                  width={40}
                  height={40}
                  className="size-9 shrink-0 rounded-full object-cover lg:size-10"
                />
                <div className="min-w-0 text-left leading-[1.35]">
                  <p className="text-stone-50 max-lg:text-[13px] lg:text-[clamp(14px,1.15vw,17px)]">
                    {app.name}
                  </p>
                  <p className="text-white/50 max-lg:text-[11px] lg:text-[clamp(12px,1vw,14px)]">
                    {app.category}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <div
          className="flex shrink-0 flex-col justify-end"
          style={{
            padding:
              "clamp(8px, 0.8vw, 12px) clamp(14px, 1.4vw, 20px) clamp(18px, 1.6vw, 24px) clamp(14px, 1.4vw, 20px)",
          }}
        >
          <div className="text-left leading-[1.25]">
            {card.footerLines.map((line) => (
              <p
                key={line}
                className="font-normal text-stone-50 max-lg:text-lg lg:text-[clamp(18px,1.6vw,22px)]"
              >
                {line}
              </p>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <CaseStudyQuoteText text={card.text} />
      <div
        className="flex shrink-0 items-end overflow-hidden"
        style={{
          gap: card.avatarSrc ? "clamp(8px, 0.8vw, 12px)" : undefined,
          paddingBottom: "clamp(22px, 2.2vw, 28px)",
          paddingLeft: "clamp(12px, 1.25vw, 14px)",
        }}
      >
        {card.avatarSrc ? (
          <div
            className="inline-flex size-[52px] shrink-0 items-center justify-center overflow-hidden rounded-full outline outline-[0.42px] outline-offset-[-0.42px] outline-stone-50/10"
            style={{
              boxShadow:
                "0 4.5px 56.6px rgba(0,0,0,0.4), inset 2.9px 2.9px 19.3px rgba(215,215,215,0.15), inset 2.9px 0.97px 9.67px rgba(255,255,255,0.25)",
            }}
          >
            <Image
              src={card.avatarSrc}
              alt=""
              width={52}
              height={52}
              className="block size-[52px] rounded-full object-cover"
            />
          </div>
        ) : null}
        <div className="min-w-0 text-left leading-[1.4]">
          <p className="text-stone-50 max-lg:text-sm lg:text-lg">{card.authorName}</p>
          <p className="text-white/50 max-lg:text-[10px] lg:text-xs">{card.authorRole}</p>
        </div>
      </div>
    </div>
  );
}
