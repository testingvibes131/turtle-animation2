# Safari blob judder — fixes to port to the main repo

**Problem:** on tall/fullscreen viewports in desktop Safari, the blob's node field
juddered during scroll and in its idle floating drift (fine in Chrome, fine in small
Safari windows). Measured: Safari ~31ms/frame at fullscreen vs Chrome's locked
16.7ms on the same machine, plus intermittent 60–140ms single-frame freezes.

**Three stacked causes, all fixed below:**
1. `backdrop-filter` elements sitting over the every-frame-animating WebGL canvas —
   WebKit re-blurs the region under them on every canvas frame (cost ∝ on-screen
   area, which is why it scaled with viewport height). Worth ~9ms/frame alone.
2. Per-frame CPU hot loops too slow for Safari's JS engine (JSC): ~25k `Math.sin`
   calls, 6,327 per-node `localToWorld` matrix multiplies + full quaternion
   `updateMatrix` composes, a dead 405KB/frame GPU upload, and a fresh ~20-field
   object allocated multiple times per frame (GC pauses = the random freeze-frames).
3. At fullscreen backing-buffer size (4096×2304 @ dpr 2) the MSAA/fill cost still
   kept Safari at ~22ms ⇒ frames alternate 1-vsync/2-vsync = subtle drift judder.
   Fixed with a Safari-only dpr/MSAA policy (visually signed off).

Everything below is in the final state of this folder — you can also just diff the
listed files wholesale.

---

## 1. `features/home/components/HeroStatsPanel.tsx` — delete invisible backdrop-blur

The gradient uses fully opaque surface tokens, so the blur had **zero visual
effect** — but it forced WebKit to re-blur the animating canvas behind the panel
every frame. Safe to delete for all browsers.

```diff
-const stakeWidgetShell =
-  "overflow-hidden backdrop-blur-[7px] border border-stroke-subtle bg-gradient-to-b from-surface-0 to-surface-1";
+// No backdrop-blur here: the gradient uses fully opaque surface tokens, so the
+// blur was invisible — but it forced WebKit to re-blur the animating blob
+// canvas beneath the panel every frame (the Safari tall-viewport scroll glitch).
+const stakeWidgetShell =
+  "overflow-hidden border border-stroke-subtle bg-gradient-to-b from-surface-0 to-surface-1";
```

## 2. `app/globals.css` — Safari-only header blur fallback

The header's `backdrop-blur-md` over the hero canvas is the other per-frame
re-blur. Chrome/Firefox keep the glass; Safari gets a more opaque flat fill.
Add right after the existing `.site-header` transition rule (~line 1408):

```css
/* Safari only (hanging-punctuation + -apple-system-body are WebKit-exclusive):
   backdrop-filter over the every-frame-animating blob canvas forces WebKit to
   re-blur the header strip per frame — measured ~9ms/frame on tall windows,
   the cause of the Safari-only scroll stutter. Swap glass blur for a more
   opaque fill there; Chrome/Firefox keep the full effect. */
@supports (hanging-punctuation: first) and (font: -apple-system-body) {
  .site-header {
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
    background-color: color-mix(in srgb, var(--surface-0) 94%, transparent);
  }
}
```

## 3. `features/blob-scene/lib/geometry/fastSin.ts` — NEW FILE

Table-lookup sine for the visual-only loops (~25k sines/frame was a measurable
JSC cost). Note the clamp — without it, tiny negative inputs can read one slot
past the table and return NaN.

```ts
const SIN_LUT_SIZE = 2048;
const SIN_LUT = new Float32Array(SIN_LUT_SIZE + 1);
for (let i = 0; i <= SIN_LUT_SIZE; i++) {
  SIN_LUT[i] = Math.sin((i / SIN_LUT_SIZE) * Math.PI * 2);
}
const TAU = Math.PI * 2;

/** Table-lookup sine (~1e-5 max error) — the blob loops issue ~25k sines per
 *  frame for ambient drift/ripple, where Math.sin is a measurable cost in
 *  Safari's JS engine. Visual-grade accuracy only. */
export function fastSin(x: number): number {
  let t = x / TAU;
  t -= Math.floor(t);
  const f = t * SIN_LUT_SIZE;
  // Clamp: tiny negative x can round t to exactly 1.0, putting i one past the
  // guard entry (NaN read). Clamping makes the lerp land on sin(2π) instead.
  const i = Math.min(f | 0, SIN_LUT_SIZE - 1);
  const frac = f - i;
  const a = SIN_LUT[i]!;
  return a + (SIN_LUT[i + 1]! - a) * frac;
}
```

