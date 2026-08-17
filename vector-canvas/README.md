# Four-State Vector Canvas

A canvas-only, clean-room reconstruction of the four vector behaviours observed in the reference section. It contains no heading, stats copy, time selector, or content layout.

## The four states

1. Radial line burst from the lower centre
2. Curved routes forming a hemisphere
3. Layered wave ribbons built from vertical vectors
4. Symmetrical hourglass / butterfly curves

Transitions follow the same structural idea as the reference: the current lines collapse into a floating particle cluster, then expand into the next topology.

## Files

- `index.html` — standalone canvas demo
- `component.html` — WordPress markup
- `styles.css` — canvas container and minimal four-dot demo switcher
- `stats-section.js` — Three.js geometry, shaders, pointer interaction, and morph controller
- `wordpress-functions.php` — WordPress 6.5+ enqueue example

## WordPress

Copy the folder to your child theme, load `styles.css` and `stats-section.js`, and insert `component.html` in a template or Custom HTML block.

The included `wordpress-functions.php` uses `wp_enqueue_script_module()` for WordPress 6.5+.

## Control from existing buttons

The four small dots are only a minimal test control. You can remove `.wm-vector__switcher` and connect your own buttons through the public API:

```js
window.WMVectorCanvas.setState('[data-wm-vector]', 0); // radial
window.WMVectorCanvas.setState('[data-wm-vector]', 1); // hemisphere
window.WMVectorCanvas.setState('[data-wm-vector]', 2); // waves
window.WMVectorCanvas.setState('[data-wm-vector]', 3); // hourglass
```

Or dispatch an event on a specific instance:

```js
document.querySelector('[data-wm-vector]').dispatchEvent(
  new CustomEvent('wm:vector-state', { detail: { state: 2 } })
);
```

## Interaction and performance

- Lines and endpoint particles are generated geometry, not images or copied assets.
- The pointer locally repels nearby lines and points and moves a soft background light.
- Morph duration is `1450ms` and uses a two-phase collapse/expand path.
- Three.js is pinned to `0.178.0`.
- Rendering pauses outside the viewport or while the tab is hidden.
- Device pixel ratio is capped at `1.8`.
- `prefers-reduced-motion` switches states without continuous animation.
