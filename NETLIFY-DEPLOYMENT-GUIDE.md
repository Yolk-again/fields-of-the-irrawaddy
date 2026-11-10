# Fields of the Irrawaddy — Netlify deployment

## Project root

The Netlify project root is the folder that contains all of these items:

- `index.html`
- `package.json`
- `package-lock.json`
- `netlify.toml`
- `src/`
- `public/`

Do not set the publish directory to the project root. The publish directory must be `dist`.

## Option A — Netlify connected to a Git repository

1. Copy this complete project into the repository and commit/push the changes.
2. In Netlify, open the site's **Project configuration / Build & deploy** settings.
3. Set the **Base directory** to the folder containing this project's `index.html` and `netlify.toml`. Leave it blank if this project is the repository root.
4. Set the build command to `npm run build`.
5. Set the publish directory to `dist`.
6. Trigger a new deploy and wait for the deploy to finish successfully.

The included `netlify.toml` provides the build command, publish directory, and Node version. If the Netlify UI has conflicting settings, make them match this file.

## Option B — Manual deploy

1. Open a terminal in this project folder.
2. Run `npm ci`.
3. Run `npm run build`.
4. Confirm that a new `dist/` folder was created and contains `index.html`, `assets/`, and `deployment-version.txt`.
5. In Netlify's Deploys page, upload the **contents of `dist/`** for a manual deploy. Do not upload the source project folder as the publish folder.

## Verify the live deployment

After Netlify reports that the deploy is published, open:

`https://fields-of-the-irrawaddy.netlify.app/deployment-version.txt`

The page must show:

`FOI-DEPLOYMENT-V6-2026-11-10`

If it shows a 404 or older text, the new `dist/` output has not been published to this site. Then open the home page in a private/incognito tab or perform a hard refresh.

On the home page, the save-selection screen should be the first screen. Choose a slot to start or continue. The six mobile header buttons appear during gameplay on touch devices.
