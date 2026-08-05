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
      remove(key) { delete cacheValues[key]; }
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
  const row = new Array(20).fill("");
  row[0] = new Date("2026-08-05T12:00:00Z");
  row[1] = "Discovery Bot";
  row[3] = "Shout-out";
  row[4] = title;
  row[5] = details;
  row[9] = "https://example.edu/story";
  row[12] = "media-file-id";
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
global.getSheet_ = function() {
  return {
    getLastRow() { return rows.length + 1; },
    getRange(_row, _column, _count, width) {
      requestedWidth = width;
      return { getValues() { listReads++; return rows; } };
    }
  };
};

const firstList = listReviewItems_();
assert.equal(firstList.length, 2);
assert.equal(requestedWidth, 16, "queue previews should read only columns A:P");
assert.ok(firstList[1].details.length <= REVIEW_LIST_PREVIEW_CHARS,
  "queue-card details should be truncated before transfer");
assert.equal(listReads, 1);
assert.deepEqual(listReviewItems_(), firstList, "a repeat open should use the short-lived cache");
assert.equal(listReads, 1, "cached queue opens must not reread the Sheet");

invalidateReviewQueueCache_();
listReviewItems_();
assert.equal(listReads, 2, "cache invalidation should force one fresh Sheet read");

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
global.getSheet_ = function() {
  return {
    getRange() { return { setValue(value) { statusWrite = value; } }; }
  };
};
global.findSubmission_ = function() {
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
const detail = getReviewDetail_("submission-first", true);
assert.equal(statusWrite, "Reviewing", "detail load should mark Reviewing in the same request");
assert.equal(detail.status, "Reviewing");
assert.equal(bytesReads, 1, "image bytes should be read only once before base64 encoding");
assert.equal(detail.imageBase64, "AQIDBA==");

const studioSource = fs.readFileSync(path.join(root, "ig-content-studio.html"), "utf8");
assert.match(studioSource, /queueJsonp\("detail",\{submissionId,markReviewing:"1"\}\)/,
  "Studio load should combine detail retrieval and the Reviewing update");
assert.match(studioSource, /queueJsonp\("update",\{submissionId,status\}\)/,
  "review decisions should use one acknowledged JSONP update");
assert.doesNotMatch(studioSource, /setTimeout\(refreshReviewQueue,500\)/,
  "review decisions must not trigger a competing full queue reload");
assert.match(studioSource, /action==="detail"\?90000:45000/,
  "timeouts should allow for Apps Script cold starts and private Drive media");

console.log("Workflow tests passed");