## 4. `features/blob-scene/hooks/useBlobFrameGeometry.ts` — LUT sine in the drift loop

Import `fastSin` and replace the three `Math.sin` calls in the per-vertex float
loop (the `pos[i3] += Math.sin(...)` lines) with `fastSin(...)`. No other change.

## 5. `features/blob-scene/components/blob/BlobPointCloud.tsx` — three changes

**(a) Dead 405KB/frame upload (real bug, free win).** The debug mesh re-uploaded
its full empty instance buffer every frame:

```diff
       debugMesh.count = pi;
-      debugMesh.instanceMatrix.needsUpdate = true;
+      // Only re-upload when the debug overlay is actually populated — an
+      // unconditional flag re-uploaded the full (empty) 405KB instance buffer
+      // every frame.
+      if (params.debugHoverZone) debugMesh.instanceMatrix.needsUpdate = true;
```

**(b) Hot-loop rewrite of `writeInstance`.** Replace the module scratch objects
(`_dummy`, `_worldPos`) with:

```ts
const _localPos = new THREE.Vector3();
const _camLocal = new THREE.Vector3();
const _worldScale = new THREE.Vector3();
```

Then, in the `useFrame` callback, transform the camera into blob-local space
ONCE per frame and write matrices straight into the instance buffer (nodes never
rotate, so the full quaternion compose in `Object3D.updateMatrix` was wasted —
and per-node `localToWorld` is replaced by local-space distance × uniform group
scale, which is mathematically identical):

```ts
// Hot path (runs per node, per frame): camera is transformed into
// blob-local space ONCE so each node's world distance is a plain
// local-space distance × the group's uniform world scale — no per-node
// localToWorld. Matrices are written straight into the instance buffer
// (scale on the diagonal + translation); nodes never rotate, so the full
// quaternion compose in Object3D.updateMatrix was wasted work.
_camLocal.copy(state.camera.position);
let groupWorldScale = 1;
if (group) {
  group.worldToLocal(_camLocal);
  groupWorldScale = group.getWorldScale(_worldScale).x;
}
const writeInstance = (
  mesh: THREE.InstancedMesh,
  vertexIndex: number,
  slot: number,
  scaleMul: number,
  hide: boolean,
) => {
  readCachedVertexPosition(frameCache, vertexIndex, _localPos);
  const dx = _localPos.x - _camLocal.x;
  const dy = _localPos.y - _camLocal.y;
  const dz = _localPos.z - _camLocal.z;
  const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) * groupWorldScale;
  const visualScale =
    pointRadius *
    scaleMul *
    depthSizeMultiplier(
      dist,
      sizeNear,
      sizeFar,
      params.depthSizeMinMul,
      params.depthSizeMaxMul,
    );
  scales[vertexIndex] = visualScale;
  const s = hide ? 0 : visualScale;
  const arr = mesh.instanceMatrix.array as Float32Array;
  const o = slot * 16;
  arr[o] = s;
  arr[o + 1] = 0;
  arr[o + 2] = 0;
  arr[o + 3] = 0;
  arr[o + 4] = 0;
  arr[o + 5] = s;
  arr[o + 6] = 0;
  arr[o + 7] = 0;
  arr[o + 8] = 0;
  arr[o + 9] = 0;
  arr[o + 10] = s;
  arr[o + 11] = 0;
  arr[o + 12] = _localPos.x;
  arr[o + 13] = _localPos.y;
  arr[o + 14] = _localPos.z;
  arr[o + 15] = 1;
};
```

This was adversarially reviewed: no rotation was ever authored on instances, no
code reads `instanceMatrix` back (picking is analytic via the frame cache +
`scales`, which is still maintained), the group's scale is uniform, and three
r184's `worldToLocal`/`getWorldScale` refresh `matrixWorld` exactly like the old
per-node `localToWorld` did.

**(c) Ripple sine.** In the per-node color loop, replace `Math.sin(...)` with
`fastSin(...)` (import from `lib/geometry/fastSin`).

## 6. `features/blob-scene/components/blob/BlobSceneContent.tsx` — stop per-frame allocation

`getBlobParamsAtTime` allocated a fresh ~20-field object on every call, multiple
times per frame → steady GC garbage → the random ~120ms freeze-frames. Reuse a
scratch object (verified: every call site in the repo consumes the result
synchronously; nothing retains it across frames):

