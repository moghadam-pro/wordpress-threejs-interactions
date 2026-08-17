const THREE_MODULE_URL = "https://cdn.jsdelivr.net/npm/three@0.178.0/build/three.module.min.js";
const reduceMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
const STATE_LABELS = ["افشانه فیبرنوری", "فرم نیم‌کره", "فرم موجی", "فرم ساعت‌شنی"];

let THREE = null;

try {
  THREE = await import(THREE_MODULE_URL);
} catch (error) {
  console.warn("Vector Canvas: Three.js was unavailable; the gradient fallback is active.", error);
}

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
const lerp = (start, end, amount) => start + (end - start) * amount;
const smoothstep = (value) => value * value * (3 - 2 * value);

function hash(index, salt = 0) {
  const value = Math.sin((index + 1) * 12.9898 + salt * 78.233) * 43758.5453;
  return value - Math.floor(value);
}

function quadraticBezier(start, control, end, t) {
  const inverse = 1 - t;
  return [
    inverse * inverse * start[0] + 2 * inverse * t * control[0] + t * t * end[0],
    inverse * inverse * start[1] + 2 * inverse * t * control[1] + t * t * end[1],
    inverse * inverse * start[2] + 2 * inverse * t * control[2] + t * t * end[2],
  ];
}

function cubicBezier(start, controlA, controlB, end, t) {
  const inverse = 1 - t;
  const inverseSquared = inverse * inverse;
  const tSquared = t * t;

  return [
    inverseSquared * inverse * start[0] +
      3 * inverseSquared * t * controlA[0] +
      3 * inverse * tSquared * controlB[0] +
      tSquared * t * end[0],
    inverseSquared * inverse * start[1] +
      3 * inverseSquared * t * controlA[1] +
      3 * inverse * tSquared * controlB[1] +
      tSquared * t * end[1],
    inverseSquared * inverse * start[2] +
      3 * inverseSquared * t * controlA[2] +
      3 * inverse * tSquared * controlB[2] +
      tSquared * t * end[2],
  ];
}

function getStatePosition(state, lineIndex, lineCount, t) {
  const normal = lineIndex / Math.max(lineCount - 1, 1);
  const seedA = hash(lineIndex, 1);
  const seedB = hash(lineIndex, 2);
  const seedC = hash(lineIndex, 3);

  if (state === 0) {
    const angle = Math.PI * (0.1 + normal * 0.8) + (seedA - 0.5) * 0.024;
    const length = 0.8 + seedB * 0.34;
    const origin = [
      (seedA - 0.5) * 0.034,
      -0.635 + (seedC - 0.5) * 0.018,
      (seedB - 0.5) * 0.025,
    ];
    const endpoint = [
      origin[0] + Math.cos(angle) * length,
      origin[1] + Math.sin(angle) * length,
      (seedA - 0.5) * 0.115,
    ];
    const launchAngle = lerp(Math.PI * 0.5, angle, 0.22);
    const lateralBend = (seedC - 0.5) * 0.09;
    const controlA = [
      origin[0] + Math.cos(launchAngle) * length * 0.34,
      origin[1] + Math.sin(launchAngle) * length * 0.34,
      origin[2] + (seedB - 0.5) * 0.035,
    ];
    const controlB = [
      endpoint[0] - Math.cos(angle) * length * 0.3 - Math.sin(angle) * lateralBend,
      endpoint[1] - Math.sin(angle) * length * 0.3 + Math.cos(angle) * lateralBend,
      endpoint[2] * 0.76,
    ];

    return cubicBezier(origin, controlA, controlB, endpoint, t);
  }

  if (state === 1) {
    const angle = Math.PI * (0.08 + normal * 0.84);
    const radius = 0.88 + seedB * 0.18;
    const center = [0, -0.56, 0];
    const start = [
      -0.43 + (seedA - 0.5) * 0.07,
      0.08 + (seedC - 0.5) * 0.08,
      (seedB - 0.5) * 0.05,
    ];
    const end = [
      center[0] + Math.cos(angle) * radius,
      center[1] + Math.sin(angle) * radius,
      (seedA - 0.5) * 0.1,
    ];
    const control = [
      lerp(start[0], end[0], 0.42) + (seedC - 0.5) * 0.13,
      0.58 + seedA * 0.15,
      (seedB - 0.5) * 0.16,
    ];

    return quadraticBezier(start, control, end, t);
  }

  if (state === 2) {
    const layer = lineIndex % 3;
    const localIndex = Math.floor(lineIndex / 3);
    const localCount = Math.ceil(lineCount / 3);
    const localNormal = localIndex / Math.max(localCount - 1, 1);
    const xBase = lerp(-0.92, 0.92, localNormal);
    const depthScale = 0.9 + layer * 0.055;
    const top =
      0.04 +
      layer * 0.17 +
      Math.sin(xBase * 3.25 + layer * 0.68) * 0.09 +
      (seedA - 0.5) * 0.018;
    const bottom = -0.64 + layer * 0.055;

    return [
      xBase * depthScale + Math.sin(Math.PI * t) * (seedB - 0.5) * 0.018,
      lerp(bottom, top, t),
      (layer - 1) * 0.055 + (seedC - 0.5) * 0.01,
    ];
  }

  const edgeY = lerp(-0.5, 0.5, normal);
  const x = lerp(-0.94, 0.94, t);
  const pinch = Math.pow(Math.abs(2 * t - 1), 1.72);
  const asymmetric = Math.sin(Math.PI * t) * (seedB - 0.5) * 0.045;

  return [
    x,
    edgeY * pinch + asymmetric,
    (seedA - 0.5) * 0.08 + Math.sin(Math.PI * t) * 0.025,
  ];
}

