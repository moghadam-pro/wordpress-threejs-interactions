const THREE_MODULE_URL = "https://cdn.jsdelivr.net/npm/three@0.178.0/build/three.module.min.js";
const reduceMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
const finePointerQuery = window.matchMedia("(hover: hover) and (pointer: fine)");

let THREE = null;

try {
  THREE = await import(THREE_MODULE_URL);
} catch (error) {
  console.warn("Interactive Bento: Three.js was unavailable; CSS fallback is active.", error);
}

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
const lerp = (start, end, amount) => start + (end - start) * amount;

const planeVertexShader = `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const planeFragmentShader = `
  precision highp float;

  uniform float uTime;
  uniform float uAspect;
  uniform float uHover;
  uniform vec2 uPointer;
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  uniform vec3 uColorC;

  varying vec2 vUv;

  float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  void main() {
    vec2 centered = vUv - 0.5;
    centered.x *= uAspect;

    vec2 pointer = uPointer * 0.5;
    pointer.x *= uAspect;

    float pointerDistance = length(centered - pointer);
    float pointerGlow = exp(-pointerDistance * pointerDistance * 5.5);

    float waveA = sin(centered.x * 5.0 + centered.y * 3.0 + uTime * 0.32);
    float waveB = cos(centered.y * 7.0 - centered.x * 2.5 - uTime * 0.24);
    float flow = 0.5 + 0.5 * sin((waveA + waveB) * 1.4 + centered.y * 4.0);

    vec3 base = mix(uColorA * 0.16, uColorC * 0.32, smoothstep(-0.7, 0.85, centered.y));
    vec3 aurora = mix(uColorA, uColorB, flow);
    float auroraBand = smoothstep(0.78, 0.12, abs(centered.y + waveA * 0.17));

    vec3 color = base;
    color += aurora * auroraBand * 0.44;
    color += mix(uColorC, vec3(1.0), 0.35) * pointerGlow * (0.14 + uHover * 0.42);

    float vignette = smoothstep(1.12, 0.25, length(centered * vec2(0.72, 0.82)));
    float grain = (hash21(gl_FragCoord.xy + uTime) - 0.5) * 0.035;

    color = color * (0.7 + vignette * 0.42) + grain;
    gl_FragColor = vec4(color, 0.96);
  }
`;

const pointsVertexShader = `
  uniform float uTime;
  uniform float uAspect;
  uniform float uHover;
  uniform float uPixelRatio;
  uniform vec2 uPointer;

  attribute float aSeed;
  varying float vStrength;

  void main() {
    vec3 p = position;
    vec2 aspectPosition = vec2(p.x * uAspect, p.y);
    vec2 aspectPointer = vec2(uPointer.x * uAspect, uPointer.y);
    vec2 delta = aspectPosition - aspectPointer;
    float distanceToPointer = max(length(delta), 0.001);
    float influence = exp(-distanceToPointer * distanceToPointer * 8.0) * uHover;

    vec2 direction = delta / distanceToPointer;
    p.xy += direction * influence * 0.12;
    p.x += sin(uTime * 0.37 + p.y * 7.0 + aSeed * 5.0) * 0.006;
    p.y += cos(uTime * 0.29 + p.x * 8.0 + aSeed * 4.0) * 0.007;
    p.z += influence * 0.22;

    vStrength = 0.22 + influence * 0.78;

    vec4 modelViewPosition = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * modelViewPosition;
    gl_PointSize = (1.15 + influence * 4.8 + aSeed * 0.6) * uPixelRatio;
  }
`;

const pointsFragmentShader = `
  precision highp float;

  uniform vec3 uColor;
  varying float vStrength;

  void main() {
    vec2 point = gl_PointCoord - 0.5;
    float circle = smoothstep(0.5, 0.12, length(point));
    float core = smoothstep(0.19, 0.0, length(point));
    vec3 color = mix(uColor, vec3(1.0), core * 0.72);
    gl_FragColor = vec4(color, circle * vStrength * 0.78);
  }
