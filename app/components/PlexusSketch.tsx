"use client";

import { folder, useControls } from "leva";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import type p5Type from "p5";

type PlexusParams = {
  nodeCount: number;
  maxLinkFrac: number;
  lineOpacity: number;
  lineWeight: number;
  nodeOpacity: number;
  nodeSize: number;
  drift: number;
  speed: number;
  noiseScale: number;
  accentMix: number;
  lineBrightness: number;
  /** World-space scale for spawn-density noise (lower = larger blobs). */
  spawnDensityNoiseScale: number;
  /** 0 = uniform density; 1 = strong noise-driven clumping. */
  spawnDensityContrast: number;
  debugShowDensityCircle: boolean;
  debugCircleCenterXFrac: number;
  debugCircleOpacity: number;
  debugCircleWeight: number;
  /** Fraction of nodes spawned inside the bottom-aligned target ellipse. */
  particlesInTargetShare: number;
  /** Extra isotropic drop-shadow blur on the canvas (network glow). */
  shadowBlur: number;
  /** Hub at target-disk center: 40px circle + 20 random spoke endpoints. */
  hubCompositionEnabled: boolean;
};

type SketchFrameParams = {
  canvasDropShadow: boolean;
  shadowOffsetY: number;
  shadowBlur: number;
  shadowAlpha: number;
};

type ParamsBundle = { plexus: PlexusParams; sketchFrame: SketchFrameParams };

type Node = {
  bx: number;
  by: number;
  seed: number;
  label: string;
};

