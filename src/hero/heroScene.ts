import {
  CustomBlending,
  LinearFilter,
  LinearMipmapLinearFilter,
  Mesh,
  MeshBasicMaterial,
  OneFactor,
  OneMinusSrcAlphaFactor,
  OrthographicCamera,
  PlaneGeometry,
  Scene,
  ShaderMaterial,
  SRGBColorSpace,
  TextureLoader,
  WebGLRenderer,
  type Texture,
} from 'three';

export interface HeroLayer {
  src: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface HeroSceneOptions {
  canvas: HTMLCanvasElement;
  /** Element whose box the canvas fills and which receives pointer input. */
  host: HTMLElement;
  pointerTarget: HTMLElement;
  stage: { w: number; h: number };
  layers: { landscape: HeroLayer; orbit: HeroLayer; v: HeroLayer; restingLight: HeroLayer };
  /** Maximum travel in CSS pixels. */
  travel?: { orbit: [number, number]; v: [number, number] };
  /** Seconds between orbit light passes (the first runs shortly after the scene appears). */
  sweepEvery?: number;
  onContextLost: () => void;
}

/**
 * Geometry measured from the supplied layers (scripts: ellipse fit to the orbit's ring pixels;
 * ridge trace of the V's brightest bevel).
 *  - Orbit (02-orbit, 883 × 269): ellipse centre (508, 119), semi-axes 349 × 69.6, tilt −10.14°.
 *  - V (03-v, 635 × 413): the inner bevel of the green arm runs (420, 60) → (252, 360).
 */
const ORBIT = { c: [508, 119] as [number, number], ab: [349, 69.6] as [number, number], phi: (-10.14 * Math.PI) / 180 };
const BEVEL = { p0: [430, 42] as [number, number], p1: [246, 372] as [number, number] };
const SWEEP_MS = 3600;
const GLINT_MS = 820;

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export interface HeroScene {
  /** Resolves after the first frame has been drawn at the resting pose. */
  ready: Promise<void>;
  dispose: () => void;
}

const MAX_DPR = 2;
const TAU_MS = 150; // easing time constant
const REST_EPS = 0.015; // CSS px

/**
 * Layered Home hero on its native 1672 × 581 canvas.
 *
 * - Orthographic camera in source pixels (y down → negative world y), one textured plane per
 *   layer at its manifest position, stacked in filename order.
 * - Textures are sRGB and premultiplied on upload; blending is ONE / ONE_MINUS_SRC_ALPHA, so the
 *   resting frame composites exactly like the browser does for the poster.
 * - Renders on demand only: one frame at rest, then frames only while the V and orbit ease.
 * - Pauses offscreen and in hidden tabs; releases every GPU resource on dispose.
 */
export function createHeroScene(opts: HeroSceneOptions): HeroScene {
  const { canvas, host, pointerTarget, stage, layers, onContextLost } = opts;
  const travel = opts.travel ?? { orbit: [3.5, 2], v: [7, 4.5] };

  const renderer = new WebGLRenderer({
    canvas,
    antialias: false,
    alpha: false,
    premultipliedAlpha: true,
    powerPreference: 'low-power',
    preserveDrawingBuffer: false,
  });
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.setClearColor(0x020a18, 1);

  const scene = new Scene();
  const camera = new OrthographicCamera(0, stage.w, 0, -stage.h, -10, 10);
  camera.position.z = 5;

  const loader = new TextureLoader();
  const disposables: { dispose: () => void }[] = [];
  const meshes: Record<keyof HeroSceneOptions['layers'], Mesh | null> = {
    landscape: null,
    orbit: null,
    v: null,
    restingLight: null,
  };
  const base: Record<string, [number, number]> = {};

  let disposed = false;
  let raf = 0;
  let last = 0;
  let visible = true;
  let inView = true;
  const target = { ox: 0, oy: 0, vx: 0, vy: 0 };
  const cur = { ox: 0, oy: 0, vx: 0, vy: 0 };

  const textures: Texture[] = [];
  const texByKey: Partial<Record<keyof HeroSceneOptions['layers'], Texture>> = {};
  let orbitLight: Mesh | null = null;

  // ---- Orbit light + bevel glint (signature moment) ----
  // Shared uniforms, injected into the orbit and V materials. With amp = 0 the added term is
  // exactly zero, so between passes the frame is the untouched resting composite.
  const U = {
    uHead: { value: 0 },
    uAmp: { value: 0 },
    uGlint: { value: -1 },
    uGlintAmp: { value: 0 },
  };
  // Arc-length parameterisation of the orbit, so the light moves at an even pace in pixels
  // (the ellipse's angle runs fast at its narrow ends and slow along its long sides).
  const ARC_N = 720;
  const arc = new Float32Array(ARC_N + 1);
  {
    const [a, b] = ORBIT.ab;
    for (let i = 1; i <= ARC_N; i++) {
      const t = ((i - 0.5) / ARC_N) * Math.PI * 2;
      arc[i] = arc[i - 1] + Math.hypot(a * Math.sin(t), b * Math.cos(t)) * ((Math.PI * 2) / ARC_N);
    }
  }
  const thetaAtArc = (f: number) => {
    const target = f * arc[ARC_N];
    let lo = 0;
    let hi = ARC_N;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (arc[mid] < target) lo = mid;
      else hi = mid;
    }
    const span = arc[hi] - arc[lo] || 1;
    return ((lo + (target - arc[lo]) / span) / ARC_N) * Math.PI * 2;
  };
  // Where the orbit passes the bevel (front, lower crossing), as an arc-length fraction from the
  // pass's start at the orbit's left end (θ = π).
  const glintAt = (() => {
    const O = layers.orbit;
    const Vl = layers.v;
    const [cx, cy] = ORBIT.c;
    const [a, b] = ORBIT.ab;
    const cs = Math.cos(ORBIT.phi);
    const sn = Math.sin(ORBIT.phi);
    const p0 = [Vl.x + BEVEL.p0[0], Vl.y + BEVEL.p0[1]];
    const p1 = [Vl.x + BEVEL.p1[0], Vl.y + BEVEL.p1[1]];
    const segDist = (x: number, y: number) => {
      const ex = p1[0] - p0[0];
      const ey = p1[1] - p0[1];
      const t = Math.max(0, Math.min(1, ((x - p0[0]) * ex + (y - p0[1]) * ey) / (ex * ex + ey * ey)));
      return Math.hypot(x - (p0[0] + ex * t), y - (p0[1] + ey * t));
    };
    let best = Infinity;
    let bestTh = Math.PI / 2;
    for (let i = 0; i < 1440; i++) {
      const th = (i / 1440) * Math.PI * 2;
      if (Math.sin(th) <= 0) continue; // lower half of the ring (towards the viewer)
      const u = a * Math.cos(th);
      const v = b * Math.sin(th);
      const x = O.x + cx + u * cs - v * sn;
      const y = O.y + cy + u * sn + v * cs;
      const d = segDist(x, y);
      if (d < best) {
        best = d;
        bestTh = th;
      }
    }
    // arc fraction from θ = π going forward (increasing θ) to bestTh (+2π)
    const arcOf = (th: number) => {
      const i = Math.min(ARC_N, Math.max(0, (th / (Math.PI * 2)) * ARC_N));
      const i0 = Math.floor(i);
      return arc[i0] + (arc[Math.min(ARC_N, i0 + 1)] - arc[i0]) * (i - i0);
    };
    const start = arcOf(Math.PI);
    const end = arcOf(bestTh) + arc[ARC_N];
    return ((end - start) / arc[ARC_N]) % 1;
  })();
  // Time (fraction of the pass) at which the eased head reaches the bevel crossing.
  const glintP = (() => {
    let lo = 0;
    let hi = 1;
    for (let i = 0; i < 40; i++) {
      const m = (lo + hi) / 2;
      if (ease(m) < glintAt) lo = m;
      else hi = m;
    }
    return lo;
  })();
  let sweepStart = -1; // performance.now() of the running pass, or -1
  let sweepRuns = 0;
  let sweepTimer = 0;
  const sweepEvery = (opts.sweepEvery ?? 9) * 1000;

