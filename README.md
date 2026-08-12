# stratify.dynaum.com

Marketing site and docs for [Stratify](https://github.com/stratify-dev/stratify).

## Run it locally

```sh
npm install
npm run dev     # builds, then serves dist/ on http://localhost:8000
npm test        # builds into a temp dir and checks structure, tokens, and links
```

## How it builds

`build.mjs` copies `src/`, `assets/`, and the root `CNAME` into `dist/`, substitutes `{{VERSION}}`
with the latest Stratify release tag, renders every `content/*.md` file through
marked with build-time shiki highlighting, and wraps each one in
`templates/docs.html`.

Set `STRATIFY_VERSION=v1.2.3` to pin the version locally. Without it the build
queries the GitHub releases API and falls back to `FALLBACK_VERSION` in
`build.mjs` when offline.

## Where content lives

| Change | Edit |
|--------|------|
| Landing page copy or layout | `src/index.html` |
| Docs prose | `content/*.md` |
| Colors, type, spacing | `src/styles.css` |
| Docs page layout | `src/docs.css` |

The engine README keeps the pitch, install, and 60-second start. This site
carries the long form. When they disagree, the site is wrong.

## Deploy

Push to `main`. GitHub Actions builds and deploys to GitHub Pages. A weekly cron
rebuilds so version snippets track the latest release.
