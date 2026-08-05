const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const propertyValues = {};
global.HEADERS = new Array(20).fill("");
global.PropertiesService = {
  getScriptProperties() {
    return {
      getProperty(key) { return propertyValues[key] || null; },
      setProperty(key, value) { propertyValues[key] = String(value); }
    };
  }
};
global.Session = { getScriptTimeZone() { return "America/New_York"; } };
global.Utilities = {
  getUuid() { return "test-uuid"; },
  formatDate(date, _zone, format) {
    if (format === "yyyy-MM-dd") return new Date(date).toISOString().slice(0, 10);
    return new Date(date).toISOString().slice(0, 10);
  },
  sleep() {}
};

const root = path.resolve(__dirname, "..");
vm.runInThisContext(fs.readFileSync(path.join(root, "Discovery.gs"), "utf8"), {
  filename: "Discovery.gs"
});

assert.equal(DISCOVERY_CONFIG.faculty.length, 14, "the configured roster should contain all 14 core faculty");
assert.equal(new Set(DISCOVERY_CONFIG.faculty.map((faculty) => faculty.orcid)).size, 14,
  "every core faculty member should have a unique ORCID");
assert.ok(DISCOVERY_CONFIG.faculty.every((faculty) => faculty.monitorUrls && faculty.monitorUrls.length),
  "every core faculty member should have at least one explicit monitored page");
assert.equal(facultyFirstLastKey_("David G. Foster"), "david foster");
assert.equal(facultyFirstLastKey_("David Foster"), "david foster",
  "roster drift checks should ignore middle initials");

assert.equal(textMentionsDepartment_("Chemical & Sustainability Engineering student wins award"), true);
assert.equal(textMentionsDepartment_("Undergraduate chemistry student wins award"), false);

const gangFan = DISCOVERY_CONFIG.faculty.find((faculty) => faculty.name === "Gang Fan");
assert.ok(facultyNewsSearchTerms_(gangFan).includes("The Fan Club"),
  "lab aliases must be active Newscenter search terms");

const orcidWork = {
  type: "journal-article",
  DOI: "10.1000/example",
  title: ["Unrelated title still accepted through exact identity"],
  author: [{ given: "M.", family: "Porosoff", ORCID: "https://orcid.org/0000-0003-3066-0029" }]
};
const porosoff = DISCOVERY_CONFIG.faculty.find((faculty) => faculty.name === "Marc D. Porosoff");
assert.equal(crossrefMatchesFaculty_(orcidWork, porosoff), true, "exact ORCID should match despite initials");
assert.equal(crossrefMatchesFaculty_({
  type: "journal-article",
  title: ["Catalysis study"],
  author: [{
    given: "M. D.", family: "Porosoff",
    affiliation: [{ name: "University of Rochester" }]
  }]
}, porosoff), true, "initial-only publisher metadata should work when the affiliation confirms identity");
assert.equal(crossrefIsAllowedPublication_(orcidWork), true);
assert.equal(crossrefIsAllowedPublication_({
  type: "journal-article",
  DOI: "10.1149/ma2026-01452230mtgabs",
  title: ["Meeting abstract"]
}), false, "meeting abstracts deposited as journal articles must be rejected");
assert.equal(crossrefIsAllowedPublication_({ type: "posted-content", DOI: "10.1000/preprint", title: ["Preprint"] }),
  false, "non-allow-listed publication types must be rejected");

assert.equal(graphicalAbstractImage_(
  '<figure><img src="/images/toc.png"><figcaption>Graphical abstract</figcaption></figure>'
), "/images/toc.png", "a labeled graphical abstract should outrank generic page imagery");
assert.equal(structuredDataImage_(
  '<script type="application/ld+json">{"@type":"NewsArticle","image":{"url":"https://example.edu/story.jpg"}}</script>'
), "https://example.edu/story.jpg", "structured NewsArticle imagery should be recognized");
assert.equal(isGenericDiscoveryImageUrl_(
  "https://www.rochester.edu/newscenter/wp-content/uploads/2026/01/NewsCenter_seal_2000x1200-scaled.png"
), true, "the generic Newscenter seal must not be attached as story imagery");
assert.equal(isGenericDiscoveryImageUrl_(
  "https://www.rochester.edu/newscenter/wp-content/uploads/2026/01/fea-catalyst-research-2000x1200.jpg"
), false, "a story-specific Newscenter feature image should remain eligible");