  function sweepState(now: number) {
    if (sweepStart < 0) return false;
    const p = (now - sweepStart) / SWEEP_MS;
    const g = (now - sweepStart - glintP * SWEEP_MS + GLINT_MS * 0.3) / GLINT_MS;
    if (p >= 1 && g >= 1) {
      sweepStart = -1;
      U.uAmp.value = 0;
      U.uGlint.value = -1;
      U.uGlintAmp.value = 0;
      // Published for tests and debugging: the next frame is the exact resting composite.
      host.dataset.heroLight = 'off';
      host.dataset.heroLightRuns = String(++sweepRuns);
      return false;
    }
    const pc = Math.min(1, Math.max(0, p));
    // even pace in pixels, eased at both ends; starts at the left end of the ring
    const startArc = 0.5; // θ = π sits at half the arc length
    U.uHead.value = thetaAtArc((startArc + ease(pc)) % 1) + (startArc + ease(pc) >= 1 ? Math.PI * 2 : 0);
    U.uAmp.value = p >= 1 ? 0 : Math.min(1, pc / 0.08) * (1 - Math.max(0, (pc - 0.86) / 0.14));
    if (g >= 0 && g < 1) {
      U.uGlint.value = g;
      U.uGlintAmp.value = Math.sin(Math.PI * g);
    } else {
      U.uGlint.value = -1;
      U.uGlintAmp.value = 0;
    }
    return true;
  }

