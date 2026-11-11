# Google Search Appearance Update

This update improves the homepage metadata for the Vercel deployment.

- Updated the page title to identify the site as a Myanmar farming game.
- Rewrote the meta description to describe the actual gameplay in a clear sentence.
- Added a canonical homepage URL matching the Vercel deployment.
- Added `max-image-preview:large` so Google may use larger image previews when it chooses to show one.
- Added a multi-size `favicon.ico` generated from the existing wheat PNG, while keeping the PNG favicon and Apple touch icon.
- Updated Open Graph title and description for social sharing.
- Preserved the existing WebSite structured data, robots.txt, sitemap.xml, game UI, and gameplay code.

Google controls its search-result presentation automatically. These changes improve the signals available to Google but do not guarantee a particular site label, favicon, title, snippet, or image preview. After deployment, use Google Search Console URL Inspection to request recrawling of the homepage and resubmit the sitemap.
