const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const cacheValues = {};
global.CacheService = {
  getScriptCache() {
    return {
      get(key) { return cacheValues[key] || null; },
      put(key, value) { cacheValues[key] = String(value); },
      getAll(keys) {
        return keys.reduce((values, key) => {
          if (Object.prototype.hasOwnProperty.call(cacheValues, key)) values[key] = cacheValues[key];
          return values;
        }, {});
      },
      putAll(values) { Object.entries(values).forEach(([key, value]) => { cacheValues[key] = String(value); }); },
      remove(key) { delete cacheValues[key]; },
      removeAll(keys) { keys.forEach(key => { delete cacheValues[key]; }); }
    };
  }
};
global.Utilities = {
  base64Encode(bytes) { return Buffer.from(bytes).toString("base64"); }
};

const root = path.resolve(__dirname, "..");
vm.runInThisContext(fs.readFileSync(path.join(root, "Code.gs"), "utf8"), {
  filename: "Code.gs"
});

function reviewRow(status, title, details) {
  const row = new Array(24).fill("");
  row[0] = new Date("2026-08-05T12:00:00Z");
  row[1] = "Discovery Bot";
  row[3] = "Shout-out";
  row[4] = title;
  row[5] = details;
  row[9] = "https://example.edu/story";
  row[12] = "media-file-id";
  row[20] = JSON.stringify(["media-file-id"]);
  row[21] = JSON.stringify(["https://example.edu/media.jpg"]);
  row[14] = status;
  row[15] = "submission-" + title.toLowerCase().replace(/\s+/g, "-");
  return row;
}

const rows = [
  reviewRow("New", "First", "x".repeat(1500)),
  reviewRow("Posted", "Published", "not in review"),
  reviewRow("Reviewing", "Second", "short details")
];
let listReads = 0;
let requestedWidth = 0;
let reviewBlockHeight = 0;
global.getSheet_ = function() {
  return {
    getLastRow() { return rows.length + 1; },
    getRange(row, column, count, width) {
      requestedWidth = width;
      return { getValues() {
        listReads++;
        if (column === 15) return rows.map(item => [item[14]]);
        reviewBlockHeight = count;
        return rows.slice(row - 2, row - 2 + count);
      } };
    }
  };
};

const firstList = listReviewItems_();
assert.equal(firstList.length, 2);
assert.equal(requestedWidth, 24, "queue previews should include ordered carousel metadata through column X");
assert.equal(reviewBlockHeight, 3,
  "queue previews should read only the block spanning waiting rows");
assert.ok(firstList[1].details.length <= REVIEW_LIST_PREVIEW_CHARS,
  "queue-card details should be truncated before transfer");
assert.equal(firstList[0].caption, undefined,
  "queue previews should omit the full publishing caption from the cache");
assert.equal(firstList[0].mediaUrls, undefined,
  "queue previews should omit unused media URLs from the cache");
assert.ok(JSON.stringify(firstList).length < 100000,
  "the review-list cache entry should stay below Apps Script's per-key limit");
assert.ok(Object.keys(cacheValues).some(key => key.includes(":part:")),
  "the review-list cache should use bounded chunks instead of one oversized value");
assert.ok(REVIEW_QUEUE_CACHE_SECONDS >= 300,
  "the compact queue cache should avoid repeated Sheet scans during a review session");
assert.equal(listReads, 2, "the first queue load should use one status scan and one bounded row read");
assert.deepEqual(listReviewItems_(), firstList, "a repeat open should use the short-lived cache");
assert.equal(listReads, 2, "cached queue opens must not reread the Sheet");

invalidateReviewQueueCache_();
listReviewItems_();
assert.equal(listReads, 4, "cache invalidation should force one fresh bounded queue read");

const largeCacheValue = [{ submissionId: "large", details: "x".repeat(45000) }];
writeReviewQueueCache_(largeCacheValue);
assert.deepEqual(readReviewQueueCache_(), largeCacheValue,
  "chunked review-list caches should round-trip values larger than one cache entry");
assert.ok(Object.keys(cacheValues).filter(key => key.includes(":part:")).length >= 3,
  "large queue caches should be divided into bounded parts");
invalidateReviewQueueCache_();
assert.equal(readReviewQueueCache_(), null, "queue invalidation should remove its manifest and every chunk");

