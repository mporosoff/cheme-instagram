/**
 * UR ChemE faculty-news discovery
 * --------------------------------
 * Paste this file into the same Google Apps Script project as Code.gs.
 * Discovered items are appended to the existing Posts sheet as "New" so
 * they must pass through the Content Studio review flow before publishing.
 *
 * One-time setup:
 *   1. Run initializeDiscovery() and approve the requested permissions.
 *   2. Run runFacultyDiscovery() once and inspect the review queue.
 *
 * The default trigger runs once each morning. It uses official Rochester
 * pages, faculty/lab websites, and Crossref. No paid search API or API key
 * is required.
 */

var DISCOVERY_CONFIG = {
  departmentNewsUrl: "https://www.hajim.rochester.edu/che/news-events/news/index.html",
  rochesterNewsApiUrl: "https://www.rochester.edu/newscenter/wp-json/wp/v2/posts",
  newsLookbackDays: 45,
  publicationLookbackDays: 120,
  maxNewsItemsTotal: 50,
  maxNewscenterItemsPerFaculty: 5,
  monitorLabWebsites: true,
  maxLabPagesPerFaculty: 3,
  maxPublicationItemsPerFaculty: 3,
  maxNewItemsPerRun: 25,
  downloadThirdPartyImages: true,
  maxImageLookupsPerRun: 25,
  maxImageBytes: 8 * 1024 * 1024,
  imageFolderName: "UR ChemE IG Discovery Media",
  triggerHour: 7,
  faculty: [
    { name: "Mitchell Anthamatten", newsTerms: ["Anthamatten Research Group"], publicationTerms: ["polymer", "macromolecular", "self-assembly", "resin", "elastomer", "nanostruct", "optoelectronic", "vapor deposition"] },
    { name: "Yasemin Basdogan", website: "https://www.basdoganlab.com/", newsTerms: ["Basdogan Lab"], publicationTerms: ["machine learning", "molecular dynamics", "quantum chemistry", "materials", "polymer", "catalys"] },
    { name: "Pooja Rajendra Bhalode", aliases: ["Pooja Bhalode"], website: "https://sites.google.com/view/pooja-bhalode/", publicationTerms: ["process systems", "multiscale", "powder flow", "hybrid model", "extraction", "sustainab"] },
    { name: "Siddharth Deshpande", website: "https://www.atomicinterfaces.org/", newsTerms: ["Atomic Interfaces"], publicationTerms: ["interface", "atomistic", "catalys", "electrocatal", "battery", "propane", "propylene", "machine learning"] },
    { name: "Gang Fan", website: "https://www.gangfanclub.com/", newsTerms: ["Gang Fan Lab", "Gang Fan Club"], publicationTerms: ["polymer", "catalys", "plastic", "upcycl", "bioelectro", "biosensor", "synthetic biology", "metabolic", "remediation"] },
    { name: "David G. Foster", aliases: ["David Foster"], website: "https://www.sas.rochester.edu/che/sites/dafoster/", publicationTerms: ["transport", "fluid", "cancer cell", "nanoparticle", "microtube", "chemical engineering education"] },
    { name: "Melodie I. Lawton", aliases: ["Melodie Lawton"], publicationTerms: ["shape memory", "polymer", "composite", "biomaterial", "drug delivery", "degradation"] },
    { name: "Darren Lipomi", website: "https://www.lipomigroup.org/", newsTerms: ["Lipomi Research Group", "Lipomi Group"], publicationTerms: ["polymer", "semiconductor", "electronic", "wearable", "flexible", "pedot", "nanoengineering", "chemical education", "ai tutor"] },
    { name: "Allison J. Lopatkin", aliases: ["Allison Lopatkin"], website: "https://lopatkinlab.com/index.html", newsTerms: ["Lopatkin Lab"], publicationTerms: ["antibiotic", "plasmid", "microbial", "bacteria", "metabolic", "synthetic biology", "horizontal gene", "resistance"] },
    { name: "Astrid M. Müller", aliases: ["Astrid Mueller", "Astrid Müller"], website: "https://astridmuellergroup.org/", newsTerms: ["Astrid Mueller Group"], publicationTerms: ["pfas", "electro", "carbon dioxide", "oxidation", "reduction", "nanomaterial", "laser"] },
    { name: "Marc D. Porosoff", aliases: ["Marc Porosoff"], website: "https://www.porosoffresearchgroup.com/", newsTerms: ["Porosoff Research Group"], publicationTerms: ["catalys", "carbon dioxide", "co2", "tungsten carbide", "optimization", "methanol", "reactive separation", "machine learning", "language model"] },
    { name: "Alexander A. Shestopalov", aliases: ["Alexander Shestopalov"], website: "https://www.hajim.rochester.edu/che/sites/shestopalov/index.html", newsTerms: ["Shestopalov Research Group"], publicationTerms: ["surface", "interface", "pattern", "nanostruct", "deposition", "monolayer"] },
    { name: "Wyatt E. Tenhaeff", aliases: ["Wyatt Tenhaeff"], website: "https://tenhaeff.weebly.com/", newsTerms: ["Tenhaeff Research Group"], publicationTerms: ["battery", "lithium", "electrochemical", "polymer", "thin film", "energy storage", "deposition"] },
    { name: "Matthew Z. Yates", aliases: ["Matthew Yates"], publicationTerms: ["surface", "coating", "electrochem", "sensor", "spectroscopy", "raman", "polymer", "waveguide", "hardware"] }
  ]
};