  function scheduleSweep(delay: number) {
    window.clearTimeout(sweepTimer);
    sweepTimer = window.setTimeout(() => {
      if (disposed) return;
      if (!visible || !inView) {
        scheduleSweep(1500);
        return;
      }
      sweepStart = performance.now();
      host.dataset.heroLight = 'on';
      kick();
      scheduleSweep(sweepEvery);
    }, delay);
  }

  function sizeToHost() {
    const w = host.clientWidth;
    const h = host.clientHeight;
    if (!w || !h) return;
    const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    renderer.setPixelRatio(dpr);
    renderer.setSize(w, h, false);
    // At or above native scale, sample texels directly (exact at 1:1); below it, use mipmaps.
    const minify = (w * dpr) / stage.w < 0.98;
    for (const t of textures) {
      const f = minify ? LinearMipmapLinearFilter : LinearFilter;
      if (t.minFilter !== f) {
        t.minFilter = f;
        t.needsUpdate = true;
      }
    }
  }

  function cssToStage() {
    return stage.w / Math.max(1, host.clientWidth);
  }

  function apply() {
    const k = cssToStage();
    const o = meshes.orbit;
    const v = meshes.v;
    const l = meshes.restingLight;
    if (o) o.position.set(base.orbit[0] + cur.ox * k, base.orbit[1] - cur.oy * k, 1);
    if (v) v.position.set(base.v[0] + cur.vx * k, base.v[1] - cur.vy * k, 2);
    if (orbitLight) {
      orbitLight.position.set(base.orbit[0] + cur.ox * k, base.orbit[1] - cur.oy * k, 4);
      const m = orbitLight.material as ShaderMaterial;
      m.uniforms.uOOrigin.value = [layers.orbit.x + cur.ox * k, layers.orbit.y + cur.oy * k];
      m.uniforms.uVOrigin.value = [layers.v.x + cur.vx * k, layers.v.y + cur.vy * k];
      orbitLight.visible = U.uAmp.value > 0;
    }
    if (l) {
      const d = Math.max(Math.hypot(cur.vx, cur.vy), Math.hypot(cur.ox, cur.oy) * 1.4);
      const t = Math.min(1, Math.max(0, (d - 0.1) / 1.4));
      const op = 1 - t * t * (3 - 2 * t); // smoothstep fade
      const m = l.material as MeshBasicMaterial;
      m.opacity = op;
      m.color.setScalar(op); // premultiplied: scale colour with alpha
      l.visible = op > 0.002;
    }
  }

