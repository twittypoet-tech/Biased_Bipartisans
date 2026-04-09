# Bipi News — Brand Guide

## Brand Files

| File | Use |
|------|-----|
| `bipi-logo-banner.svg` | Main header logo, nav bar, email signature |
| `bipi-mark.svg` | App icon, social avatar (crop to circle/square) |
| `favicon.svg` | Browser tab icon |
| `apple-touch-icon.svg` | iOS home screen icon |
| `og-image.svg` | Social sharing preview (convert to PNG for full compat) |
| `site.webmanifest` | PWA / browser install metadata |

---

## Brand Colors

| Role | Light Mode | Dark Mode |
|------|-----------|-----------|
| Navy (left / BIASED) | `#0B1E47` | `#4D6EB8` |
| Crimson (right / BIPARTISANS) | `#5E0F0F` | `#B84848` |
| Gold accent | `#C8A44A` | `#E8C060` |
| Background (dark) | `#080F22` | — |
| Background (light) | `#ffffff` | — |

---

## HTML `<head>` Snippets

```html
<!-- Favicon -->
<link rel="icon" href="/favicon.svg" type="image/svg+xml">

<!-- Apple Touch Icon -->
<link rel="apple-touch-icon" href="/apple-touch-icon.svg">

<!-- PWA Manifest -->
<link rel="manifest" href="/site.webmanifest">
<meta name="theme-color" content="#0B1122">

<!-- Open Graph -->
<meta property="og:title" content="Bipi News">
<meta property="og:description" content="AI-powered debate platform. Think Further.">
<meta property="og:image" content="https://yourdomain.com/og-image.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:type" content="website">

<!-- Twitter Card -->
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="https://yourdomain.com/og-image.png">
<meta name="twitter:title" content="Bipi News">
<meta name="twitter:description" content="AI-powered debate platform. Think Further.">
```

---

## Notes

- **OG image**: Convert `og-image.svg` to PNG (1200×630) for maximum social platform compatibility. Use `sharp`, Figma, or browser-based export. SVG OG images are not supported by Facebook/LinkedIn.
- **Favicon**: SVG favicons work in all modern browsers (Chrome 80+, Firefox 41+, Safari 12+). For legacy support, add a `favicon.ico` fallback.
- **Apple Touch Icon**: The dark background (`#0B1122`) is baked in — it looks sharp when pinned to the iOS home screen.