/** Creates/replaces the daily trigger. Safe to run more than once. */
function initializeDiscovery() {
  var props = PropertiesService.getScriptProperties();
  if (!props.getProperty("DISCOVERY_CONTACT_EMAIL")) {
    var email = props.getProperty("NOTIFICATION_EMAIL") || Session.getEffectiveUser().getEmail();
    if (email) props.setProperty("DISCOVERY_CONTACT_EMAIL", email);
  }

  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === "runFacultyDiscovery") {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
  ScriptApp.newTrigger("runFacultyDiscovery")
    .timeBased()
    .everyDays(1)
    .atHour(DISCOVERY_CONFIG.triggerHour)
    .create();

  console.log("Faculty discovery is scheduled daily near " + DISCOVERY_CONFIG.triggerHour + ":00.");
  console.log("Run runFacultyDiscovery() once now to test it.");
}

/** Main scheduled job. Returns a short summary when run from the editor. */
function runFacultyDiscovery() {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(1000)) return { ok: false, message: "Discovery is already running." };

  try {
    var candidates = [];
    candidates = candidates.concat(discoverDepartmentNews_());
    candidates = candidates.concat(discoverRochesterNewscenter_());
    if (DISCOVERY_CONFIG.monitorLabWebsites) candidates = candidates.concat(discoverLabWebsiteUpdates_());

    for (var i = 0; i < DISCOVERY_CONFIG.faculty.length; i++) {
      var faculty = DISCOVERY_CONFIG.faculty[i];
      candidates = candidates.concat(discoverFacultyPublications_(faculty));
    }

    var result = saveDiscoveryCandidates_(candidates);
    if (result.added.length) sendDiscoveryDigest_(result.added, result.skipped);
    console.log(JSON.stringify(result));
    return { ok: true, added: result.added.length, skipped: result.skipped };
  } finally {
    lock.releaseLock();
  }
}

function discoverDepartmentNews_() {
  try {
    var html = fetchText_(DISCOVERY_CONFIG.departmentNewsUrl);
    var out = [];
    var months = "January|February|March|April|May|June|July|August|September|October|November|December";
    var itemPattern = new RegExp("(?:Latest News\\s*)?((?:" + months + ")\\s+\\d{1,2},\\s+\\d{4})" +
      "[\\s\\S]{0,800}?<h3[^>]*>[\\s\\S]{0,300}?<a[^>]+href=[\\\"']([^\\\"']+)[\\\"'][^>]*>([\\s\\S]*?)<\\/a>", "gi");
    var match;
    while ((match = itemPattern.exec(html)) !== null) {
      var published = new Date(match[1] + " 12:00:00");
      if (!isRecent_(published, DISCOVERY_CONFIG.newsLookbackDays)) continue;
      var title = stripHtml_(match[3]);
      if (!title) continue;
      out.push({
        title: title,
        link: absoluteUrl_(match[2], DISCOVERY_CONFIG.departmentNewsUrl),
        imageCredit: "University of Rochester Newscenter",
        date: published,
        type: "Shout-out",
        credit: "UR Chemical and Sustainability Engineering",
        details: "Official department news item. Verify the linked story, image rights/credit, and claims before using the Content Studio to draft the post.",
        source: "Department news",
        score: 100
      });
    }
    return out;
  } catch (err) {
    console.error("Department news discovery failed: " + err);
    return [];
  }
}

