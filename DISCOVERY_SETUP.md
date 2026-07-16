# Faculty news and publication discovery

This optional add-on supplies the existing Instagram review queue with possible post ideas. It does **not** publish, approve, or generate claims on its own.

## What it watches

- The department's official recent-news page
- The University of Rochester Newscenter's public WordPress endpoint, searched by faculty name
- Linked faculty/lab websites. The first run records a baseline; later changes to home, news, blog, award, event, outreach, highlight, or publication pages create review leads
- Crossref for newly published papers that match the faculty member's given and family names, with University of Rochester used as a ranking signal

The script adds a maximum of 25 new leads per run. Existing links/titles are skipped. Every new row has status `New`, so it appears in the Content Studio's **Review queue** and follows the same review/approval path as supplied content.

When an article exposes a social-sharing image or `og:image`, the script downloads that preview into a private **UR ChemE IG Discovery Media** Drive folder. It records the article URL, direct image URL, and best available creator/site credit in the row. Content Studio adds the recorded image credit to the draft caption and restores it at approval if it was accidentally removed.

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

One digest email is sent only when new leads are found. It uses the existing `NOTIFICATION_EMAIL` script property.

## Tuning

Edit `DISCOVERY_CONFIG` at the top of `Discovery.gs` to change:

- lookback windows;
- maximum publication matches per faculty, news results, or total new leads per run;
- third-party image downloading, image-size limits, and per-run lookup limits;
- trigger hour; or
- the faculty list, name aliases, and monitored lab websites.

The faculty list is intentionally explicit. This avoids silently adding emeritus, affiliated, or similarly named people if the website layout changes. Update it when the department roster changes.

## Coverage and limitations

- The script does not scrape LinkedIn, Instagram, or other login-gated social networks. Automated scraping there is brittle and can violate platform terms.
- Image discovery uses only the article's declared social/preview image; it does not scrape galleries for unrelated images. If no usable JPEG, PNG, or WebP image is exposed, the lead remains text-only.
- A source/site credit is not always the photographer or copyright owner. The review row therefore includes a required rights check. Replace the provisional credit with the source's preferred credit line when one is provided.
- Crediting a source does not by itself establish permission or fair use. The department remains responsible for confirming that reuse is allowed, licensed, or otherwise appropriate for the particular post.
- Some publishers omit affiliations from Crossref, and names are not unique identifiers. Every publication match must therefore be verified; adding ORCID/OpenAlex IDs is the best future precision upgrade.
- Awards that exist only on a society webpage and are not mentioned by Rochester or a lab website may be missed. For high-priority societies, add an official RSS feed or API as a future source.
- Lab-site monitoring detects meaningful page-text changes but cannot know whether a change is newsworthy. Those entries are intentionally labeled as review leads.
- Public APIs can throttle requests or be temporarily unavailable. The script retries transient errors; a failed source is logged and tried again on the next daily run.
- Downloaded discovery images remain in the private Drive folder after a lead is rejected so there is an audit trail; they can be deleted manually during periodic cleanup.

For higher-recall publication tracking, the next upgrade is to add verified ORCID or OpenAlex author IDs to each faculty record. Additional official society feeds can be added later while keeping the same review and deduplication layer.
