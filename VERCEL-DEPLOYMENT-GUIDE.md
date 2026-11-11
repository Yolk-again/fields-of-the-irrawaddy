# Fields of the Irrawaddy — Vercel Deployment Guide

This project is a client-side Vite + TypeScript + Phaser game. It builds to `dist/` and does not require a server, database, API route, or environment variables for the current gameplay.

## Vercel project settings

- Framework Preset: **Vite**
- Root Directory: `./` (the folder containing this `package.json`)
- Install Command: `npm ci`
- Build Command: `npm run build`
- Output Directory: `dist`
- Node.js: **22.x** (`package.json` pins Vercel to the 22.x major; local `.nvmrc` uses 22.16.0)
- Production Branch: `main`

These settings are also recorded in `vercel.json`.

## Deploy from GitHub (recommended)

1. Push this project to the GitHub repository's `main` branch.
2. Sign in to Vercel and choose **Add New → Project**.
3. Import `Yolk-again/fields-of-the-irrawaddy`.
4. Confirm the settings listed above and click **Deploy**.
5. Open the generated `.vercel.app` URL and test the title screen, new game, saving, continuing, mobile controls, audio, and loading animation.
6. The SEO metadata, `robots.txt`, and `sitemap.xml` currently use `https://fields-of-the-irrawaddy.vercel.app/` as the expected hostname. If Vercel assigns a different hostname, replace that hostname in `index.html`, `public/robots.txt`, and `public/sitemap.xml`, then push and redeploy.
7. Every later push to `main` will trigger a production deployment; other branches create preview deployments when Git integration is enabled.

## Deploy without connecting GitHub

From the project root in PowerShell:

```powershell
npm.cmd ci
npm.cmd run build
npm.cmd install --global vercel
vercel.cmd login
vercel.cmd
vercel.cmd --prod
```

Choose the existing Vercel project when prompted, or create a new one. The first `vercel.cmd` deployment is a preview; `vercel.cmd --prod` publishes production.

## Important: existing save data when changing domains

The game stores save slots in the browser's `localStorage`. Browser storage is separated by website origin. A save stored under `fields-of-the-irrawaddy.netlify.app` will **not automatically appear** under a new `*.vercel.app` address. Back up saves from the old site before moving, then restore them on the new Vercel site. If you later attach a custom domain, use the same exact domain consistently so the browser origin remains stable.

### Export saves from the old Netlify site

1. Open the old Netlify game in the same browser/profile where the saves exist.
2. Press `F12`, open **Console**, and paste the following.
3. It downloads a JSON backup containing all `fields_of_irrawaddy_` keys (save slots, slot names, language, and audio preferences).

```js
const prefix = "fields_of_irrawaddy_";
const backup = Object.fromEntries(
  Object.entries(localStorage).filter(([key]) => key.startsWith(prefix))
);
const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
const url = URL.createObjectURL(blob);
const link = document.createElement("a");
link.href = url;
link.download = "fields-of-the-irrawaddy-save-backup.json";
link.click();
URL.revokeObjectURL(url);
```

### Restore saves on the new Vercel site

1. Open the new Vercel site in the same browser/profile.
2. Press `F12`, open **Console**, and paste the following.
3. Choose the JSON backup downloaded above. The script only restores keys beginning with `fields_of_irrawaddy_`, then reloads the page.

```js
const picker = document.createElement("input");
picker.type = "file";
picker.accept = ".json,application/json";
picker.onchange = async () => {
  const file = picker.files?.[0];
  if (!file) return;
  const backup = JSON.parse(await file.text());
  if (!backup || typeof backup !== "object" || Array.isArray(backup)) {
    throw new Error("Invalid save backup file.");
  }
  const prefix = "fields_of_irrawaddy_";
  for (const [key, value] of Object.entries(backup)) {
    if (key.startsWith(prefix) && typeof value === "string") {
      localStorage.setItem(key, value);
    }
  }
  alert("Save data restored. The page will now reload.");
  location.reload();
};
picker.click();
```

**Keep the JSON backup somewhere safe.** Do not clear the old site's browser data until you have confirmed the saves appear and load correctly on Vercel.

## Local verification

```powershell
npm.cmd ci
npm.cmd run build
npm.cmd run preview
```

The production build should create `dist/`. The Vercel deployment serves that output directory.
