# Test KCC Technical on your own computer

1. Install Node.js (LTS) from nodejs.org, once.
2. Unzip this folder.
3. Windows: double-click START-DEMO-WINDOWS.bat. Mac: double-click START-DEMO-MAC.command (or run `node tools/local-demo.js`).
4. Open http://localhost:8080 (don't open index.html directly).
5. Sign in as anyone. Password for everyone: demo. Jordan = master admin, Priya = admin, the rest = crew.

It uses a pretend cloud held in memory: nothing touches your real Firebase, EmailJS or YouTube, and no emails are sent.
Stop with Ctrl+C. Restart to reset to the sample crew. Public request form: http://localhost:8080/#request

Things worth trying: sign in as crew vs admin and compare menus; Crew page > add/reset passwords; Service Day call sheet > Send, then open the confirm link; Settings > YouTube; open two tabs as different people and edit.
