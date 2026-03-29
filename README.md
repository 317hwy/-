# Photogrammetry Demo Website

This folder is a standalone GitHub Pages package for the photogrammetry demo.

## Included files

Only the website runtime files are included:

- `index.html`
- `styles.css`
- `script.js`
- `assets/`
- `.github/workflows/deploy-pages.yml`
- `.nojekyll`

No thesis sources or unrelated local files are part of this package.

## Deploy to GitHub Pages

1. Create a new GitHub repository.
2. Upload all files from this folder to the repository root.
3. Push to the default branch (`main` recommended).
4. In GitHub, open `Settings -> Pages` and set `Source` to `GitHub Actions`.
5. Wait for the `Deploy static site to GitHub Pages` workflow to finish.

Your site URL will be:

- `https://<github-username>.github.io/<repo-name>/`
- or `https://<github-username>.github.io/` if the repository name is `<github-username>.github.io`

## Behavior note

Uploaded custom images are saved only in the current browser via `IndexedDB` / `localStorage`.
They are not shared across different devices or browsers.