const namedProfessorshipPost = {
  title: { rendered: "URochester faculty appointed to named professorships" },
  link: "https://www.rochester.edu/newscenter/rochester-named-professorships-jan-june-2026-713932/",
  date_gmt: new Date().toISOString().replace(/\.\d{3}Z$/, ""),
  excerpt: { rendered: "<p>Named positions celebrate faculty work.</p>" },
  content: { rendered: [
    "<h2>Named positions celebrate the work of faculty.</h2>",
    "<hr>",
    "<p>Yan Bai, a professor of economics, was appointed to a named position.</p>",
    "<hr>",
    "<p><a href='https://www.hajim.rochester.edu/che/people/faculty/lipomi-darren/'>Darren Lipomi</a>, a professor of chemical and sustainability engineering, has been appointed as the Arthur Gould Yates Professor of Engineering. He retains his appointment as chair of the Department of Chemical and Sustainability Engineering.</p>",
    "<p>Lipomi's research interests include molecular engineering of electronic and electroactive polymers.</p>",
    "<hr>",
    "<p>Another professor in another department was appointed.</p>"
  ].join("\n") },
  _embedded: { "wp:featuredmedia": [{
    source_url: "https://www.rochester.edu/newscenter/wp-content/uploads/2026/01/NewsCenter_seal_2000x1200-scaled.png",
    caption: { rendered: "News Center" }
  }] }
};
const namedFacts = newscenterFactsForDraft_(namedProfessorshipPost);
assert.match(namedFacts, /Darren Lipomi/);
assert.match(namedFacts, /Arthur Gould Yates Professor of Engineering/);
assert.doesNotMatch(namedFacts, /Yan Bai/, "roundup extraction must omit unrelated appointments");
const namedCandidate = newscenterCandidateFromPost_(namedProfessorshipPost,
  "UR Chemical and Sustainability Engineering", "Official department-language match.", 105);
assert.equal(namedCandidate.credit, "Darren Lipomi", "the matching faculty member should receive draft credit");
assert.match(namedCandidate.details, /FACTS FOR DRAFT:\n[\s\S]*Arthur Gould Yates/);
assert.doesNotMatch(namedCandidate.details, /Open the original article/i,
  "drafting details must contain facts instead of an instruction the model cannot perform");

const savedRows = [];
global.getSheet_ = function() {
  return {
    getLastRow() { return 1; },
    getRange() {
      return {
        setValues(rows) { savedRows.push.apply(savedRows, rows); },
        getValues() { return []; }
      };
    }
  };
};
DISCOVERY_CONFIG.maxNewItemsPerRun = 1;
DISCOVERY_CONFIG.downloadThirdPartyImages = false;
const candidates = [
  {
    title: "First changed page", link: "https://example.edu/one", details: "First", credit: "Test",
    type: "Shout-out", date: new Date(), score: 10,
    monitorState: { propertyKey: "LAB_PAGE_ONE", hash: "hash-one" }
  },
  {
    title: "Second changed page", link: "https://example.edu/two", details: "Second", credit: "Test",
    type: "Shout-out", date: new Date(), score: 5,
    monitorState: { propertyKey: "LAB_PAGE_TWO", hash: "hash-two" }
  }
];
const saveResult = saveDiscoveryCandidates_(candidates);
assert.equal(saveResult.added.length, 1);
assert.equal(saveResult.deferred, 1);
assert.equal(saveResult.imageLookups, 0);
assert.equal(saveResult.imagesAdded, 0);
assert.equal(propertyValues.LAB_PAGE_ONE, "hash-one", "saved page state should be committed");
assert.equal(propertyValues.LAB_PAGE_TWO, undefined, "deferred page state must remain pending for retry");
assert.match(savedRows[0][5], /DISCOVERY MONITOR ID: LAB_PAGE_ONE:hash-one/);

