"use client";

import { Html } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type RefObject,
} from "react";
import * as THREE from "three";
import type { AprRange } from "@/app/v2/lib/apr";
import type { TerrainCell } from "@/app/v2/lib/gridLayout";
import {
  cellToLabelContent,
  FEATURED_PIN_SHOW_NAME_LABEL,
  FEATURED_PIN_Y_OFFSET,
  featuredFlagDisplayCell,
  featuredStickApr,
  featuredLabelOpacity,
  getFeaturedPinLabelPosition,
  isFeaturedFlagVisible,
  resolveFeaturedLabelContent,
  type LockedLabelContent,
} from "@/app/v2/lib/featuredPinVisuals";
import {
  dominantFeaturedAtCrossing,
  sourceCellAtCrossing,
} from "@/app/v2/lib/scrolledCell";
import { getFeaturedFlagPose } from "@/app/v2/lib/markerPosition";
import { FLAG_BLEND_SHOW_THRESHOLD } from "@/app/v2/lib/scrolledDnaBlend";
import {
  markerDepthOpacity,
  type MarkerDepthFadeRange,
} from "@/app/v2/lib/markerDepthFade";
import type { TerrainWaveSnapshot } from "@/app/v2/lib/terrainWave";
import { dmSansFontFamily, r3fHtmlFontClassName } from "@/app/fonts";

/** Fixed layout width (px) — do not use tiny max-width + word-break or min-content collapses to 1 char/line. */
const LABEL_WIDTH_PX = 112;
/** Base px before drei screen `scale` (non-transform Html: lower distanceFactor = smaller). */
const LABEL_BASE_FONT_PX = 5;
const OPACITY_EPSILON = 0.02;
const OPACITY_WRITE_EPSILON = 0.004;
/** Hysteresis so blend lerp around the show threshold does not flicker. */
const PIN_HIDE_BLEND = FLAG_BLEND_SHOW_THRESHOLD - 0.02;
/** Drop from tracking once blend has settled near rest (after label fade-out). */
const BLEND_IDLE_EPSILON = 0.05;

const labelWrap: CSSProperties = {
  pointerEvents: "none",
  userSelect: "none",
  margin: 0,
  padding: 0,
  fontFamily: dmSansFontFamily,
  textAlign: "left",
  lineHeight: 1.15,
  textShadow: "0 1px 6px rgba(0,0,0,0.85), 0 0 1px rgba(0,0,0,0.9)",
  color: "#f9f9f9",
  whiteSpace: "normal",
};

const fadeWrapStyle: CSSProperties = {
  opacity: 0,
  fontSize: LABEL_BASE_FONT_PX,
  transform: "translateY(-50%)",
  width: LABEL_WIDTH_PX,
  boxSizing: "border-box",
  whiteSpace: "normal",
  overflowWrap: "break-word",
};

const nameStyle: CSSProperties = {
  fontSize: "1.15em",
  fontWeight: 600,
  display: FEATURED_PIN_SHOW_NAME_LABEL ? undefined : "none",
};

const aprRowStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  alignItems: "baseline",
  gap: 2,
  lineHeight: 1.1,
  marginTop: FEATURED_PIN_SHOW_NAME_LABEL ? 1 : 0,
};

const aprValueStyle: CSSProperties = {
  fontSize: "1em",
  fontWeight: 600,
};

const aprSuffixStyle: CSSProperties = {
  fontSize: "0.82em",
  fontWeight: 500,
  opacity: 0.88,
};

type SlotState = {
  text: LockedLabelContent | null;
  opacity: number;
  blend: number;
  pinShown: boolean;
  lastOpacityWrite: number;
};

type LabelDom = {
  fade: HTMLDivElement;
  name: HTMLDivElement;
  aprValue: HTMLDivElement;
  aprSuffix: HTMLDivElement;
};

