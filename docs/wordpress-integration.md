# WordPress integration

## Child-theme installation

Copy one or both component folders into the child theme:

```text
wp-content/themes/your-child-theme/
├── assets/
│   ├── bento-card/
│   └── vector-canvas/
└── functions.php
```

Use the supplied `wordpress-functions.php` files as examples. If both components are enabled, give their style and module handles unique names as shown in those files.

## WordPress 6.5 and newer

Use `wp_enqueue_script_module()` for each JavaScript module. This preserves `type="module"` and lets the browser import Three.js correctly.

```php
add_action(
    'wp_enqueue_scripts',
    static function (): void {
        $component_url = get_stylesheet_directory_uri() . '/assets/vector-canvas';

        wp_enqueue_style(
            'wm-vector-canvas',
            $component_url . '/styles.css',
            array(),
            '1.1.0'
        );

        wp_enqueue_script_module(
            'wm-vector-canvas',
            $component_url . '/stats-section.js',
            array(),
            '1.1.0'
        );
    }
);
```

## Older WordPress versions

Enqueue the stylesheet normally and print a module script from the template or an appropriate hook:

```html
<script type="module" src="/wp-content/themes/your-child-theme/assets/vector-canvas/stats-section.js"></script>
```

Do not load the same module once per block. One module initializes every matching root on the page.

## Adding markup

Choose one method:

- paste `component.html` into a Custom HTML block;
- convert it into a block pattern;
- include it in a PHP template part;
- render it from a custom dynamic block.

Do not paste the standalone `index.html` into WordPress; that file includes demo-page wrappers and document-level tags.

## Dynamic content and AJAX

The modules scan the initial document automatically. After inserting components dynamically, initialize the added subtree:

```js
window.WMInteractiveBento.init(containerElement);
window.WMVectorCanvas.init(containerElement);
```

Initialization is idempotent: an existing root is not initialized twice.

## Content Security Policy

The default code imports Three.js from `cdn.jsdelivr.net`. A restrictive Content Security Policy must allow that module source, or the Three.js module must be self-hosted. Self-hosting is preferred when the site requires deterministic third-party availability or a strict `script-src 'self'` policy.

## Cache and deployment checklist

1. Increase asset version strings when files change.
2. Purge WordPress, CDN, and optimization-plugin caches.
3. Exclude the ES modules from script concatenation tools that remove `type="module"`.
4. Check desktop, touch, keyboard, and reduced-motion modes.
5. Confirm no duplicate element IDs when repeating the Bento card.
6. Test the production CSP and CDN path, not only localhost.
