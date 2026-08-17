# Customization

## Bento palette and content

Set the point-field palette directly on the component root:

```html
<button
  class="wm-bento"
  data-wm-bento
  data-color-a="#635bff"
  data-color-b="#ff5db1"
  data-color-c="#7dd3fc"
>
```

Edit the title, summary, illustration markup, and dialog content in `component.html`. When several cards appear on one page, every title, description, and dialog needs a unique `id`; update `aria-labelledby`, `aria-describedby`, `aria-controls`, and `data-wm-dialog` accordingly.

Common visual values live in `bento-card/styles.css`. Keep selectors under `.wm-bento` or the demo-only wrappers so theme CSS cannot leak in either direction.

## Vector canvas controls

The four-dot switcher is optional. Remove `.wm-vector__switcher` from the production markup and connect existing controls:

```js
const canvasSelector = '#homepage-vector';

document.querySelectorAll('[data-homepage-vector-state]').forEach((button) => {
  button.addEventListener('click', () => {
    window.WMVectorCanvas.setState(canvasSelector, Number(button.dataset.homepageVectorState));
  });
});
```

The accepted states are integers `0` through `3`; out-of-range values are clamped.

## Geometry and transition tuning

The topology builders and morph duration are located near the top of `vector-canvas/stats-section.js`. When tuning them:

- preserve equal buffer lengths across states;
- avoid large point counts before testing mobile GPU cost;
- keep the two-phase transition so unrelated structures do not cross through a dense line tangle;
- update status labels when the semantic meaning of states changes;
- verify both normal and reduced-motion paths.

## Self-hosting Three.js

Both modules define `THREE_MODULE_URL` on the first line. Download the matching ESM build, place it in your theme, and replace the CDN URL with a relative URL:

```js
const THREE_MODULE_URL = './vendor/three.module.min.js';
```

Keep one reviewed Three.js version across both components. If your site already imports Three.js, consider adapting the modules to receive that shared instance instead of downloading it twice.

## Theme conflicts

The component classes use a `wm-` prefix. If your theme applies broad rules to `button`, `canvas`, or `dialog`, inspect computed styles and add narrowly scoped resets inside the component root. Avoid `!important` unless the theme cannot be changed.

