# Google Drive upload folders (one-time setup)
1. Google Drive: make a folder "KCC Tech Requests". Copy its ID (the long text at the end of its web address).
2. Cloud Console (project light-tracker-d708f): enable "Google Drive API" and "IAM Service Account Credentials API".
3. IAM: give the default compute service account (the one the functions run as) the role "Service Account Token Creator" on itself.
4. Share the Drive folder with that service account's email as Editor.
5. Put DRIVE_ROOT_FOLDER_ID=<folder id> in .env next to the EmailJS keys, then redeploy functions.
Each new public request then gets its own subfolder; anyone with the link can add files to that subfolder only.