function pinVisibleWithHysteresis(slot: SlotState, blend: number): boolean {
  if (blend > FLAG_BLEND_SHOW_THRESHOLD) {
    slot.pinShown = true;
  } else if (blend < PIN_HIDE_BLEND) {
    slot.pinShown = false;
  }
  return slot.pinShown;
}

function updateLabelSlot(
  slot: SlotState,
  incoming: LockedLabelContent | null,
  blend: number,
): boolean {
  const pinVisible = pinVisibleWithHysteresis(slot, blend);
  const stickOpacity = featuredLabelOpacity(blend);

  if (!pinVisible) {
    slot.blend = blend;
    if (!slot.text) {
      slot.opacity = 0;
      return false;
    }
    slot.opacity = stickOpacity;
    if (slot.opacity <= OPACITY_EPSILON) {
      slot.text = null;
    }
    return slot.text !== null;
  }

  if (!incoming) {
    slot.blend = blend;
    slot.opacity = 0;
    return false;
  }

  if (!slot.text) {
    slot.text = incoming;
    slot.opacity = stickOpacity;
    slot.blend = blend;
    return true;
  }

  if (incoming.id !== slot.text.id) {
    slot.opacity = stickOpacity;
    slot.blend = blend;
    if (slot.opacity <= OPACITY_EPSILON) {
      slot.text = incoming;
      slot.opacity = featuredLabelOpacity(blend);
    }
    return true;
  }

  slot.text = incoming;
  slot.opacity = stickOpacity;
  slot.blend = blend;
  return true;
}

type FeaturedPinLabelProps = {
  index: number;
  distanceFactor: number;
  onMount: (index: number, dom: LabelDom, group: THREE.Group) => void;
  onUnmount: (index: number) => void;
};

function FeaturedPinLabel({
  index,
  distanceFactor,
  onMount,
  onUnmount,
}: FeaturedPinLabelProps) {
  const groupRef = useRef<THREE.Group>(null);
  const fadeRef = useRef<HTMLDivElement>(null);
  const nameRef = useRef<HTMLDivElement>(null);
  const aprValueRef = useRef<HTMLDivElement>(null);
  const aprSuffixRef = useRef<HTMLDivElement>(null);
  const mountedRef = useRef(false);

  const tryRegister = useCallback(() => {
    const g = groupRef.current;
    const fade = fadeRef.current;
    const name = nameRef.current;
    const aprValue = aprValueRef.current;
    const aprSuffix = aprSuffixRef.current;
    if (!g || !fade || !name || !aprValue || !aprSuffix || mountedRef.current) {
      return;
    }
    mountedRef.current = true;
    onMount(index, { fade, name, aprValue, aprSuffix }, g);
  }, [index, onMount]);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      onUnmount(index);
    };
  }, [index, onUnmount]);

  return (
    <group
      ref={(node) => {
        groupRef.current = node;
        tryRegister();
      }}
    >
      <Html
        className={r3fHtmlFontClassName}
        center={false}
        occlude={false}
        pointerEvents="none"
        distanceFactor={distanceFactor}
        zIndexRange={[100, 0]}
        style={labelWrap}
      >
        <div
          ref={(node) => {
            fadeRef.current = node;
            tryRegister();
          }}
          style={fadeWrapStyle}
        >
          <div
            ref={(node) => {
              nameRef.current = node;
              tryRegister();
            }}
            style={nameStyle}
          />
          <div style={aprRowStyle}>
            <div
              ref={(node) => {
                aprValueRef.current = node;
                tryRegister();
              }}
              style={aprValueStyle}
            />
            <div
              ref={(node) => {
                aprSuffixRef.current = node;
                tryRegister();
              }}
              style={aprSuffixStyle}
            />
          </div>
        </div>
      </Html>
    </group>
  );
}

type FeaturedPinLabelsProps = {
  featured: TerrainCell[];
  cellPitch: number;
  waveRef: RefObject<TerrainWaveSnapshot>;
  markersMoveWithBelt: boolean;
  sphereRadiusRatio: number;
  depthFadeRange: MarkerDepthFadeRange;
  depthFadeMinOpacity: number;
  dnaLookup?: (TerrainCell | undefined)[][];
  dnaBlendsRef?: RefObject<Float32Array>;
  aprRange: AprRange;
};

