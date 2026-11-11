# Test KCC Technical on your own computer

1. Install Node.js (LTS) from nodejs.org, once.
2. Unzip this folder.
3. Windows: double-click START-DEMO-WINDOWS.bat. Mac: double-click START-DEMO-MAC.command (or run `node tools/local-demo.js`).
4. Open http://localhost:8080 (don't open index.html directly).
5. Sign in as anyone. Password for everyone: demo. Jordan = master admin, Priya = admin, the rest = crew.

It uses a pretend cloud held in memory: nothing touches your real Firebase, EmailJS or YouTube, and no emails are sent.
Stop with Ctrl+C. Restart to reset to the sample crew. Public request form: http://localhost:8080/#request

Things worth trying: sign in as crew vs admin and compare menus; Crew page > add/reset passwords; Service Day call sheet > Send, then open the confirm link; Settings > YouTube; open two tabs as different people and edit.

## New in this version (all work in the demo)
- Service Day: **Go-live check** card (crew, stations, outages, YouTube, vMix, ProPresenter, X32), **Booth** tile (X32 status + light scene buttons), **Last service** summary with "Log 3h for everyone who served".
- Settings → **Connections**: addresses for vMix, ProPresenter, booth bridge and YouTube, each with a Test button.
- Asset Checkout: **Rapid scan** (camera, or type a code; try the gear IDs) and **Print QR labels**.
- The demo has a pretend ProPresenter and a pretend booth bridge. For the real bridge see tools/booth-bridge/README.md; for Fire tablets see android-wrapper/README.md.

## Training manuals and quizzes
Training → open "Camera framing basics" (links, gear, quiz). Crew pass the quiz to complete it; admins use "Manuals & quiz" to add links, link gear and write questions. Linked gear shows its manuals in the gear detail.