```ts
import type { PerlinBlobParams } from "@/features/blob-scene/lib/geometry/perlinBlob";

// Reuse one scratch object: this runs multiple times per frame and a fresh
// ~20-field allocation each call produced steady GC garbage (periodic
// ~120ms collection pauses in Safari read as dropped frames). Callers must
// consume the result synchronously, not hold it across frames.
const paramsAtTimeScratchRef = useRef<PerlinBlobParams | null>(null);
const getBlobParamsAtTime = useCallback(
  (time: number) => {
    const scratch = (paramsAtTimeScratchRef.current ??= { ...params, time });
    Object.assign(scratch, params);
    scratch.time = time;
    return scratch;
  },
  [params],
);
```

## 7. `features/blob-scene/lib/geometry/blobViewportOffset.ts` — micro GC fix

Two sites allocated a `Vector3` per call on the scroll path. The target is the
origin, so:

```diff
-  const dist = camera.position.distanceTo(new THREE.Vector3(0, 0, 0));
+  const dist = camera.position.length();
```

(in both `computeBlobOffsetX` and `viewHalfExtents`.)

## 8. `features/blob-scene/BlobExperience.tsx` — Safari render policy

The final piece: even with everything above, Safari sat at ~22ms at fullscreen
buffer size (4096×2304 @ dpr 2 + MSAA). dpr 1.5 + no MSAA brings it under the
16.7ms line and was visually signed off (Chrome untouched, smaller Safari
windows keep full dpr).

```ts
/** Safari (WebKit) can't hold 60fps on the blob at dpr 2 + MSAA once the
 *  viewport gets fullscreen-sized — the node drift visibly judders (measured
 *  ~22ms/frame vs Chrome's locked 16.7ms on identical hardware). Above this
 *  css-pixel area Safari drops to dpr 1.5; it also always skips MSAA (the
 *  ~12px sphere nodes don't visibly benefit). Verified visually equivalent. */
const SAFARI_DPR_CAP_AREA_PX = 1_700_000;
const SAFARI_LARGE_VIEWPORT_DPR = 1.5;

const isSafariBrowser = () =>
  /safari/i.test(navigator.userAgent) &&
  !/chrome|chromium|crios|android/i.test(navigator.userAgent);
```

dpr effect (replaces the old `setDpr(mq.matches ? 1 : [1, 2])` sync, and note
the added **resize listener** so entering/leaving fullscreen retunes it):

```ts
useEffect(() => {
  const mq = window.matchMedia(MOBILE_VIEWPORT_QUERY);
  const safari = isSafariBrowser();
  const sync = () => {
    if (mq.matches) {
      setDpr(1);
      return;
    }
    const area = window.innerWidth * window.innerHeight;
    setDpr(
      safari && area >= SAFARI_DPR_CAP_AREA_PX
        ? SAFARI_LARGE_VIEWPORT_DPR
        : [1, 2],
    );
  };
  sync();
  mq.addEventListener("change", sync);
  window.addEventListener("resize", sync);
  return () => {
    mq.removeEventListener("change", sync);
    window.removeEventListener("resize", sync);
  };
}, []);
```

And on the `<Canvas>`:

```ts
// Safari always renders without MSAA (see SAFARI_DPR_CAP_AREA_PX note).
const noAA = typeof window !== "undefined" && isSafariBrowser();
// ...
gl={{ antialias: !noAA, alpha: true }}
```

---

## Things we ruled out (don't re-investigate)

- Sticky/svh/dvh sub-pixel drift: instrumented every run — zero drift, zero
  measurement reversals, ever. The sticky canvas geometry is rock solid.
- Canvas buffer size alone (dpr): dpr 1 at full AA didn't fix it windowed —
  the blur + CPU terms dominated until they were removed.
- `gl_PointSize` caps: nodes are instanced sphere meshes, not GL points.
- The hero `layoutMirrored` flip: freezes didn't cluster at the hero midpoint.

## FYI: dead code found during review

`applyScrollWobble` in `features/blob-scene/lib/geometry/blobScrollWobble.ts`
has **zero call sites** — the wobble strength ref is written and decayed but the
distortion is never applied to rendering. Wire it up or delete it.

## How to verify after porting

`npm run build && npm start`, open in Safari on a tall monitor, go **fullscreen**
(this was the worst case), and watch the dispersed nodes at the very top of the
page — their slow drift is the most judder-sensitive view. Compare with Chrome
side by side. Before the fixes Safari measured ~31ms/frame there; after, it
holds 60fps.
