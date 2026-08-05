# Discovery source coverage

This is the configured source inventory for the daily discovery job. All results are review leads; nothing is approved or published automatically.

## Department-wide and student coverage

| Content | Source | Matching behavior |
|---|---|---|
| Faculty roster completeness | [Official core-faculty roster](https://www.hajim.rochester.edu/che/people/faculty/index.html) | Compares first/last names with the configured 14-person roster every day and warns if someone is added or removed. |
| Department news | [Official recent news](https://www.hajim.rochester.edu/che/news-events/news/index.html) | Parses recent dated stories. |
| Tagged Newscenter stories | [Official Newscenter department tag](https://www.rochester.edu/newscenter/wp-json/wp/v2/tags?slug=department-of-chemical-and-sustainability-engineering) | Pulls every recent post assigned to the department tag. |
| Student, alumni, program, and team stories | [Newscenter posts API](https://www.rochester.edu/newscenter/wp-json/wp/v2/posts) | Searches article title, excerpt, and body for `chemical engineering`, `chemical sustainability engineering`, or `chemical and sustainability engineering`; ampersands normalize to `and`. A faculty name is not required. |
| Events | [Official events page](https://www.hajim.rochester.edu/che/news-events/events/index.html) | Creates an initial review lead, then a new lead whenever meaningful page text changes. |
| Seminars | [Official seminar series](https://www.hajim.rochester.edu/che/news-events/currentyear.html) | Creates an initial review lead, then a new lead whenever meaningful page text changes. |

## Faculty-by-faculty coverage

Each faculty member is also searched in the Newscenter using the configured name, aliases, and lab/group names. Publications use the verified ORCID query **and** a name-plus-University-of-Rochester fallback, then accept journal articles and book chapters only.

| Faculty | Websites monitored for changes | Newscenter terms beyond the configured name/aliases | Publication identity |
|---|---|---|---|
| Mitchell Anthamatten | [Official profile](https://www.hajim.rochester.edu/che/people/faculty/anthamatten_mitchell/index.html) | Anthamatten Research Group | [ORCID 0000-0002-7763-9465](https://orcid.org/0000-0002-7763-9465) + name/affiliation fallback |
| Yasemin Basdogan | [Lab home](https://www.basdoganlab.com/); [lab updates/page](https://www.basdoganlab.com/blank-2) | Basdogan Lab | [ORCID 0000-0002-2071-9675](https://orcid.org/0000-0002-2071-9675) + fallback |
| Pooja Rajendra Bhalode | [Group home](https://sites.google.com/view/pooja-bhalode/); [publications](https://sites.google.com/view/pooja-bhalode/publications) | Multiscale Systems Engineering Lab | [ORCID 0000-0003-4531-011X](https://orcid.org/0000-0003-4531-011X) + fallback |
| Siddharth Deshpande | [Lab home](https://www.atomicinterfaces.org/); [research highlights](https://www.atomicinterfaces.org/research-highlights); [publications](https://www.atomicinterfaces.org/publications) | Atomic Interfaces; Deshpande group | [ORCID 0000-0001-9471-9080](https://orcid.org/0000-0001-9471-9080) + fallback |
| Gang Fan | [Lab home](https://www.gangfanclub.com/); [publications](https://www.gangfanclub.com/publications); [lab events](https://www.gangfanclub.com/lab-events); [outreach](https://www.gangfanclub.com/outreach) | Gang Fan Lab; Gang Fan Club; The Fan Club | [ORCID 0000-0002-4185-5692](https://orcid.org/0000-0002-4185-5692) + fallback |
| David G. Foster | [Group home](https://www.sas.rochester.edu/che/sites/dafoster/); [publications](https://www.sas.rochester.edu/che/sites/dafoster/publications/) | University of Rochester CFD; Foster CFD Group | [ORCID 0000-0003-1837-2112](https://orcid.org/0000-0003-1837-2112) + fallback |
| Melodie I. Lawton | [Official profile](https://www.hajim.rochester.edu/che/people/faculty/lawton-melodie/index.html) | None beyond name/alias | [ORCID 0000-0001-5267-3766](https://orcid.org/0000-0001-5267-3766) + fallback |
| Darren Lipomi | [Lab home](https://www.lipomigroup.org/); [blog](https://www.lipomigroup.org/blog); [outreach](https://www.lipomigroup.org/outreach); [publications](https://www.lipomigroup.org/pubs) | Lipomi Research Group; Lipomi Group | [ORCID 0000-0002-5808-7765](https://orcid.org/0000-0002-5808-7765) + fallback |
| Allison J. Lopatkin | [Lab home](https://lopatkinlab.com/index.html); [publications](https://lopatkinlab.com/publications.html) | Lopatkin Lab | [ORCID 0000-0003-0018-9205](https://orcid.org/0000-0003-0018-9205) + fallback |
| Astrid M. Müller | [Group home](https://astridmuellergroup.org/); [news/updates](https://astridmuellergroup.org/2018/08/01/august-2018/); [publications](https://astridmuellergroup.org/publications/) | Astrid Mueller Group; Müller Group; Mueller Group | [ORCID 0000-0002-2785-6808](https://orcid.org/0000-0002-2785-6808) + fallback |
| Marc D. Porosoff | [Group home](https://www.porosoffresearchgroup.com/); [news](https://www.porosoffresearchgroup.com/news.html); [publications](https://www.porosoffresearchgroup.com/publications.html); [teaching](https://www.porosoffresearchgroup.com/teaching.html) | Porosoff Research Group; Porosoff Group | [ORCID 0000-0003-3066-0029](https://orcid.org/0000-0003-3066-0029) + fallback |
| Alexander A. Shestopalov | [Group home](https://www.hajim.rochester.edu/che/sites/shestopalov/index.html); [news/events](https://www.hajim.rochester.edu/che/sites/shestopalov/news-events/index.html); [publications](https://www.hajim.rochester.edu/che/sites/shestopalov/publications/index.html) | Shestopalov Research Group; Shestopalov Group | [ORCID 0000-0002-5153-7604](https://orcid.org/0000-0002-5153-7604) + fallback |
| Wyatt E. Tenhaeff | [Lab home](https://tenhaeff.weebly.com/); [publications](https://tenhaeff.weebly.com/publications.html) | Tenhaeff Research Group; Tenhaeff Labs; Tenhaeff Group | [ORCID 0000-0001-7132-3171](https://orcid.org/0000-0001-7132-3171) + fallback |
| Matthew Z. Yates | [Official profile](https://www.hajim.rochester.edu/che/people/faculty/yates_matthew/index.html) | None beyond name/alias | [ORCID 0000-0002-5588-2413](https://orcid.org/0000-0002-5588-2413) + fallback |

## Daily completeness signal

The daily email includes a source-health table with category, source/faculty, status, records checked, leads found, and error notes. It is sent even when no new leads are found, so a quiet day can be distinguished from a failed source.

For each newly saved lead, Discovery prefers an official Newscenter featured image or publication graphical-abstract metadata, then tries labeled graphical-abstract/TOC figures, structured article images, and social-preview images. Content Studio loads a saved image automatically and clearly reports when no usable image was available. Images remain review candidates: credit and reuse rights still require confirmation.

Changed-page hashes are committed only after the corresponding row is written to the review queue. If the 25-item per-run cap defers a page-change lead, that state remains pending and is retried on the next run.