/** Searches the official University Newscenter article body for each faculty name. */
function discoverRochesterNewscenter_() {
  var out = [];
  var fromDate = dateDaysAgo_(DISCOVERY_CONFIG.newsLookbackDays).toISOString();
  for (var f = 0; f < DISCOVERY_CONFIG.faculty.length; f++) {
    var faculty = DISCOVERY_CONFIG.faculty[f];
    var searchName = (faculty.aliases && faculty.aliases[0]) || faculty.name;
    var url = DISCOVERY_CONFIG.rochesterNewsApiUrl +
      "?search=" + encodeURIComponent(searchName) +
      "&after=" + encodeURIComponent(fromDate) +
      "&per_page=" + DISCOVERY_CONFIG.maxNewscenterItemsPerFaculty +
      "&orderby=date&order=desc&_embed=1";
    try {
      var posts = JSON.parse(fetchText_(url)) || [];
      for (var i = 0; i < posts.length && out.length < DISCOVERY_CONFIG.maxNewsItemsTotal; i++) {
        var post = posts[i];
        var title = stripHtml_(post.title && post.title.rendered || "");
        var body = [title, post.excerpt && post.excerpt.rendered, post.content && post.content.rendered].join(" ");
        if (!textMentionsFaculty_(body, faculty)) continue;
        var published = post.date_gmt ? new Date(post.date_gmt + "Z") : new Date(post.date || "");
        if (!isRecent_(published, DISCOVERY_CONFIG.newsLookbackDays)) continue;
        var embedded = post._embedded || {};
        var media = embedded["wp:featuredmedia"] && embedded["wp:featuredmedia"][0] || {};
        var imageUrl = media.source_url || "";
        var imageCaption = stripHtml_(media.caption && media.caption.rendered || "");
        var excerpt = truncate_(stripHtml_(post.excerpt && post.excerpt.rendered || ""), 700);
        out.push({
          title: title,
          link: post.link || "",
          imageUrl: imageUrl,
          imageCredit: imageCaption || "University of Rochester Newscenter",
          date: published,
          type: "Shout-out",
          credit: searchName,
          details: "Official University of Rochester Newscenter item matched to " + searchName + "." +
            (excerpt ? "\n\n" + excerpt : "") +
            "\n\nOpen the original article and verify the claims and preferred image credit before drafting.",
          source: "University of Rochester Newscenter",
          score: 100 + relevanceBonus_(title)
        });
      }
    } catch (err) {
      console.warn("Rochester Newscenter search failed for " + searchName + ": " + err);
    }
    Utilities.sleep(150);
  }
  return out;
}

/**
 * Monitors each linked lab homepage plus a few same-site news/blog/publication
 * pages. The first run records a baseline; later content changes create a
 * review lead. No page content is published automatically.
 */
function discoverLabWebsiteUpdates_() {
  var props = PropertiesService.getScriptProperties();
  var out = [];
  var initialized = 0;
  var now = new Date();
  for (var f = 0; f < DISCOVERY_CONFIG.faculty.length; f++) {
    var faculty = DISCOVERY_CONFIG.faculty[f];
    if (!faculty.website) continue;
    try {
      var homeHtml = fetchText_(faculty.website);
      var pages = labPagesToMonitor_(faculty.website, homeHtml);
      for (var p = 0; p < pages.length; p++) {
        var pageUrl = pages[p];
        try {
          var html = pageUrl === faculty.website ? homeHtml : fetchText_(pageUrl);
          var normalized = normalizeMonitoredPage_(html);
          if (normalized.length < 80) continue;
          var hash = hashText_(normalized);
          var propertyKey = "LAB_PAGE_" + hashText_(pageUrl).slice(0, 28);
          var previous = props.getProperty(propertyKey);
          props.setProperty(propertyKey, hash);
          if (!previous) {
            initialized++;
            continue;
          }
          if (previous === hash) continue;
          var pageTitle = pageTitleFromHtml_(html) || hostName_(pageUrl);
          out.push({
            title: "Lab website updated: " + facultyDisplayName_(faculty) + " — " +
              truncate_(pageTitle, 90) + " (" + formatDisplayDate_(now) + ")",
            link: pageUrl,
            date: now,
            type: "Shout-out",
            credit: facultyDisplayName_(faculty) + " lab",
            details: "The monitored faculty/lab website changed since the previous daily check. " +
              "Open the page and look for a new award, publication, grant, team achievement, event, or research update before drafting. " +
              "Website changes can also be routine edits, so this is a review lead rather than a confirmed story.",
            source: hostName_(pageUrl),
            score: 65,
            allowRepeatUrl: true
          });
        } catch (pageError) {
          console.warn("Lab page check failed for " + pageUrl + ": " + pageError);
        }
      }
    } catch (siteError) {
      console.warn("Lab website check failed for " + facultyDisplayName_(faculty) + ": " + siteError);
    }
  }
  if (initialized) console.log("Lab website monitoring baseline initialized for " + initialized + " page(s).");
  return out;
}

