SUDOKU — IPHONE / SAFARI HOME SCREEN VERSION

THIS FOLDER IS READY FOR GITHUB PAGES.

IMPORTANT:
Upload the CONTENTS of this folder to the ROOT of your GitHub repository.
Do not upload the whole folder as one nested folder unless index.html still ends
up at the repository root.

FILES THAT MUST BE AT THE REPOSITORY ROOT:
- index.html
- styles.css
- app.js
- sw.js
- manifest.webmanifest
- apple-touch-icon.png
- .nojekyll
- icons/ folder

GITHUB PAGES:
1. Create a PUBLIC repository.
2. Upload all the files above.
3. Go to Settings -> Pages.
4. Source: Deploy from a branch.
5. Branch: main
6. Folder: /(root)
7. Save.
8. Wait for GitHub to publish the site.
9. In Settings -> Pages, click Visit site.

IPHONE INSTALL:
1. Open the GitHub Pages URL in Safari.
2. Tap the Share/Page menu.
3. Tap Add to Home Screen.
4. Turn on Open as Web App.
5. Tap Add.
6. Launch Sudoku from its new Home Screen icon.

OFFLINE:
After the site has loaded successfully at least once, the service worker caches
the app files so the game can continue to work offline.

UPDATES:
When you upload newer files to the GitHub repository, GitHub Pages republishes
the site. The service worker cache version must change when app files change.