const oldDiscoveryRow = new Array(20).fill("");
oldDiscoveryRow[1] = "Discovery Bot";
oldDiscoveryRow[2] = "UR Newscenter";
oldDiscoveryRow[4] = "Existing discovery lead";
oldDiscoveryRow[5] = "Existing details";
oldDiscoveryRow[9] = "https://example.edu/story";
oldDiscoveryRow[14] = "New";
const backfillWrites = {};
global.getSheet_ = function() {
  return {
    getLastRow() { return 2; },
    getRange(row, column) {
      return {
        getValues() { return [oldDiscoveryRow]; },
        setValue(value) { backfillWrites[column] = value; },
        setValues(values) { backfillWrites[column] = values[0]; }
      };
    }
  };
};
global.downloadDiscoveryImage_ = function() {
  return {
    driveUrl: "https://drive.google.com/file/d/test/view",
    fileId: "test-file-id",
    sourceUrl: "https://example.edu/story.jpg",
    credit: "Example University",
    kind: "Featured story image"
  };
};
const backfillResult = backfillDiscoveryImages();
assert.equal(backfillResult.added, 1);
assert.match(backfillWrites[6], /IMAGE TYPE: Featured story image/);
assert.deepEqual(backfillWrites[12], ["https://drive.google.com/file/d/test/view", "test-file-id"]);

const oldNewscenterRow = new Array(20).fill("");
oldNewscenterRow[1] = "Discovery Bot";
oldNewscenterRow[4] = "URochester faculty appointed to named professorships";
oldNewscenterRow[5] = "Official University of Rochester Newscenter item matched to department language.\n\nNamed positions celebrate faculty.\n\nOpen the original article and verify the department connection.\n\nIMAGE CREDIT: News Center\nIMAGE SOURCE: https://www.rochester.edu/newscenter/wp-content/uploads/2026/01/NewsCenter_seal_2000x1200-scaled.png\nIMAGE TYPE: Featured story image\nRIGHTS CHECK: Confirm credit.";
oldNewscenterRow[9] = namedProfessorshipPost.link;
oldNewscenterRow[11] = "https://drive.google.com/file/d/seal/view";
oldNewscenterRow[12] = "seal-file-id";
oldNewscenterRow[14] = "Rejected";
const refreshWrites = {};
global.getSheet_ = function() {
  return {
    getLastRow() { return 2; },
    getRange(row, column) {
      return {
        getValues() { return [oldNewscenterRow]; },
        setValue(value) { refreshWrites[column] = value; },
        setValues(values) { refreshWrites[column] = values[0]; }
      };
    }
  };
};
global.fetchText_ = function() { return JSON.stringify([namedProfessorshipPost]); };
const refreshResult = refreshDiscoveryNewscenterDetails();
assert.equal(refreshResult.updated, 1);
assert.equal(refreshResult.genericImagesDetached, 1);
assert.match(refreshWrites[6], /FACTS FOR DRAFT:\n[\s\S]*Darren Lipomi/);
assert.doesNotMatch(refreshWrites[6], /IMAGE SOURCE:/,
  "generic image metadata must be removed from repaired details");
assert.deepEqual(refreshWrites[12], ["", ""], "the existing generic seal must be detached");

const studioSource = fs.readFileSync(path.join(root, "ig-content-studio.html"), "utf8");
assert.match(studioSource, /function reviewDetailsForDraft_\(item\)/,
  "Content Studio must sanitize reviewer-only instructions before drafting");
assert.match(studioSource, /const reviewDetails=reviewDetailsForDraft_\(reviewSource\)/);
assert.doesNotMatch(studioSource, /Details: \$\{reviewSource\.details\|\|""\}/,
  "raw Discovery details must never be appended to the model brief");
assert.match(studioSource, /const fallbackHeadline=built\.headlineHint\|\|\(reviewSource&&reviewSource\.title\)\|\|""/,
  "review graphics must fall back to the verified source title");
assert.match(studioSource, /pull_quote:p\.pull_quote\|\|p\.subhead\|\|graphicHeadline/,
  "quote graphics must never be blank when a review title is available");

console.log("Discovery tests passed");
