# UR ChemE Instagram Toolkit

A small, no-server toolkit for running the University of Rochester Chemical and Sustainability Engineering Instagram (**@ur.cheme**). It turns "I have an event/paper/photo" into an approved, ready-to-post Instagram post — caption, graphic, and all — without you ever touching code.

## What's inside

| File | What it is | Who uses it |
|---|---|---|
| `ig-content-studio.html` | The **Content Studio** — review department submissions, generate captions + graphics, and hit **Approve**. | You |
| `cheme-submission-form.html` | A **submission form** colleagues can use to send you raw material. | Colleagues (optional) |
| `papers.html` | A public, searchable **paper library** linking new posted graphics to their articles. | Instagram visitors |
| `Code.gs` | A Google Apps Script that catches submissions/approvals and files them into a Google Sheet. | Behind the scenes |
| `Discovery.gs` | Optional faculty-news/publication discovery that adds verified-by-you leads to the review queue. | Behind the scenes |
| `SETUP.md` | The full, do-this-then-that setup guide (≈1 hour, mostly one-time). | You |

Photo posts can contain up to 10 ordered images. The public form and Content Studio both accept multi-image uploads, review submissions retain the complete carousel, and approval stores every rendered slide for publishing.

The private review queue keeps a compact five-minute cache and uses validated Sheet row hints when loading details or source media, so opening the department review list and importing a submission do not repeatedly rescan the complete Sheet.

Photo graphics export at Instagram's portrait-friendly 1080×1350 size; square cards and 9:16 Reel covers remain available in the graphic editor. The **Plain photo + per-image text** template preserves each full image in a 4:5 frame and adds an independently editable text overlay to each slide, including controls for font, fill color, outline thickness/color, nine-position placement, and an optional text background with its own color and transparency. The traditional Instagram caption remains separate.

The graphic editor defaults to **Rochester Navy** and offers eight starting styles: **Cobalt Chevron**, **Ever Better Light**, **Studio Classic**, **Rochester Editorial**, **Lab Notebook**, **Golden Spotlight**, and **Campus Bulletin**. The original four looks remain available unchanged until you customize them. All styles work across paper, event, quote, photo, and Reel layouts.

The admin editor now includes:

- **Layout & image:** text-first, image-first, or split compositions; margins, spacing, image area, and corners; crop position when filling the frame. Photo and Reel covers have top/middle/bottom text placement and adjustable gradient or solid backdrops.
- **Typography, palette, and branding:** four headline typefaces, alignment, sizes, line spacing, five color controls, five accent treatments, and optional wordmark, department, handle, and detail lines. Custom designs respect typed line breaks, fit text into bounded regions, and flag shortened copy in the preview.
- **Reusable designs:** save a look under **My presets**, rename it, select it as the default for new posts, or export/import a JSON library for backup and other browsers. Libraries hold up to 50 presets and contain appearance settings only. They do not include captions, photos, API keys, or publishing credentials.
- **Creative input:** add optional direction for AI-generated graphic wording, edit the text directly, or choose **Start manually** to build a post without an API key. **Try a variation**, **Undo design**, and **Reset to preset** make it easy to explore a new look while retaining post content.

Open the **Graphic** tab, pick a starting style, then expand the design sections below the text fields. The preview stays visible while you edit. The same renderer supplies previews, JPEG downloads, and approved carousel images. Plain photo overlays retain their separate per-image controls. Saved presets stay in the browser where you created them; export a backup before clearing browser data.

Use **Zoom preview** beneath the graphic to inspect it in a larger window. Choose **Fit** or **25–200%**, then scroll or swipe to inspect details. **Close** or **Escape** returns to the editor. Zoom also works for individual carousel slides and Reel covers, and never changes the exported image size.

Run the local regression checks with `node --test tests/*.test.js`.

For papers, follow **Add paper details → Choose an image → Write caption & review**. After creating an AI image, choose **Use image & continue to caption**. A selected-image thumbnail stays beside the caption, and **Generate caption · keep image** writes the text without replacing the graphic. Changes to the caption angle or research credit preserve the image for the same DOI. Use **Review graphic & approve** to check the final image and article link before posting. A different paper does not inherit the previous paper's image.

Paper captions use third person and credit the supplied group or authors. **Research group / authors to credit** is editable and fills from submission credit, Rochester-affiliated DOI authors when available, or the paper's author credit. DOI imports retain the complete author list; author order alone is never used to invent a lab or group leader. Generated captions that use first person or omit the supplied credit receive one correction attempt. If that still fails, the Studio keeps the existing caption and image and shows an error. Paper captions include **Read the paper via the link in bio**, without adding a second reference when one is already present.

**AI Generate** turns the paper facts into an unbranded graphic. Choose an explainer, everyday analogy, material cutaway, magazine illustration, photo-inspired concept, or minimal abstract look. Set the audience, amount of text, square/portrait format, and your own creative direction; the full prompt is editable. The free **Prompt + upload** workflow prepares a prompt for a generator you already use. **Illustrated diagram** uses the existing Claude key and text API usage. **AI image** uses your OpenAI image API key and separate API billing; a ChatGPT subscription does not include those API calls. The optional image key is kept in this browser tab only, and never sent to the queue or gallery. Review the result and choose **Use image & continue to caption** for a paper before approving. **Restore previous graphic** reverses the replacement. Caption regeneration preserves the artwork and gallery edits when the source paper is unchanged.

The **[paper library](https://mporosoff.github.io/cheme-instagram/papers.html)** runs on the existing free GitHub Pages site. Add its URL to Instagram’s bio links or Linktree once. Under **Paper gallery** in the Studio, review the article title and DOI/link, and optionally add journal, authors, year, and a short summary. New approved paper posts appear automatically with their published graphic when Make records **Posted**. Earlier posts are not backfilled, and drafts or failed posts stay private. Uncheck the gallery option to exclude an individual paper. No Make changes or additional hosting subscription are needed.

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

Once hosted, your pages live at:

- Studio (bookmark for yourself): `https://mporosoff.github.io/cheme-instagram/ig-content-studio.html`
- Form (share with colleagues): `https://mporosoff.github.io/cheme-instagram/cheme-submission-form.html`
- Papers (Instagram bio or Linktree): `https://mporosoff.github.io/cheme-instagram/papers.html`

To supplement colleague submissions with faculty news and newly indexed publications, see **[DISCOVERY_SETUP.md](DISCOVERY_SETUP.md)** and the complete **[source coverage table](DISCOVERY_COVERAGE.md)**. The optional discovery job can collect source-attributed social-preview images, but it never auto-publishes; every lead enters the existing review queue as **New**.

> You can also just double-click `ig-content-studio.html` to run it locally — hosting only matters for sharing the form and using the studio on your phone.

## A note on safety

There are **no secrets baked into these files**. Your API key and manager-review token are typed in at runtime and stored only in the manager's browser tab. The Instagram credentials live only inside Make. The public endpoint applies a honeypot, server-side validation, duplicate protection, and an hourly rate limit; manager actions require the Apps Script `MANAGER_TOKEN`.

## License

Released under the [MIT License](LICENSE).
