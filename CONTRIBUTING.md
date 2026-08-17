# Contributing

Small, focused pull requests are welcome.

1. Create a feature branch.
2. Keep component CSS scoped under its `wm-` root.
3. Do not add copied source, text, screenshots, or proprietary assets from reference sites.
4. Preserve keyboard behaviour, reduced-motion support, and CSS fallbacks.
5. Run the demos through an HTTP server and test desktop and mobile widths.
6. Check module syntax before submitting:

   ```bash
   node --input-type=module --check < bento-card/bento-card.js
   node --input-type=module --check < vector-canvas/stats-section.js
   ```

Explain visual changes and include before/after screenshots when useful.

