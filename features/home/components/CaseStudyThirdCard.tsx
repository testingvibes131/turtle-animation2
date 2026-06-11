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
          className="flex min-h-0 flex-1 flex-col justify-start"
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
                    ? "border-b border-dotted border-[var(--stroke-strong)]"
                    : "",
                ].join(" ")}
                style={{
                  gap: "clamp(8px, 0.9vw, 14px)",
                  padding: "clamp(8px, 1vw, 14px) 0",
                }}
              >
                <Image
                  src={app.logo}
                  alt=""
                  width={40}
                  height={40}
                  className="size-7 shrink-0 rounded-full object-cover lg:size-10"
                />
                <div className="min-w-0 text-left leading-[1.35]">
                  <p className="text-ink-primary max-lg:text-[10px] lg:text-[clamp(14px,1.15vw,17px)]">
                    {app.name}
                  </p>
                  <p className="text-ink-subtle max-lg:text-[9px] lg:text-[clamp(12px,1vw,14px)]">
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
          <div className="text-left leading-[1.4]">
            {card.footerLines.map((line) => (
              <p key={line} className="text-ink-primary max-lg:text-[13px] lg:text-lg">
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
      <CaseStudyQuoteText text={card.text} mobileText={card.mobileText} />
      <div
        className="flex shrink-0 items-end overflow-hidden"
        style={{
          gap: card.avatarSrc ? "clamp(8px, 0.8vw, 12px)" : undefined,
          paddingBottom: "clamp(22px, 2.2vw, 28px)",
          paddingLeft: "clamp(12px, 1.25vw, 14px)",
        }}
      >
        {card.avatarSrc ? (
          <div className="case-avatar-gloss inline-flex size-[52px] shrink-0 items-center justify-center overflow-hidden rounded-full outline outline-[0.42px] outline-offset-[-0.42px] outline-[var(--stroke-subtle)]">
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
          <p className="text-ink-primary max-lg:text-[13px] lg:text-lg">{card.authorName}</p>
          <p className="text-ink-subtle max-lg:text-[10px] lg:text-xs">
            {card.authorRole.includes(" & ") ? (
              <>
                {card.authorRole.slice(0, card.authorRole.indexOf(" & ") + 1)}
                <span className="max-lg:block">
                  {card.authorRole.slice(card.authorRole.indexOf(" & ") + 1)}
                </span>
              </>
            ) : (
              card.authorRole
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