const hintedRow = reviewRow("New", "Hinted", "full details");
hintedRow[15] = "submission-hinted";
let hintedRowReads = 0;
let idColumnReads = 0;
const hintedSheet = {
  getLastRow() { return 10000; },
  getRange(row, column) {
    if (row === 42 && column === 1) {
      hintedRowReads++;
      return { getValues() { return [hintedRow]; } };
    }
    if (column === 16) idColumnReads++;
    return { getValues() { return []; } };
  }
};
const hintedItem = findSubmission_("submission-hinted", hintedSheet, 42);
assert.equal(hintedItem.rowNumber, 42);
assert.equal(hintedRowReads, 1, "a valid row hint should read only the target row");
assert.equal(idColumnReads, 0, "a valid row hint must bypass the full Submission ID column scan");

let updatedStatus = "";
global.updateSubmissionStatus_ = function(_id, status) { updatedStatus = status; return true; };
assert.deepEqual(managerReviewUpdate_("submission-first", "Rejected", ""), {
  ok: true,
  submissionId: "submission-first",
  status: "Rejected"
});
assert.equal(updatedStatus, "Rejected");

let bytesReads = 0;
let statusWrite = "";
let receivedRowHint = "";
global.getSheet_ = function() {
  return {
    getRange() { return { setValue(value) { statusWrite = value; } }; }
  };
};
global.findSubmission_ = function(_submissionId, _sheet, rowNumber) {
  receivedRowHint = rowNumber;
  return {
    rowNumber: 2,
    status: "New",
    mediaFileId: "media-file-id",
    submissionId: "submission-first"
  };
};
global.DriveApp = {
  getFileById() {
    return {
      getBlob() {
        return {
          getBytes() { bytesReads++; return [1, 2, 3, 4]; },
          getContentType() { return "image/png"; },
          getName() { return "story.png"; }
        };
      }
    };
  }
};
const detail = getReviewDetail_("submission-first", true, false, 42);
assert.equal(statusWrite, "Reviewing", "detail load should mark Reviewing in the same request");
assert.equal(detail.status, "Reviewing");
assert.equal(bytesReads, 0, "the fast detail response must not wait for image bytes");
assert.equal(detail.imageBase64, undefined);
assert.equal(receivedRowHint, 42, "detail loading should use the queue's validated row hint");

const media = getReviewMedia_("submission-first", 0, 42);
assert.equal(bytesReads, 1, "the separate media request should read image bytes once");
assert.equal(media.submissionId, "submission-first");
assert.equal(media.imageBase64, "AQIDBA==");
assert.equal(media.mediaCount, 1);
assert.equal(receivedRowHint, 42, "media loading should reuse the validated row hint");

const legacyDetail = getReviewDetail_("submission-first", false);
assert.equal(legacyDetail.imageBase64, "AQIDBA==",
  "older Studio builds should continue receiving inline media until upgraded");

const studioSource = fs.readFileSync(path.join(root, "ig-content-studio.html"), "utf8");
assert.match(studioSource, /queueJsonp\("detail",\{submissionId,markReviewing:"1",includeMedia:"0",rowNumber\}\)/,
  "Studio load should request metadata without blocking on image transfer");
assert.match(studioSource, /queueJsonp\("media",\{submissionId,mediaIndex:String\(index\),rowNumber\}\)/,
  "each carousel image should load independently after the Studio is populated");
assert.match(studioSource, /card\.dataset\.rowNumber=item\.rowNumber/,
  "review cards should retain their validated Sheet row hint");
assert.match(studioSource, /if\(reviewQueueListPromise\)return reviewQueueListPromise/,
  "reopening the queue must reuse an in-flight list request");
assert.match(studioSource, /refreshReviewQueue\(!!reviewQueueItemsCache\)/,
  "reopening the queue should show the most recent cards immediately");
assert.match(studioSource, /queueJsonp\("update",\{submissionId,status,rowNumber\}\)/,
  "review decisions should use one acknowledged JSONP update");
assert.match(studioSource, /unknown action[\s\S]*legacyReviewStatus_\(submissionId,status,rowNumber\)/i,
  "the hosted Studio must remain compatible until the new Apps Script version is deployed");
assert.doesNotMatch(studioSource, /setTimeout\(refreshReviewQueue,500\)/,
  "review decisions must not trigger a competing full queue reload");
assert.match(studioSource, /action==="media"\?120000:\(action==="detail"\?90000:45000\)/,
  "timeouts should separate private Drive media from the fast queue operations");
assert.match(studioSource, /id="rpLink"/,
  "shout-outs should expose a source-link field for manual and discovered posts");
assert.match(studioSource, /setField\("rpLink",item\.link\)/,
  "loading a discovered shout-out should retain its original source link");
assert.match(studioSource, /link:sourceLink/,
  "approved Studio payloads should save the retained source link in the publishing queue");
assert.match(studioSource, /sourceLink,slideCount,date:new Date\(\)\.toISOString\(\)/,
  "local approval history should retain the source link for reference");

console.log("Workflow tests passed");