  function render() {
    if (disposed) return;
    apply();
    renderer.render(scene, camera);
  }

  function atRest() {
    return (
      Math.abs(cur.ox - target.ox) < REST_EPS &&
      Math.abs(cur.oy - target.oy) < REST_EPS &&
      Math.abs(cur.vx - target.vx) < REST_EPS &&
      Math.abs(cur.vy - target.vy) < REST_EPS
    );
  }

  function tick(now: number) {
    raf = 0;
    if (disposed || !visible || !inView) return;
    const dt = last ? Math.min(64, now - last) : 16;
    last = now;
    const a = 1 - Math.exp(-dt / TAU_MS);
    cur.ox += (target.ox - cur.ox) * a;
    cur.oy += (target.oy - cur.oy) * a;
    cur.vx += (target.vx - cur.vx) * a;
    cur.vy += (target.vy - cur.vy) * a;
    const sweeping = sweepState(now);
    if (atRest()) {
      // Settle exactly on the target; at the resting pose this is the original reflection.
      Object.assign(cur, target);
      render();
      if (sweeping) {
        raf = requestAnimationFrame(tick);
        return;
      }
      last = 0;
      return;
    }
    render();
    raf = requestAnimationFrame(tick);
  }

  function kick() {
    if (!raf && !disposed && visible && inView) {
      last = 0;
      raf = requestAnimationFrame(tick);
    }
  }

