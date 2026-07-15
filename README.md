# UR ChemE Instagram Toolkit

A small, no-server toolkit for running the University of Rochester Chemical and Sustainability Engineering Instagram (**@ur.cheme**). It turns "I have an event/paper/photo" into an approved, ready-to-post Instagram post — caption, graphic, and all — without you ever touching code.

## What's inside

| File | What it is | Who uses it |
|---|---|---|
| `ig-content-studio.html` | The **Content Studio** — create posts, generate captions + graphics, and hit **Approve**. | You |
| `cheme-submission-form.html` | A **submission form** colleagues can use to send you raw material. | Colleagues (optional) |
| `Code.gs` | A Google Apps Script that catches submissions/approvals and files them into a Google Sheet. | Behind the scenes |
| `SETUP.md` | The full, do-this-then-that setup guide (≈1 hour, mostly one-time). | You |

Photo graphics export at Instagram's portrait-friendly 1080×1350 size; square cards and 9:16 Reel covers remain available in the graphic editor.

Reels use a separate Make route: the Studio records a shared Google Drive MP4, Make downloads it, Cloudinary supplies the public video URL, and Instagram publishes it as a Reel.

## How it works (the short version)

A plain web page can't post to Instagram directly — Meta only allows posting through its API with credentials that can't live safely in a shared file. So instead:

1. You build and **Approve** a post in the Content Studio.
2. The caption + graphic land in a private Google Sheet, marked **Ready** (handled by `Code.gs`).
3. **Make** watches the sheet, moves the approved JPEG through **Cloudinary** to obtain a public URL, and posts it to @ur.cheme.

One button for you; the Instagram login stays locked inside Make, never in any file you share.

```
Studio / Form  ──►  Apps Script  ──►  Google Sheet ("Ready")  ──►  Make  ──►  Cloudinary  ──►  Instagram
```

## Quick start

The full walkthrough is in **[SETUP.md](SETUP.md)**. The big steps:

1. **Google Sheet + script** — create a sheet, paste in `Code.gs`, deploy it as a web app.
2. **Connect the pages** — paste the web-app URL into the studio's settings and the form.
3. **Host the pages** — this repo can publish them free via **GitHub Pages** (Settings ▸ Pages ▸ Deploy from `main` / root).
4. **Auto-posting** — wire up Make to watch the sheet, upload the image to Cloudinary, and post its public URL.

Once hosted, your two pages live at:

- Studio (bookmark for yourself): `https://mporosoff.github.io/cheme-instagram/ig-content-studio.html`
- Form (share with colleagues): `https://mporosoff.github.io/cheme-instagram/cheme-submission-form.html`

> You can also just double-click `ig-content-studio.html` to run it locally — hosting only matters for sharing the form and using the studio on your phone.

## A note on safety

There are **no secrets baked into these files**. Your API key is typed in at runtime and the publishing-queue URL lives in your browser, so a public repo is fine. The Instagram credentials live only inside Make.

## License

Released under the [MIT License](LICENSE).
