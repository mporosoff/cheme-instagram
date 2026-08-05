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
  facultyRosterUrl: "https://www.hajim.rochester.edu/che/people/faculty/index.html",
  departmentNewsUrl: "https://www.hajim.rochester.edu/che/news-events/news/index.html",
  rochesterNewsApiUrl: "https://www.rochester.edu/newscenter/wp-json/wp/v2/posts",
  departmentNewsTerms: [
    "chemical and sustainability engineering",
    "chemical sustainability engineering",
    "chemical engineering"
  ],
  departmentMonitoredPages: [
    { label: "Department events", url: "https://www.hajim.rochester.edu/che/news-events/events/index.html", type: "Event", score: 115, emitOnFirstRun: true },
    { label: "Department seminar series", url: "https://www.hajim.rochester.edu/che/news-events/currentyear.html", type: "Event", score: 115, emitOnFirstRun: true }
  ],
  rochesterNewsTagSlugs: ["department-of-chemical-and-sustainability-engineering"],
  newsLookbackDays: 45,
  publicationLookbackDays: 120,
  maxNewsItemsTotal: 100,
  maxDepartmentNewscenterItemsPerTerm: 100,
  maxNewscenterItemsPerTag: 100,
  maxNewscenterItemsPerTerm: 20,
  maxNewscenterItemsPerFaculty: 40,
  monitorLabWebsites: true,
  maxPublicationItemsPerFaculty: 20,
  crossrefRowsPerQuery: 100,
  crossrefPauseMs: 250,
  publicationTypes: ["journal-article", "book-chapter"],
  maxNewItemsPerRun: 25,
  downloadThirdPartyImages: true,
  maxImageLookupsPerRun: 25,
  maxImageBackfillsPerRun: 25,
  maxImageBytes: 8 * 1024 * 1024,
  imageFolderName: "UR ChemE IG Discovery Media",
  sendDailySourceDigest: true,
  triggerHour: 7,
  faculty: [
    {
      name: "Mitchell Anthamatten", orcid: "0000-0002-7763-9465",
      monitorUrls: ["https://www.hajim.rochester.edu/che/people/faculty/anthamatten_mitchell/index.html"],
      newsTerms: ["Anthamatten Research Group"],
      publicationTerms: ["polymer", "macromolecular", "self-assembly", "resin", "elastomer", "nanostruct", "optoelectronic", "vapor deposition"]
    },
    {
      name: "Yasemin Basdogan", orcid: "0000-0002-2071-9675",
      monitorUrls: ["https://www.basdoganlab.com/", "https://www.basdoganlab.com/blank-2"],
      newsTerms: ["Basdogan Lab"],
      publicationTerms: ["machine learning", "molecular dynamics", "quantum chemistry", "materials", "polymer", "catalys"]
    },
    {
      name: "Pooja Rajendra Bhalode", aliases: ["Pooja Bhalode"], orcid: "0000-0003-4531-011X",
      monitorUrls: ["https://sites.google.com/view/pooja-bhalode/", "https://sites.google.com/view/pooja-bhalode/publications"],
      newsTerms: ["Multiscale Systems Engineering Lab"],
      publicationTerms: ["process systems", "multiscale", "powder flow", "hybrid model", "extraction", "sustainab"]
    },
    {
      name: "Siddharth Deshpande", orcid: "0000-0001-9471-9080",
      monitorUrls: ["https://www.atomicinterfaces.org/", "https://www.atomicinterfaces.org/research-highlights", "https://www.atomicinterfaces.org/publications"],
      newsTerms: ["Atomic Interfaces", "Deshpande group"],
      publicationTerms: ["interface", "atomistic", "catalys", "electrocatal", "battery", "propane", "propylene", "machine learning"]
    },
    {
      name: "Gang Fan", orcid: "0000-0002-4185-5692",
      monitorUrls: ["https://www.gangfanclub.com/", "https://www.gangfanclub.com/publications", "https://www.gangfanclub.com/lab-events", "https://www.gangfanclub.com/outreach"],
      newsTerms: ["Gang Fan Lab", "Gang Fan Club", "The Fan Club"],
      publicationTerms: ["polymer", "catalys", "plastic", "upcycl", "bioelectro", "biosensor", "synthetic biology", "metabolic", "remediation"]
    },
    {
      name: "David G. Foster", aliases: ["David Foster"], orcid: "0000-0003-1837-2112",
      monitorUrls: ["https://www.sas.rochester.edu/che/sites/dafoster/", "https://www.sas.rochester.edu/che/sites/dafoster/publications/"],
      newsTerms: ["University of Rochester CFD", "Foster CFD Group"],
      publicationTerms: ["transport", "fluid", "cancer cell", "nanoparticle", "microtube", "chemical engineering education"]
    },
    {
      name: "Melodie I. Lawton", aliases: ["Melodie Lawton"], orcid: "0000-0001-5267-3766",
      monitorUrls: ["https://www.hajim.rochester.edu/che/people/faculty/lawton-melodie/index.html"],
      publicationTerms: ["shape memory", "polymer", "composite", "biomaterial", "drug delivery", "degradation"]
    },
    {
      name: "Darren Lipomi", orcid: "0000-0002-5808-7765",
      monitorUrls: ["https://www.lipomigroup.org/", "https://www.lipomigroup.org/blog", "https://www.lipomigroup.org/outreach", "https://www.lipomigroup.org/pubs"],
      newsTerms: ["Lipomi Research Group", "Lipomi Group"],
      publicationTerms: ["polymer", "semiconductor", "electronic", "wearable", "flexible", "pedot", "nanoengineering", "chemical education", "ai tutor"]
    },
    {
      name: "Allison J. Lopatkin", aliases: ["Allison Lopatkin"], orcid: "0000-0003-0018-9205",
      monitorUrls: ["https://lopatkinlab.com/index.html", "https://lopatkinlab.com/publications.html"],
      newsTerms: ["Lopatkin Lab"],
      publicationTerms: ["antibiotic", "plasmid", "microbial", "bacteria", "metabolic", "synthetic biology", "horizontal gene", "resistance"]
    },
    {
      name: "Astrid M. Müller", aliases: ["Astrid Mueller", "Astrid Müller"], orcid: "0000-0002-2785-6808",
      monitorUrls: ["https://astridmuellergroup.org/", "https://astridmuellergroup.org/2018/08/01/august-2018/", "https://astridmuellergroup.org/publications/"],
      newsTerms: ["Astrid Mueller Group", "Müller Group", "Mueller Group"],
      publicationTerms: ["pfas", "electro", "carbon dioxide", "oxidation", "reduction", "nanomaterial", "laser"]
    },
    {
      name: "Marc D. Porosoff", aliases: ["Marc Porosoff"], orcid: "0000-0003-3066-0029",
      monitorUrls: ["https://www.porosoffresearchgroup.com/", "https://www.porosoffresearchgroup.com/news.html", "https://www.porosoffresearchgroup.com/publications.html", "https://www.porosoffresearchgroup.com/teaching.html"],
      newsTerms: ["Porosoff Research Group", "Porosoff Group"],
      publicationTerms: ["catalys", "carbon dioxide", "co2", "tungsten carbide", "optimization", "methanol", "reactive separation", "machine learning", "language model"]
    },
    {
      name: "Alexander A. Shestopalov", aliases: ["Alexander Shestopalov"], orcid: "0000-0002-5153-7604",
      monitorUrls: ["https://www.hajim.rochester.edu/che/sites/shestopalov/index.html", "https://www.hajim.rochester.edu/che/sites/shestopalov/news-events/index.html", "https://www.hajim.rochester.edu/che/sites/shestopalov/publications/index.html"],
      newsTerms: ["Shestopalov Research Group", "Shestopalov Group"],
      publicationTerms: ["surface", "interface", "pattern", "nanostruct", "deposition", "monolayer"]
    },
    {
      name: "Wyatt E. Tenhaeff", aliases: ["Wyatt Tenhaeff"], orcid: "0000-0001-7132-3171",
      monitorUrls: ["https://tenhaeff.weebly.com/", "https://tenhaeff.weebly.com/publications.html"],
      newsTerms: ["Tenhaeff Research Group", "Tenhaeff Labs", "Tenhaeff Group"],
      publicationTerms: ["battery", "lithium", "electrochemical", "polymer", "thin film", "energy storage", "deposition"]
    },
    {
      name: "Matthew Z. Yates", aliases: ["Matthew Yates"], orcid: "0000-0002-5588-2413",
      monitorUrls: ["https://www.hajim.rochester.edu/che/people/faculty/yates_matthew/index.html"],
      publicationTerms: ["surface", "coating", "electrochem", "sensor", "spectroscopy", "raman", "polymer", "waveguide", "hardware"]
    }
  ]
};

