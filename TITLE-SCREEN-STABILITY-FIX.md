# Title Screen Stability Fix — 2026-11-13

- Consolidated the final title-screen grid so the heading, landscape artwork, save slots, install action, and footer always occupy their intended rows.
- Removed vertical scrolling from touch-device landscape title screens and fitted the title content to the available dynamic viewport height, including wider touch devices.
- Tightened typography, image sizing, save-slot cards, and action buttons on short landscape screens while preserving all three save slots and their existing actions.
- Kept the portrait rotate-device screen non-scrollable.
- Disabled title-entry transforms on touch landscape screens to prevent animated layout shifts during orientation changes.
- Hid the scroll/install cue on touch devices because the landscape title screen is designed to fit without scrolling.
- Updated the deployment build marker and service-worker cache version so installed copies can recognize the new release.

Validation: all 28 TypeScript source files parsed without syntax errors, the stylesheet parsed without CSS syntax errors, and the ZIP archive integrity was verified. A full Vite production build could not be completed in this environment because dependency installation timed out.
