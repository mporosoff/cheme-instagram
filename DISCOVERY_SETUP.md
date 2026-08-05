# Faculty news and publication discovery

This optional add-on supplies the existing Instagram review queue with possible post ideas. It does **not** publish, approve, or generate claims on its own.

## What it watches

- The department's official recent-news page
- The official core-faculty roster, checked daily against the configured 14-person list so a new hire or roster change produces a warning
- The University of Rochester Newscenter's official department tag plus public WordPress search endpoint. Searches use faculty names, aliases, and lab/group names as well as the department phrases "chemical engineering" and "chemical and sustainability engineering" (including the ampersand variant). Department-wide matches capture student, alumni, program, and team stories even when no configured faculty member is named
- The department's official events and seminar pages
- Explicit faculty/lab page lists. The first run records a baseline; later changes to the configured profile, home, news, blog, event, outreach, teaching, or publication pages create review leads
- Crossref using each faculty member's verified ORCID plus a name-and-University-of-Rochester fallback. Results are limited to journal articles and book chapters and recurring meeting-abstract records are rejected

See **[DISCOVERY_COVERAGE.md](DISCOVERY_COVERAGE.md)** for the complete faculty-by-faculty source table.

The script adds a maximum of 25 new leads per run. Existing links/titles are skipped. Page-change state is saved only after its row is safely written, so leads deferred by the limit are retried during the next run. Every new row has status `New`, so it appears in the Content Studio's **Review queue** and follows the same review/approval path as supplied content. For Newscenter stories, Discovery extracts the department- or faculty-matching section from the full article body and labels it `FACTS FOR DRAFT`; Content Studio sends only that factual section—not verification instructions or image metadata—to the caption model.

When an article exposes a Newscenter featured image, graphical-abstract/publication metadata, a labeled graphical-abstract or TOC figure, structured article data, or a social-sharing image, the script downloads the best available candidate into a private **UR ChemE IG Discovery Media** Drive folder. Generic seals, logos, icons, placeholders, avatars, and branding assets are rejected. It records the article URL, direct image URL, image type, and best available creator/site credit in the row. Content Studio automatically loads the saved image, labels it as ready, uses it in the graphic, and adds the recorded image credit to the draft caption. The upload control remains available to replace it.

After installing this version, optionally run `backfillDiscoveryImages()` from the Apps Script editor. It attempts to attach source images to up to 25 existing `Discovery Bot` rows that are still `New` or `Reviewing` and have no image. Run it again if its returned `remaining` count is above zero.

If Newscenter leads were created by an older version, run `refreshDiscoveryNewscenterDetails()` once after installing. It repairs up to 25 old Newscenter rows at a time, regardless of their current review status, and does not change that status. It also detaches any generic Newscenter seal/logo already attached to a repaired row. Run it again only if its returned `remaining` count is above zero.

The Rochester sources and Crossref are public and require no API key or paid account. Their records are only as accurate as the source page and publisher metadata, so the script deliberately asks a reviewer to verify every result.

## Install it (about 5 minutes)

1. Open the Google Apps Script project that already contains `Code.gs`.
2. Click **+ → Script**, name the file `Discovery`, and paste in all of `Discovery.gs`.
3. Save, select `initializeDiscovery`, and click **Run**. Approve the URL-fetch, spreadsheet, Drive, trigger, and email permissions.
4. Select `runFacultyDiscovery` and run it once manually.
5. Open the private Sheet or the Content Studio's **Review queue**. Verify any discovered items before loading them into the Studio.

`initializeDiscovery()` creates one daily trigger, scheduled near 7 a.m. in the Apps Script project's time zone. Running it again safely replaces that trigger rather than creating duplicates.

## Normal workflow

```text
Department/Newscenter/lab/publication sources
              ↓
     Discovery Bot row (New)
              ↓
 Verify source, claims, date, and authorship
 Verify image creator, preferred credit, and reuse terms
              ↓
 Load into Content Studio → generate/edit caption + graphic
              ↓
             Approve
```

One digest email is sent after every daily run, including quiet days. It lists new leads and a source-health table showing every department source and faculty check, automatic image attempts/attachments, records checked, leads found, deferrals, and errors. It uses the existing `NOTIFICATION_EMAIL` script property. Set `sendDailySourceDigest` to `false` to return to new-leads-only email behavior.

## Tuning

Edit `DISCOVERY_CONFIG` at the top of `Discovery.gs` to change:

- lookback windows;
- maximum publication matches per faculty, news results, or total new leads per run;
- third-party image downloading, image-size limits, and per-run lookup limits;
- trigger hour;
- department-wide Newscenter search phrases;
- allowed Crossref publication types; or
- the faculty list, name aliases, lab/group terms, verified ORCID, and explicit `monitorUrls`.

The faculty list is intentionally explicit. This avoids silently adding emeritus, affiliated, or similarly named people if the website layout changes. Update it when the department roster changes.

## Coverage and limitations

- The script does not scrape LinkedIn, Instagram, or other login-gated social networks. Automated scraping there is brittle and can violate platform terms.
- Image discovery uses only the article's declared social/preview image; it does not scrape galleries for unrelated images. If no usable JPEG, PNG, or WebP image is exposed, the lead remains text-only.
- A source/site credit is not always the photographer or copyright owner. The review row therefore includes a required rights check. Replace the provisional credit with the source's preferred credit line when one is provided.
- Crediting a source does not by itself establish permission or fair use. The department remains responsible for confirming that reuse is allowed, licensed, or otherwise appropriate for the particular post.
- Some publishers omit ORCID and affiliation metadata from Crossref. The verified ORCID query provides the high-confidence path and the name/affiliation/topic fallback preserves recall, but every publication match must still be reviewed.
- Awards that exist only on a society webpage and are not mentioned by Rochester or a lab website may be missed. For high-priority societies, add an official RSS feed or API as a future source.
- Lab-site monitoring detects meaningful page-text changes but cannot know whether a change is newsworthy. Those entries are intentionally labeled as review leads.
- Public APIs can throttle requests or be temporarily unavailable. The script retries transient errors; a failed source is logged and tried again on the next daily run.
- Downloaded discovery images remain in the private Drive folder after a lead is rejected so there is an audit trail; they can be deleted manually during periodic cleanup.

Additional official society feeds or carefully verified OpenAlex author IDs can be added later while keeping the same review and deduplication layer.