var DISCOVERY_RUN_REPORT_ = [];

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
    DISCOVERY_RUN_REPORT_ = [];
    var candidates = [];
    candidates = candidates.concat(discoverFacultyRosterCoverage_());
    candidates = candidates.concat(discoverDepartmentNews_());
    candidates = candidates.concat(discoverMonitoredDepartmentPages_());
    candidates = candidates.concat(discoverRochesterDepartmentTagNews_());
    candidates = candidates.concat(discoverRochesterDepartmentNewscenter_());
    candidates = candidates.concat(discoverRochesterNewscenter_());
    if (DISCOVERY_CONFIG.monitorLabWebsites) candidates = candidates.concat(discoverLabWebsiteUpdates_());

    for (var i = 0; i < DISCOVERY_CONFIG.faculty.length; i++) {
      var faculty = DISCOVERY_CONFIG.faculty[i];
      candidates = candidates.concat(discoverFacultyPublications_(faculty));
    }

    var result = saveDiscoveryCandidates_(candidates);
    recordDiscoverySource_("Images", "Automatic source images", "OK", result.imageLookups,
      result.imagesAdded, result.imageLookups - result.imagesAdded + " candidate(s) had no usable source image");
    recordDiscoverySource_("Queue", "Review queue", "OK", candidates.length, result.added.length,
      result.skipped + " duplicate/incomplete; " + result.deferred + " deferred by the per-run limit");
    if (result.added.length || DISCOVERY_CONFIG.sendDailySourceDigest) {
      sendDiscoveryDigest_(result.added, result.skipped, result.deferred, DISCOVERY_RUN_REPORT_);
    }
    console.log(JSON.stringify(result));
    return {
      ok: true,
      added: result.added.length,
      skipped: result.skipped,
      deferred: result.deferred,
      sources: DISCOVERY_RUN_REPORT_
    };
  } finally {
    lock.releaseLock();
  }
}

