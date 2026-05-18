"use client";

import {
  MARKER_MOTION_OPTIONS,
  type MarkerMotionMode,
} from "@/app/v2/lib/markerMode";

type MarkerMotionDebugControlsProps = {
  mode: MarkerMotionMode;
  onChange: (mode: MarkerMotionMode) => void;
};

export function MarkerMotionDebugControls({
  mode,
  onChange,
}: MarkerMotionDebugControlsProps) {
  const active = MARKER_MOTION_OPTIONS.find((o) => o.mode === mode);

  return (
    <div className="pointer-events-auto fixed bottom-6 left-6 z-20 flex flex-col gap-2">
      <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-[#666]">
        Marker motion (debug)
      </p>
      <div className="inline-flex rounded-full border border-[#333] bg-[#0a0a0a]/90 p-0.5 backdrop-blur-sm">
        {MARKER_MOTION_OPTIONS.map((option) => {
          const isActive = option.mode === mode;
          return (
            <button
              key={option.mode}
              type="button"
              onClick={() => onChange(option.mode)}
              className={[
                "rounded-full px-3 py-1.5 text-xs transition-colors",
                isActive
                  ? "bg-[#f0f0f0] text-black"
                  : "text-[#aaa] hover:text-white",
              ].join(" ")}
              aria-pressed={isActive}
              title={option.description}
            >
              {option.label}
            </button>
          );
        })}
      </div>
      {active ? (
        <p className="max-w-xs text-[11px] leading-snug text-[#777]">
          {active.description}
        </p>
      ) : null}
    </div>
  );
}
