# KCC Technical: switch to v2 (target Sunday, Nov 22, 2026)

Nothing here runs until Ayode says "go" for that stage. Live Firebase project: `light-tracker-d708f`. Beta project: `cc-technical-beta`.

## Friday (done by Claude, no live changes)
- [ ] Upload a fresh backup of the LIVE data (JSON export from the old app, taken Friday)
- [ ] Claude dry-runs the migration on a copy: crew, schedules, gear, inventory, checkouts, announcements all come through; exactly one active master admin
- [ ] Claude lists any crew who get a temporary password (they never had one)

## Saturday
- [ ] Tell the crew: stop editing the old app from tonight
- [ ] Take the final backup from the old app (Settings, Backup/Export). Keep the file somewhere safe
- [ ] In the Firebase console for the live project, export or note the old document `stage-light-tracker/main` (it is NOT deleted by the migration)
- [ ] Check the live project is on the **Blaze** plan with a budget alert, Authentication is turned on, and the service account `light-tracker-d708f@appspot.gserviceaccount.com` has the **Service Account Token Creator** role (these were done before the first launch; confirm)
- [ ] Make sure the `.env` in your project folder has the EmailJS keys and `APP_URL` set to the LIVE address
- [ ] Read the rollback section below so you know it before Sunday

## Sunday morning (aim to finish an hour before service)
1. [ ] Deploy the server to live (from the project folder):
   `npx firebase deploy --only functions --project light-tracker-d708f`
   Answer **Yes** if asked to delete `weeklyScheduleSMS` and `manualSendScheduleSMS`.
   Do NOT deploy the rules yet.
2. [ ] Migrate the data (the old document is untouched):
   `gcloud auth application-default login`
   `set GCLOUD_PROJECT=light-tracker-d708f` then `node tools/migrate.js --clean` (dry run, read the output; `--clean` also drops the known test entries), then `node tools/migrate.js --clean --go`
   Write down the temporary passwords it prints and give them to those people.
3. [ ] Go live together, within a few minutes:
   a. Claude publishes v2 as the main app (only after you say "go" on Sunday)
   b. You run `npx firebase deploy --only firestore:rules --project light-tracker-d708f`
4. [ ] Check: sign in as the master, an admin and a crew member. Add and delete a test crew member. Open `#request` in a private window and send a test request. Submit the volunteer form. Confirm an email arrives.
5. [ ] Tell the crew v2 is live and to use their usual password (or the temporary one).

## Rollback (if something is badly wrong before or during service)
1. Tell Claude "roll back". Claude republishes the old app.
2. You restore the old rules: from the old project copy of `firestore.rules`, run `npx firebase deploy --only firestore:rules --project light-tracker-d708f`.
3. The old data document was never deleted, so the old app works again as it did Saturday.
4. Edits made in v2 after the switch are not copied back. Copy anything important by hand.

## The week after
- [ ] After a week with no problems, delete the old document `stage-light-tracker/main` in the console
- [ ] Delete SMS functions on live if the deploy did not already remove them: `npx firebase functions:delete weeklyScheduleSMS manualSendScheduleSMS --project light-tracker-d708f`
