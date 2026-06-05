import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

const W = 340;
const H = 150;
const SEG_X = 130;
const SEG_Z = 58;

function heightAt(x: number, z: number) {
  return (
    Math.sin(x * 0.08 + 1.2) * 3.6 +
    Math.cos(z * 0.12 + 0.5) * 2.8 +
    Math.sin((x + z) * 0.06) * 4.8 +
    Math.cos(x * 0.04 - z * 0.05) * 3.6 +
    Math.sin(x * 0.18) * 0.7 +
    Math.cos(z * 0.22) * 0.5
  );
}

function buildGrid() {
  const verts: number[] = [];
  const stepX = W / SEG_X;
  const stepZ = H / SEG_Z;
  const startX = -W / 2;
  const startZ = -H / 2;

  const grid: [number, number, number][][] = [];
  for (let j = 0; j <= SEG_Z; j++) {
    grid[j] = [];
    for (let i = 0; i <= SEG_X; i++) {
      const x = startX + i * stepX;
      const z = startZ + j * stepZ;
      const y = heightAt(x, z);
      grid[j][i] = [x, y, z];
    }
  }

  for (let j = 0; j <= SEG_Z; j++) {
    for (let i = 0; i < SEG_X; i++) {
      verts.push(...grid[j][i], ...grid[j][i + 1]);
    }
  }
  for (let i = 0; i <= SEG_X; i++) {
    for (let j = 0; j < SEG_Z; j++) {
      verts.push(...grid[j][i], ...grid[j + 1][i]);
    }
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
  return { geom, grid };
}

function findPeaks(grid: [number, number, number][][]) {
  const peaks: [number, number, number][] = [];
  const minHeight = 3.2;
  const radius = 3;
  for (let j = radius; j < grid.length - radius; j++) {
    for (let i = radius; i < grid[0].length - radius; i++) {
      const y = grid[j][i][1];
      if (y < minHeight) continue;
      let isPeak = true;
      for (let dj = -radius; dj <= radius && isPeak; dj++) {
        for (let di = -radius; di <= radius && isPeak; di++) {
          if (di === 0 && dj === 0) continue;
          if (grid[j + dj][i + di][1] > y) isPeak = false;
        }
      }
      if (isPeak) peaks.push(grid[j][i]);
    }
  }
  return peaks;
}

export function initTerrainScene(
  container: HTMLElement,
  canvas: HTMLCanvasElement,
  onHintHide?: () => void,
) {
  const scene = new THREE.Scene();
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 1000);
  camera.position.set(0, 42, 86);

  const { geom, grid } = buildGrid();
  const wireMat = new THREE.LineBasicMaterial({
    color: 0xf9f9f9,
    transparent: true,
    opacity: 0.22,
  });
  scene.add(new THREE.LineSegments(geom, wireMat));

  const peaks = findPeaks(grid);
  const dotGeom = new THREE.SphereGeometry(0.45, 12, 12);
  const dotMat = new THREE.MeshBasicMaterial({ color: 0x73f36c });
  const dots = new THREE.InstancedMesh(dotGeom, dotMat, peaks.length);
  const dummy = new THREE.Object3D();
  peaks.forEach((p, i) => {
    dummy.position.set(p[0], p[1] + 0.6, p[2]);
    dummy.updateMatrix();
    dots.setMatrixAt(i, dummy.matrix);
  });
  dots.instanceMatrix.needsUpdate = true;
  scene.add(dots);

  const haloGeom = new THREE.SphereGeometry(1.6, 16, 16);
  const haloMat = new THREE.MeshBasicMaterial({
    color: 0x73f36c,
    transparent: true,
    opacity: 0.18,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const halos = new THREE.InstancedMesh(haloGeom, haloMat, peaks.length);
  peaks.forEach((p, i) => {
    dummy.position.set(p[0], p[1] + 0.6, p[2]);
    dummy.updateMatrix();
    halos.setMatrixAt(i, dummy.matrix);
  });
  halos.instanceMatrix.needsUpdate = true;
  scene.add(halos);

  const controls = new OrbitControls(camera, container);
  controls.target.set(0, -4, 0);
  controls.enableZoom = false;
  controls.enablePan = false;
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.rotateSpeed = 0.6;
  controls.minPolarAngle = Math.PI * 0.22;
  controls.maxPolarAngle = Math.PI * 0.38;
  controls.minAzimuthAngle = -Math.PI * 0.3;
  controls.maxAzimuthAngle = Math.PI * 0.3;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.35;

  const sizeRenderer = () => {
    const w = container.clientWidth;
    const h = container.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };

  controls.addEventListener("start", () => {
    controls.autoRotate = false;
    onHintHide?.();
    container.classList.remove("cursor-grab");
    container.classList.add("cursor-grabbing");
  });
  controls.addEventListener("end", () => {
    container.classList.remove("cursor-grabbing");
    container.classList.add("cursor-grab");
  });

  sizeRenderer();
  let resizeRaf = 0;
  const ro = new ResizeObserver(() => {
    cancelAnimationFrame(resizeRaf);
    resizeRaf = requestAnimationFrame(sizeRenderer);
  });
  ro.observe(container);

  let frameId = 0;
  const animate = () => {
    frameId = requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
  };
  animate();

  return () => {
    cancelAnimationFrame(frameId);
    ro.disconnect();
    controls.dispose();
    geom.dispose();
    wireMat.dispose();
    dotGeom.dispose();
    dotMat.dispose();
    haloGeom.dispose();
    haloMat.dispose();
    renderer.dispose();
  };
}