function labPagesToMonitor_(homeUrl, html) {
  var pages = [homeUrl];
  var seen = {};
  var candidates = [];
  seen[normalizedUrl_(homeUrl)] = true;
  var anchorPattern = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  var match;
  var keywords = /news|award|honou?r|press|media|blog|update|publication|event|outreach|highlight/i;
  while ((match = anchorPattern.exec(html)) !== null) {
    var label = stripHtml_(match[2]) + " " + match[1];
    if (!keywords.test(label)) continue;
    var url = absoluteUrl_(match[1], homeUrl);
    var key = normalizedUrl_(url);
    if (!isSafePublicHttpUrl_(url) || !sameHost_(url, homeUrl) || seen[key]) continue;
    seen[key] = true;
    var priority = /news|award|honou?r|press|media|blog|update/i.test(label) ? 100 :
      (/event|outreach|highlight/i.test(label) ? 80 : 50);
    candidates.push({ url: url, priority: priority });
  }
  candidates.sort(function(a, b) { return b.priority - a.priority; });
  for (var i = 0; i < candidates.length && pages.length < DISCOVERY_CONFIG.maxLabPagesPerFaculty; i++) {
    pages.push(candidates[i].url);
  }
  return pages;
}

function normalizeMonitoredPage_(html) {
  return stripHtml_(String(html || "")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(script|style|noscript|svg)\b[\s\S]*?<\/\1>/gi, " "))
    .toLowerCase().replace(/\s+/g, " ").trim();
}

function hashText_(value) {
  var digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,
    String(value || ""), Utilities.Charset.UTF_8);
  return Utilities.base64EncodeWebSafe(digest).replace(/=+$/, "");
}

function pageTitleFromHtml_(html) {
  var ogTitle = metaContent_(html, ["og:title", "twitter:title"]);
  if (ogTitle) return stripHtml_(ogTitle);
  var match = String(html || "").match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match ? stripHtml_(match[1]) : "";
}

function textMentionsFaculty_(value, faculty) {
  var text = normalizeSearchText_(value);
  var variants = [faculty.name].concat(faculty.aliases || []);
  for (var i = 0; i < variants.length; i++) {
    var name = normalizeSearchText_(variants[i]);
    if (name && text.indexOf(name) >= 0) return true;
  }
  return false;
}

