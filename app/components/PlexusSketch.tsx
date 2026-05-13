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
};

export function PlexusSketch() {
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
        value: true,
        label: "Hub + 20 random spokes",
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
        value: 0.14,
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
      let lastLayoutSig = "";
      let lastHubSig = "";
      let cw = 0;
      let ch = 0;

      /** Bottom-aligned target zone: ellipse wider on X, slightly larger than old circle. */
      function targetZoneEllipse(px: PlexusParams, w: number, h: number) {
        const ry = h * 0.36;
        const rx = ry * 1.52;
        const ccx = w * px.debugCircleCenterXFrac;
        const ccy = h - ry;
        return { rx, ry, ccx, ccy };
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
        for (let a = 0; a < maxAttempts; a++) {
          const x = p.random(w);
          const y = p.random(h);
          if (p.random() < spawnAcceptWeight(p, x, y)) return { x, y };
        }
        return { x: p.random(w), y: p.random(h) };
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
        for (let a = 0; a < maxAttempts; a++) {
          const u = p.random(0, 1);
          const theta = p.random(p.TWO_PI);
          const rn = Math.sqrt(u);
          const x = ccx + rx * rn * Math.cos(theta);
          const y = ccy + ry * rn * Math.sin(theta);
          if (x < 0 || x > w || y < 0 || y > h) continue;
          if (p.random() < spawnAcceptWeight(p, x, y)) return { x, y };
        }
        const u = p.random(0, 1);
        const theta = p.random(p.TWO_PI);
        const rn = Math.sqrt(u);
        return {
          x: p.constrain(ccx + rx * rn * Math.cos(theta), 0, w - 1e-6),
          y: p.constrain(ccy + ry * rn * Math.sin(theta), 0, h - 1e-6),
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
          for (const n of nodes) {
            n.bx *= sx;
            n.by *= sy;
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
          nodes.push({
            bx: p.constrain(bx, 0, w - 1e-6),
            by: p.constrain(by, 0, h - 1e-6),
            seed: p.random(10000),
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

      function rebuildHubSpokes(p: p5Type) {
        hubSpokeIndices = [];
        const px = paramsRef.current.plexus;
        if (!px.hubCompositionEnabled) return;
        const n = nodes.length;
        if (n === 0) return;
        const w = Math.max(1, cw);
        const h = Math.max(1, ch);
        const want = Math.min(20, n);

        const eligible: number[] = [];
        for (let i = 0; i < n; i++) {
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
            if (nodes[i]!.by >= headerBottom) relaxed.push(i);
          }
          tryPool(relaxed);
        }
      }

      p5instance = new P5((p) => {
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
          lastLayoutSig = `${px0.nodeCount}|${px0.particlesInTargetShare}|${px0.debugCircleCenterXFrac}|${px0.spawnDensityNoiseScale}|${px0.spawnDensityContrast}`;
          lastHubSig = `${px0.hubCompositionEnabled}`;
        };

        p.draw = () => {
          syncCanvasSize(p);
          const px = paramsRef.current.plexus;
          const layoutSig = `${px.nodeCount}|${px.particlesInTargetShare}|${px.debugCircleCenterXFrac}|${px.spawnDensityNoiseScale}|${px.spawnDensityContrast}`;
          if (layoutSig !== lastLayoutSig) {
            rebuildNodes(p, px.nodeCount);
            lastLayoutSig = layoutSig;
            rebuildHubSpokes(p);
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

          const positions: { x: number; y: number }[] = new Array(nodes.length);
          for (let i = 0; i < nodes.length; i++) {
            const n = nodes[i]!;
            const nx = n.seed * px.noiseScale;
            const ny = n.seed * 0.001;
            const ox = (p.noise(nx + t, ny) - 0.5) * 2 * driftPx;
            const oy = (p.noise(nx, ny + t * 0.93) - 0.5) * 2 * driftPx;
            positions[i] = { x: n.bx + ox, y: n.by + oy };
          }

          p.strokeWeight(px.lineWeight);
          p.noFill();

          const acc = px.accentMix;
          const br = px.lineBrightness * 255;
          const gTint = 115 * acc + br * (1 - acc);
          const mono = br * (1 - acc * 0.35);

          for (let i = 0; i < positions.length; i++) {
            const a = positions[i]!;
            for (let j = i + 1; j < positions.length; j++) {
              const b = positions[j]!;
              const dx = a.x - b.x;
              const dy = a.y - b.y;
              const d = Math.hypot(dx, dy);
              if (d >= maxD) continue;
              const falloff = 1 - d / maxD;
              const alpha = falloff * falloff * px.lineOpacity * 255;
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

          if (px.hubCompositionEnabled && hubSpokeIndices.length > 0) {
            const w = Math.max(1, cw);
            const h = Math.max(1, ch);
            const { ccx, ccy } = targetZoneEllipse(px, w, h);

            p.strokeWeight(1.15);
            p.stroke(228, 228, 232, 200);
            for (const idx of hubSpokeIndices) {
              const pt = positions[idx];
              if (!pt) continue;
              if (!hubEndpointOutsideUiOverlay(pt.x, pt.y, w, h)) continue;
              p.line(ccx, ccy, pt.x, pt.y);
            }
          }

          p.noStroke();
          for (let i = 0; i < positions.length; i++) {
            const pt = positions[i]!;
            p.fill(br, br, br, px.nodeOpacity * 255);
            p.circle(pt.x, pt.y, px.nodeSize);
          }

          if (px.hubCompositionEnabled && hubSpokeIndices.length > 0) {
            const w = Math.max(1, cw);
            const h = Math.max(1, ch);
            const { ccx, ccy } = targetZoneEllipse(px, w, h);

            const hubR = 20;
            const ctx = p.drawingContext;
            ctx.save();
            const grad = ctx.createRadialGradient(ccx, ccy, 0, ccx, ccy, hubR);
            grad.addColorStop(0, "#141514");
            grad.addColorStop(1, "#356032");
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(ccx, ccy, hubR, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }

          if (px.debugShowDensityCircle) {
            const w = Math.max(1, cw);
            const h = Math.max(1, ch);
            const { rx, ry, ccx, ccy } = targetZoneEllipse(px, w, h);
            p.noFill();
            p.stroke(115, 243, 108, px.debugCircleOpacity * 255);
            p.strokeWeight(px.debugCircleWeight);
            const dash = [10, 8];
            p.drawingContext.setLineDash(dash);
            p.ellipse(ccx, ccy, rx * 2, ry * 2);
            p.drawingContext.setLineDash([]);
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
      className="h-screen w-full cursor-pointer bg-[#0a0a0a] -z-10"
      style={frameFilter ? { filter: frameFilter } : undefined}
    >
      {/* p5 injects canvas here */}
    </div>
  );
}
