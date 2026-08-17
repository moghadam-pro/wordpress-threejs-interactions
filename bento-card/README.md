# Interactive WebGL Bento Card

A clean-room, WordPress-friendly reconstruction of the interaction pattern we inspected: pointer-following border light, subtle 3D card depth, a reactive Three.js point field, a CSS fallback, and an accessible native dialog.

## Files

- `index.html` — complete standalone demo
- `component.html` — component markup for a WordPress Custom HTML block or theme template
- `styles.css` — scoped component and demo styles
- `bento-card.js` — pointer interaction, dialog behaviour, and Three.js scene
- `wordpress-functions.php` — enqueue example for WordPress 6.5+

## Test locally

Serve the folder over HTTP; ES modules do not work reliably from a `file://` URL.

```bash
python -m http.server 4173 --directory bento-card
```

Then open `http://localhost:4173/`.

## Add to WordPress

1. Copy this folder to your child theme, for example:

   `wp-content/themes/your-child-theme/assets/bento-card/`

2. Copy the contents of `wordpress-functions.php` into the child theme's `functions.php` and adjust the folder URL if needed.

3. Put the markup from `component.html` in a Custom HTML block, a template part, or a PHP template.

WordPress introduced `wp_enqueue_script_module()` in version 6.5. For an older installation, output the JavaScript with a literal module tag in the theme template instead:

```html
<script type="module" src="/wp-content/themes/your-child-theme/assets/bento-card/bento-card.js"></script>
```

Load each CSS/JavaScript file once, even if several cards appear on the same page. The JavaScript automatically initializes every `[data-wm-bento]` element and ignores cards already initialized.

When using more than one card, give each title, description, and dialog a unique `id`, then point that card's `aria-controls` and `data-wm-dialog` to its own dialog.

## Customise

Set the WebGL palette on each card:

```html
<button
  class="wm-bento"
  data-wm-bento
  data-color-a="#635bff"
  data-color-b="#ff5db1"
  data-color-c="#7dd3fc"
>
```

Useful CSS variables are defined on `.wm-bento`:

```css
.wm-bento {
  --wm-radius: 26px;
}
```

The JavaScript updates these runtime variables:

- `--wm-pointer-x` / `--wm-pointer-y`
- `--wm-tilt-x` / `--wm-tilt-y`
- `--wm-shift-x` / `--wm-shift-y`
- `--wm-canvas-x` / `--wm-canvas-y`

The same normalised pointer coordinates feed both CSS and the Three.js shader, keeping the border light, card tilt, parallax, and particles visually connected.

## Performance and accessibility

- Three.js is pinned to `0.178.0`, matching the revision observed on the reference page.
- Rendering stops when the card is off-screen or the tab is hidden.
- Device pixel ratio is capped at `1.75`.
- Coarse pointers do not get 3D tilt.
- `prefers-reduced-motion` disables continuous animation.
- If Three.js or WebGL fails, the CSS gradient remains visible.
- The root is a native button and opens a native `<dialog>` with keyboard focus handling.