/** Warns in the daily source table if the official core-faculty roster drifts. */
function discoverFacultyRosterCoverage_() {
  try {
    var html = fetchText_(DISCOVERY_CONFIG.facultyRosterUrl);
    var rosterNames = [];
    var seen = {};
    var pattern = /<h4\b[^>]*class=["'][^"']*\bname\b[^"']*["'][^>]*>[\s\S]{0,300}?<a\b[^>]*>([\s\S]*?)<\/a>[\s\S]{0,80}?<\/h4>/gi;
    var match;
    while ((match = pattern.exec(html)) !== null) {
      var listed = stripHtml_(match[1]);
      if (listed.indexOf(",") >= 0) {
        var parts = listed.split(",");
        listed = parts.slice(1).join(" ").trim() + " " + parts[0].trim();
      }
      var rosterKey = facultyFirstLastKey_(listed);
      if (rosterKey && !seen[rosterKey]) {
        seen[rosterKey] = true;
        rosterNames.push(listed);
      }
    }
    if (!rosterNames.length) throw new Error("No core-faculty names could be parsed");

    var configured = {};
    for (var f = 0; f < DISCOVERY_CONFIG.faculty.length; f++) {
      configured[facultyFirstLastKey_(DISCOVERY_CONFIG.faculty[f].name)] = DISCOVERY_CONFIG.faculty[f].name;
    }
    var unconfigured = [];
    for (var r = 0; r < rosterNames.length; r++) {
      if (!configured[facultyFirstLastKey_(rosterNames[r])]) unconfigured.push(rosterNames[r]);
    }
    var noLongerListed = [];
    for (var key in configured) {
      if (Object.prototype.hasOwnProperty.call(configured, key) && !seen[key]) noLongerListed.push(configured[key]);
    }
    var notes = [];
    if (unconfigured.length) notes.push("Official roster not configured: " + unconfigured.join(", "));
    if (noLongerListed.length) notes.push("Configured but absent from official roster: " + noLongerListed.join(", "));
    recordDiscoverySource_("Department", "Core faculty roster", notes.length ? "Warning" : "OK",
      rosterNames.length, DISCOVERY_CONFIG.faculty.length - noLongerListed.length,
      notes.length ? notes.join(" | ") : "Configured roster matches the official core-faculty list");
  } catch (err) {
    console.warn("Faculty roster coverage check failed: " + err);
    recordDiscoverySource_("Department", "Core faculty roster", "Error", 0, 0, String(err));
  }
  return [];
}

function facultyFirstLastKey_(name) {
  var words = normalizeSearchText_(name).split(/\s+/).filter(String);
  return words.length ? words[0] + " " + words[words.length - 1] : "";
}

function discoverDepartmentNews_() {
  try {
    var html = fetchText_(DISCOVERY_CONFIG.departmentNewsUrl);
    var out = [];
    var parsed = 0;
    var months = "January|February|March|April|May|June|July|August|September|October|November|December";
    var itemPattern = new RegExp("(?:Latest News\\s*)?((?:" + months + ")\\s+\\d{1,2},\\s+\\d{4})" +
      "[\\s\\S]{0,800}?<h3[^>]*>[\\s\\S]{0,300}?<a[^>]+href=[\\\"']([^\\\"']+)[\\\"'][^>]*>([\\s\\S]*?)<\\/a>", "gi");
    var match;
    while ((match = itemPattern.exec(html)) !== null) {
      parsed++;
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
    recordDiscoverySource_("Department", "Recent news page", "OK", parsed, out.length, "");
    return out;
  } catch (err) {
    console.error("Department news discovery failed: " + err);
    recordDiscoverySource_("Department", "Recent news page", "Error", 0, 0, String(err));
    return [];
  }
}

/** Monitors official department event/seminar listings with a retry-safe hash. */
function discoverMonitoredDepartmentPages_() {
  var props = PropertiesService.getScriptProperties();
  var pages = DISCOVERY_CONFIG.departmentMonitoredPages || [];
  var out = [];
  for (var i = 0; i < pages.length; i++) {
    var page = pages[i];
    try {
      var html = fetchText_(page.url);
      var snapshot = monitoredPageSnapshot_(page.url, html, props);
      if (!snapshot) {
        recordDiscoverySource_("Department", page.label, "Warning", 1, 0, "Page text was too short to monitor");
        continue;
      }
      if (!snapshot.previous && !page.emitOnFirstRun) {
        props.setProperty(snapshot.propertyKey, snapshot.hash);
        recordDiscoverySource_("Department", page.label, "Baseline", 1, 0, "Initial baseline stored");
        continue;
      }
      if (snapshot.previous === snapshot.hash) {
        recordDiscoverySource_("Department", page.label, "OK", 1, 0, "No page change");
        continue;
      }
      var initial = !snapshot.previous;
      out.push({
        title: (initial ? "Review current " : "Updated ") + page.label + " — " + formatDisplayDate_(new Date()),
        link: page.url,
        date: new Date(),
        type: page.type || "Event",
        credit: "UR Chemical and Sustainability Engineering",
        details: (initial ? "Initial review of the current official listing. " : "The official listing changed since the previous successful review. ") +
          "Open the page and check for seminars, defenses, lectures, student presentations, or other events suitable for Instagram.",
        source: hostName_(page.url),
        score: Number(page.score || 110),
        allowRepeatUrl: true,
        monitorState: snapshot
      });
      recordDiscoverySource_("Department", page.label, initial ? "Baseline lead" : "Changed", 1, 1,
        initial ? "Initial listing queued for review" : "Page change queued for review");
    } catch (err) {
      console.warn(page.label + " discovery failed: " + err);
      recordDiscoverySource_("Department", page.label, "Error", 0, 0, String(err));
    }
  }
  return out;
}

/** Pulls posts carrying the official Newscenter department tag. */
function discoverRochesterDepartmentTagNews_() {
  var out = [];
  var seen = {};
  var slugs = DISCOVERY_CONFIG.rochesterNewsTagSlugs || [];
  var fromDate = dateDaysAgo_(DISCOVERY_CONFIG.newsLookbackDays).toISOString();
  for (var s = 0; s < slugs.length; s++) {
    var slug = slugs[s];
    var checked = 0;
    var found = 0;
    try {
      var tagUrl = DISCOVERY_CONFIG.rochesterNewsApiUrl.replace(/\/posts$/, "/tags") +
        "?slug=" + encodeURIComponent(slug);
      var tags = JSON.parse(fetchText_(tagUrl)) || [];
      if (!tags.length) {
        recordDiscoverySource_("Newscenter tag", slug, "Warning", 0, 0, "Tag slug was not found");
        continue;
      }
      for (var t = 0; t < tags.length; t++) {
        var postsUrl = DISCOVERY_CONFIG.rochesterNewsApiUrl +
          "?tags=" + encodeURIComponent(tags[t].id) +
          "&after=" + encodeURIComponent(fromDate) +
          "&per_page=" + DISCOVERY_CONFIG.maxNewscenterItemsPerTag +
          "&orderby=date&order=desc&_embed=1";
        var posts = JSON.parse(fetchText_(postsUrl)) || [];
        checked += posts.length;
        for (var p = 0; p < posts.length && out.length < DISCOVERY_CONFIG.maxNewsItemsTotal; p++) {
          var post = posts[p];
          var linkKey = normalizedUrl_(post.link || "");
          if (!linkKey || seen[linkKey]) continue;
          var candidate = newscenterCandidateFromPost_(post,
            "UR Chemical and Sustainability Engineering",
            "Official University of Rochester Newscenter item carrying the department tag.", 110);
          if (!candidate) continue;
          seen[linkKey] = true;
          out.push(candidate);
          found++;
        }
      }
      recordDiscoverySource_("Newscenter tag", slug, "OK", checked, found, "");
    } catch (err) {
      console.warn("Rochester Newscenter tag search failed for " + slug + ": " + err);
      recordDiscoverySource_("Newscenter tag", slug, "Error", checked, found, String(err));
    }
    Utilities.sleep(150);
  }
  return out;
}

/**
 * Searches Newscenter for department language, independent of faculty names.
 * This captures student, alumni, program, and team stories that identify the
 * department or major but do not mention an individual configured faculty member.
 */
function discoverRochesterDepartmentNewscenter_() {
  var out = [];
  var seen = {};
  var fromDate = dateDaysAgo_(DISCOVERY_CONFIG.newsLookbackDays).toISOString();
  var terms = DISCOVERY_CONFIG.departmentNewsTerms || [];

  for (var t = 0; t < terms.length; t++) {
    var term = terms[t];
    var checked = 0;
    var found = 0;
    var url = DISCOVERY_CONFIG.rochesterNewsApiUrl +
      "?search=" + encodeURIComponent(term) +
      "&after=" + encodeURIComponent(fromDate) +
      "&per_page=" + DISCOVERY_CONFIG.maxDepartmentNewscenterItemsPerTerm +
      "&orderby=date&order=desc&_embed=1";
    try {
      var posts = JSON.parse(fetchText_(url)) || [];
      checked = posts.length;
      for (var i = 0; i < posts.length && out.length < DISCOVERY_CONFIG.maxNewsItemsTotal; i++) {
        var post = posts[i];
        var title = stripHtml_(post.title && post.title.rendered || "");
        var body = [title, post.excerpt && post.excerpt.rendered, post.content && post.content.rendered].join(" ");
        if (!textMentionsDepartment_(body)) continue;
        var linkKey = normalizedUrl_(post.link || "");
        if (!linkKey || seen[linkKey]) continue;
        var candidate = newscenterCandidateFromPost_(post,
          "UR Chemical and Sustainability Engineering",
          "Official University of Rochester Newscenter item matched to department language (\"" + term +
            "\"). This may feature a student, alumnus, program, team, or faculty member.", 105);
        if (!candidate) continue;
        seen[linkKey] = true;
        out.push(candidate);
        found++;
      }
      recordDiscoverySource_("Newscenter phrase", term, "OK", checked, found, "");
    } catch (err) {
      console.warn("Rochester Newscenter department search failed for " + term + ": " + err);
      recordDiscoverySource_("Newscenter phrase", term, "Error", checked, found, String(err));
    }
    Utilities.sleep(150);
  }
  return out;
}

/** Searches the official University Newscenter article body for each faculty name. */
function discoverRochesterNewscenter_() {
  var out = [];
  var fromDate = dateDaysAgo_(DISCOVERY_CONFIG.newsLookbackDays).toISOString();
  for (var f = 0; f < DISCOVERY_CONFIG.faculty.length; f++) {
    var faculty = DISCOVERY_CONFIG.faculty[f];
    var searchTerms = facultyNewsSearchTerms_(faculty);
    var facultySeen = {};
    var facultyFound = 0;
    var checked = 0;
    var errors = [];
    for (var s = 0; s < searchTerms.length; s++) {
      var searchTerm = searchTerms[s];
      var url = DISCOVERY_CONFIG.rochesterNewsApiUrl +
        "?search=" + encodeURIComponent(searchTerm) +
        "&after=" + encodeURIComponent(fromDate) +
        "&per_page=" + DISCOVERY_CONFIG.maxNewscenterItemsPerTerm +
        "&orderby=date&order=desc&_embed=1";
      try {
        var posts = JSON.parse(fetchText_(url)) || [];
        checked += posts.length;
        for (var i = 0; i < posts.length && facultyFound < DISCOVERY_CONFIG.maxNewscenterItemsPerFaculty; i++) {
          var post = posts[i];
          var title = stripHtml_(post.title && post.title.rendered || "");
          var body = [title, post.excerpt && post.excerpt.rendered, post.content && post.content.rendered].join(" ");
          if (!textMentionsFaculty_(body, faculty)) continue;
          var linkKey = normalizedUrl_(post.link || "");
          if (!linkKey || facultySeen[linkKey]) continue;
          var candidate = newscenterCandidateFromPost_(post, facultyDisplayName_(faculty),
            "Official University of Rochester Newscenter item matched through faculty/lab search term \"" +
              searchTerm + "\".", 100);
          if (!candidate) continue;
          facultySeen[linkKey] = true;
          out.push(candidate);
          facultyFound++;
        }
      } catch (err) {
        errors.push(searchTerm + ": " + err);
        console.warn("Rochester Newscenter search failed for " + searchTerm + ": " + err);
      }
      Utilities.sleep(150);
    }
    recordDiscoverySource_("Newscenter faculty", facultyDisplayName_(faculty),
      errors.length ? "Warning" : "OK", checked, facultyFound, errors.join(" | "));
  }
  return out;
}

function facultyNewsSearchTerms_(faculty) {
  return uniqueStrings_([faculty.name].concat(faculty.aliases || [], faculty.newsTerms || []));
}

function newscenterCandidateFromPost_(post, credit, detailsPrefix, score) {
  var title = stripHtml_(post.title && post.title.rendered || "");
  var link = post.link || "";
  var published = post.date_gmt ? new Date(post.date_gmt + "Z") : new Date(post.date || "");
  if (!title || !link || !isRecent_(published, DISCOVERY_CONFIG.newsLookbackDays)) return null;
  var embedded = post._embedded || {};
  var media = embedded["wp:featuredmedia"] && embedded["wp:featuredmedia"][0] || {};
  var imageUrl = media.source_url || "";
  var imageCaption = stripHtml_(media.caption && media.caption.rendered || "");
  var excerpt = truncate_(stripHtml_(post.excerpt && post.excerpt.rendered || ""), 700);
  return {
    title: title,
    link: link,
    imageUrl: imageUrl,
    imageCredit: imageCaption || "University of Rochester Newscenter",
    date: published,
    type: "Shout-out",
    credit: credit,
    details: detailsPrefix + (excerpt ? "\n\n" + excerpt : "") +
      "\n\nOpen the original article and verify the department connection, claims, and preferred image credit before drafting.",
    source: "University of Rochester Newscenter",
    score: Number(score || 100) + relevanceBonus_(title)
  };
}

/**
 * Monitors each linked lab homepage plus a few same-site news/blog/publication
 * pages. The first run records a baseline; later content changes create a
 * review lead. No page content is published automatically.
 */
function discoverLabWebsiteUpdates_() {
  var props = PropertiesService.getScriptProperties();
  var out = [];
  var now = new Date();
  for (var f = 0; f < DISCOVERY_CONFIG.faculty.length; f++) {
    var faculty = DISCOVERY_CONFIG.faculty[f];
    var pages = uniqueStrings_(faculty.monitorUrls || []);
    var checked = 0;
    var changed = 0;
    var initialized = 0;
    var errors = [];
    for (var p = 0; p < pages.length; p++) {
      var pageUrl = pages[p];
      try {
        var html = fetchText_(pageUrl);
        checked++;
        var snapshot = monitoredPageSnapshot_(pageUrl, html, props);
        if (!snapshot) {
          errors.push(pageUrl + ": page text was too short");
          continue;
        }
        if (!snapshot.previous) {
          props.setProperty(snapshot.propertyKey, snapshot.hash);
          initialized++;
          continue;
        }
        if (snapshot.previous === snapshot.hash) continue;
        var pageTitle = pageTitleFromHtml_(html) || hostName_(pageUrl);
        out.push({
          title: "Faculty website updated: " + facultyDisplayName_(faculty) + " — " +
            truncate_(pageTitle, 90) + " (" + formatDisplayDate_(now) + ")",
          link: pageUrl,
          date: now,
          type: "Shout-out",
          credit: facultyDisplayName_(faculty),
          details: "The explicitly monitored faculty, lab, news, publication, outreach, or official profile page changed since the previous successful review. " +
            "Open the page and look for a new award, publication, grant, student achievement, event, or research update before drafting. " +
            "Website changes can also be routine edits, so this is a review lead rather than a confirmed story.",
          source: hostName_(pageUrl),
          score: 65,
          allowRepeatUrl: true,
          monitorState: snapshot
        });
        changed++;
      } catch (pageError) {
        errors.push(pageUrl + ": " + pageError);
        console.warn("Faculty page check failed for " + pageUrl + ": " + pageError);
      }
    }
    var note = (initialized ? initialized + " baseline(s) initialized. " : "") + errors.join(" | ");
    recordDiscoverySource_("Faculty pages", facultyDisplayName_(faculty),
      errors.length ? "Warning" : (initialized && !changed ? "Baseline" : "OK"), checked, changed, note);
  }
  return out;
}

function monitoredPageSnapshot_(pageUrl, html, props) {
  var normalized = normalizeMonitoredPage_(html);
  if (normalized.length < 80) return null;
  var propertyKey = "LAB_PAGE_" + hashText_(pageUrl).slice(0, 28);
  return {
    propertyKey: propertyKey,
    hash: hashText_(normalized),
    previous: props.getProperty(propertyKey) || ""
  };
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
  var variants = facultyNewsSearchTerms_(faculty);
  for (var i = 0; i < variants.length; i++) {
    var name = normalizeSearchText_(variants[i]);
    if (name && text.indexOf(name) >= 0) return true;
  }
  return false;
}

function uniqueStrings_(values) {
  var out = [];
  var seen = {};
  for (var i = 0; i < values.length; i++) {
    var value = String(values[i] || "").trim();
    var key = normalizeSearchText_(value);
    if (!value || !key || seen[key]) continue;
    seen[key] = true;
    out.push(value);
  }
  return out;
}

function textMentionsDepartment_(value) {
  var text = normalizeSearchText_(value);
  var terms = DISCOVERY_CONFIG.departmentNewsTerms || [];
  for (var i = 0; i < terms.length; i++) {
    var term = normalizeSearchText_(terms[i]);
    if (term && text.indexOf(term) >= 0) return true;
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

function normalizedUrl_(url) {
  return String(url || "").toLowerCase().replace(/#.*$/, "").replace(/\/$/, "");
}

function discoverFacultyPublications_(faculty) {
  var authorName = facultyDisplayName_(faculty);
  var fromDate = dateDaysAgo_(DISCOVERY_CONFIG.publicationLookbackDays);
  var dateFilter = "from-pub-date:" + formatIsoDate_(fromDate);
  var selectFields = "DOI,title,author,published,published-online,published-print,issued," +
    "container-title,URL,score,publisher,type";
  var rows = Number(DISCOVERY_CONFIG.crossrefRowsPerQuery || 100);
  var queries = [];
  var orcid = normalizeOrcid_(faculty.orcid || "");

  // ORCID is the high-confidence path. The name/affiliation query remains as
  // an additive fallback because not every publisher deposits author ORCIDs.
  if (orcid) {
    queries.push({
      label: "ORCID",
      params: [
        "filter=" + encodeURIComponent(dateFilter + ",orcid:" + orcid),
        "rows=" + rows,
        "select=" + encodeURIComponent(selectFields),
        "sort=published", "order=desc"
      ]
    });
  }
  queries.push({
    label: "name + affiliation",
    params: [
      "query.author=" + encodeURIComponent(authorName),
      "query.affiliation=" + encodeURIComponent("University of Rochester"),
      "filter=" + encodeURIComponent(dateFilter),
      "rows=" + rows,
      "select=" + encodeURIComponent(selectFields),
      "sort=score", "order=desc"
    ]
  });

  var email = PropertiesService.getScriptProperties().getProperty("DISCOVERY_CONTACT_EMAIL");
  var worksByDoi = {};
  var errors = [];
  for (var q = 0; q < queries.length; q++) {
    var params = queries[q].params.slice();
    if (email) params.push("mailto=" + encodeURIComponent(email));
    try {
      var payload = JSON.parse(fetchText_("https://api.crossref.org/works?" + params.join("&")));
      var works = payload && payload.message && payload.message.items || [];
      for (var w = 0; w < works.length; w++) {
        var workDoi = String(works[w].DOI || "").trim().toLowerCase();
        if (queries[q].label === "ORCID") works[w]._discoveryOrcidMatch = true;
        if (workDoi && !worksByDoi[workDoi]) worksByDoi[workDoi] = works[w];
      }
    } catch (err) {
      errors.push(queries[q].label + ": " + err);
      console.warn("Crossref " + queries[q].label + " query failed for " + faculty.name + ": " + err);
    }
    Utilities.sleep(Number(DISCOVERY_CONFIG.crossrefPauseMs || 0));
  }

  var merged = [];
  for (var doiKey in worksByDoi) {
    if (Object.prototype.hasOwnProperty.call(worksByDoi, doiKey)) merged.push(worksByDoi[doiKey]);
  }
  merged.sort(function(a, b) { return dateValue_(crossrefDate_(b)) - dateValue_(crossrefDate_(a)); });

  var out = [];
  for (var i = 0; i < merged.length && out.length < DISCOVERY_CONFIG.maxPublicationItemsPerFaculty; i++) {
    var work = merged[i];
    if (!crossrefIsAllowedPublication_(work) || !crossrefMatchesFaculty_(work, faculty)) continue;
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
      details: "New publication discovered through Crossref using ORCID and name/affiliation coverage.\n\nAuthors: " + authors +
        (journal ? "\nJournal: " + journal : "") + "\nDOI: " + doi +
        "\nCrossref type: " + String(work.type || "unknown") +
        "\n\nVerify final publication status and the preferred image/figure rights before drafting.",
      source: "Crossref",
      score: work._discoveryOrcidMatch || (orcid && crossrefWorkHasOrcid_(work, orcid)) ? 100 : 95
    });
  }
  recordDiscoverySource_("Publications", authorName, errors.length ? "Warning" : "OK",
    merged.length, out.length, errors.join(" | "));
  return out;
}

function saveDiscoveryCandidates_(candidates) {
  var sheet = getSheet_();
  var existing = existingDiscoveryKeys_(sheet);
  var unique = {};
  var prepared = [];
  var skipped = 0;

  for (var i = 0; i < candidates.length; i++) {
    var item = candidates[i];
    var keys = discoveryCandidateKeys_(item);
    if (!item.title || !item.link) {
      skipped++;
      continue;
    }
    if (hasAnyKey_(existing, keys)) {
      // A matching monitor ID proves this exact page state was already saved.
      // Committing here heals a rare interruption after the sheet write.
      commitMonitorState_(item);
      skipped++;
      continue;
    }
    if (hasAnyKey_(unique, keys)) {
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
  var deferred = Math.max(0, prepared.length - DISCOVERY_CONFIG.maxNewItemsPerRun);
  prepared = prepared.slice(0, DISCOVERY_CONFIG.maxNewItemsPerRun);

  var rows = [];
  var added = [];
  var imageLookups = 0;
  var imagesAdded = 0;
  for (var j = 0; j < prepared.length; j++) {
    var candidate = prepared[j];
    var image = null;
    if (DISCOVERY_CONFIG.downloadThirdPartyImages && imageLookups < DISCOVERY_CONFIG.maxImageLookupsPerRun) {
      imageLookups++;
      image = downloadDiscoveryImage_(candidate);
    }
    var details = candidate.details;
    if (candidate.monitorState) {
      details += "\n\nDISCOVERY MONITOR ID: " + monitorStateId_(candidate.monitorState);
    }
    if (image) {
      imagesAdded++;
      details += "\n\nIMAGE CREDIT: " + image.credit +
        "\nIMAGE SOURCE: " + image.sourceUrl +
        "\nIMAGE TYPE: " + image.kind +
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
    // Page hashes advance only after their corresponding queue rows are safely
    // written. Items deferred by the run cap are therefore retried tomorrow.
    for (var k = 0; k < added.length; k++) commitMonitorState_(added[k]);
  }
  return {
    added: added,
    skipped: skipped,
    deferred: deferred,
    imageLookups: imageLookups,
    imagesAdded: imagesAdded
  };
}

function discoveryCandidateKeys_(item) {
  if (item.monitorState) return ["monitor:" + monitorStateId_(item.monitorState)];
  return item.allowRepeatUrl ? discoveryKeys_(item.title, "") : discoveryKeys_(item.title, item.link);
}

function monitorStateId_(state) {
  return String(state.propertyKey || "") + ":" + String(state.hash || "");
}

function commitMonitorState_(item) {
  if (!item || !item.monitorState || !item.monitorState.propertyKey || !item.monitorState.hash) return;
  PropertiesService.getScriptProperties().setProperty(item.monitorState.propertyKey, item.monitorState.hash);
}

function downloadDiscoveryImage_(candidate) {
  try {
    var pageMeta = findArticleImageMetadata_(candidate.link);
    var imageUrl = absoluteUrl_(candidate.imageUrl || pageMeta.url || "", candidate.link);
    if (!imageUrl || !isSafePublicHttpUrl_(imageUrl)) return null;
    var imageKind = candidate.imageUrl ? "Featured story image" : (pageMeta.kind || "Article preview image");

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
      "\nImage source: " + imageUrl + "\nImage type: " + imageKind + "\nCredit/source: " + credit);
    return {
      fileId: file.getId(),
      driveUrl: file.getUrl(),
      sourceUrl: imageUrl,
      credit: credit,
      kind: imageKind
    };
  } catch (err) {
    console.warn("No usable preview image for " + candidate.link + ": " + err);
    return null;
  }
}

/**
 * One-time/manual helper for Discovery Bot rows already waiting in the queue.
 * Safe to run repeatedly: rows with an attached MediaFileId are skipped.
 */
function backfillDiscoveryImages() {
  var sheet = getSheet_();
  if (sheet.getLastRow() < 2) return { ok: true, checked: 0, added: 0, remaining: 0 };
  var values = sheet.getRange(2, 1, sheet.getLastRow() - 1, HEADERS.length).getValues();
  var limit = Number(DISCOVERY_CONFIG.maxImageBackfillsPerRun || 25);
  var checked = 0;
  var added = 0;
  var remaining = 0;

  for (var i = values.length - 1; i >= 0; i--) {
    var row = values[i];
    var isDiscovery = String(row[1] || "") === "Discovery Bot";
    var status = String(row[14] || "");
    var link = String(row[9] || "");
    var alreadyHasImage = String(row[12] || "").trim();
    if (!isDiscovery || alreadyHasImage || (status !== "New" && status !== "Reviewing") || !link) continue;
    if (checked >= limit) {
      remaining++;
      continue;
    }

    checked++;
    var candidate = {
      title: String(row[4] || "Discovery image"),
      link: link,
      imageCredit: String(row[2] || "")
    };
    var image = downloadDiscoveryImage_(candidate);
    if (!image) continue;

    var details = String(row[5] || "");
    if (!/(?:^|\n)IMAGE SOURCE:/i.test(details)) {
      details += "\n\nIMAGE CREDIT: " + image.credit +
        "\nIMAGE SOURCE: " + image.sourceUrl +
        "\nIMAGE TYPE: " + image.kind +
        "\nRIGHTS CHECK: Confirm the source's preferred photographer/creator credit and reuse terms before approval.";
      sheet.getRange(i + 2, 6).setValue(truncate_(details, 6000));
    }
    sheet.getRange(i + 2, 12, 1, 2).setValues([[image.driveUrl, image.fileId]]);
    added++;
  }

  var result = { ok: true, checked: checked, added: added, remaining: remaining };
  console.log(JSON.stringify(result));
  return result;
}

function findArticleImageMetadata_(articleUrl) {
  if (!articleUrl || !isSafePublicHttpUrl_(articleUrl)) return { url: "", credit: "", siteName: "", kind: "" };
  try {
    var html = fetchText_(articleUrl);
    var image = metaContent_(html, [
      "citation_graphical_abstract", "citation_image", "prism.teaser", "dc.image"
    ]);
    var kind = image ? "Graphical abstract or publication image" : "";
    if (!image) {
      image = graphicalAbstractImage_(html);
      if (image) kind = "Graphical abstract or TOC image";
    }
    if (!image) {
      image = structuredDataImage_(html);
      if (image) kind = "Article image";
    }
    if (!image) {
      image = metaContent_(html, ["og:image:secure_url", "og:image", "twitter:image"]);
      if (image) kind = "Article social-preview image";
    }
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
    return { url: image, credit: stripHtml_(credit), siteName: stripHtml_(siteName), kind: kind };
  } catch (err) {
    console.warn("Article did not expose readable image metadata for " + articleUrl + ": " + err);
    return { url: "", credit: "", siteName: "", kind: "" };
  }
}

function graphicalAbstractImage_(html) {
  var figurePattern = /<figure\b[^>]*>([\s\S]{0,12000}?)<\/figure>/gi;
  var match;
  while ((match = figurePattern.exec(html)) !== null) {
    var figureHtml = match[1];
    var figureText = stripHtml_(figureHtml);
    if (!/graphical abstract|table of contents (?:graphic|image)|toc (?:graphic|image)/i.test(figureText)) continue;
    var image = imageSourceFromHtml_(figureHtml);
    if (image) return image;
  }
  return "";
}

function imageSourceFromHtml_(html) {
  var match = String(html || "").match(/<img\b[^>]+(?:data-src|data-original|src)=["']([^"']+)["']/i);
  return match ? decodeHtml_(match[1]) : "";
}

function structuredDataImage_(html) {
  var pattern = /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  var match;
  while ((match = pattern.exec(html)) !== null) {
    try {
      var data = JSON.parse(match[1].trim());
      var image = structuredDataImageValue_(data);
      if (image) return image;
    } catch (err) {
      // Invalid third-party structured data is ignored; other metadata remains available.
    }
  }
  return "";
}

function structuredDataImageValue_(value) {
  if (!value) return "";
  if (Array.isArray(value)) {
    for (var i = 0; i < value.length; i++) {
      var arrayImage = structuredDataImageValue_(value[i]);
      if (arrayImage) return arrayImage;
    }
    return "";
  }
  if (typeof value !== "object") return "";
  if (value.image) {
    if (typeof value.image === "string") return value.image;
    if (Array.isArray(value.image)) return structuredDataImageValue_({ image: value.image[0] });
    if (value.image.url) return value.image.url;
    if (value.image.contentUrl) return value.image.contentUrl;
  }
  if (value["@graph"]) return structuredDataImageValue_(value["@graph"]);
  return "";
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
    var stateMatch = String(rows[i][1] || "").match(/DISCOVERY MONITOR ID:\s*([^\s]+)/i);
    if (stateMatch) keys["monitor:" + stateMatch[1]] = true;
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
  if (work._discoveryOrcidMatch) return true;
  var expectedOrcid = normalizeOrcid_(faculty.orcid || "");
  if (expectedOrcid && crossrefWorkHasOrcid_(work, expectedOrcid)) return true;

  var expectedName = (faculty.aliases && faculty.aliases[0]) || faculty.name;
  var expectedFirst = removeDiacritics_(String(expectedName).trim().split(/\s+/)[0].toLowerCase());
  var expectedLast = facultyLastName_(faculty).toLowerCase();
  var authors = work.author || [];
  var matchedAuthor = null;
  for (var i = 0; i < authors.length; i++) {
    var family = removeDiacritics_(String(authors[i].family || "").toLowerCase());
    var given = removeDiacritics_(String(authors[i].given || "").toLowerCase());
    if (family === removeDiacritics_(expectedLast) && crossrefGivenNameMatches_(given, expectedFirst)) {
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

function crossrefGivenNameMatches_(given, expectedFirst) {
  var firstToken = String(given || "").replace(/[^a-z]+/g, " ").trim().split(/\s+/)[0] || "";
  if (!firstToken || !expectedFirst) return false;
  return firstToken === expectedFirst ||
    (firstToken.length === 1 && firstToken.charAt(0) === expectedFirst.charAt(0));
}

function normalizeOrcid_(value) {
  var match = String(value || "").toUpperCase().match(/(\d{4}-\d{4}-\d{4}-[\dX]{4})/);
  return match ? match[1] : "";
}

function crossrefWorkHasOrcid_(work, expectedOrcid) {
  var authors = work.author || [];
  for (var i = 0; i < authors.length; i++) {
    if (normalizeOrcid_(authors[i].ORCID || "") === expectedOrcid) return true;
  }
  return false;
}

function crossrefIsAllowedPublication_(work) {
  var type = String(work.type || "").toLowerCase();
  var allowed = DISCOVERY_CONFIG.publicationTypes || [];
  var typeAllowed = false;
  for (var i = 0; i < allowed.length; i++) {
    if (type === String(allowed[i]).toLowerCase()) {
      typeAllowed = true;
      break;
    }
  }
  if (!typeAllowed) return false;

  // Some publishers deposit meeting abstracts as journal articles. Filter the
  // recurring Crossref identifiers/titles while keeping ordinary proceedings
  // out through the explicit type allow-list above.
  var doi = String(work.DOI || "").toLowerCase();
  var title = work.title && work.title[0] || "";
  var journal = work["container-title"] && work["container-title"][0] || "";
  return !/mtgabs|meeting abstracts?|conference abstracts?/i.test(doi + " " + title + " " + journal);
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

function recordDiscoverySource_(category, source, status, checked, found, note) {
  DISCOVERY_RUN_REPORT_.push({
    category: String(category || "Other"),
    source: String(source || "Unnamed source"),
    status: String(status || "OK"),
    checked: Number(checked || 0),
    found: Number(found || 0),
    note: truncate_(String(note || ""), 500)
  });
}

function sendDiscoveryDigest_(items, skipped, deferred, report) {
  var email = PropertiesService.getScriptProperties().getProperty("NOTIFICATION_EMAIL");
  if (!email) return;
  var itemLines = [];
  for (var i = 0; i < items.length; i++) {
    itemLines.push("<li><b>" + html_(items[i].title) + "</b> &mdash; " + html_(items[i].source || "Source") +
      " [<a href=\"" + html_(items[i].link) + "\">source</a>]</li>");
  }
  var sourceRows = [];
  var textRows = [];
  report = report || [];
  for (var r = 0; r < report.length; r++) {
    var row = report[r];
    sourceRows.push("<tr><td>" + html_(row.category) + "</td><td>" + html_(row.source) +
      "</td><td>" + html_(row.status) + "</td><td style=\"text-align:right\">" + row.checked +
      "</td><td style=\"text-align:right\">" + row.found + "</td><td>" + html_(row.note) + "</td></tr>");
    textRows.push(row.category + " | " + row.source + " | " + row.status + " | checked " +
      row.checked + " | found " + row.found + (row.note ? " | " + row.note : ""));
  }
  var sheetUrl = getSheet_().getParent().getUrl();
  var summary = items.length + " new lead(s), " + skipped + " duplicate/incomplete result(s), " +
    deferred + " lead(s) deferred by the per-run limit.";
  var itemHtml = items.length ? "<h3>New review leads</h3><ul>" + itemLines.join("") + "</ul>" :
    "<p>No new review leads were added today.</p>";
  var tableHtml = "<h3>Source health and coverage</h3><table border=\"1\" cellpadding=\"5\" cellspacing=\"0\" " +
    "style=\"border-collapse:collapse;font-family:Arial,sans-serif;font-size:12px\"><thead><tr>" +
    "<th>Category</th><th>Source/faculty</th><th>Status</th><th>Checked</th><th>Found</th><th>Notes</th>" +
    "</tr></thead><tbody>" + sourceRows.join("") + "</tbody></table>";
  MailApp.sendEmail({
    to: email,
    subject: items.length ? items.length + " new UR ChemE content lead" + (items.length === 1 ? "" : "s") :
      "UR ChemE discovery source check",
    body: summary + "\n\nOpen the review sheet: " + sheetUrl + "\n\nSOURCE HEALTH\n" + textRows.join("\n"),
    htmlBody: "<p>" + html_(summary) + "</p>" + itemHtml +
      "<p><a href=\"" + html_(sheetUrl) + "\">Open the private review sheet</a></p>" + tableHtml,
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
