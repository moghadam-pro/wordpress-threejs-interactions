# Architecture

## Shared approach

Both components are autonomous enhancement layers:

1. Semantic HTML remains the source of structure and accessibility.
2. Scoped CSS supplies layout, visual fallback, and runtime custom properties.
3. A JavaScript module imports a pinned Three.js version and discovers component roots by data attribute.
4. Each root owns its renderer, scene, camera, observers, pointer state, and animation state.
5. Public APIs allow late initialization and external control without exposing implementation internals.

There is no bundler, framework, global stylesheet, or WordPress plugin dependency.

## Bento card

`bento-card.js` initializes every `[data-wm-bento]` exactly once.

Pointer coordinates are normalized relative to the card. The same input drives CSS variables for border light, tilt, parallax, and canvas translation, plus shader uniforms for the point field. Sharing one input makes the separate layers feel like one physical response.

The Three.js layer renders a procedurally displaced point grid. A CSS gradient stays behind it as progressive enhancement. The card is a native button and controls a native `<dialog>` so keyboard activation, focus, Escape, and semantics do not depend on WebGL.

## Four-state vector canvas

`stats-section.js` builds four generated target topologies:

1. radial burst;
2. hemisphere routes;
3. vertical wave ribbons;
4. mirrored hourglass curves.

Every topology is represented by compatible line and point buffers. During a state change, the shader/controller interpolates from the current coordinates into an intermediate particle cloud, then from the cloud into the target coordinates. This preserves a continuous visual transition even though the final structures differ.

Pointer coordinates are converted into local canvas space and used to repel nearby vertices with a smooth falloff. The pointer also offsets a soft background light, making the deformation readable without adding DOM layers.

## Lifecycle and performance

- `ResizeObserver` updates renderer size and camera projection.
- `IntersectionObserver` suspends work outside the viewport.
- `document.visibilityState` suspends work in background tabs.
- Pixel ratio caps limit fragment load on high-density displays.
- Reduced-motion users receive static or immediate state changes.
- Each root stores an initialized flag so repeated `init()` calls are safe.

For pages containing many canvases, load instances lazily or limit the number visible at once. Measure with the Performance panel on representative mobile devices; desktop GPU timing alone is not a sufficient benchmark.