function getClusterPosition(lineIndex) {
  const radius = 0.04 + hash(lineIndex, 7) * 0.27;
  const angle = hash(lineIndex, 8) * Math.PI * 2;
  return [
    Math.cos(angle) * radius,
    0.08 + Math.sin(angle) * radius * 0.82,
    (hash(lineIndex, 9) - 0.5) * 0.16,
  ];
}

const backgroundVertexShader = `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const backgroundFragmentShader = `
  precision highp float;

  uniform float uTime;
  uniform float uHover;
  uniform vec2 uPointerUv;
  varying vec2 vUv;

  float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  void main() {
    vec3 top = vec3(0.055, 0.075, 0.28);
    vec3 middle = vec3(0.18, 0.16, 0.62);
    vec3 bottom = vec3(0.43, 0.36, 1.0);
    vec3 color = mix(bottom, middle, smoothstep(0.0, 0.58, vUv.y));
    color = mix(color, top, smoothstep(0.5, 1.0, vUv.y));

    vec2 lowerPoint = vec2(0.5, -0.07);
    float lowerGlow = exp(-length((vUv - lowerPoint) * vec2(1.25, 1.8)) * 4.4);
    color += vec3(0.74, 0.78, 1.0) * lowerGlow * 0.68;

    vec2 pointerDelta = (vUv - uPointerUv) * vec2(1.25, 1.0);
    float pointerGlow = exp(-dot(pointerDelta, pointerDelta) * 8.0) * uHover;
    color += vec3(0.23, 0.27, 0.78) * pointerGlow * 0.24;

    float vignette = smoothstep(0.92, 0.28, length((vUv - 0.5) * vec2(0.82, 1.0)));
    color *= 0.78 + vignette * 0.25;
    color += (hash21(gl_FragCoord.xy + uTime) - 0.5) * 0.018;

    gl_FragColor = vec4(color, 1.0);
  }
`;

const fiberVertexShader = `
  uniform float uFromState;
  uniform float uToState;
  uniform float uProgress;
  uniform float uTime;
  uniform float uHover;
  uniform float uMotion;
  uniform float uLineWidthWorld;
  uniform float uWidthScale;
  uniform vec2 uPointerWorld;

  attribute vec3 aPrevious;
  attribute vec3 aNext;
  attribute float aSide;
  attribute float aT;
  attribute float aSeed;
  attribute float aDepth;
  attribute float aGuideX;

  varying float vAcross;
  varying float vAlong;
  varying float vDepth;
  varying float vInteraction;
  varying float vVisibility;

  float stateZero(float state) {
    return 1.0 - step(0.5, abs(state));
  }

  float fiberVisibility() {
    float eased = uProgress * uProgress * (3.0 - 2.0 * uProgress);
    float collapse = pow(max(sin(uProgress * 3.14159265), 0.0), 0.72);
    return mix(stateZero(uFromState), stateZero(uToState), eased) * (1.0 - collapse);
  }

  vec3 moveFiber(vec3 source, float along, float seed, float depth, float guideX) {
    vec3 moved = source;
    float flex = pow(smoothstep(0.015, 1.0, along), 1.38);
    float phase = seed * 6.2831853;
    float breeze =
      sin(uTime * 0.48 + phase) * 0.62 +
      sin(uTime * 0.21 + phase * 1.73 + 1.2) * 0.38;
    float crossBreeze = sin(uTime * 0.31 + phase * 2.11) * 0.0045;

    moved.x += (breeze * (0.014 + depth * 0.009) + crossBreeze) * flex * uMotion;
    moved.y += cos(uTime * 0.37 + phase * 1.27) * 0.0042 * flex * uMotion;

    vec2 delta = moved.xy - uPointerWorld;
    float distanceToPointer = length(delta);
    float sideBasis = guideX - uPointerWorld.x + (seed - 0.5) * 0.028;
    float sideDirection = abs(sideBasis) < 0.008
      ? (seed < 0.5 ? -1.0 : 1.0)
      : sign(sideBasis);
    vec2 pushDirection = normalize(vec2(sideDirection, clamp(delta.y * 1.25, -0.14, 0.14)));
    float proximity = 1.0 - smoothstep(0.055, 0.285, distanceToPointer);
    float rootAnchor = smoothstep(0.035, 0.7, along);
    float interaction = proximity * uHover;

    moved.xy += pushDirection * interaction * (0.112 + depth * 0.032) * rootAnchor;
    moved.z += interaction * 0.045 * rootAnchor;
    return moved;
  }

  void main() {
    vec3 center = moveFiber(position, aT, aSeed, aDepth, aGuideX);
    vec3 previous = moveFiber(aPrevious, max(aT - 0.016, 0.0), aSeed, aDepth, aGuideX);
    vec3 next = moveFiber(aNext, min(aT + 0.016, 1.0), aSeed, aDepth, aGuideX);

    vec2 tangent = next.xy - previous.xy;
    float tangentLength = length(tangent);
    tangent = tangentLength > 0.00001 ? tangent / tangentLength : vec2(0.0, 1.0);
    vec2 normal = vec2(-tangent.y, tangent.x);
    float taper = mix(0.82, 1.12, smoothstep(0.0, 0.82, aT));
    float halfWidth = uLineWidthWorld * uWidthScale * taper * (0.78 + aDepth * 0.34) * 0.5;
    center.xy += normal * aSide * halfWidth;

    vec2 pointerDelta = center.xy - uPointerWorld;
    vInteraction = (1.0 - smoothstep(0.055, 0.285, length(pointerDelta))) * uHover;
    vAcross = aSide;
    vAlong = aT;
    vDepth = aDepth;
    vVisibility = fiberVisibility();
    gl_Position = projectionMatrix * modelViewMatrix * vec4(center, 1.0);
  }