export function FeaturedPinLabels({
  featured,
  cellPitch,
  waveRef,
  markersMoveWithBelt,
  sphereRadiusRatio,
  depthFadeRange,
  depthFadeMinOpacity,
  dnaLookup,
  dnaBlendsRef,
  aprRange,
}: FeaturedPinLabelsProps) {
  /** Non-transform Html scales as `objectScale * distanceFactor` — lower = smaller on screen. */
  const distanceFactor = useMemo(
    () => Math.max(3.5, cellPitch * 3.5),
    [cellPitch],
  );
  const camera = useThree((s) => s.camera);
  const slotsRef = useRef<Map<number, SlotState>>(new Map());
  const domRef = useRef<Map<number, LabelDom>>(new Map());
  const groupsRef = useRef<Map<number, THREE.Group>>(new Map());
  const labelPos = useRef(new THREE.Vector3());
  const trackedRef = useRef<Set<number>>(new Set());
  const [activeIndices, setActiveIndices] = useState<number[]>([]);
  const activeKeyRef = useRef("");

  const onMount = useCallback(
    (index: number, dom: LabelDom, group: THREE.Group) => {
      domRef.current.set(index, dom);
      groupsRef.current.set(index, group);
    },
    [],
  );

  const onUnmount = useCallback((index: number) => {
    domRef.current.delete(index);
    groupsRef.current.delete(index);
  }, []);

  useFrame(() => {
    const { prepared, elapsed } = waveRef.current;
    if (!prepared) return;

    const blends = dnaBlendsRef?.current;
    const { cols, rows } = prepared;
    const tracked = trackedRef.current;
    const nextActive: number[] = [];
    const toDrop: number[] = [];

    const getSlot = (index: number): SlotState => {
      let slot = slotsRef.current.get(index);
      if (!slot) {
        slot = {
          text: null,
          opacity: 0,
          blend: 0,
          pinShown: false,
          lastOpacityWrite: -1,
        };
        slotsRef.current.set(index, slot);
      }
      return slot;
    };

    if (blends && dnaLookup) {
      for (let i = 0; i < featured.length; i++) {
        if (tracked.has(i)) continue;
        const blend = blends[i] ?? 0;
        if (blend > FLAG_BLEND_SHOW_THRESHOLD || getSlot(i).text) {
          tracked.add(i);
        }
      }

      for (const i of tracked) {
        const cell = featured[i];
        if (!cell) {
          toDrop.push(i);
          continue;
        }

        const blend = blends[i] ?? 0;
        const slot = getSlot(i);

        if (blend < BLEND_IDLE_EPSILON && !slot.text) {
          toDrop.push(i);
          continue;
        }

        const pinVisible = pinVisibleWithHysteresis(slot, blend);
        const atCrossing = sourceCellAtCrossing(cell, elapsed, dnaLookup);
        const dominant =
          !atCrossing?.featured && !slot.text
            ? dominantFeaturedAtCrossing(
                cell,
                elapsed,
                dnaLookup,
                cols,
                rows,
              )
            : undefined;
        const incoming = resolveFeaturedLabelContent(
          atCrossing,
          dominant,
          slot.text,
          pinVisible,
        );
        const keep = updateLabelSlot(slot, incoming, blend);

        if (keep) {
          nextActive.push(i);
        }

        const dom = domRef.current.get(i);
        const group = groupsRef.current.get(i);
        if (!dom || !group) continue;

        if (!keep || !slot.text) {
          if (slot.lastOpacityWrite !== 0) {
            dom.fade.style.opacity = "0";
            slot.lastOpacityWrite = 0;
          }
          continue;
        }

        const flag = getFeaturedFlagPose(
          cell,
          prepared,
          elapsed,
          markersMoveWithBelt,
          slot.blend,
          sphereRadiusRatio,
          {
            aprRange,
            stickApr: featuredStickApr(cell, elapsed, dnaLookup),
          },
        );

        const depthOpacity = markerDepthOpacity(
          flag.x,
          flag.yTop + FEATURED_PIN_Y_OFFSET,
          flag.z,
          camera,
          depthFadeRange,
          depthFadeMinOpacity,
        );
        const displayOpacity = slot.opacity * depthOpacity;
        if (
          Math.abs(displayOpacity - slot.lastOpacityWrite) > OPACITY_WRITE_EPSILON
        ) {
          dom.fade.style.opacity = String(displayOpacity);
          slot.lastOpacityWrite = displayOpacity;
        }

        const { name, aprValue, aprSuffix } = slot.text;
        if (dom.name.textContent !== name) {
          dom.name.textContent = name;
          dom.name.title = name;
        }
        if (dom.aprValue.textContent !== aprValue) {
          dom.aprValue.textContent = aprValue;
        }
        if (dom.aprSuffix.textContent !== aprSuffix) {
          dom.aprSuffix.textContent = aprSuffix;
        }

        getFeaturedPinLabelPosition(flag, camera, cellPitch, labelPos.current);
        group.position.copy(labelPos.current);
      }
    } else {
      for (let i = 0; i < featured.length; i++) {
        const cell = featured[i]!;
        const blend = blends ? (blends[i] ?? 0) : 1;
        const slot = getSlot(i);
        const show = isFeaturedFlagVisible(
          cell,
          i,
          elapsed,
          dnaLookup,
          blends ?? null,
        );
        if (show) {
          slot.text = cellToLabelContent(
            featuredFlagDisplayCell(cell, elapsed, dnaLookup),
          );
          slot.opacity = featuredLabelOpacity(blend);
          slot.blend = blend;
          slot.pinShown = true;
          nextActive.push(i);
        } else {
          slot.text = null;
          slot.opacity = 0;
          slot.blend = 0;
          slot.pinShown = false;
        }
      }

      for (const i of nextActive) {
        const cell = featured[i];
        const slot = slotsRef.current.get(i);
        const dom = domRef.current.get(i);
        const group = groupsRef.current.get(i);
        if (!cell || !slot?.text || !dom || !group) continue;

        dom.name.textContent = slot.text.name;
        dom.name.title = slot.text.name;
        dom.aprValue.textContent = slot.text.aprValue;
        dom.aprSuffix.textContent = slot.text.aprSuffix;

        const flag = getFeaturedFlagPose(
          cell,
          prepared,
          elapsed,
          markersMoveWithBelt,
          slot.blend,
          sphereRadiusRatio,
          {
            aprRange,
            stickApr: featuredStickApr(cell, elapsed, dnaLookup),
          },
        );

        const depthOpacity = markerDepthOpacity(
          flag.x,
          flag.yTop + FEATURED_PIN_Y_OFFSET,
          flag.z,
          camera,
          depthFadeRange,
          depthFadeMinOpacity,
        );
        const displayOpacity = slot.opacity * depthOpacity;
        dom.fade.style.opacity = String(displayOpacity);
        slot.lastOpacityWrite = displayOpacity;

        getFeaturedPinLabelPosition(flag, camera, cellPitch, labelPos.current);
        group.position.copy(labelPos.current);
      }
    }

    for (const i of toDrop) {
      tracked.delete(i);
    }

    const key = nextActive.join(",");
    if (key !== activeKeyRef.current) {
      activeKeyRef.current = key;
      setActiveIndices(nextActive);
    }
  });

  if (featured.length === 0) return null;

  return (
    <>
      {activeIndices.map((index) => (
        <FeaturedPinLabel
          key={index}
          index={index}
          distanceFactor={distanceFactor}
          onMount={onMount}
          onUnmount={onUnmount}
        />
      ))}
    </>
  );
}
