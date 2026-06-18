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

- In the Instagram app, set **@ur.cheme** to a **Business or Creator** account, and **link it to a Facebook Page**. This is Meta's hard requirement for *any* posting automation — there's no way around it.
- Create a free account at **make.com**.

**Build the scenario:**

1. In Make, click **Create a new scenario**.
2. Add the first module: search **Google Sheets**, choose **Watch New Rows**. Connect your Google account, pick your sheet and the `Posts` tab, say the table has headers. Save.
3. Add a **Filter** between modules (the wrench on the connector): condition = `Status` **Equal to** `Ready`. Only approved posts pass.
4. Add a module: **Google Drive ▸ Download a File**, using the `MediaFileId` from the row. (Feeding Make the Drive file is more reliable than a link.)
5. Add a module: **Instagram for Business ▸ Create a Photo Post**. Connect via Facebook login and pick @ur.cheme. Map:
   - **Caption** → the `Caption` column
   - **Photo** → the file from step 4
6. (Recommended) Add a final module: **Google Sheets ▸ Update a Row**, set `Status` to `Posted` so nothing posts twice.
7. Click **Run once** to test with one Ready row. If it posts, set the schedule (bottom-left clock — e.g. every 15 minutes) and toggle the scenario **ON**.

> **For Reels/video:** add a second branch (or a `Type = Video` filter) that uses **Instagram for Business ▸ Create a Reel** instead. Map the **video** to the `VideoLink` and, optionally, the **cover** to the `MediaURL` (the 9:16 cover the studio made). One honest catch: Instagram fetches the video from a URL, so the link must point *directly* at the file and be publicly reachable. A normal Google Drive "share" link often isn't — the most reliable route is to drop the clip in your own Drive folder and let Make's **Google Drive ▸ Download a File** module hand the video to the Reel module. Photos are easy; Reels are the fiddly one.

---

## Part 5 — Your day-to-day after setup

1. Open the studio. Pick a type, drop in a DOI / details / photo, **Generate post**.
2. Tweak the caption and the graphic.
3. Download the graphic isn't required anymore — just hit **Approve**. It lands in the Sheet as **Ready** with the image attached.
4. Make posts it on the next cycle. Done.

Colleagues' submissions show up in the Sheet as **New** rows — raw material. To turn one into a post, recreate it in the studio and approve it; that writes a clean **Ready** row. (The New rows never post on their own.)

**Reels:** in the studio pick the **Reel** type, paste the video link (what gets posted), and optionally drop in the clip — the studio grabs a cover frame, writes Reel-style copy against it, and builds a 9:16 cover. Approve sends the caption, cover, and video link to the queue as a `Video` row.

---

## Files at a glance

| File | For whom | Where it goes |
|---|---|---|
| `ig-content-studio.html` | You | GitHub Pages (or open locally) |
| `cheme-submission-form.html` | Colleagues | GitHub Pages — share the link |
| `Code.gs` | (behind the scenes) | Pasted into the Sheet's Apps Script |
| `SETUP.md` | You | this guide |