`;

class ReactivePointField {
  constructor(card, canvas, Three) {
    this.card = card;
    this.canvas = canvas;
    this.THREE = Three;
    this.pointer = { x: 0, y: 0, hover: 0 };
    this.targetPointer = { x: 0, y: 0, hover: 0 };
    this.isVisible = true;
    this.frame = null;
    this.startTime = performance.now();
    this.lastTime = this.startTime;

    this.init();
  }

  init() {
    const Three = this.THREE;

    try {
      this.renderer = new Three.WebGLRenderer({
        canvas: this.canvas,
        alpha: true,
        antialias: true,
        powerPreference: "high-performance",
      });
    } catch (error) {
      console.warn("Interactive Bento: WebGL renderer could not start.", error);
      return;
    }

    this.renderer.setClearColor(0x000000, 0);
    this.renderer.outputColorSpace = Three.SRGBColorSpace;

    this.scene = new Three.Scene();
    this.camera = new Three.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
    this.camera.position.z = 2;

    const colors = {
      a: new Three.Color(this.card.dataset.colorA || "#635bff"),
      b: new Three.Color(this.card.dataset.colorB || "#ff5db1"),
      c: new Three.Color(this.card.dataset.colorC || "#7dd3fc"),
    };

    this.sharedUniforms = {
      uTime: { value: 0 },
      uAspect: { value: 1 },
      uHover: { value: 0 },
      uPointer: { value: new Three.Vector2(0, 0) },
    };

    const planeGeometry = new Three.PlaneGeometry(2, 2, 1, 1);
    const planeMaterial = new Three.ShaderMaterial({
      uniforms: {
        ...this.sharedUniforms,
        uColorA: { value: colors.a },
        uColorB: { value: colors.b },
        uColorC: { value: colors.c },
      },
      vertexShader: planeVertexShader,
      fragmentShader: planeFragmentShader,
      transparent: true,
      depthWrite: false,
      depthTest: false,
    });

    this.plane = new Three.Mesh(planeGeometry, planeMaterial);
    this.plane.position.z = -0.4;
    this.scene.add(this.plane);

    const columns = 38;
    const rows = 58;
    const pointCount = columns * rows;
    const positions = new Float32Array(pointCount * 3);
    const seeds = new Float32Array(pointCount);

    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        const index = row * columns + column;
        const index3 = index * 3;
        const jitterX = (Math.random() - 0.5) * 0.018;
        const jitterY = (Math.random() - 0.5) * 0.014;

        positions[index3] = -1.05 + (column / (columns - 1)) * 2.1 + jitterX;
        positions[index3 + 1] = -1.05 + (row / (rows - 1)) * 2.1 + jitterY;
        positions[index3 + 2] = 0.04 + Math.random() * 0.04;
        seeds[index] = Math.random();
      }
    }

    const pointsGeometry = new Three.BufferGeometry();
    pointsGeometry.setAttribute("position", new Three.BufferAttribute(positions, 3));
    pointsGeometry.setAttribute("aSeed", new Three.BufferAttribute(seeds, 1));

    const pointsMaterial = new Three.ShaderMaterial({
      uniforms: {
        ...this.sharedUniforms,
        uPixelRatio: { value: 1 },
        uColor: { value: colors.c },
      },
      vertexShader: pointsVertexShader,
      fragmentShader: pointsFragmentShader,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: Three.AdditiveBlending,
    });

    this.points = new Three.Points(pointsGeometry, pointsMaterial);
    this.scene.add(this.points);

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this.canvas.parentElement);

    this.intersectionObserver = new IntersectionObserver(
      ([entry]) => {
        this.isVisible = entry.isIntersecting;
        if (this.isVisible) this.start();
      },
      { rootMargin: "160px" },
    );
    this.intersectionObserver.observe(this.card);

    this.handleVisibility = () => {
      if (!document.hidden) this.start();
    };
    document.addEventListener("visibilitychange", this.handleVisibility);

    this.canvas.dataset.engine = `three.js r${Three.REVISION}`;
    this.card.classList.add("is-webgl-ready");
    this.resize();
    this.start();
  }

  resize() {
    if (!this.renderer) return;

    const width = Math.max(this.canvas.parentElement.clientWidth, 1);
    const height = Math.max(this.canvas.parentElement.clientHeight, 1);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.75);

    this.renderer.setPixelRatio(pixelRatio);
    this.renderer.setSize(width, height, false);
    this.sharedUniforms.uAspect.value = width / height;
    this.points.material.uniforms.uPixelRatio.value = pixelRatio;
    this.render(performance.now());
  }

  setPointer(x, y, hover) {
    this.targetPointer.x = clamp(x, -1, 1);
    this.targetPointer.y = clamp(y, -1, 1);
    this.targetPointer.hover = clamp(hover, 0, 1);

    if (reduceMotionQuery.matches) {
      this.pointer = { ...this.targetPointer };
      this.updateUniforms();
      this.render(performance.now());
    } else {
      this.start();
    }
  }

  updateUniforms() {
    if (!this.renderer) return;

    this.sharedUniforms.uPointer.value.set(this.pointer.x, this.pointer.y);
    this.sharedUniforms.uHover.value = this.pointer.hover;
  }

  start() {
    if (!this.renderer || this.frame !== null || !this.isVisible || document.hidden) return;

    if (reduceMotionQuery.matches) {
      this.render(performance.now());
      return;
    }

    this.frame = requestAnimationFrame((time) => this.tick(time));
  }

  tick(time) {
    this.frame = null;
    if (!this.renderer || !this.isVisible || document.hidden) return;

    const delta = Math.min((time - this.lastTime) / 16.667, 3);
    const smoothing = 1 - Math.pow(0.84, delta);

    this.pointer.x = lerp(this.pointer.x, this.targetPointer.x, smoothing);
    this.pointer.y = lerp(this.pointer.y, this.targetPointer.y, smoothing);
    this.pointer.hover = lerp(this.pointer.hover, this.targetPointer.hover, smoothing);
    this.updateUniforms();
    this.render(time);
    this.lastTime = time;
    this.start();
  }

  render(time) {
    if (!this.renderer) return;

    this.sharedUniforms.uTime.value = (time - this.startTime) / 1000;
    this.renderer.render(this.scene, this.camera);
  }
}

function initDialog(card) {
  const dialogId = card.dataset.wmDialog;
  const dialog = dialogId ? document.getElementById(dialogId) : null;

  if (!dialog || typeof dialog.showModal !== "function") return;

  const closeButton = dialog.querySelector("[data-wm-dialog-close]");

  const updateExpandedState = () => {
    card.setAttribute("aria-expanded", dialog.open ? "true" : "false");
  };

  card.addEventListener("click", () => {
    if (!dialog.open) dialog.showModal();
    updateExpandedState();
  });

  closeButton?.addEventListener("click", () => dialog.close());
  dialog.addEventListener("close", updateExpandedState);
  dialog.addEventListener("cancel", updateExpandedState);
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });
}

function initPointerInteraction(card, scene) {
  const target = { x: 0.5, y: 0.5, hover: 0 };
  const current = { x: 0.5, y: 0.5, hover: 0 };
  let frame = null;

  const paint = () => {
    frame = null;
    const smoothing = reduceMotionQuery.matches ? 1 : 0.2;

    current.x = lerp(current.x, target.x, smoothing);
    current.y = lerp(current.y, target.y, smoothing);
    current.hover = lerp(current.hover, target.hover, smoothing);

    const xFromCenter = current.x - 0.5;
    const yFromCenter = current.y - 0.5;

    card.style.setProperty("--wm-pointer-x", `${current.x * 100}%`);
    card.style.setProperty("--wm-pointer-y", `${current.y * 100}%`);
    card.style.setProperty("--wm-tilt-x", `${yFromCenter * -7.5}deg`);
    card.style.setProperty("--wm-tilt-y", `${xFromCenter * 8.5}deg`);
    card.style.setProperty("--wm-shift-x", `${xFromCenter * 5}px`);
    card.style.setProperty("--wm-shift-y", `${yFromCenter * 5}px`);
    card.style.setProperty("--wm-canvas-x", `${xFromCenter * -13}px`);
    card.style.setProperty("--wm-canvas-y", `${yFromCenter * -13}px`);

    scene?.setPointer(current.x * 2 - 1, 1 - current.y * 2, current.hover);

    const distance =
      Math.abs(current.x - target.x) +
      Math.abs(current.y - target.y) +
      Math.abs(current.hover - target.hover);

    if (distance > 0.002) frame = requestAnimationFrame(paint);
  };

  const requestPaint = () => {
    if (frame === null) frame = requestAnimationFrame(paint);
  };

  const updateFromPointer = (event) => {
    if (!finePointerQuery.matches) return;

    const bounds = card.getBoundingClientRect();
    target.x = clamp((event.clientX - bounds.left) / bounds.width, 0, 1);
    target.y = clamp((event.clientY - bounds.top) / bounds.height, 0, 1);
    target.hover = 1;
    card.classList.add("is-pointer-active");
    requestPaint();
  };

  card.addEventListener("pointerenter", updateFromPointer);
  card.addEventListener("pointermove", updateFromPointer);
  card.addEventListener("pointerleave", () => {
    target.x = 0.5;
    target.y = 0.5;
    target.hover = 0;
    card.classList.remove("is-pointer-active");
    requestPaint();
  });

  card.addEventListener("focus", () => {
    target.hover = 0.7;
    scene?.setPointer(0, 0, 0.7);
    requestPaint();
  });

  card.addEventListener("blur", () => {
    target.hover = 0;
    requestPaint();
  });

  paint();
}

function initBentoCard(card) {
  if (card.dataset.wmBentoReady === "true") return;

  const canvas = card.querySelector("[data-wm-three-canvas]");
  const scene = THREE && canvas ? new ReactivePointField(card, canvas, THREE) : null;

  initPointerInteraction(card, scene);
  initDialog(card);
  card.dataset.wmBentoReady = "true";
}

function initAllBentoCards(root = document) {
  root.querySelectorAll("[data-wm-bento]").forEach(initBentoCard);
}

initAllBentoCards();

window.WMInteractiveBento = Object.freeze({
  init: initAllBentoCards,
  threeRevision: THREE?.REVISION || null,
});
