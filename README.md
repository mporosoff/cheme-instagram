# UR ChemE Instagram Toolkit

A small, no-server toolkit for running the University of Rochester Chemical and Sustainability Engineering Instagram (**@ur.cheme**). It turns "I have an event/paper/photo" into an approved, ready-to-post Instagram post — caption, graphic, and all — without you ever touching code.

## What's inside

| File | What it is | Who uses it |
|---|---|---|
| `ig-content-studio.html` | The **Content Studio** — review department submissions, generate captions + graphics, and hit **Approve**. | You |
| `cheme-submission-form.html` | A **submission form** colleagues can use to send you raw material. | Colleagues (optional) |
| `Code.gs` | A Google Apps Script that catches submissions/approvals and files them into a Google Sheet. | Behind the scenes |
| `SETUP.md` | The full, do-this-then-that setup guide (≈1 hour, mostly one-time). | You |

Photo graphics export at Instagram's portrait-friendly 1080×1350 size; square cards and 9:16 Reel covers remain available in the graphic editor.

Reels use a separate Make route: the Studio records a shared Google Drive MP4 or MOV file, Make downloads it, Cloudinary supplies the public video URL, and Instagram publishes it as a Reel.

## How it works (the short version)

A plain web page can't post to Instagram directly — Meta only allows posting through its API with credentials that can't live safely in a shared file. So instead:

1. Colleagues submit material through the public form; it lands in the private Sheet as **New** and triggers a manager email.
2. You load it from **Review queue** in the Content Studio, generate/edit the post, and **Approve** it.
3. The approved caption + graphic land in the Sheet as **Ready**, while the original submission becomes **Reviewed**.
4. **Make** claims the row as **Processing**, publishes it through Cloudinary and Instagram, then records **Posted** or **Error**.

One button for you; the Instagram login stays locked inside Make, never in any file you share.

```
Public form → New → Studio review → Ready → Make Processing → Posted / Error
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

There are **no secrets baked into these files**. Your API key and manager-review token are typed in at runtime and stored only in the manager's browser tab. The Instagram credentials live only inside Make. The public endpoint applies a honeypot, server-side validation, duplicate protection, and an hourly rate limit; manager actions require the Apps Script `MANAGER_TOKEN`.

## License

Released under the [MIT License](LICENSE).
