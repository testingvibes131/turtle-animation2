import Image from "next/image";

const ASSET = "/cta/turtle-green";
const FRAME = 240;

/** Figma export filenames in public/cta/turtle-green/ */
const files = {
  dotBig2: "Dot-Green-Big2.svg",
  dotBig: "Dot-Green-Big.svg",
  dotMed2: "Dot-Green-Med2.svg",
  dotMed: "Dot-Green-Med.svg",
  dotSmall3: "Dot-Green-Small 3.svg",
  dotBold: "Dot-Green-Bold.svg",
  dotSmall: "Dot-Green-Small.svg",
  inner: "Turtle-Green.svg",
  innerLight: "Turtle-Green-Light.svg",
} as const;

function assetPath(name: string) {
  return `${ASSET}/${encodeURIComponent(name)}`;
}

type OrbitalDotProps = {
  file: string;
  left: number;
  top: number;
  glowInset: string;
};

function pct(value: number) {
  return `${(value / FRAME) * 100}%`;
}

/** Figma dot frame — 20×20 with inner glow asset. */
function OrbitalDot({ file, left, top, glowInset }: OrbitalDotProps) {
  return (
    <div
      className="absolute aspect-square w-[8.333%]"
      style={{ left: pct(left), top: pct(top) }}
    >
      <div className={`relative aspect-square size-full mix-blend-plus-lighter ${glowInset}`}>
        <Image src={assetPath(file)} alt="" fill className="object-contain" sizes="56px" />
      </div>
    </div>
  );
}

/** Figma Turtle-Green (1430:27750) — orb with orbital glow dots. */
export function TurtleGreenIllustration() {
  return (
    <div
      className="relative mx-auto aspect-square w-[clamp(200px,22vw,240px)] shrink-0"
      aria-hidden="true"
    >
      <OrbitalDot file={files.dotBig2} left={211} top={29} glowInset="inset-[-37.5%] left-[10%] right-[10%] top-[10%]" />
      <OrbitalDot file={files.dotBig} left={231} top={109} glowInset="inset-[-42.86%] left-[15%] right-[15%] top-[15%]" />
      <OrbitalDot file={files.dotMed2} left={211} top={191} glowInset="inset-[-50%] left-[20%] right-[20%] top-[20%]" />
      <OrbitalDot file={files.dotMed} left={110} top={230} glowInset="inset-[-60%] left-1/4 right-1/4 top-[25%]" />
      <OrbitalDot file={files.dotSmall3} left={9} top={191} glowInset="inset-[-50%] left-[30%] right-[30%] top-[30%]" />
      <OrbitalDot file={files.dotBold} left={110} top={-10} glowInset="inset-[-33.33%] left-[5%] right-[5%] top-[10%]" />
      <OrbitalDot file={files.dotSmall} left={-11} top={109} glowInset="inset-[-33.33%] left-[35%] right-[35%] top-[35%]" />

      {/* Orb ships as two hand-authored SVGs (a CSS invert would flip the core
          glow's luminosity); the theme picks which one shows. */}
      <div className="absolute left-1/2 top-1/2 aspect-square w-[56.667%] -translate-x-1/2 -translate-y-1/2">
        <Image
          src={assetPath(files.inner)}
          alt=""
          fill
          className="theme-asset-dark object-contain"
          sizes="136px"
        />
        <Image
          src={assetPath(files.innerLight)}
          alt=""
          fill
          className="theme-asset-light object-contain"
          sizes="136px"
        />
      </div>
    </div>
  );
}
