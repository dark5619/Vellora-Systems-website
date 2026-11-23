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
  onContextLost: () => void;
}

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
    if (atRest()) {
      // Settle exactly on the target; at the resting pose this is the original reflection.
      Object.assign(cur, target);
      render();
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
    const geo = new PlaneGeometry(L.w, L.h);
    const mesh = new Mesh(geo, mat);
    base[key] = [L.x + L.w / 2, -(L.y + L.h / 2)];
    mesh.position.set(base[key][0], base[key][1], order);
    mesh.renderOrder = order;
    meshes[key] = mesh;
    scene.add(mesh);
    disposables.push(tex, mat, geo);
  }

  const ready = (async () => {
    await Promise.all([load('landscape', 0), load('orbit', 1), load('v', 2), load('restingLight', 3)]);
    if (disposed) throw new Error('disposed');
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
  })();

  function dispose() {
    if (disposed) return;
    disposed = true;
    cancelAnimationFrame(raf);
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