  function onPointerMove(e: PointerEvent) {
    if (e.pointerType !== 'mouse' && e.pointerType !== 'pen') return;
    const r = pointerTarget.getBoundingClientRect();
    const nx = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width) * 2 - 1));
    const ny = Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height) * 2 - 1));
    target.ox = nx * travel.orbit[0];
    target.oy = ny * travel.orbit[1];
    target.vx = nx * travel.v[0];
    target.vy = ny * travel.v[1];
    kick();
  }

  function onPointerLeave() {
    target.ox = target.oy = target.vx = target.vy = 0;
    kick();
  }

  function onVisibility() {
    visible = document.visibilityState === 'visible';
    if (!visible) {
      cancelAnimationFrame(raf);
      raf = 0;
    } else kick();
  }

  const io = new IntersectionObserver(
    ([entry]) => {
      inView = entry.isIntersecting;
      if (!inView) {
        cancelAnimationFrame(raf);
        raf = 0;
        // Leave the scene at rest while offscreen.
        target.ox = target.oy = target.vx = target.vy = 0;
        Object.assign(cur, target);
        sweepStart = -1;
        U.uAmp.value = 0;
        U.uGlint.value = -1;
        U.uGlintAmp.value = 0;
        host.dataset.heroLight = 'off';
      } else render();
    },
    { threshold: 0 },
  );

  const ro = new ResizeObserver(() => {
    sizeToHost();
    render();
  });

  function onLost(e: Event) {
    e.preventDefault();
    dispose();
    onContextLost();
  }

  /**
   * V glint, added to the V's own pixels in its texture space before the output colour
   * conversion: a short spot running down one bevel, limited to its brightest texels.
   */
  function patchMaterial(mat: MeshBasicMaterial, key: 'v', L: HeroLayer) {
    mat.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, U, {
        uSize: { value: [L.w, L.h] },
        uC: { value: ORBIT.c },
        uAB: { value: ORBIT.ab },
        uPhi: { value: ORBIT.phi },
        uP0: { value: BEVEL.p0 },
        uP1: { value: BEVEL.p1 },
      });
      const decl = `
uniform float uHead; uniform float uAmp; uniform float uGlint; uniform float uGlintAmp;
uniform vec2 uSize; uniform vec2 uC; uniform vec2 uAB; uniform float uPhi; uniform vec2 uP0; uniform vec2 uP1;
`;
      const vGlint = `
if (uGlint >= 0.0) {
  vec2 px = vec2(vMapUv.x * uSize.x, (1.0 - vMapUv.y) * uSize.y);
  vec2 e = uP1 - uP0;
  float len = length(e);
  vec2 ed = e / len;
  vec2 nrm = vec2(-ed.y, ed.x);
  vec2 rel = px - uP0;
  float along = dot(rel, ed);
  float across = dot(rel, nrm);
  float pos = uGlint * (len + 140.0) - 70.0;
  float spot = exp(-pow((along - pos) / 52.0, 2.0)) * exp(-pow(across / 11.0, 2.0));
  float lum = dot(gl_FragColor.rgb, vec3(0.2126, 0.7152, 0.0722)) / max(gl_FragColor.a, 1e-3);
  float bevel = smoothstep(0.36, 0.85, lum);
  gl_FragColor.rgb += mix(gl_FragColor.rgb, vec3(gl_FragColor.a), 0.7) * spot * bevel * uGlintAmp * 1.7;
}
`;
      shader.fragmentShader = decl + shader.fragmentShader.replace(
        '#include <opaque_fragment>',
        `#include <opaque_fragment>\n${vGlint}`,
      );
    };
    mat.customProgramCacheKey = () => `hero-${key}`;
  }

  async function load(key: keyof HeroSceneOptions['layers'], order: number): Promise<void> {
    const L = layers[key];
    const tex: Texture = await loader.loadAsync(L.src);
    if (disposed) {
      tex.dispose();
      return;
    }
    tex.colorSpace = SRGBColorSpace;
    tex.premultiplyAlpha = true;
    tex.generateMipmaps = true;
    tex.minFilter = LinearFilter;
    tex.magFilter = LinearFilter;
    tex.needsUpdate = true;
    textures.push(tex);
    const mat = new MeshBasicMaterial({
      map: tex,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
      blending: CustomBlending,
      blendSrc: OneFactor,
      blendDst: OneMinusSrcAlphaFactor,
      blendSrcAlpha: OneFactor,
      blendDstAlpha: OneMinusSrcAlphaFactor,
      premultipliedAlpha: false,
    });
    if (key === 'v') patchMaterial(mat, key, L);
    texByKey[key] = tex;
    const geo = new PlaneGeometry(L.w, L.h);
    const mesh = new Mesh(geo, mat);
    base[key] = [L.x + L.w / 2, -(L.y + L.h / 2)];
    mesh.position.set(base[key][0], base[key][1], order);
    mesh.renderOrder = order;
    meshes[key] = mesh;
    scene.add(mesh);
    disposables.push(tex, mat, geo);
  }

  /**
   * The orbit light is its own additive layer on top of the resting light (which covers the ring
   * with its reflections). It reads the ring's pixels for shape and colour and the V's alpha for
   * occlusion, so the light runs along the supplied orbit and passes behind the V.
   */
  function createOrbitLight() {
    const O = layers.orbit;
    const Vl = layers.v;
    const mat = new ShaderMaterial({
      uniforms: {
        ...U,
        uOrbit: { value: texByKey.orbit },
        uV: { value: texByKey.v },
        uSize: { value: [O.w, O.h] },
        uVSize: { value: [Vl.w, Vl.h] },
        uOOrigin: { value: [O.x, O.y] },
        uVOrigin: { value: [Vl.x, Vl.y] },
        uC: { value: ORBIT.c },
        uAB: { value: ORBIT.ab },
        uPhi: { value: ORBIT.phi },
      },
      vertexShader: `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`,
      fragmentShader: `
uniform sampler2D uOrbit; uniform sampler2D uV;
uniform float uHead; uniform float uAmp;
uniform vec2 uSize; uniform vec2 uVSize; uniform vec2 uOOrigin; uniform vec2 uVOrigin;
uniform vec2 uC; uniform vec2 uAB; uniform float uPhi;
varying vec2 vUv;
void main() {
  vec4 t = texture2D(uOrbit, vUv);
  vec2 px = vec2(vUv.x * uSize.x, (1.0 - vUv.y) * uSize.y);
  vec2 d = px - uC;
  float cs = cos(uPhi), sn = sin(uPhi);
  vec2 q = vec2(d.x * cs + d.y * sn, -d.x * sn + d.y * cs) / uAB;
  float th = atan(q.y, q.x);
  float dd = mod(uHead - th + 3.14159265, 6.28318531) - 3.14159265; // > 0: behind the head
  float ds = length(vec2(uAB.x * sin(th), uAB.y * cos(th)));        // px per radian here
  float dpx = dd * ds;
  float head = exp(-pow(dpx / 16.0, 2.0));
  float tail = dpx > 0.0 ? exp(-dpx / 120.0) * 0.45 : 0.0;
  // behind the V: its alpha at this stage position hides the light
  vec2 vuv = (uOOrigin + px - uVOrigin) / uVSize;
  float vA = (vuv.x < 0.0 || vuv.y < 0.0 || vuv.x > 1.0 || vuv.y > 1.0) ? 0.0 : texture2D(uV, vec2(vuv.x, 1.0 - vuv.y)).a;
  float occ = 1.0 - smoothstep(0.3, 0.9, vA);
  float ring = smoothstep(0.08, 0.6, t.a);
  vec3 col = mix(t.rgb, vec3(t.a), 0.6) * ring * (head * 1.6 + tail) * uAmp * occ;
  gl_FragColor = vec4(col, 0.0);
  #include <colorspace_fragment>
}
`,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
      blending: CustomBlending,
      blendSrc: OneFactor,
      blendDst: OneFactor,
      blendSrcAlpha: OneFactor,
      blendDstAlpha: OneFactor,
    });
    const geo = new PlaneGeometry(O.w, O.h);
    orbitLight = new Mesh(geo, mat);
    orbitLight.position.set(base.orbit[0], base.orbit[1], 4);
    orbitLight.renderOrder = 4;
    orbitLight.visible = false;
    scene.add(orbitLight);
    disposables.push(mat, geo);
  }

  const ready = (async () => {
    await Promise.all([load('landscape', 0), load('orbit', 1), load('v', 2), load('restingLight', 3)]);
    if (disposed) throw new Error('disposed');
    createOrbitLight();
    sizeToHost();
    // Upload textures before the first visible frame to avoid a hitch on swap.
    renderer.compile(scene, camera);
    render();
    canvas.addEventListener('webglcontextlost', onLost, false);
    pointerTarget.addEventListener('pointermove', onPointerMove);
    pointerTarget.addEventListener('pointerleave', onPointerLeave);
    document.addEventListener('visibilitychange', onVisibility);
    io.observe(host);
    ro.observe(host);
    scheduleSweep(900);
  })();

  function dispose() {
    if (disposed) return;
    disposed = true;
    cancelAnimationFrame(raf);
    window.clearTimeout(sweepTimer);
    pointerTarget.removeEventListener('pointermove', onPointerMove);
    pointerTarget.removeEventListener('pointerleave', onPointerLeave);
    document.removeEventListener('visibilitychange', onVisibility);
    canvas.removeEventListener('webglcontextlost', onLost);
    io.disconnect();
    ro.disconnect();
    for (const d of disposables) d.dispose();
    scene.clear();
    renderer.dispose();
    renderer.forceContextLoss();
  }

  return { ready, dispose };
}