`;

const fiberFragmentShader = `
  precision highp float;

  uniform float uOpacity;

  varying float vAcross;
  varying float vAlong;
  varying float vDepth;
  varying float vInteraction;
  varying float vVisibility;

  void main() {
    float edge = 1.0 - smoothstep(0.62, 1.0, abs(vAcross));
    float tipEnergy = smoothstep(0.58, 1.0, vAlong);
    vec3 cool = vec3(0.64, 0.72, 1.0);
    vec3 white = vec3(1.0, 0.985, 1.0);
    vec3 color = mix(cool, white, 0.33 + tipEnergy * 0.44 + vInteraction * 0.16);
    float alpha = edge * uOpacity * (0.42 + vDepth * 0.4 + tipEnergy * 0.18) * vVisibility;
    gl_FragColor = vec4(color, alpha);
  }
`;

const fiberTipVertexShader = `
  uniform float uFromState;
  uniform float uToState;
  uniform float uProgress;
  uniform float uTime;
  uniform float uHover;
  uniform float uMotion;
  uniform float uPixelRatio;
  uniform vec2 uPointerWorld;

  attribute float aSeed;
  attribute float aDepth;

  varying float vDepth;
  varying float vInteraction;
  varying float vVisibility;

  float stateZero(float state) {
    return 1.0 - step(0.5, abs(state));
  }

  vec3 moveTip(vec3 source, float seed, float depth) {
    vec3 moved = source;
    float phase = seed * 6.2831853;
    float breeze =
      sin(uTime * 0.48 + phase) * 0.62 +
      sin(uTime * 0.21 + phase * 1.73 + 1.2) * 0.38;
    moved.x += (breeze * (0.014 + depth * 0.009) + sin(uTime * 0.31 + phase * 2.11) * 0.0045) * uMotion;
    moved.y += cos(uTime * 0.37 + phase * 1.27) * 0.0042 * uMotion;

    vec2 delta = moved.xy - uPointerWorld;
    float distanceToPointer = length(delta);
    float sideBasis = source.x - uPointerWorld.x + (seed - 0.5) * 0.028;
    float sideDirection = abs(sideBasis) < 0.008
      ? (seed < 0.5 ? -1.0 : 1.0)
      : sign(sideBasis);
    vec2 pushDirection = normalize(vec2(sideDirection, clamp(delta.y * 1.25, -0.14, 0.14)));
    float interaction = (1.0 - smoothstep(0.055, 0.285, distanceToPointer)) * uHover;
    moved.xy += pushDirection * interaction * (0.112 + depth * 0.032);
    moved.z += interaction * 0.045;
    return moved;
  }

  void main() {
    float eased = uProgress * uProgress * (3.0 - 2.0 * uProgress);
    float collapse = pow(max(sin(uProgress * 3.14159265), 0.0), 0.72);
    vVisibility = mix(stateZero(uFromState), stateZero(uToState), eased) * (1.0 - collapse);

    vec3 positionValue = moveTip(position, aSeed, aDepth);
    float distanceToPointer = length(positionValue.xy - uPointerWorld);
    vInteraction = (1.0 - smoothstep(0.055, 0.285, distanceToPointer)) * uHover;
    vDepth = aDepth;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(positionValue, 1.0);
    gl_PointSize = (8.0 + aDepth * 5.0 + vInteraction * 2.0) * uPixelRatio;
  }