export function PlexusSketch() {
  const opportunityNamesRef = useRef<string[]>([]);
  const namesGenRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    void fetch("/data/turtle-opportunity-names.txt")
      .then((r) => r.text())
      .then((raw) => {
        if (cancelled) return;
        const lines = raw
          .split(/\r?\n/)
          .map((s) => s.trim())
          .filter(Boolean);
        opportunityNamesRef.current = lines;
        namesGenRef.current += 1;
      })
      .catch(() => {
        /* keep empty; nodes get empty labels until retry */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const plexus = useControls({
    Plexus: folder({
      nodeCount: { value: 650, min: 120, max: 780, step: 2 },
      maxLinkFrac: {
        value: 0.11,
        min: 0.05,
        max: 0.42,
        step: 0.01,
        label: "Max link distance (× min side)",
      },
      lineOpacity: {
        value: 0.32,
        min: 0,
        max: 1,
        step: 0.02,
        label: "Line opacity",
      },
      lineWeight: {
        value: 0.85,
        min: 0.2,
        max: 2.5,
        step: 0.05,
        label: "Line weight",
      },
      nodeOpacity: {
        value: 1.0,
        min: 0,
        max: 1,
        step: 0.02,
        label: "Node opacity",
      },
      nodeSize: {
        value: 1.35,
        min: 0.5,
        max: 5,
        step: 0.1,
        label: "Node size",
      },
      shadowBlur: {
        value: 106,
        min: 0,
        max: 120,
        step: 2,
        label: "Shadow blur (glow)",
      },
      spawnDensityNoiseScale: {
        value: 0.000,
        min: 0.00000,
        max: 0.0045,
        step: 0.00005,
        label: "Spawn clump noise scale",
      },
      spawnDensityContrast: {
        value: 1.0,
        min: 0,
        max: 1,
        step: 0.02,
        label: "Spawn clump strength",
      },
    }),
    "Debug (density target)": folder({
      debugShowDensityCircle: {
        value: false,
        label: "Show target ellipse",
      },
      particlesInTargetShare: {
        value: 0.72,
        min: 0,
        max: 1,
        step: 0.02,
        label: "Share spawned inside target zone",
      },
      debugCircleCenterXFrac: {
        value: 0.49,
        min: 0,
        max: 1,
        step: 0.01,
        label: "Center X (0–1)",
      },
      debugCircleOpacity: {
        value: 0.61,
        min: 0.1,
        max: 1,
        step: 0.02,
        label: "Circle opacity",
      },
      debugCircleWeight: {
        value: 1.6,
        min: 0.5,
        max: 4,
        step: 0.1,
        label: "Circle stroke",
      },
    }),
    "Hub composition": folder({
      hubCompositionEnabled: {
        value: false,
        label: "Fixed hub + spokes (ellipse center)",
      },
    }),
    Motion: folder({
      drift: {
        value: 0.2,
        min: 0,
        max: 1.6,
        step: 0.02,
        label: "Drift radius",
      },
      speed: {
        value: 0.3,
        min: 0.02,
        max: 0.55,
        step: 0.01,
        label: "Motion speed",
      },
      noiseScale: {
        value: 0.0001,
        min: 0.00000,
        max: 0.004,
        step: 0.0001,
        label: "Noise scale",
      },
    }),
    Color: folder({
      accentMix: {
        value: 0.2,
        min: 0,
        max: 1,
        step: 0.02,
        label: "Green accent mix",
      },
      lineBrightness: {
        value: 1.0,
        min: 0.35,
        max: 1,
        step: 0.02,
        label: "Line brightness",
      },
    }),
  });

  const sketchFrame = useControls("Sketch frame", {
    canvasDropShadow: {
      value: true,
      label: "Canvas drop shadow (CSS)",
    },
    shadowOffsetY: {
      value: 36,
      min: 0,
      max: 120,
      step: 2,
      label: "Shadow offset Y (px)",
    },
    shadowBlur: {
      value: 64,
      min: 0,
      max: 160,
      step: 2,
      label: "Shadow blur (px)",
    },
    shadowAlpha: {
      value: 0.48,
      min: 0,
      max: 1,
      step: 0.02,
      label: "Shadow opacity",
    },
  });

  const paramsRef = useRef<ParamsBundle>({ plexus, sketchFrame });
  useLayoutEffect(() => {
    paramsRef.current = { plexus, sketchFrame };
  }, [plexus, sketchFrame]);

  const containerRef = useRef<HTMLDivElement>(null);

  const frameFilter = useMemo(() => {
    const parts: string[] = [];
    if (plexus.shadowBlur > 0.5) {
      parts.push(`drop-shadow(0 0 ${plexus.shadowBlur}px rgba(0,0,0,0.3))`);
    }
    if (sketchFrame.canvasDropShadow) {
      parts.push(
        `drop-shadow(0 ${sketchFrame.shadowOffsetY}px ${sketchFrame.shadowBlur}px rgba(0,0,0,${sketchFrame.shadowAlpha}))`,
      );
    }
    return parts.length ? parts.join(" ") : undefined;
  }, [
    plexus.shadowBlur,
    sketchFrame.canvasDropShadow,
    sketchFrame.shadowOffsetY,
    sketchFrame.shadowBlur,
    sketchFrame.shadowAlpha,
  ]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let disposed = false;
    let p5instance: p5Type | null = null;
    let ro: ResizeObserver | null = null;
    /** Set in setup; used by ResizeObserver to resize before next draw. */
    let sketch: p5Type | null = null;

    void import("p5").then((mod) => {
      if (disposed || !containerRef.current) return;
      const P5 = mod.default;

      let nodes: Node[] = [];
      /** Indices into `nodes` / `positions` for hub spokes (existing particles). */
      let hubSpokeIndices: number[] = [];
      /** Fixed hub: nearest particle to ellipse center; spokes and disk anchor here. */
      let hubCenterNodeIndex: number | null = null;
      /** Random endpoints for hover hub only; repicked when the hovered node changes. */
      let hoverSpokeIndices: number[] = [];
      let lastHoverSpokeCenter: number | null = null;
      /** Default hub (nearest in ellipse to center); stays until user hovers a *different* node. */
      let pinnedDefaultHubIdx: number | null = null;
      let defaultHubSuperseded = false;
      let lastLayoutSig = "";
      let lastHubSig = "";
      let cw = 0;
      let ch = 0;
      /** No particles in this band from the top (fixed header). */
      const NODE_SPAWN_TOP_EXCLUSION_PX = 100;

      /** Bottom-aligned target zone: ellipse wider on X, slightly larger than old circle. */
      function targetZoneEllipse(px: PlexusParams, w: number, h: number) {
        const ry = h * 0.36;
        const rx = ry * 1.52;
        const ccx = w * px.debugCircleCenterXFrac;
        const ccy = h - ry;
        return { rx, ry, ccx, ccy };
      }

      /** Filled axis-aligned ellipse (same as spawn zone) in logical canvas coords. */
      function posInTargetEllipse(px: PlexusParams, w: number, h: number, x: number, y: number): boolean {
        const { rx, ry, ccx, ccy } = targetZoneEllipse(px, w, h);
        if (rx < 1e-6 || ry < 1e-6) return false;
        const dx = (x - ccx) / rx;
        const dy = (y - ccy) / ry;
        return dx * dx + dy * dy <= 1.000001;
      }

      function spawnAcceptWeight(p: p5Type, x: number, y: number): number {
        const cfg = paramsRef.current.plexus;
        const c = p.constrain(cfg.spawnDensityContrast, 0, 1);
        if (c <= 1e-5) return 1;
        const nz = cfg.spawnDensityNoiseScale;
        const n1 = p.noise(x * nz + 101.7, y * nz + 33.2);
        const n2 = p.noise(x * nz * 2.55 + 201.1, y * nz * 2.55 - 77.4);
        const v = p.constrain(n1 * 0.5 + n2 * 0.5, 0.001, 0.999);
        const peaked = Math.pow(v, 3.45);
        const wSparse = 0.0035;
        const wRich = 1;
        const biased = wSparse + (wRich - wSparse) * peaked;
        return p.lerp(1, biased, c);
      }

      function sampleBiasedInRect(
        p: p5Type,
        w: number,
        h: number,
        maxAttempts = 220,
      ): { x: number; y: number } {
        const yLo = h > NODE_SPAWN_TOP_EXCLUSION_PX ? NODE_SPAWN_TOP_EXCLUSION_PX : 0;
        for (let a = 0; a < maxAttempts; a++) {
          const x = p.random(w);
          const y = yLo < h ? p.random(yLo, h) : p.random(h);
          if (p.random() < spawnAcceptWeight(p, x, y)) return { x, y };
        }
        return {
          x: p.random(w),
          y: yLo < h ? p.random(yLo, h) : p.random(h),
        };
      }

      function sampleBiasedInEllipse(
        p: p5Type,
        ccx: number,
        ccy: number,
        rx: number,
        ry: number,
        w: number,
        h: number,
        maxAttempts = 260,
      ): { x: number; y: number } {
        const yLo = h > NODE_SPAWN_TOP_EXCLUSION_PX ? NODE_SPAWN_TOP_EXCLUSION_PX : 0;
        for (let a = 0; a < maxAttempts; a++) {
          const u = p.random(0, 1);
          const theta = p.random(p.TWO_PI);
          const rn = Math.sqrt(u);
          const x = ccx + rx * rn * Math.cos(theta);
          const y = ccy + ry * rn * Math.sin(theta);
          if (x < 0 || x > w || y < 0 || y > h) continue;
          if (y < NODE_SPAWN_TOP_EXCLUSION_PX) continue;
          if (p.random() < spawnAcceptWeight(p, x, y)) return { x, y };
        }
        const u = p.random(0, 1);
        const theta = p.random(p.TWO_PI);
        const rn = Math.sqrt(u);
        return {
          x: p.constrain(ccx + rx * rn * Math.cos(theta), 0, w - 1e-6),
          y: p.constrain(ccy + ry * rn * Math.sin(theta), yLo, h - 1e-6),
        };
      }

      /**
       * Hub spoke endpoints must sit outside the top header + center hero overlay
       * (matches ~`inset-10` + `SiteHeader` pt + bar + `HeroSection` block).
       * Allows sides and bottom; blocks top strip and upper-center column.
       */
      function hubEndpointOutsideUiOverlay(x: number, y: number, w: number, h: number): boolean {
        const inset = 40;
        const headerBottom = Math.min(h * 0.15, inset + 60 + 34 + 28);
        if (y < headerBottom) return false;

        const heroBottom = h * 0.52;
        if (y >= heroBottom) return true;

        const cx = w * 0.5;
        const halfW = Math.min(w * 0.37, Math.max(220, w * 0.5 - inset));
        if (Math.abs(x - cx) < halfW) return false;

        return true;
      }

      function syncCanvasSize(p: p5Type) {
        const el = containerRef.current;
        if (!el) return;
        const nw = Math.max(1, Math.floor(el.clientWidth));
        const nh = Math.max(1, Math.floor(el.clientHeight));
        if (nw === cw && nh === ch) return;
        if (cw > 0 && ch > 0) {
          const sx = nw / cw;
          const sy = nh / ch;
          const yMin = nh > NODE_SPAWN_TOP_EXCLUSION_PX ? NODE_SPAWN_TOP_EXCLUSION_PX : 0;
          for (const n of nodes) {
            n.bx *= sx;
            n.by *= sy;
            n.by = p.constrain(n.by, yMin, nh - 1e-6);
          }
        }
        cw = nw;
        ch = nh;
        p.resizeCanvas(cw, ch);
      }

      function rebuildNodes(p: p5Type, count: number) {
        nodes = [];
        const px = paramsRef.current.plexus;
        const w = Math.max(1, cw);
        const h = Math.max(1, ch);
        const { rx, ry, ccx, ccy } = targetZoneEllipse(px, w, h);
        const share = p.constrain(px.particlesInTargetShare, 0, 1);

        let nIn = Math.round(count * share);
        nIn = Math.max(0, Math.min(count, nIn));
        const nOut = count - nIn;

        const pushNode = (bx: number, by: number) => {
          const names = opportunityNamesRef.current;
          const label =
            names.length > 0 ? names[nodes.length % names.length]! : "";
          const yMin = h > NODE_SPAWN_TOP_EXCLUSION_PX ? NODE_SPAWN_TOP_EXCLUSION_PX : 0;
          nodes.push({
            bx: p.constrain(bx, 0, w - 1e-6),
            by: p.constrain(by, yMin, h - 1e-6),
            seed: p.random(10000),
            label,
          });
        };

        for (let i = 0; i < nIn; i++) {
          const { x, y } = sampleBiasedInEllipse(p, ccx, ccy, rx, ry, w, h);
          pushNode(x, y);
        }
        for (let i = 0; i < nOut; i++) {
          const { x, y } = sampleBiasedInRect(p, w, h);
          pushNode(x, y);
        }

        for (let i = nodes.length - 1; i > 0; i--) {
          const j = Math.floor(p.random(i + 1));
          const a = nodes[i]!;
          const b = nodes[j]!;
          nodes[i] = b;
          nodes[j] = a;
        }
      }

      /** Random count in [2, 15], capped by `maxPossible` (e.g. `n - 1` with hub excluded). */
      function randomSpokeWantCount(p: p5Type, maxPossible: number): number {
        const cap = Math.min(15, Math.max(0, maxPossible));
        if (cap < 2) return cap;
        return 2 + Math.floor(p.random() * (cap - 1));
      }

      function rebuildHubSpokes(p: p5Type) {
        hubSpokeIndices = [];
        hubCenterNodeIndex = null;
        const n = nodes.length;
        if (n === 0) return;
        const w = Math.max(1, cw);
        const h = Math.max(1, ch);
        const px = paramsRef.current.plexus;
        const { ccx, ccy } = targetZoneEllipse(px, w, h);

        const insideEllipse: number[] = [];
        for (let i = 0; i < n; i++) {
          if (posInTargetEllipse(px, w, h, nodes[i]!.bx, nodes[i]!.by)) {
            insideEllipse.push(i);
          }
        }
        if (insideEllipse.length === 0) {
          hubCenterNodeIndex = null;
          return;
        }

        let bestD2 = Infinity;
        let centerIdx = insideEllipse[0]!;
        for (const i of insideEllipse) {
          const dx = nodes[i]!.bx - ccx;
          const dy = nodes[i]!.by - ccy;
          const d2 = dx * dx + dy * dy;
          if (d2 < bestD2) {
            bestD2 = d2;
            centerIdx = i;
          }
        }
        hubCenterNodeIndex = centerIdx;

        const want = randomSpokeWantCount(p, n - 1);

        const eligible: number[] = [];
        for (let i = 0; i < n; i++) {
          if (i === centerIdx) continue;
          if (hubEndpointOutsideUiOverlay(nodes[i]!.bx, nodes[i]!.by, w, h)) {
            eligible.push(i);
          }
        }

        const used = new Set<number>();
        const tryPool = (pool: number[]) => {
          if (pool.length === 0) return;
          let guard = 0;
          while (hubSpokeIndices.length < want && guard < 12000) {
            guard++;
            const idx = pool[Math.floor(p.random(pool.length))]!;
            if (used.has(idx)) continue;
            used.add(idx);
            hubSpokeIndices.push(idx);
          }
        };

        tryPool(eligible);

        if (hubSpokeIndices.length < want) {
          const headerBottom = Math.min(h * 0.15, 40 + 60 + 34 + 28);
          const relaxed: number[] = [];
          for (let i = 0; i < n; i++) {
            if (i === centerIdx) continue;
            if (nodes[i]!.by >= headerBottom) relaxed.push(i);
          }
          tryPool(relaxed);
        }
      }

      const HUB_DISK_RADIUS = 14;
      /** Selected hover hub: `logo-dot.png` size (logical px). */
      const SELECTED_HUB_IMG_PX = 64;
      /** #73F36C @ 30% opacity — hover hub spokes */
      const HIGHLIGHT_LINE = { r: 115, g: 243, b: 108, a: Math.round(255 * 0.3) };

      let labelGreenImg: import("p5").Image | null = null;
      let logoDotImg: import("p5").Image | null = null;

      function drawSelectedHubImage(p: p5Type, cx: number, cy: number) {
        if (!logoDotImg || !logoDotImg.width) return;
        const d = SELECTED_HUB_IMG_PX;
        p.push();
        p.imageMode(p.CENTER);
        p.image(logoDotImg, cx, cy, d, d);
        p.pop();
      }

      /** `green.svg` at spoke roots (hub-facing side of endpoint nodes). */
      function drawGreenSpokeRootMarker(p: p5Type, cx: number, cy: number, nodeSize: number) {
        if (!labelGreenImg || !labelGreenImg.width) return;
        const d = Math.max(12, nodeSize * 2.75);
        p.push();
        p.imageMode(p.CENTER);
        p.image(labelGreenImg, cx, cy, d, d);
        p.pop();
      }

      function pickSyntheticHoverIndex(px: PlexusParams, w: number, h: number): number | null {
        const n = nodes.length;
        if (n === 0) return null;
        const { ccx, ccy } = targetZoneEllipse(px, w, h);
        const inside: number[] = [];
        for (let i = 0; i < n; i++) {
          if (posInTargetEllipse(px, w, h, nodes[i]!.bx, nodes[i]!.by)) {
            inside.push(i);
          }
        }
        if (inside.length === 0) return null;
        let bestD2 = Infinity;
        let pick = inside[0]!;
        for (const i of inside) {
          const dx = nodes[i]!.bx - ccx;
          const dy = nodes[i]!.by - ccy;
          const d2 = dx * dx + dy * dy;
          if (d2 < bestD2) {
            bestD2 = d2;
            pick = i;
          }
        }
        return pick;
      }

      function pickHoverSpokeIndices(p: p5Type, centerIdx: number) {
        hoverSpokeIndices = [];
        const n = nodes.length;
        if (n < 2) return;
        const w = Math.max(1, cw);
        const h = Math.max(1, ch);
        const px = paramsRef.current.plexus;

        const inEllipse: number[] = [];
        for (let i = 0; i < n; i++) {
          if (i === centerIdx) continue;
          if (posInTargetEllipse(px, w, h, nodes[i]!.bx, nodes[i]!.by)) {
            inEllipse.push(i);
          }
        }

        const want = randomSpokeWantCount(p, inEllipse.length);

        const ax = nodes[centerIdx]!.bx;
        const ay = nodes[centerIdx]!.by;
        const scored = inEllipse
          .map((idx) => {
            const dx = nodes[idx]!.bx - ax;
            const dy = nodes[idx]!.by - ay;
            return { idx, d2: dx * dx + dy * dy };
          })
          .sort((u, v) => u.d2 - v.d2);
        const poolDepth = Math.min(
          scored.length,
          Math.max(want + 10, want * 3, 18),
        );
        const nearPool = scored.slice(0, poolDepth).map((s) => s.idx);

        const used = new Set<number>();
        let guard = 0;
        while (hoverSpokeIndices.length < want && nearPool.length > 0 && guard < 12000) {
          guard++;
          const idx = nearPool[Math.floor(p.random(nearPool.length))]!;
          if (used.has(idx)) continue;
          used.add(idx);
          hoverSpokeIndices.push(idx);
        }
      }

      p5instance = new P5((p) => {
        p.preload = () => {
          labelGreenImg = p.loadImage("/green.svg");
          logoDotImg = p.loadImage("/logo-dot.png");
        };

        p.setup = () => {
          sketch = p;
          syncCanvasSize(p);
          const canvas = p.createCanvas(cw, ch);
          canvas.parent(container);
          p.pixelDensity(
            Math.min(2, typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1),
          );
          rebuildNodes(p, paramsRef.current.plexus.nodeCount);
          rebuildHubSpokes(p);
          const px0 = paramsRef.current.plexus;
          lastLayoutSig = `${px0.nodeCount}|${px0.particlesInTargetShare}|${px0.debugCircleCenterXFrac}|${px0.spawnDensityNoiseScale}|${px0.spawnDensityContrast}|n${namesGenRef.current}`;
          lastHubSig = `${px0.hubCompositionEnabled}`;
        };

        p.draw = () => {
          syncCanvasSize(p);
          const px = paramsRef.current.plexus;
          const layoutSig = `${px.nodeCount}|${px.particlesInTargetShare}|${px.debugCircleCenterXFrac}|${px.spawnDensityNoiseScale}|${px.spawnDensityContrast}|n${namesGenRef.current}`;
          if (layoutSig !== lastLayoutSig) {
            rebuildNodes(p, px.nodeCount);
            lastLayoutSig = layoutSig;
            rebuildHubSpokes(p);
            lastHoverSpokeCenter = null;
            hoverSpokeIndices = [];
            pinnedDefaultHubIdx = null;
            defaultHubSuperseded = false;
          }

          const hubSig = `${px.hubCompositionEnabled}`;
          if (hubSig !== lastHubSig) {
            rebuildHubSpokes(p);
            lastHubSig = hubSig;
          }

          p.background(10, 10, 10);
          const t = p.millis() * 0.001 * px.speed;
          const minSide = Math.min(cw, ch);
          const maxD = Math.max(20, minSide * px.maxLinkFrac);
          const driftPx = minSide * 0.12 * px.drift;
          const canvasW = Math.max(1, cw);
          const canvasH = Math.max(1, ch);

          const positions: { x: number; y: number }[] = new Array(nodes.length);
          for (let i = 0; i < nodes.length; i++) {
            const n = nodes[i]!;
            const nx = n.seed * px.noiseScale;
            const ny = n.seed * 0.001;
            const ox = (p.noise(nx + t, ny) - 0.5) * 2 * driftPx;
            const oy = (p.noise(nx, ny + t * 0.93) - 0.5) * 2 * driftPx;
            positions[i] = { x: n.bx + ox, y: n.by + oy };
          }

          const mx = p.mouseX;
          const my = p.mouseY;
          const hitR = Math.max(18, px.nodeSize * 2.35);
          let pointerHoverIdx: number | null = null;
          let bestD = hitR;
          for (let hi = 0; hi < positions.length; hi++) {
            const q = positions[hi]!;
            const dh = Math.hypot(mx - q.x, my - q.y);
            if (dh < bestD) {
              bestD = dh;
              pointerHoverIdx = hi;
            }
          }

          if (!defaultHubSuperseded) {
            if (pinnedDefaultHubIdx === null) {
              const picked = pickSyntheticHoverIndex(px, canvasW, canvasH);
              if (picked !== null) {
                pinnedDefaultHubIdx = picked;
              }
            }
          }

          let effectiveHoverIdx: number | null = pointerHoverIdx;

          if (pointerHoverIdx !== null) {
            if (
              pinnedDefaultHubIdx !== null &&
              pointerHoverIdx !== pinnedDefaultHubIdx
            ) {
              defaultHubSuperseded = true;
            }
          } else if (!defaultHubSuperseded && pinnedDefaultHubIdx !== null) {
            const sp = positions[pinnedDefaultHubIdx];
            if (
              sp &&
              posInTargetEllipse(px, canvasW, canvasH, sp.x, sp.y)
            ) {
              effectiveHoverIdx = pinnedDefaultHubIdx;
            }
          }

          if (effectiveHoverIdx !== lastHoverSpokeCenter) {
            lastHoverSpokeCenter = effectiveHoverIdx;
            hoverSpokeIndices = [];
            if (
              effectiveHoverIdx !== null &&
              posInTargetEllipse(
                px,
                canvasW,
                canvasH,
                positions[effectiveHoverIdx]!.x,
                positions[effectiveHoverIdx]!.y,
              )
            ) {
              pickHoverSpokeIndices(p, effectiveHoverIdx);
            }
          }

          const hoverHubOriginInside =
            effectiveHoverIdx !== null &&
            posInTargetEllipse(
              px,
              canvasW,
              canvasH,
              positions[effectiveHoverIdx!]!.x,
              positions[effectiveHoverIdx!]!.y,
            );
          const showHoverHub = hoverHubOriginInside && hoverSpokeIndices.length > 0;

          const highlightNetwork = showHoverHub;
          const highlightSet = new Set<number>();
          if (showHoverHub && effectiveHoverIdx !== null) {
            highlightSet.add(effectiveHoverIdx);
            for (const idx of hoverSpokeIndices) {
              highlightSet.add(idx);
            }
          }

          /** When a hover hub is active, mute the rest of the field (keep readable). */
          const NET_DIM_FACTOR = 0.48;
          const NODE_DIM_FACTOR = 0.52;
          const netDim = highlightNetwork ? NET_DIM_FACTOR : 1;

          p.strokeWeight(px.lineWeight);
          p.noFill();

          const acc = px.accentMix;
          const br = px.lineBrightness * 255;
          const gTint = 115 * acc + br * (1 - acc);
          const mono = br * (1 - acc * 0.35);
          const nodeR = px.nodeSize * 0.5;

          const hubCenterPos =
            hubCenterNodeIndex !== null ? positions[hubCenterNodeIndex] : undefined;
          const fixedHubVisible =
            px.hubCompositionEnabled &&
            hubCenterNodeIndex !== null &&
            hubSpokeIndices.length > 0 &&
            !!hubCenterPos &&
            posInTargetEllipse(px, canvasW, canvasH, hubCenterPos.x, hubCenterPos.y);

          for (let i = 0; i < positions.length; i++) {
            const a = positions[i]!;
            for (let j = i + 1; j < positions.length; j++) {
              const b = positions[j]!;
              const dx = a.x - b.x;
              const dy = a.y - b.y;
              const d = Math.hypot(dx, dy);
              if (d >= maxD) continue;
              const falloff = 1 - d / maxD;
              const alpha = falloff * falloff * px.lineOpacity * 255 * netDim;
              const edge = falloff * acc;
              p.stroke(
                mono + edge * (gTint - mono),
                mono + edge * (243 - mono),
                mono + edge * (108 - mono),
                alpha,
              );
              p.line(a.x, a.y, b.x, b.y);
            }
          }

          p.noStroke();
          for (let i = 0; i < positions.length; i++) {
            if (showHoverHub && highlightSet.has(i)) continue;
            if (fixedHubVisible && i === hubCenterNodeIndex) {
              continue;
            }
            const pt = positions[i]!;
            const nodeDim = highlightNetwork && !highlightSet.has(i) ? NODE_DIM_FACTOR : 1;
            p.fill(br, br, br, px.nodeOpacity * 255 * nodeDim);
            p.circle(pt.x, pt.y, px.nodeSize);
          }

          if (fixedHubVisible && hubCenterPos) {
            const hcx = hubCenterPos.x;
            const hcy = hubCenterPos.y;
            const ctx = p.drawingContext;
            ctx.save();
            const grad = ctx.createRadialGradient(
              hcx,
              hcy,
              0,
              hcx,
              hcy,
              HUB_DISK_RADIUS,
            );
            grad.addColorStop(0, "#141514");
            grad.addColorStop(1, "#303030");
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(hcx, hcy, HUB_DISK_RADIUS, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();

            p.strokeCap(p.ROUND);
            p.strokeWeight(1.15);
            p.stroke(228, 228, 232, 200);
            for (const idx of hubSpokeIndices) {
              const pt = positions[idx];
              if (!pt) continue;
              if (!hubEndpointOutsideUiOverlay(pt.x, pt.y, canvasW, canvasH)) continue;
              const dx = pt.x - hcx;
              const dy = pt.y - hcy;
              const len = Math.max(1e-6, Math.hypot(dx, dy));
              const ux = dx / len;
              const uy = dy / len;
              const x0 = hcx + ux * HUB_DISK_RADIUS;
              const y0 = hcy + uy * HUB_DISK_RADIUS;
              const x1 = pt.x - ux * nodeR;
              const y1 = pt.y - uy * nodeR;
              p.line(x0, y0, x1, y1);
            }
          }

          if (px.debugShowDensityCircle) {
            const w = Math.max(1, cw);
            const h = Math.max(1, ch);
            const { rx, ry, ccx, ccy } = targetZoneEllipse(px, w, h);
            p.noFill();
            p.stroke(160, 162, 168, px.debugCircleOpacity * 255);
            p.strokeWeight(px.debugCircleWeight);
            const dash = [10, 8];
            p.drawingContext.setLineDash(dash);
            p.ellipse(ccx, ccy, rx * 2, ry * 2);
            p.drawingContext.setLineDash([]);
          }

          if (showHoverHub) {
            const hpt = positions[effectiveHoverIdx!]!;
            const hcx = hpt.x;
            const hcy = hpt.y;
            const hubImgR = SELECTED_HUB_IMG_PX * 0.5;

            p.strokeCap(p.ROUND);
            p.strokeWeight(1.35);
            p.stroke(
              HIGHLIGHT_LINE.r,
              HIGHLIGHT_LINE.g,
              HIGHLIGHT_LINE.b,
              HIGHLIGHT_LINE.a,
            );
            p.noFill();
            for (const idx of hoverSpokeIndices) {
              const pt = positions[idx];
              if (!pt) continue;
              if (!posInTargetEllipse(px, canvasW, canvasH, pt.x, pt.y)) continue;
              const dx = pt.x - hcx;
              const dy = pt.y - hcy;
              const len = Math.max(1e-6, Math.hypot(dx, dy));
              const ux = dx / len;
              const uy = dy / len;
              const x0 = hcx + ux * hubImgR;
              const y0 = hcy + uy * hubImgR;
              const x1 = pt.x - ux * nodeR;
              const y1 = pt.y - uy * nodeR;
              p.line(x0, y0, x1, y1);
            }

            if (labelGreenImg && labelGreenImg.width > 0) {
              for (const idx of hoverSpokeIndices) {
                const q = positions[idx];
                if (!q) continue;
                if (!posInTargetEllipse(px, canvasW, canvasH, q.x, q.y)) continue;
                const dx = q.x - hcx;
                const dy = q.y - hcy;
                const len = Math.max(1e-6, Math.hypot(dx, dy));
                const ux = dx / len;
                const uy = dy / len;
                const gx = q.x - ux * nodeR;
                const gy = q.y - uy * nodeR;
                drawGreenSpokeRootMarker(p, gx, gy, px.nodeSize);
              }
            }

            drawSelectedHubImage(p, hcx, hcy);
          }

          p.cursor(effectiveHoverIdx === null ? p.ARROW : p.HAND);

          if (effectiveHoverIdx !== null) {
            const hn = nodes[effectiveHoverIdx]!;
            const raw = hn.label.trim();
            if (raw.length > 0) {
              const pt = positions[effectiveHoverIdx]!;
              const maxChars = 54;
              const shown =
                raw.length > maxChars ? `${raw.slice(0, maxChars - 1)}…` : raw;
              const padX = 10;
              const padY = 6;
              const dotD = 12;
              const dotGap = 8;
              const ts = 14;
              p.push();
              p.textSize(ts);
              p.textFont("sans-serif");
              p.textAlign(p.LEFT, p.CENTER);
              const tw = p.textWidth(shown);
              const innerW = dotD + dotGap + tw;
              const boxW = padX * 2 + innerW;
              const boxH = Math.max(ts + padY * 2, dotD + padY * 2);
              const baseY =
                showHoverHub && effectiveHoverIdx !== null
                  ? pt.y - SELECTED_HUB_IMG_PX * 0.5 - 20
                  : pt.y - px.nodeSize * 0.5 - 24;
              const cx = pt.x;
              const top = baseY - boxH;
              const left = cx - boxW * 0.5;
              p.noStroke();
              p.fill(18, 19, 18, 238);
              p.rectMode(p.CORNER);
              p.rect(left, top, boxW, boxH, 8);
              const dotCx = left + padX + dotD * 0.5;
              const dotCy = top + boxH * 0.5;
              if (labelGreenImg && labelGreenImg.width > 0) {
                p.push();
                p.imageMode(p.CENTER);
                p.image(labelGreenImg, dotCx, dotCy, dotD, dotD);
                p.pop();
              } else {
                p.fill(150, 152, 156);
                p.circle(dotCx, dotCy, dotD);
              }
              p.fill(240, 240, 240);
              p.text(shown, left + padX + dotD + dotGap, top + boxH * 0.5);
              p.rectMode(p.CORNER);
              p.pop();
            }
          }
        };
      }, container);

      ro = new ResizeObserver(() => {
        if (!sketch || !containerRef.current) return;
        syncCanvasSize(sketch);
      });
      ro.observe(container);
    });

    return () => {
      disposed = true;
      sketch = null;
      ro?.disconnect();
      p5instance?.remove();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="h-screen w-full bg-[#0a0a0a] -z-10"
      style={frameFilter ? { filter: frameFilter } : undefined}
    >
      {/* p5 injects canvas here */}
    </div>
  );
}
