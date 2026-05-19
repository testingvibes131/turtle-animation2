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
import { isInsideDebugZone, type DebugZone } from "@/app/v2/lib/debugZone";
import type { TerrainCell } from "@/app/v2/lib/gridLayout";
import {
  cellToLabelContent,
  featuredFlagDisplayCell,
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
import type { TerrainWaveSnapshot } from "@/app/v2/lib/terrainWave";

const LABEL_MAX_WIDTH = "70px";
const OPACITY_EPSILON = 0.02;
const OPACITY_WRITE_EPSILON = 0.004;
/** Hysteresis so blend lerp around the show threshold does not flicker. */
const PIN_HIDE_BLEND = FLAG_BLEND_SHOW_THRESHOLD - 0.02;
/** Drop from tracking once blend has settled near rest (after label fade-out). */
const BLEND_IDLE_EPSILON = 0.05;

const labelWrap: CSSProperties = {
  pointerEvents: "none",
  userSelect: "none",
  fontFamily:
    'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  textAlign: "left",
  lineHeight: 1.25,
  textShadow: "0 1px 8px rgba(0,0,0,0.85), 0 0 1px rgba(0,0,0,0.9)",
  color: "#73f36c",
  whiteSpace: "nowrap",
};

const fadeWrapStyle: CSSProperties = { opacity: 0 };

const nameStyle: CSSProperties = {
  fontSize: 7,
  fontWeight: 600,
  overflow: "hidden",
  textOverflow: "ellipsis",
  maxWidth: LABEL_MAX_WIDTH,
};

const aprStyle: CSSProperties = {
  fontSize: 6,
  fontWeight: 500,
  opacity: 0.92,
  marginTop: 1,
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
  apr: HTMLDivElement;
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
  const aprRef = useRef<HTMLDivElement>(null);
  const mountedRef = useRef(false);

  const tryRegister = useCallback(() => {
    const g = groupRef.current;
    const fade = fadeRef.current;
    const name = nameRef.current;
    const apr = aprRef.current;
    if (!g || !fade || !name || !apr || mountedRef.current) return;
    mountedRef.current = true;
    onMount(index, { fade, name, apr }, g);
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
          <div
            ref={(node) => {
              aprRef.current = node;
              tryRegister();
            }}
            style={aprStyle}
          />
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
  debugZone: DebugZone;
  sphereRadiusRatio: number;
  dnaLookup?: (TerrainCell | undefined)[][];
  dnaBlendsRef?: RefObject<Float32Array>;
};

export function FeaturedPinLabels({
  featured,
  cellPitch,
  waveRef,
  markersMoveWithBelt,
  debugZone,
  sphereRadiusRatio,
  dnaLookup,
  dnaBlendsRef,
}: FeaturedPinLabelsProps) {
  const distanceFactor = useMemo(
    () => Math.max(14, cellPitch * 16),
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

        if (
          Math.abs(slot.opacity - slot.lastOpacityWrite) > OPACITY_WRITE_EPSILON
        ) {
          dom.fade.style.opacity = String(slot.opacity);
          slot.lastOpacityWrite = slot.opacity;
        }

        const { name, aprLine } = slot.text;
        if (dom.name.textContent !== name) {
          dom.name.textContent = name;
          dom.name.title = name;
        }
        if (dom.apr.textContent !== aprLine) {
          dom.apr.textContent = aprLine;
        }

        const flag = getFeaturedFlagPose(
          cell,
          prepared,
          elapsed,
          markersMoveWithBelt,
          debugZone,
          slot.blend,
          sphereRadiusRatio,
        );
        if (!isInsideDebugZone(flag.x, flag.z, debugZone)) {
          if (slot.lastOpacityWrite !== 0) {
            dom.fade.style.opacity = "0";
            slot.lastOpacityWrite = 0;
          }
          continue;
        }
        getFeaturedPinLabelPosition(flag, camera, cellPitch, labelPos.current);
        group.position.copy(labelPos.current);
      }
    } else {
      for (let i = 0; i < featured.length; i++) {
        const cell = featured[i]!;
        const blend = blends ? (blends[i] ?? 0) : 1;
        const slot = getSlot(i);
        const flag = getFeaturedFlagPose(
          cell,
          prepared,
          elapsed,
          markersMoveWithBelt,
          debugZone,
          blend,
          sphereRadiusRatio,
        );
        const show =
          isFeaturedFlagVisible(
            cell,
            i,
            elapsed,
            dnaLookup,
            blends ?? null,
          ) && isInsideDebugZone(flag.x, flag.z, debugZone);
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

        dom.fade.style.opacity = String(slot.opacity);
        slot.lastOpacityWrite = slot.opacity;
        dom.name.textContent = slot.text.name;
        dom.name.title = slot.text.name;
        dom.apr.textContent = slot.text.aprLine;

        const flag = getFeaturedFlagPose(
          cell,
          prepared,
          elapsed,
          markersMoveWithBelt,
          debugZone,
          slot.blend,
          sphereRadiusRatio,
        );
        if (!isInsideDebugZone(flag.x, flag.z, debugZone)) {
          dom.fade.style.opacity = "0";
          slot.lastOpacityWrite = 0;
          continue;
        }
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