`;

const fiberTipFragmentShader = `
  precision highp float;

  varying float vDepth;
  varying float vInteraction;
  varying float vVisibility;

  void main() {
    float distanceFromCenter = length(gl_PointCoord - 0.5);
    float halo = 1.0 - smoothstep(0.12, 0.5, distanceFromCenter);
    float core = 1.0 - smoothstep(0.0, 0.115, distanceFromCenter);
    vec3 color = mix(vec3(0.54, 0.64, 1.0), vec3(1.0), core * 0.9 + vInteraction * 0.1);
    float alpha = (halo * (0.34 + vDepth * 0.22) + core * 0.72) * vVisibility;
    gl_FragColor = vec4(color, alpha);
  }
`;

const morphVertexShader = `
  uniform float uFromState;
  uniform float uToState;
  uniform float uProgress;
  uniform float uTime;
  uniform float uHover;
  uniform vec2 uPointerWorld;

  attribute vec3 aPosition0;
  attribute vec3 aPosition1;
  attribute vec3 aPosition2;
  attribute vec3 aPosition3;
  attribute vec3 aCluster;
  attribute float aSeed;
  attribute float aDepth;

  varying float vAlpha;
  varying float vSeed;
  varying float vInteraction;
  varying float vStateZero;

  vec3 selectState(float state) {
    float w0 = 1.0 - smoothstep(0.01, 0.45, abs(state - 0.0));
    float w1 = 1.0 - smoothstep(0.01, 0.45, abs(state - 1.0));
    float w2 = 1.0 - smoothstep(0.01, 0.45, abs(state - 2.0));
    float w3 = 1.0 - smoothstep(0.01, 0.45, abs(state - 3.0));
    float total = max(w0 + w1 + w2 + w3, 0.0001);
    return (aPosition0 * w0 + aPosition1 * w1 + aPosition2 * w2 + aPosition3 * w3) / total;
  }

  void main() {
    float eased = uProgress * uProgress * (3.0 - 2.0 * uProgress);
    float collapse = pow(max(sin(uProgress * 3.14159265), 0.0), 0.72);
    vec3 fromPosition = selectState(uFromState);
    vec3 toPosition = selectState(uToState);
    vec3 positionValue = mix(fromPosition, toPosition, eased);
    positionValue = mix(positionValue, aCluster, collapse);

    vec2 delta = positionValue.xy - uPointerWorld;
    float distanceToPointer = max(length(delta), 0.001);
    float interaction = exp(-distanceToPointer * distanceToPointer * 13.0) * uHover * (1.0 - collapse);
    positionValue.xy += (delta / distanceToPointer) * interaction * 0.055;
    positionValue.z += interaction * 0.11;
    positionValue.y += sin(uTime * 0.42 + aSeed * 6.2831) * 0.0025 * (1.0 - collapse);

    vAlpha = (0.24 + aDepth * 0.68) * max(0.035, 1.0 - collapse);
    vSeed = aSeed;
    vInteraction = interaction;
    float fromZero = 1.0 - step(0.5, abs(uFromState));
    float toZero = 1.0 - step(0.5, abs(uToState));
    vStateZero = mix(fromZero, toZero, eased) * (1.0 - collapse);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(positionValue, 1.0);
  }
`;

const morphFragmentShader = `
  precision highp float;

  varying float vAlpha;
  varying float vSeed;
  varying float vInteraction;
  varying float vStateZero;

  void main() {
    vec3 cool = vec3(0.73, 0.78, 1.0);
    vec3 warm = vec3(1.0, 1.0, 1.0);
    vec3 color = mix(cool, warm, 0.42 + vSeed * 0.38 + vInteraction * 0.35);
    gl_FragColor = vec4(color, vAlpha * (1.0 - vStateZero));
  }
`;

const pointsVertexShader = `
  uniform float uFromState;
  uniform float uToState;
  uniform float uProgress;
  uniform float uHover;
  uniform float uPixelRatio;
  uniform vec2 uPointerWorld;

  attribute vec3 aPosition0;
  attribute vec3 aPosition1;
  attribute vec3 aPosition2;
  attribute vec3 aPosition3;
  attribute vec3 aCluster;
  attribute float aSeed;
  attribute float aEndpoint;

  varying float vAlpha;
  varying float vInteraction;
  varying float vStateZero;

  vec3 selectState(float state) {
    float w0 = 1.0 - smoothstep(0.01, 0.45, abs(state - 0.0));
    float w1 = 1.0 - smoothstep(0.01, 0.45, abs(state - 1.0));
    float w2 = 1.0 - smoothstep(0.01, 0.45, abs(state - 2.0));
    float w3 = 1.0 - smoothstep(0.01, 0.45, abs(state - 3.0));
    float total = max(w0 + w1 + w2 + w3, 0.0001);
    return (aPosition0 * w0 + aPosition1 * w1 + aPosition2 * w2 + aPosition3 * w3) / total;
  }

  void main() {
    float eased = uProgress * uProgress * (3.0 - 2.0 * uProgress);
    float collapse = pow(max(sin(uProgress * 3.14159265), 0.0), 0.72);
    vec3 positionValue = mix(selectState(uFromState), selectState(uToState), eased);
    positionValue = mix(positionValue, aCluster, collapse);

    vec2 delta = positionValue.xy - uPointerWorld;
    float distanceToPointer = max(length(delta), 0.001);
    float interaction = exp(-distanceToPointer * distanceToPointer * 14.0) * uHover;
    positionValue.xy += (delta / distanceToPointer) * interaction * 0.06;

    vInteraction = interaction;
    vAlpha = mix(0.18 + aEndpoint * 0.62, 0.98, collapse);
    float fromZero = 1.0 - step(0.5, abs(uFromState));
    float toZero = 1.0 - step(0.5, abs(uToState));
    vStateZero = mix(fromZero, toZero, eased) * (1.0 - collapse);

    gl_Position = projectionMatrix * modelViewMatrix * vec4(positionValue, 1.0);
    gl_PointSize = (1.45 + collapse * 2.35 + interaction * 5.0 + aSeed * 0.65) * uPixelRatio;
  }
