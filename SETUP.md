# UR ChemE Instagram — step-by-step setup

This is the exact, do-this-then-that guide. Total time: about an hour, most of it one-time.

## First, the honest answer to "can the studio post to Instagram directly?"

Not directly — and here's why, because it matters for how we set this up. The studio is a single web page with no server behind it. Instagram only allows posting through Meta's API, which needs a Meta app that passes review, a login token that expires every 60 days, and an image sitting at a public web address that Meta fetches. A plain web page can't do those safely (it would have to hold a secret password that anyone could read).

**So we do the next best thing, and it feels the same to you:** in the studio you hit **Approve**, and the finished caption + graphic get sent to a private Google Sheet marked "Ready." A free tool called **Make** watches that sheet and does the actual posting to @ur.cheme. The Instagram login lives inside Make — never in any file you share. One button for you; robust and safe underneath.

You end up running **two pages**:

- **The Content Studio** — for *you*. Create posts, approve them. (You don't share this.)
- **The Submission Form** — for *colleagues*. Optional; it just lets them feed you material. You can ignore it entirely and still post.

Behind them sit the Sheet + Make, which you set up once.

---

## Part 1 — The Google Sheet + the intake script (≈15 min)

1. Go to **sheets.google.com** and create a blank sheet. Name it something like *UR ChemE IG*.
2. Rename the first tab (bottom-left) to **`Posts`**.
3. In **row 1**, type these 15 headers, one per cell, columns A through O:

   `Timestamp` · `Submitter` · `Credit` · `Type` · `Title` · `Details` · `Date` · `Time` · `Location` · `Link` · `Caption` · `MediaURL` · `MediaFileId` · `VideoLink` · `Status`

4. In the menu: **Extensions ▸ Apps Script**. A code editor opens in a new tab.
5. Select all the sample code, delete it, and paste in **everything from `Code.gs`**. Click the **Save** icon.
6. Click **Deploy ▸ New deployment**. Click the gear ⚙ next to "Select type" and choose **Web app**.
7. Set **Execute as: Me** and **Who has access: Anyone**. Click **Deploy**.
8. Google asks you to authorize — click through, choose your account, "Advanced ▸ Go to (unsafe)" if it appears (it's your own script), and Allow.
9. **Copy the Web app URL** it gives you (ends in `/exec`). Keep it handy — you'll paste it in two places next.

> Test it: paste that URL into a browser. You should see "UR ChemE endpoint is live."

---

## Part 2 — Connect the studio and the form to the Sheet (≈5 min)

**Studio:** open `ig-content-studio.html` in your browser, click **Voice & brand**, and paste the Web app URL into the **Publishing queue URL** field. Save. Now the studio's **Approve** button sends finished posts to the Sheet automatically.

**Form (only if you want colleague submissions):** open `cheme-submission-form.html` in a text editor, find `WEBAPP_URL = "PASTE_YOUR_APPS_SCRIPT_URL_HERE"` near the top, and paste your URL between the quotes. Save.

---

## Part 3 — Host the pages on GitHub Pages (≈15 min)

Yes, GitHub is the right home — same as your applets. The studio has no secrets baked in (your API key is typed in at runtime, the queue URL lives in your browser), so a public repo is fine.

1. On **github.com**, click **New** to create a repository. Name it e.g. `cheme-instagram`. Set it **Public**. Create it.
2. Click **Add file ▸ Upload files**. Drag in `ig-content-studio.html` and `cheme-submission-form.html` (the version with your URL pasted in). **Commit changes**.
3. Go to the repo's **Settings ▸ Pages**.
4. Under "Build and deployment," Source = **Deploy from a branch**, Branch = **main**, folder = **/ (root)**. **Save**.
5. Wait ~1 minute, refresh. GitHub shows your site URL. Your two pages are:
   - Studio (bookmark for yourself): `https://<you>.github.io/cheme-instagram/ig-content-studio.html`
   - Form (share with colleagues): `https://<you>.github.io/cheme-instagram/cheme-submission-form.html`

> If you'd rather not put the studio online at all, you can just double-click the HTML file to open it locally — it works the same. Hosting only matters for the form (so colleagues can reach it) and for using the studio on your phone.

---

## Part 4 — Auto-posting with Make (≈25 min, one-time)

**Do these account steps first (only you can):**

- In the Instagram app, set **@ur.cheme** to a **Business** account. The Make module used below does not support Creator accounts.
- Create or select a real Facebook **Page** (not a Facebook profile), link @ur.cheme under the Page's **Settings ▸ Permissions ▸ Linked accounts**, and make sure the Facebook login used in Make has access to that Page.
- Create free accounts at **make.com** and **cloudinary.com**. Cloudinary supplies the public JPEG URL that Instagram's API requires.

**Build the scenario:**

1. In Make, click **Create a new scenario**.
2. Add **Google Sheets ▸ Watch New Rows**. Connect your Google account and configure:
   - Spreadsheet: **UR ChemE IG**
   - Sheet: **Posts**
   - Table contains headers: **Yes**
   - Header row: **A1:O1**
3. Add a filter between Google Sheets and the next module with both conditions:
   - `Status (O)` **Equal to** `Ready`
   - `Type (D)` **Does not equal to** `Video`
   The second condition prevents a Reel cover from being posted accidentally as a normal photo.
4. Add **Google Drive ▸ Download a File**. Map **File ID** to `MediaFileId (M)` from Watch New Rows.
5. Add **Cloudinary ▸ Upload a Resource**. Connect with the Cloud name, API key, and API secret from your Cloudinary dashboard, then configure:
   - File type: **Base64 Encoded Data URI**
   - File: **Google Drive ▸ Download a File**
   - MIME type: `image/jpeg`
   - Resource type: `image`
   - Upload preset and Public ID: leave blank
6. Add **Instagram for Business (Facebook login) ▸ Create a Photo Post**. Select the Facebook Page linked to @ur.cheme, then map:
   - **Photo URL** → Cloudinary's **Secure URL** only
   - **Caption** → `Caption (K)` from Watch New Rows
7. Add **Google Sheets ▸ Update a Row**. Map **Row number** from Watch New Rows, map columns A–N back to their matching source values, and type `Posted` in `Status (O)`.
8. Save the scenario. Create one clearly labeled test post in the Studio and approve it. Confirm the Sheet row contains `Ready`, a caption, and a `MediaFileId`; then click **Run once** in Make. A successful run publishes the post and changes its Sheet status to `Posted`.
9. Delete the temporary Instagram test post, set the schedule (for example, every 15 minutes), and turn the scenario **ON**.

### Build the Reel scenario

Keep the working Photo scenario unchanged. Duplicate it, rename the copy **UR ChemE — Reels**, and configure the copy as follows:

1. Keep **Google Sheets ▸ Watch New Rows** pointed at the same `Posts` sheet and header row `A1:O1`.
2. Replace the filter conditions with:
   - `Status (O)` **Equal to** `Ready`
   - `Type (D)` **Equal to** `Video`
3. In **Google Drive ▸ Download a File**, map **File ID** to `VideoLink (N)`. The Studio and Apps Script convert the pasted Drive sharing URL into the file ID Make needs.
4. In **Cloudinary ▸ Upload a Resource**, configure:
   - File type: **Base64 Encoded Data URI**
   - File: **Google Drive ▸ Download a File**
   - MIME type: map **MIME type** from **Google Drive → Download a File** so both `video/mp4` and `video/quicktime` (MOV) work
   - Resource type: `video`
   - Upload preset and Public ID: leave blank
5. Replace the Instagram photo module with **Instagram for Business (Facebook login) ▸ Create a Reel Post**. Select the same Facebook Page and map:
   - **Video URL** → Cloudinary's **Secure URL** only
   - **Caption** → `Caption (K)` from Watch New Rows
   - **Share to feed** → `Yes`
   If Make offers a thumbnail time/offset, leave it at the default for the first test. The Studio's generated 9:16 cover remains available for a later custom-cover enhancement.
6. Keep **Google Sheets ▸ Update a Row** configured with the original row number, columns A–N mapped back to themselves, and `Posted` in `Status (O)`.
7. When Make asks where Watch New Rows should start, choose the current/latest row so old Video rows are not published. Save the scenario but leave it **OFF** until the private Reel test is ready.

Use an MP4 or MOV stored in Google Drive, shared as **Anyone with the link**, and kept under approximately 60 MB. The Make/Cloudinary Base64 transfer is the limiting step even though Instagram itself accepts larger files. H.264 video with AAC audio is the most portable choice; some device-specific MOV codecs may need conversion before Instagram accepts them.

### Make troubleshooting

- **No Page appears in the Instagram module:** confirm that you created a Facebook Page rather than a profile, linked @ur.cheme to it, and authorized Make with a Facebook login that can access the Page. Refresh or recreate the Make connection after linking.
- **Invalid Photo URL:** the Photo URL field must contain only Cloudinary's `Secure URL`. Put the Sheet's `Caption (K)` token in the Caption field.
- **Google Drive URL rejected:** expected. Instagram cannot fetch Google Drive files even when sharing is public; keep the Cloudinary upload step in the route.
- **Reel file not found:** confirm that column N contains a Drive file ID, that the original Drive file is still available, and that it is shared with the Google account used by Make or with anyone who has the link.
- **Cloudinary rejects a Reel:** confirm the resource type is `video`, the MIME type is mapped from Google Drive (`video/mp4` or `video/quicktime`), and the file is under approximately 60 MB.

---

## Part 5 — Your day-to-day after setup

1. Open the studio. Pick a type, drop in a DOI / details / photo, **Generate post**.
2. Tweak the caption and the graphic.
3. Download the graphic isn't required anymore — just hit **Approve**. It lands in the Sheet as **Ready** with the image attached.
4. Make posts it on the next cycle. Done.

The Studio exports Photo templates as a 1080×1350 JPEG (4:5), with text kept inside a centered safe area so Instagram's feed and profile-grid previews are less likely to need manual adjustment. Paper, event, and quote templates remain square; Reel covers remain 9:16.

Colleagues' submissions show up in the Sheet as **New** rows — raw material. To turn one into a post, recreate it in the studio and approve it; that writes a clean **Ready** row. (The New rows never post on their own.)

**Reels:** upload an MP4 or MOV under approximately 60 MB to Google Drive and set it to **Anyone with the link**. In the Studio choose **Reel**, paste that Drive link, and optionally drop the same clip into the browser so the Studio can grab a cover frame and use it while drafting. The local clip is not uploaded by the browser. Approve sends the caption, generated 9:16 cover, and normalized Drive file ID to the queue as a `Video` row; the separate Make Reel scenario downloads and publishes the video.

---

## Files at a glance

| File | For whom | Where it goes |
|---|---|---|
| `ig-content-studio.html` | You | GitHub Pages (or open locally) |
| `cheme-submission-form.html` | Colleagues | GitHub Pages — share the link |
| `Code.gs` | (behind the scenes) | Pasted into the Sheet's Apps Script |
| `SETUP.md` | You | this guide |
