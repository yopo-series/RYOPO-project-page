# RYOPO project page

Research website for **RYOPO: Bringing End-to-End Category-Level Object Pose Estimation into Real Time**, by Hakjin Lee, Junghoon Seo, and Jaehoon Sim (PIT IN Co.).

Private preview. Paper and code links are pending release; no manuscript PDF is included. GitHub Pages is disabled.

## Preview

Requires Node.js 20+. No production dependencies.

```sh
npm start
```

Open <http://127.0.0.1:4173>. For network access at `/`:

```sh
npm start -- --host 0.0.0.0 --port 30540
```

The network preview has no authentication; anyone who can reach the port can view the site.

## Edit

- `index.html`: text, media, authors, and release links.
- `styles.css`, `app.js`, `assets/scripts/demo-gallery.js`: layout and interactions.
- `data/results.json`: benchmark results. Columns: method, IoU50, 5° 2 cm, 5° 5 cm, 10° 5 cm. Keep the static REAL275 table in `index.html` in sync.
- `assets/images/`, `assets/videos/`: diagrams, posters, and videos.
- `tools/pipeline-template.svg`: simplified diagram template; rebuild with `node tools/build-pipeline.mjs rgb.jpg depth.png`.

Benchmark videos play at 20 FPS, not inference speed. HouseCat6D comparison videos use ground-truth instance inputs for other methods; the accuracy table uses RYOPO's predicted masks. Mask-free results come from separately trained models.

## Check

```sh
npm ci
npx playwright install chromium
npm run check
npm test
```

Checks cover links, benchmark data, desktop/mobile layout, video playback, galleries, and diagram zoom.

## Publish

Add the final arXiv and public code URLs when ready. **Enable GitHub Pages only with author approval**: it can expose the site even from a private repository. No deployment workflow is configured.
