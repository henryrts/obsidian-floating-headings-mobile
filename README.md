# Floating Heading but Works on Mobile

A mobile-compatible fork of [Floating Headings](https://github.com/k0src/Floating-Headings-Obsidian-Plugin) for Obsidian.

It displays a floating, collapsible outline beside the active Markdown note. Desktop keeps hover expansion. Mobile uses tap-first controls.

## Mobile changes

- Tap the collapsed heading rail to open or close the outline.
- Tap outside the outline to close it.
- Selecting a heading closes the outline automatically on touch devices.
- Larger touch targets for headings and collapse controls.
- Panel width and height adapt to small screens and safe areas.
- Keyboard activation remains available for accessibility.
- Uses a separate plugin ID, so it can coexist with the original plugin.

## Install with BRAT

1. Install and enable **BRAT** from Obsidian Community Plugins.
2. Open **Settings → BRAT → Add Beta plugin**.
3. Enter:

   `https://github.com/henryrts/obsidian-floating-headings-mobile`

4. Enable **Floating Heading but Works on Mobile** under Community Plugins.

Disable the original Floating Headings plugin if both outlines appear.

## Manual installation

1. Download `main.js`, `manifest.json`, and `styles.css` from the latest GitHub release.
2. Create this folder inside the vault:

   `.obsidian/plugins/floating-headings-mobile/`

3. Copy the three files into that folder.
4. Reload Obsidian and enable the plugin.

## Desktop behavior

Desktop behavior remains based on the upstream plugin: hover to expand, click a heading to navigate, filter headings, collapse heading groups, and configure position and appearance.

## Development notes

The repository contains the bundled release inherited from upstream plus a reproducible mobile patch verifier. Run:

```bash
node scripts/verify.mjs
```

## Attribution

Based on [Floating Headings](https://github.com/k0src/Floating-Headings-Obsidian-Plugin) version 1.1.2 by k0src. Mobile interaction changes are maintained in this repository.

## License

ISC-style permissive license. See [LICENSE](LICENSE).