`;

const pointsFragmentShader = `
  precision highp float;

  varying float vAlpha;
  varying float vInteraction;
  varying float vStateZero;

  void main() {
    vec2 point = gl_PointCoord - 0.5;
    float circle = smoothstep(0.5, 0.12, length(point));
    float core = smoothstep(0.18, 0.0, length(point));
    vec3 color = mix(vec3(0.78, 0.83, 1.0), vec3(1.0), core * 0.8 + vInteraction * 0.4);
    gl_FragColor = vec4(color, circle * vAlpha * (1.0 - vStateZero));
  }
`;

class FourStateVectorScene {
  constructor(root, canvas, Three) {
    this.root = root;
    this.canvas = canvas;
    this.THREE = Three;
    this.lineCount = 190;
    this.samplesPerLine = 64;
    this.currentState = clamp(Number(root.dataset.state) || 0, 0, 3);
    this.fromState = this.currentState;
    this.toState = this.currentState;
    this.transitionStart = 0;
    this.transitionDuration = 1450;
    this.progress = 1;
    this.pointer = { x: 0.5, y: 0.5, hover: 0 };
    this.pointerTarget = { x: 0.5, y: 0.5, hover: 0 };
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
        alpha: false,
        antialias: true,
        powerPreference: "high-performance",
      });
    } catch (error) {
      console.warn("Vector Canvas: WebGL renderer could not start.", error);
      return;
    }

    this.renderer.setClearColor(0x171d5d, 1);
    this.renderer.outputColorSpace = Three.SRGBColorSpace;

    this.scene = new Three.Scene();
    this.camera = new Three.OrthographicCamera(-1.2, 1.2, 0.5, -0.5, 0.1, 10);
    this.camera.position.z = 3;

    this.sharedUniforms = {
      uFromState: { value: this.fromState },
      uToState: { value: this.toState },
      uProgress: { value: 1 },
      uTime: { value: 0 },
      uHover: { value: 0 },
      uPixelRatio: { value: 1 },
      uPointerWorld: { value: new Three.Vector2(0, 0) },
      uPointerUv: { value: new Three.Vector2(0.5, 0.5) },
      uLineWidthWorld: { value: 0.002 },
      uMotion: { value: reduceMotionQuery.matches ? 0 : 1 },
    };

    this.buildBackground();
    this.buildFiberOptics();
    this.buildLines();
    this.buildPoints();

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this.root);

    this.intersectionObserver = new IntersectionObserver(
      ([entry]) => {
        this.isVisible = entry.isIntersecting;
        if (this.isVisible) this.start();
      },
      { rootMargin: "160px" },
    );
    this.intersectionObserver.observe(this.root);

    this.handleVisibility = () => {
      if (!document.hidden) this.start();
    };
    document.addEventListener("visibilitychange", this.handleVisibility);

    this.canvas.dataset.engine = `three.js r${Three.REVISION}`;
    this.root.classList.add("is-webgl-ready");
    this.resize();
    this.start();
  }

  buildBackground() {
    const Three = this.THREE;
    const material = new Three.ShaderMaterial({
      uniforms: {
        uTime: this.sharedUniforms.uTime,
        uHover: this.sharedUniforms.uHover,
        uPointerUv: this.sharedUniforms.uPointerUv,
      },
      vertexShader: backgroundVertexShader,
      fragmentShader: backgroundFragmentShader,
      depthWrite: false,
      depthTest: false,
    });

    this.background = new Three.Mesh(new Three.PlaneGeometry(1, 1), material);
    this.background.position.z = -2;
    this.scene.add(this.background);
  }

  buildFiberOptics() {
    const Three = this.THREE;
    const verticesPerLine = this.samplesPerLine * 2;
    const vertexCount = this.lineCount * verticesPerLine;
    const positions = new Float32Array(vertexCount * 3);
    const previous = new Float32Array(vertexCount * 3);
    const next = new Float32Array(vertexCount * 3);
    const sides = new Float32Array(vertexCount);
    const progress = new Float32Array(vertexCount);
    const seeds = new Float32Array(vertexCount);
    const depths = new Float32Array(vertexCount);
    const guideX = new Float32Array(vertexCount);
    const indices = new Uint32Array(this.lineCount * (this.samplesPerLine - 1) * 6);
    const sampleStep = 1 / (this.samplesPerLine - 1);

    for (let lineIndex = 0; lineIndex < this.lineCount; lineIndex += 1) {
      const seed = hash(lineIndex, 11);
      const depth = 0.25 + hash(lineIndex, 12) * 0.75;
      const endpointX = getStatePosition(0, lineIndex, this.lineCount, 1)[0];

      for (let sample = 0; sample < this.samplesPerLine; sample += 1) {
        const t = sample * sampleStep;
        const center = getStatePosition(0, lineIndex, this.lineCount, t);
        const previousPoint = getStatePosition(0, lineIndex, this.lineCount, Math.max(t - sampleStep, 0));
        const nextPoint = getStatePosition(0, lineIndex, this.lineCount, Math.min(t + sampleStep, 1));

        for (let sideIndex = 0; sideIndex < 2; sideIndex += 1) {
          const vertex = lineIndex * verticesPerLine + sample * 2 + sideIndex;
          const vertex3 = vertex * 3;
          positions.set(center, vertex3);
          previous.set(previousPoint, vertex3);
          next.set(nextPoint, vertex3);
          sides[vertex] = sideIndex === 0 ? -1 : 1;
          progress[vertex] = t;
          seeds[vertex] = seed;
          depths[vertex] = depth;
          guideX[vertex] = endpointX;
        }
      }

      for (let segment = 0; segment < this.samplesPerLine - 1; segment += 1) {
        const indexOffset = (lineIndex * (this.samplesPerLine - 1) + segment) * 6;
        const current = lineIndex * verticesPerLine + segment * 2;
        const following = current + 2;
        indices[indexOffset] = current;
        indices[indexOffset + 1] = current + 1;
        indices[indexOffset + 2] = following;
        indices[indexOffset + 3] = following;
        indices[indexOffset + 4] = current + 1;
        indices[indexOffset + 5] = following + 1;
      }
    }

    const geometry = new Three.BufferGeometry();
    geometry.setAttribute("position", new Three.BufferAttribute(positions, 3));
    geometry.setAttribute("aPrevious", new Three.BufferAttribute(previous, 3));
    geometry.setAttribute("aNext", new Three.BufferAttribute(next, 3));
    geometry.setAttribute("aSide", new Three.BufferAttribute(sides, 1));
    geometry.setAttribute("aT", new Three.BufferAttribute(progress, 1));
    geometry.setAttribute("aSeed", new Three.BufferAttribute(seeds, 1));
    geometry.setAttribute("aDepth", new Three.BufferAttribute(depths, 1));
    geometry.setAttribute("aGuideX", new Three.BufferAttribute(guideX, 1));
    geometry.setIndex(new Three.BufferAttribute(indices, 1));

    const createMaterial = (widthScale, opacity, blending) =>
      new Three.ShaderMaterial({
        uniforms: {
          ...this.sharedUniforms,
          uWidthScale: { value: widthScale },
          uOpacity: { value: opacity },
        },
        vertexShader: fiberVertexShader,
        fragmentShader: fiberFragmentShader,
        transparent: true,
        depthWrite: false,
        depthTest: false,
        side: Three.DoubleSide,
        blending,
      });

    this.fiberGlow = new Three.Mesh(geometry, createMaterial(6.2, 0.13, Three.AdditiveBlending));
    this.fiberGlow.frustumCulled = false;
    this.fiberGlow.renderOrder = 1;
    this.scene.add(this.fiberGlow);

    this.fiberCore = new Three.Mesh(geometry, createMaterial(1.9, 0.88, Three.NormalBlending));
    this.fiberCore.frustumCulled = false;
    this.fiberCore.renderOrder = 2;
    this.scene.add(this.fiberCore);

    const tipPositions = new Float32Array(this.lineCount * 3);
    const tipSeeds = new Float32Array(this.lineCount);
    const tipDepths = new Float32Array(this.lineCount);

    for (let lineIndex = 0; lineIndex < this.lineCount; lineIndex += 1) {
      tipPositions.set(getStatePosition(0, lineIndex, this.lineCount, 1), lineIndex * 3);
      tipSeeds[lineIndex] = hash(lineIndex, 11);
      tipDepths[lineIndex] = 0.25 + hash(lineIndex, 12) * 0.75;
    }

    const tipGeometry = new Three.BufferGeometry();
    tipGeometry.setAttribute("position", new Three.BufferAttribute(tipPositions, 3));
    tipGeometry.setAttribute("aSeed", new Three.BufferAttribute(tipSeeds, 1));
    tipGeometry.setAttribute("aDepth", new Three.BufferAttribute(tipDepths, 1));

    const tipMaterial = new Three.ShaderMaterial({
      uniforms: this.sharedUniforms,
      vertexShader: fiberTipVertexShader,
      fragmentShader: fiberTipFragmentShader,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: Three.AdditiveBlending,
    });

    this.fiberTips = new Three.Points(tipGeometry, tipMaterial);
    this.fiberTips.frustumCulled = false;
    this.fiberTips.renderOrder = 3;
    this.scene.add(this.fiberTips);
  }

  createMorphAttributes(vertexCount, fillPosition) {
    const Three = this.THREE;
    const positions = Array.from({ length: 4 }, () => new Float32Array(vertexCount * 3));
    const clusters = new Float32Array(vertexCount * 3);
    const seeds = new Float32Array(vertexCount);
    const depths = new Float32Array(vertexCount);
    const endpoints = new Float32Array(vertexCount);

    for (let vertex = 0; vertex < vertexCount; vertex += 1) {
      const descriptor = fillPosition(vertex);
      const vertex3 = vertex * 3;

      for (let state = 0; state < 4; state += 1) {
        const point = getStatePosition(state, descriptor.lineIndex, this.lineCount, descriptor.t);
        positions[state][vertex3] = point[0];
        positions[state][vertex3 + 1] = point[1];
        positions[state][vertex3 + 2] = point[2];
      }

      const cluster = getClusterPosition(descriptor.lineIndex);
      clusters[vertex3] = cluster[0];
      clusters[vertex3 + 1] = cluster[1];
      clusters[vertex3 + 2] = cluster[2];
      seeds[vertex] = hash(descriptor.lineIndex, 11);
      depths[vertex] = 0.25 + hash(descriptor.lineIndex, 12) * 0.75;
      endpoints[vertex] = descriptor.endpoint || 0;
    }

    return {
      aPosition0: new Three.BufferAttribute(positions[0], 3),
      aPosition1: new Three.BufferAttribute(positions[1], 3),
      aPosition2: new Three.BufferAttribute(positions[2], 3),
      aPosition3: new Three.BufferAttribute(positions[3], 3),
      aCluster: new Three.BufferAttribute(clusters, 3),
      aSeed: new Three.BufferAttribute(seeds, 1),
      aDepth: new Three.BufferAttribute(depths, 1),
      aEndpoint: new Three.BufferAttribute(endpoints, 1),
    };
  }

  buildLines() {
    const Three = this.THREE;
    const segmentCount = this.lineCount * (this.samplesPerLine - 1);
    const vertexCount = segmentCount * 2;
    const attributes = this.createMorphAttributes(vertexCount, (vertex) => {
      const segmentVertex = vertex % 2;
      const segment = Math.floor(vertex / 2);
      const lineIndex = Math.floor(segment / (this.samplesPerLine - 1));
      const sample = segment % (this.samplesPerLine - 1) + segmentVertex;
      return {
        lineIndex,
        t: sample / (this.samplesPerLine - 1),
        endpoint: sample === this.samplesPerLine - 1 ? 1 : 0,
      };
    });

    const geometry = new Three.BufferGeometry();
    Object.entries(attributes).forEach(([name, attribute]) => geometry.setAttribute(name, attribute));
    geometry.setAttribute("position", attributes.aPosition0.clone());

    const material = new Three.ShaderMaterial({
      uniforms: this.sharedUniforms,
      vertexShader: morphVertexShader,
      fragmentShader: morphFragmentShader,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: Three.NormalBlending,
    });

    this.lines = new Three.LineSegments(geometry, material);
    this.lines.frustumCulled = false;
    this.scene.add(this.lines);
  }

  buildPoints() {
    const Three = this.THREE;
    const vertexCount = this.lineCount * 2;
    const attributes = this.createMorphAttributes(vertexCount, (vertex) => ({
      lineIndex: Math.floor(vertex / 2),
      t: vertex % 2,
      endpoint: vertex % 2,
    }));

    const geometry = new Three.BufferGeometry();
    Object.entries(attributes).forEach(([name, attribute]) => geometry.setAttribute(name, attribute));
    geometry.setAttribute("position", attributes.aPosition0.clone());

    const material = new Three.ShaderMaterial({
      uniforms: this.sharedUniforms,
      vertexShader: pointsVertexShader,
      fragmentShader: pointsFragmentShader,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: Three.AdditiveBlending,
    });

    this.points = new Three.Points(geometry, material);
    this.points.frustumCulled = false;
    this.scene.add(this.points);
  }

  resize() {
    if (!this.renderer) return;

    const width = Math.max(this.root.clientWidth, 1);
    const height = Math.max(this.root.clientHeight, 1);
    const aspect = width / height;
    const halfWidth = 1.18;
    const halfHeight = halfWidth / aspect;
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.8);

    this.camera.left = -halfWidth;
    this.camera.right = halfWidth;
    this.camera.top = halfHeight;
    this.camera.bottom = -halfHeight;
    this.camera.updateProjectionMatrix();

    this.background.scale.set(halfWidth * 2, halfHeight * 2, 1);
    this.renderer.setPixelRatio(pixelRatio);
    this.renderer.setSize(width, height, false);
    this.sharedUniforms.uPixelRatio.value = pixelRatio;
    this.sharedUniforms.uLineWidthWorld.value = (this.camera.top - this.camera.bottom) / height;
    this.syncPointerUniforms();
    this.render(performance.now());
  }

  setPointer(normalX, normalY, hover) {
    this.pointerTarget.x = clamp(normalX, 0, 1);
    this.pointerTarget.y = clamp(normalY, 0, 1);
    this.pointerTarget.hover = clamp(hover, 0, 1);

    if (reduceMotionQuery.matches) {
      this.pointer = { ...this.pointerTarget };
      this.syncPointerUniforms();
      this.render(performance.now());
    } else {
      this.start();
    }
  }

  setState(nextState) {
    const state = clamp(Number(nextState) || 0, 0, 3);
    if (state === this.toState && this.progress < 1) return;
    if (state === this.currentState && this.progress >= 1) return;

    const transitionBase = this.progress < 0.5 ? this.fromState : this.toState;
    this.fromState = transitionBase;
    this.toState = state;
    this.currentState = state;
    this.progress = reduceMotionQuery.matches ? 1 : 0;
    this.transitionStart = performance.now();

    this.sharedUniforms.uFromState.value = this.fromState;
    this.sharedUniforms.uToState.value = this.toState;
    this.sharedUniforms.uProgress.value = this.progress;
    this.start();
  }

  syncPointerUniforms() {
    const worldX = lerp(this.camera.left, this.camera.right, this.pointer.x);
    const worldY = lerp(this.camera.top, this.camera.bottom, this.pointer.y);
    this.sharedUniforms.uPointerWorld.value.set(worldX, worldY);
    this.sharedUniforms.uPointerUv.value.set(this.pointer.x, 1 - this.pointer.y);
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
    const pointerSmoothing = 1 - Math.pow(0.84, delta);
    this.pointer.x = lerp(this.pointer.x, this.pointerTarget.x, pointerSmoothing);
    this.pointer.y = lerp(this.pointer.y, this.pointerTarget.y, pointerSmoothing);
    this.pointer.hover = lerp(this.pointer.hover, this.pointerTarget.hover, pointerSmoothing);
    this.syncPointerUniforms();

    if (this.progress < 1) {
      this.progress = clamp((time - this.transitionStart) / this.transitionDuration, 0, 1);
      this.sharedUniforms.uProgress.value = smoothstep(this.progress);
    }

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

const instances = new WeakMap();

function initVectorCanvas(root) {
  if (root.dataset.wmVectorReady === "true") return instances.get(root) || null;

  const canvas = root.querySelector("[data-wm-vector-canvas]");
  const buttons = [...root.querySelectorAll("[data-vector-state]")];
  const status = root.querySelector("[data-wm-vector-status]");
  const scene = THREE && canvas ? new FourStateVectorScene(root, canvas, THREE) : null;

  const selectState = (stateValue) => {
    const state = clamp(Number(stateValue) || 0, 0, 3);
    root.dataset.state = String(state);
    buttons.forEach((button) => {
      const active = Number(button.dataset.vectorState) === state;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", active ? "true" : "false");
    });
    if (status) status.textContent = STATE_LABELS[state];
    scene?.setState(state);
  };

  buttons.forEach((button) => {
    button.addEventListener("click", () => selectState(button.dataset.vectorState));
  });

  root.addEventListener("pointerenter", (event) => {
    if (event.target.closest("[data-vector-state]")) return;
    const bounds = root.getBoundingClientRect();
    scene?.setPointer((event.clientX - bounds.left) / bounds.width, (event.clientY - bounds.top) / bounds.height, 1);
  });

  root.addEventListener("pointermove", (event) => {
    if (event.target.closest("[data-vector-state]")) return;
    const bounds = root.getBoundingClientRect();
    scene?.setPointer((event.clientX - bounds.left) / bounds.width, (event.clientY - bounds.top) / bounds.height, 1);
  });

  root.addEventListener("pointerleave", () => scene?.setPointer(0.5, 0.5, 0));
  root.addEventListener("wm:vector-state", (event) => selectState(event.detail?.state));

  const api = Object.freeze({ root, scene, setState: selectState });
  instances.set(root, api);
  root.dataset.wmVectorReady = "true";
  selectState(root.dataset.state || 0);
  return api;
}

function initAllVectorCanvases(root = document) {
  return [...root.querySelectorAll("[data-wm-vector]")].map(initVectorCanvas);
}

function setExternalState(target, state) {
  const element = typeof target === "string" ? document.querySelector(target) : target;
  if (!element) return false;
  const api = instances.get(element) || initVectorCanvas(element);
  api?.setState(state);
  return Boolean(api);
}

initAllVectorCanvases();

window.WMVectorCanvas = Object.freeze({
  init: initAllVectorCanvases,
  setState: setExternalState,
  threeRevision: THREE?.REVISION || null,
});
