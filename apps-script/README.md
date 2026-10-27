# Photo Sync backend (Google Apps Script)

Backs up tracker photos to a Google Drive folder named `AI Tracker Photos` so they appear on every device.

## Setup

1. Go to https://script.google.com and create a new project.
2. Replace the default code with the contents of `photo-sync.gs`.
3. Project Settings > Script Properties > add `ACCESS_KEY` with a long random value.
4. Deploy > New deployment > type **Web app**.
   - Execute as: **Me**
   - Who has access: **Anyone**
5. Authorize Drive access when prompted, then copy the web app URL (ends in `/exec`).
6. In the tracker: More menu > **Photo Sync**, paste the URL and the access key, click **Test**, then **Save & Sync**.
7. Repeat step 6 on each device.

## Notes

- Every request must carry the access key; requests without it are rejected.
- Each photo is stored as `<id>_full.jpg` (max 1920 px) and `<id>_thumb.jpg` (max 360 px). Photo metadata lives in the full file's description.
- Deleting a photo in the tracker moves its Drive files to Trash.
- After editing the script, use Deploy > Manage deployments > Edit > New version so the same URL keeps working.