function normalizeSearchText_(value) {
  return removeDiacritics_(stripHtml_(value).toLowerCase())
    .replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

function facultyDisplayName_(faculty) {
  return (faculty.aliases && faculty.aliases[0]) || faculty.name;
}

function sameHost_(first, second) {
  return hostName_(first).toLowerCase() === hostName_(second).toLowerCase();
}

function normalizedUrl_(url) {
  return String(url || "").toLowerCase().replace(/#.*$/, "").replace(/\/$/, "");
}

function discoverFacultyPublications_(faculty) {
  try {
    var authorName = (faculty.aliases && faculty.aliases[0]) || faculty.name;
    var fromDate = dateDaysAgo_(DISCOVERY_CONFIG.publicationLookbackDays);
    var params = [
      "query.author=" + encodeURIComponent(authorName),
      "query.affiliation=" + encodeURIComponent("University of Rochester"),
      "filter=" + encodeURIComponent("from-pub-date:" + formatIsoDate_(fromDate)),
      "rows=100",
      "select=" + encodeURIComponent("DOI,title,author,published,published-online,published-print,issued,container-title,URL,score,publisher"),
      "sort=score",
      "order=desc"
    ];
    var email = PropertiesService.getScriptProperties().getProperty("DISCOVERY_CONTACT_EMAIL");
    if (email) params.push("mailto=" + encodeURIComponent(email));
    var url = "https://api.crossref.org/works?" + params.join("&");
    var payload = JSON.parse(fetchText_(url));
    var works = payload && payload.message && payload.message.items || [];
    var out = [];

    for (var i = 0; i < works.length && out.length < DISCOVERY_CONFIG.maxPublicationItemsPerFaculty; i++) {
      var work = works[i];
      if (!crossrefMatchesFaculty_(work, faculty)) continue;
      var title = work.title && work.title[0] || "";
      var doi = String(work.DOI || "").trim();
      if (!title || !doi) continue;
      var published = crossrefDate_(work);
      if (!isRecent_(published, DISCOVERY_CONFIG.publicationLookbackDays)) continue;
      var authors = crossrefAuthors_(work.author || []);
      var journal = work["container-title"] && work["container-title"][0] || work.publisher || "";
      out.push({
        title: stripHtml_(title),
        link: "https://doi.org/" + doi,
        date: published,
        type: "Paper",
        credit: authorName,
        details: "New publication discovered through Crossref.\n\nAuthors: " + authors +
          (journal ? "\nJournal: " + journal : "") + "\nDOI: " + doi +
          "\n\nVerify that the author is the Rochester faculty member and confirm the final publication status before drafting.",
        source: "Crossref",
        score: 95
      });
    }
    return out;
  } catch (err) {
    console.error("Publication discovery failed for " + faculty.name + ": " + err);
    return [];
  }
}

function saveDiscoveryCandidates_(candidates) {
  var sheet = getSheet_();
  var existing = existingDiscoveryKeys_(sheet);
  var unique = {};
  var prepared = [];
  var skipped = 0;

  for (var i = 0; i < candidates.length; i++) {
    var item = candidates[i];
    var keys = item.allowRepeatUrl ? discoveryKeys_(item.title, "") : discoveryKeys_(item.title, item.link);
    if (!item.title || !item.link || hasAnyKey_(existing, keys) || hasAnyKey_(unique, keys)) {
      skipped++;
      continue;
    }
    addKeys_(unique, keys);
    prepared.push(item);
  }

  prepared.sort(function(a, b) {
    var scoreDiff = Number(b.score || 0) - Number(a.score || 0);
    return scoreDiff || dateValue_(b.date) - dateValue_(a.date);
  });
  prepared = prepared.slice(0, DISCOVERY_CONFIG.maxNewItemsPerRun);

  var rows = [];
  var added = [];
  var imageLookups = 0;
  for (var j = 0; j < prepared.length; j++) {
    var candidate = prepared[j];
    var image = null;
    if (DISCOVERY_CONFIG.downloadThirdPartyImages && imageLookups < DISCOVERY_CONFIG.maxImageLookupsPerRun) {
      imageLookups++;
      image = downloadDiscoveryImage_(candidate);
    }
    var details = candidate.details;
    if (image) {
      details += "\n\nIMAGE CREDIT: " + image.credit +
        "\nIMAGE SOURCE: " + image.sourceUrl +
        "\nRIGHTS CHECK: Confirm the source's preferred photographer/creator credit and reuse terms before approval.";
      candidate.imageFileId = image.fileId;
      candidate.imageCredit = image.credit;
    }
    rows.push([
      new Date(), "Discovery Bot", truncate_(candidate.credit, 250), candidate.type,
      truncate_(candidate.title, 500), truncate_(details, 6000),
      formatDisplayDate_(candidate.date), "", "", truncate_(candidate.link, 1000),
      "", image ? image.driveUrl : "", image ? image.fileId : "", "", "New", Utilities.getUuid(), "", "", "", ""
    ]);
    added.push(candidate);
  }
  if (rows.length) {
    sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, HEADERS.length).setValues(rows);
  }
  return { added: added, skipped: skipped };
}

function downloadDiscoveryImage_(candidate) {
  try {
    var pageMeta = findArticleImageMetadata_(candidate.link);
    var imageUrl = absoluteUrl_(candidate.imageUrl || pageMeta.url || "", candidate.link);
    if (!imageUrl || !isSafePublicHttpUrl_(imageUrl)) return null;

    var response = fetchResponse_(imageUrl);
    var blob = response.getBlob();
    var mime = String(blob.getContentType() || response.getHeaders()["Content-Type"] || "")
      .toLowerCase().split(";")[0];
    if (!/^image\/(jpeg|png|webp)$/.test(mime)) {
      if (/\.png(?:[?#]|$)/i.test(imageUrl)) mime = "image/png";
      else if (/\.webp(?:[?#]|$)/i.test(imageUrl)) mime = "image/webp";
      else if (/\.jpe?g(?:[?#]|$)/i.test(imageUrl)) mime = "image/jpeg";
      else return null;
    }

    var bytes = blob.getBytes();
    if (!bytes.length || bytes.length > DISCOVERY_CONFIG.maxImageBytes) return null;
    var ext = mime === "image/png" ? ".png" : (mime === "image/webp" ? ".webp" : ".jpg");
    var name = safeFileName_(truncate_(candidate.title, 120) || "discovery-image") + ext;
    blob.setContentType(mime).setName(name);

    var folder = getFolder_(DISCOVERY_CONFIG.imageFolderName);
    var file = folder.createFile(blob);
    var credit = pageMeta.credit || pageMeta.siteName || candidate.imageCredit || hostName_(imageUrl);
    file.setDescription("Auto-downloaded preview image for review only.\nArticle: " + candidate.link +
      "\nImage source: " + imageUrl + "\nCredit/source: " + credit);
    return {
      fileId: file.getId(),
      driveUrl: file.getUrl(),
      sourceUrl: imageUrl,
      credit: credit
    };
  } catch (err) {
    console.warn("No usable preview image for " + candidate.link + ": " + err);
    return null;
  }
}

function findArticleImageMetadata_(articleUrl) {
  if (!articleUrl || !isSafePublicHttpUrl_(articleUrl)) return { url: "", credit: "", siteName: "" };
  try {
    var html = fetchText_(articleUrl);
    var image = metaContent_(html, ["og:image:secure_url", "og:image", "twitter:image"]);
    var siteName = metaContent_(html, ["og:site_name", "application-name"]);
    var credit = metaContent_(html, ["image:credit", "twitter:image:credit"]);
    if (!credit) {
      var creditMatch = html.match(/["']creditText["']\s*:\s*["']([^"']+)["']/i) ||
        html.match(/["']copyrightNotice["']\s*:\s*["']([^"']+)["']/i);
      credit = creditMatch ? decodeHtml_(creditMatch[1]) : "";
    }
    if (!credit) {
      var captionMatch = html.match(/<figcaption[^>]*>([\s\S]{0,1500}?)<\/figcaption>/i);
      var caption = captionMatch ? stripHtml_(captionMatch[1]) : "";
      var labeledCredit = caption.match(/(?:image|photo|credit)\s*(?:by|:)\s*([^|;]{2,160})/i);
      var parentheticalCredit = caption.match(/\(([^()]{2,120})\)\s*$/);
      credit = labeledCredit ? labeledCredit[1].trim() :
        (parentheticalCredit ? parentheticalCredit[1].trim() : "");
    }
    var baseMatch = html.match(/<base[^>]+href=["']([^"']+)["']/i);
    image = image ? absoluteUrl_(image, baseMatch ? baseMatch[1] : articleUrl) : "";
    return { url: image, credit: stripHtml_(credit), siteName: stripHtml_(siteName) };
  } catch (err) {
    console.warn("Article did not expose readable image metadata for " + articleUrl + ": " + err);
    return { url: "", credit: "", siteName: "" };
  }
}

function metaContent_(html, names) {
  for (var i = 0; i < names.length; i++) {
    var escaped = names[i].replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    var first = new RegExp("<meta[^>]+(?:property|name)=[\\\"']" + escaped +
      "[\\\"'][^>]+content=[\\\"']([^\\\"']+)[\\\"']", "i");
    var second = new RegExp("<meta[^>]+content=[\\\"']([^\\\"']+)[\\\"'][^>]+(?:property|name)=[\\\"']" +
      escaped + "[\\\"']", "i");
    var match = html.match(first) || html.match(second);
    if (match) return decodeHtml_(match[1]);
  }
  return "";
}

function existingDiscoveryKeys_(sheet) {
  var keys = {};
  if (sheet.getLastRow() < 2) return keys;
  var rows = sheet.getRange(2, 5, sheet.getLastRow() - 1, 6).getValues();
  for (var i = 0; i < rows.length; i++) {
    addKeys_(keys, discoveryKeys_(rows[i][0], rows[i][5]));
  }
  return keys;
}

function discoveryKeys_(title, link) {
  var normalizedTitle = String(title || "").toLowerCase()
    .replace(/\s+-\s+[^-]{2,80}$/, "")
    .replace(/[^a-z0-9]+/g, " ").trim();
  var normalizedLink = String(link || "").toLowerCase()
    .replace(/^https?:\/\/(www\.)?/, "").replace(/[?#].*$/, "").replace(/\/$/, "");
  var keys = [];
  if (normalizedTitle) keys.push("title:" + normalizedTitle);
  if (normalizedLink) keys.push("url:" + normalizedLink);
  return keys;
}

function hasAnyKey_(map, keys) {
  for (var i = 0; i < keys.length; i++) if (map[keys[i]]) return true;
  return false;
}

function addKeys_(map, keys) {
  for (var i = 0; i < keys.length; i++) map[keys[i]] = true;
}

function crossrefMatchesFaculty_(work, faculty) {
  var expectedName = (faculty.aliases && faculty.aliases[0]) || faculty.name;
  var expectedFirst = removeDiacritics_(String(expectedName).trim().split(/\s+/)[0].toLowerCase());
  var expectedLast = facultyLastName_(faculty).toLowerCase();
  var authors = work.author || [];
  var matchedAuthor = null;
  for (var i = 0; i < authors.length; i++) {
    var family = removeDiacritics_(String(authors[i].family || "").toLowerCase());
    var given = removeDiacritics_(String(authors[i].given || "").toLowerCase());
    if (family === removeDiacritics_(expectedLast) &&
        (given === expectedFirst || given.indexOf(expectedFirst + " ") === 0 || given.indexOf(expectedFirst + ".") === 0)) {
      matchedAuthor = authors[i];
      break;
    }
  }
  if (!matchedAuthor) return false;

  var affiliations = matchedAuthor.affiliation || [];
  if (affiliations.length) {
    for (var j = 0; j < affiliations.length; j++) {
      if (/university of rochester|rochester,?\s*(ny|new york)/i.test(affiliations[j].name || "")) return true;
    }
    return false;
  }

  // Publisher deposits often omit affiliations. In that case, require the
  // exact name plus a department-relevant title/journal term to avoid
  // namesake matches such as unrelated software or biomedical researchers.
  return publicationTopicMatches_(work, faculty);
}

function publicationTopicMatches_(work, faculty) {
  var title = work.title && work.title[0] || "";
  var journal = work["container-title"] && work["container-title"][0] || work.publisher || "";
  var text = stripHtml_(title + " " + journal).toLowerCase();
  var terms = faculty.publicationTerms || [];
  for (var i = 0; i < terms.length; i++) {
    if (text.indexOf(String(terms[i]).toLowerCase()) >= 0) return true;
  }
  return false;
}

function crossrefAuthors_(authors) {
  var names = [];
  for (var i = 0; i < authors.length && i < 20; i++) {
    names.push([authors[i].given, authors[i].family].filter(String).join(" "));
  }
  if (authors.length > 20) names.push("et al.");
  return names.join(", ");
}

function crossrefDate_(work) {
  var value = work["published-online"] || work["published-print"] || work.published || work.issued;
  var parts = value && value["date-parts"] && value["date-parts"][0];
  if (!parts || !parts.length) return new Date(0);
  return new Date(Number(parts[0]), Number(parts[1] || 1) - 1, Number(parts[2] || 1));
}

function sendDiscoveryDigest_(items, skipped) {
  var email = PropertiesService.getScriptProperties().getProperty("NOTIFICATION_EMAIL");
  if (!email) return;
  var lines = [];
  for (var i = 0; i < items.length; i++) {
    lines.push("<li><b>" + html_(items[i].title) + "</b> — " + html_(items[i].source || "Source") +
      " [<a href=\"" + html_(items[i].link) + "\">source</a>]</li>");
  }
  var sheetUrl = getSheet_().getParent().getUrl();
  MailApp.sendEmail({
    to: email,
    subject: items.length + " new UR ChemE content lead" + (items.length === 1 ? "" : "s"),
    body: items.length + " new content leads were added to the review queue. Open the sheet: " + sheetUrl,
    htmlBody: "<p>Faculty discovery added <b>" + items.length + "</b> item" +
      (items.length === 1 ? "" : "s") + " to the New review queue.</p><ul>" + lines.join("") +
      "</ul><p><a href=\"" + html_(sheetUrl) + "\">Open the private review sheet</a></p>" +
      (skipped ? "<p style=\"color:#777\">" + skipped + " duplicate or incomplete result(s) were skipped.</p>" : ""),
    name: "UR ChemE Faculty Discovery"
  });
}

function fetchText_(url) {
  return fetchResponse_(url).getContentText();
}

function fetchResponse_(url) {
  if (!isSafePublicHttpUrl_(url)) throw new Error("Unsafe or unsupported URL: " + url);
  var response;
  for (var attempt = 0; attempt < 3; attempt++) {
    response = UrlFetchApp.fetch(url, {
      muteHttpExceptions: true,
      followRedirects: true,
      headers: { "User-Agent": "UR-ChemE-Content-Discovery/1.0" }
    });
    var code = response.getResponseCode();
    if (code >= 200 && code < 300) return response;
    if (code !== 429 && code < 500) break;
    Utilities.sleep((attempt + 1) * 3000);
  }
  throw new Error("HTTP " + response.getResponseCode() + " for " + url);
}

function isSafePublicHttpUrl_(url) {
  var match = String(url || "").match(/^https?:\/\/([^\/?#]+)/i);
  if (!match) return false;
  var host = match[1].replace(/:\d+$/, "").replace(/^\[|\]$/g, "").toLowerCase();
  if (host.indexOf("@") >= 0 || host.indexOf(":") >= 0) return false;
  if (host === "localhost" || /(^|\.)localhost$/.test(host) || /\.(local|internal)$/.test(host) ||
      host === "metadata.google.internal" || host === "::1") return false;
  if (/^(0|10|127|169\.254|192\.168)\./.test(host)) return false;
  var private172 = host.match(/^172\.(\d{1,3})\./);
  if (private172 && Number(private172[1]) >= 16 && Number(private172[1]) <= 31) return false;
  return true;
}

function hostName_(url) {
  var match = String(url || "").match(/^https?:\/\/([^\/?#]+)/i);
  return match ? match[1].replace(/^www\./i, "") : "Original source";
}

function stripHtml_(value) {
  return decodeHtml_(String(value || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
}

function decodeHtml_(value) {
  return String(value || "")
    .replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ")
    .replace(/&#x([0-9a-f]+);/gi, function(_, n) { return String.fromCharCode(parseInt(n, 16)); })
    .replace(/&#(\d+);/g, function(_, n) { return String.fromCharCode(Number(n)); });
}

function absoluteUrl_(href, base) {
  href = decodeHtml_(String(href || "").trim());
  if (!href) return "";
  if (/^https?:\/\//i.test(href)) return href;
  if (/^\/\//.test(href)) {
    var protocol = String(base || "").match(/^https?:/i);
    return (protocol ? protocol[0] : "https:") + href;
  }
  var origin = String(base).match(/^https?:\/\/[^/]+/i);
  if (!origin) return href;
  if (href.charAt(0) === "/") return origin[0] + href;
  return String(base).replace(/[^/]*$/, "") + href;
}

function relevanceBonus_(title) {
  var t = String(title || "").toLowerCase();
  if (/award|honou?r|fellow|medal|prize|wins?|named/.test(t)) return 25;
  if (/grant|funding|million|foundation|nsf|department of energy/.test(t)) return 20;
  if (/research|study|discover|publication|paper|journal/.test(t)) return 15;
  return 0;
}

function facultyLastName_(faculty) {
  var name = (faculty.aliases && faculty.aliases[0]) || faculty.name;
  var parts = String(name).trim().split(/\s+/);
  return parts[parts.length - 1];
}

function removeDiacritics_(value) {
  return String(value || "").replace(/[üÜ]/g, "u").replace(/[öÖ]/g, "o")
    .replace(/[äÄ]/g, "a").replace(/[éÉ]/g, "e");
}

function isRecent_(date, days) {
  var value = dateValue_(date);
  return value && value >= dateDaysAgo_(days).getTime() && value <= Date.now() + 86400000;
}

function dateDaysAgo_(days) {
  return new Date(Date.now() - Number(days || 0) * 86400000);
}

function dateValue_(date) {
  var value = date instanceof Date ? date.getTime() : new Date(date).getTime();
  return isNaN(value) ? 0 : value;
}

function formatIsoDate_(date) {
  return Utilities.formatDate(date, "Etc/UTC", "yyyy-MM-dd");
}

function formatDisplayDate_(date) {
  return dateValue_(date) ? Utilities.formatDate(new Date(date), Session.getScriptTimeZone(), "MMM d, yyyy") : "";
}

function truncate_(value, max) {
  return String(value || "").trim().slice(0, max || 1000);
}
