/**
 * UR ChemE Instagram — intake, review, and publishing queue
 * ------------------------------------------------------------------
 * Public form submissions enter as New. Manager-approved Studio posts
 * enter as Ready. Make watches only Ready rows.
 *
 * One-time setup after deploying this version:
 *   1. Run initializeWorkflow() from the Apps Script editor.
 *   2. Copy the logged MANAGER_TOKEN into Content Studio ▸ Review queue.
 *   3. Confirm the logged NOTIFICATION_EMAIL (or edit it under
 *      Project Settings ▸ Script properties).
 *
 * Sheet columns A–T:
 * Timestamp | Submitter | Credit | Type | Title | Details | Date | Time |
 * Location | Link | Caption | MediaURL | MediaFileId | VideoLink | Status |
 * SubmissionId | PublishedAt | InstagramPostId | Error | SourceSubmissionId
 */

var FOLDER_NAME = "UR ChemE IG Media";
var SHEET_NAME = "Posts";
var MAX_PUBLIC_SUBMISSIONS_PER_HOUR = 40;
var MAX_IMAGE_BYTES = 8 * 1024 * 1024;
var MAX_REVIEW_LIST_ITEMS = 60;
var REVIEW_LIST_PREVIEW_CHARS = 700;
var REVIEW_QUEUE_CACHE_KEY = "review-queue-list-v2";
var REVIEW_QUEUE_CACHE_SECONDS = 45;
var HEADERS = [
  "Timestamp", "Submitter", "Credit", "Type", "Title", "Details",
  "Date", "Time", "Location", "Link", "Caption", "MediaURL",
  "MediaFileId", "VideoLink", "Status", "SubmissionId", "PublishedAt",
  "InstagramPostId", "Error", "SourceSubmissionId"
];

function doPost(e) {
  try {
    var d = JSON.parse((e && e.postData && e.postData.contents) || "{}");
    if (d.action === "managerUpdate") return handleManagerUpdate_(d);
    return handleSubmission_(d);
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message || err) });
  }
}

function doGet(e) {
  var p = (e && e.parameter) || {};
  var action = p.action || "health";
  try {
    if (action === "health") {
      return ContentService.createTextOutput("UR ChemE endpoint is live.");
    }
    if (action === "status") {
      var statusItem = findSubmission_(sanitizeId_(p.submissionId));
      return jsonp_({
        ok: true,
        found: !!statusItem,
        status: statusItem ? statusItem.status : ""
      }, p.callback);
    }
    requireManager_(p.token);
    if (action === "list") return jsonp_({ ok: true, items: listReviewItems_() }, p.callback);
    if (action === "detail") {
      return jsonp_({
        ok: true,
        item: getReviewDetail_(sanitizeId_(p.submissionId), p.markReviewing === "1")
      }, p.callback);
    }
    if (action === "update") {
      return jsonp_(managerReviewUpdate_(p.submissionId, p.status, p.error), p.callback);
    }
    return jsonp_({ ok: false, error: "Unknown action." }, p.callback);
  } catch (err) {
    return jsonp_({ ok: false, error: String(err && err.message || err) }, p.callback);
  }
}

function handleSubmission_(d) {
  var isStudio = d.source === "studio";
  if (!isStudio) {
    if (String(d.website || "").trim()) return json_({ ok: true }); // honeypot
    enforceRateLimit_();
  }
  validateSubmission_(d, isStudio);

  var sheet = getSheet_();
  var submissionId = sanitizeId_(d.submissionId) || Utilities.getUuid();
  var existing = findSubmission_(submissionId, sheet);
  if (existing) return json_({ ok: true, duplicate: true, submissionId: submissionId });

  var videoLink = normalizeDriveFileId_(d.videoLink || "");
  var mediaUrl = "", fileId = "";
  if (d.imageBase64) {
    var folder = getFolder_(FOLDER_NAME);
    var blob = Utilities.newBlob(
      Utilities.base64Decode(d.imageBase64),
      d.imageType || "image/jpeg",
      safeFileName_(d.imageName || ("img-" + Date.now() + ".jpg"))
    );
    var file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    fileId = file.getId();
    mediaUrl = "https://drive.google.com/uc?export=view&id=" + fileId;
  }

  var sourceSubmissionId = isStudio ? sanitizeId_(d.sourceSubmissionId) : "";
  sheet.appendRow([
    new Date(), clean_(d.submitter || (isStudio ? "Content Studio" : ""), 150),
    clean_(d.credit, 250), clean_(d.type, 50), clean_(d.title, 500),
    clean_(d.details, 6000), clean_(d.date, 50), clean_(d.time, 50),
    clean_(d.location, 300), clean_(d.link, 1000), clean_(d.caption, 10000),
    mediaUrl, fileId, videoLink, isStudio ? "Ready" : "New", submissionId,
    "", "", "", sourceSubmissionId
  ]);
  invalidateReviewQueueCache_();

  if (sourceSubmissionId) updateSubmissionStatus_(sourceSubmissionId, "Reviewed", "", sheet);
  if (!isStudio) {
    try { sendNewSubmissionEmail_(d, submissionId, sheet); }
    catch (mailErr) { console.error("Submission email failed: " + mailErr); }
  }
  return json_({ ok: true, submissionId: submissionId });
}

function validateSubmission_(d, isStudio) {
  if (!d.consent) throw new Error("Consent is required.");
  if (!isStudio && !String(d.submitter || "").trim()) throw new Error("Submitter is required.");
  if (!String(d.title || "").trim()) throw new Error("Title is required.");
  if (String(d.submitter || "").length > 150) throw new Error("Submitter is too long.");
  if (String(d.title || "").length > 500) throw new Error("Title is too long.");
  if (String(d.details || "").length > 6000) throw new Error("Details are too long.");
  if (String(d.caption || "").length > 10000) throw new Error("Caption is too long.");
  if (d.imageBase64) {
    var mime = String(d.imageType || "").toLowerCase();
    if (!/^image\/(jpeg|png|webp)$/.test(mime)) throw new Error("Unsupported image type.");
    var approximateBytes = Math.floor(String(d.imageBase64).length * 3 / 4);
    if (approximateBytes > MAX_IMAGE_BYTES) throw new Error("Image exceeds 8 MB.");
  }
  if (String(d.type || "").toLowerCase() === "video") {
    var videoId = normalizeDriveFileId_(d.videoLink || "");
    if (!/^[A-Za-z0-9_-]{20,}$/.test(videoId)) throw new Error("A valid Google Drive video link is required.");
  }
}

function enforceRateLimit_() {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) throw new Error("Submission service is busy. Try again shortly.");
  try {
    var cache = CacheService.getScriptCache();
    var now = new Date();
    var key = "public-count-" + Utilities.formatDate(now, "Etc/UTC", "yyyyMMddHH");
    var count = Number(cache.get(key) || 0);
    if (count >= MAX_PUBLIC_SUBMISSIONS_PER_HOUR) throw new Error("Submission limit reached. Try again later.");
    cache.put(key, String(count + 1), 3600);
  } finally {
    lock.releaseLock();
  }
}

function handleManagerUpdate_(d) {
  requireManager_(d.managerToken);
  return json_(managerReviewUpdate_(d.submissionId, d.status, d.error));
}

function managerReviewUpdate_(submissionId, status, errorText) {
  var allowed = { New: true, Reviewing: true, Reviewed: true, Rejected: true };
  var nextStatus = String(status || "");
  if (!allowed[nextStatus]) throw new Error("Invalid review status.");
  var id = sanitizeId_(submissionId);
  if (!id) throw new Error("Submission ID is required.");
  var updated = updateSubmissionStatus_(id, nextStatus, clean_(errorText, 2000));
  return { ok: updated, submissionId: id, status: nextStatus };
}

function listReviewItems_() {
  var cached = readReviewQueueCache_();
  if (cached) return cached;
  var sheet = getSheet_();
  if (sheet.getLastRow() < 2) return [];
  // The queue cards need only A:P. Full details/media are fetched for the one
  // item the reviewer opens, so avoid transferring the publishing-only columns.
  var rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, 16).getValues();
  var out = [];
  for (var i = rows.length - 1; i >= 0 && out.length < MAX_REVIEW_LIST_ITEMS; i--) {
    var item = rowObject_(rows[i], i + 2);
    if (item.status === "New" || item.status === "Reviewing") {
      item.details = truncateText_(item.details, REVIEW_LIST_PREVIEW_CHARS);
      out.push(item);
    }
  }
  writeReviewQueueCache_(out);
  return out;
}

function getReviewDetail_(submissionId, markReviewing) {
  var sheet = getSheet_();
  var item = findSubmission_(submissionId, sheet);
  if (!item) throw new Error("Submission not found.");
  if (markReviewing && item.status !== "Reviewing") {
    sheet.getRange(item.rowNumber, 15).setValue("Reviewing");
    item.status = "Reviewing";
    updateReviewQueueCacheStatus_(item.submissionId, "Reviewing");
  }
  if (item.mediaFileId) {
    try {
      var blob = DriveApp.getFileById(item.mediaFileId).getBlob();
      var bytes = blob.getBytes();
      if (bytes.length <= MAX_IMAGE_BYTES) {
        item.imageBase64 = Utilities.base64Encode(bytes);
        item.imageType = blob.getContentType() || "image/jpeg";
        item.imageName = blob.getName();
      }
    } catch (err) {
      item.mediaError = "The submitted image could not be loaded.";
    }
  }
  return item;
}

function updateSubmissionStatus_(submissionId, status, errorText, optSheet) {
  var sheet = optSheet || getSheet_();
  var found = findSubmission_(submissionId, sheet);
  if (!found) return false;
  sheet.getRange(found.rowNumber, 15).setValue(status);
  if (typeof errorText !== "undefined") sheet.getRange(found.rowNumber, 19).setValue(errorText || "");
  updateReviewQueueCacheStatus_(submissionId, status);
  return true;
}

function readReviewQueueCache_() {
  try {
    var value = CacheService.getScriptCache().get(REVIEW_QUEUE_CACHE_KEY);
    return value ? JSON.parse(value) : null;
  } catch (err) {
    return null;
  }
}

function writeReviewQueueCache_(items) {
  try {
    CacheService.getScriptCache().put(
      REVIEW_QUEUE_CACHE_KEY,
      JSON.stringify(items || []),
      REVIEW_QUEUE_CACHE_SECONDS
    );
  } catch (err) {
    // Cache is an optimization; the Sheet remains authoritative.
  }
}

function invalidateReviewQueueCache_() {
  try { CacheService.getScriptCache().remove(REVIEW_QUEUE_CACHE_KEY); }
  catch (err) {}
}

function updateReviewQueueCacheStatus_(submissionId, status) {
  var items = readReviewQueueCache_();
  if (!items) return;
  var found = false;
  var out = [];
  for (var i = 0; i < items.length; i++) {
    var item = items[i];
    if (String(item.submissionId || "") === String(submissionId || "")) {
      found = true;
      if (status === "New" || status === "Reviewing") {
        item.status = status;
        out.push(item);
      }
    } else {
      out.push(item);
    }
  }
  if (!found && (status === "New" || status === "Reviewing")) {
    invalidateReviewQueueCache_();
    return;
  }
  writeReviewQueueCache_(out);
}

function truncateText_(value, max) {
  var text = String(value || "");
  var limit = Number(max || 0);
  return limit > 0 && text.length > limit ? text.slice(0, limit - 1).trim() + "…" : text;
}

function findSubmission_(submissionId, optSheet) {
  if (!submissionId) return null;
  var sheet = optSheet || getSheet_();
  if (sheet.getLastRow() < 2) return null;
  var ids = sheet.getRange(2, 16, sheet.getLastRow() - 1, 1).getValues();
  for (var i = ids.length - 1; i >= 0; i--) {
    if (String(ids[i][0]) === submissionId) {
      var rowNumber = i + 2;
      return rowObject_(sheet.getRange(rowNumber, 1, 1, HEADERS.length).getValues()[0], rowNumber);
    }
  }
  return null;
}

function rowObject_(r, rowNumber) {
  return {
    rowNumber: rowNumber,
    timestamp: r[0] instanceof Date ? r[0].toISOString() : String(r[0] || ""),
    submitter: String(r[1] || ""), credit: String(r[2] || ""), type: String(r[3] || ""),
    title: String(r[4] || ""), details: String(r[5] || ""), date: String(r[6] || ""),
    time: String(r[7] || ""), location: String(r[8] || ""), link: String(r[9] || ""),
    caption: String(r[10] || ""), mediaUrl: String(r[11] || ""),
    mediaFileId: String(r[12] || ""), videoLink: String(r[13] || ""),
    status: String(r[14] || ""), submissionId: String(r[15] || ""),
    publishedAt: String(r[16] || ""), instagramPostId: String(r[17] || ""),
    error: String(r[18] || ""), sourceSubmissionId: String(r[19] || "")
  };
}

function sendNewSubmissionEmail_(d, submissionId, sheet) {
  var email = PropertiesService.getScriptProperties().getProperty("NOTIFICATION_EMAIL");
  if (!email) return;
  var title = clean_(d.title, 500);
  var type = clean_(d.type, 50) || "Submission";
  var body = "<p>A new <b>" + html_(type) + "</b> submission is waiting for review.</p>" +
    "<p><b>" + html_(title) + "</b><br>From: " + html_(clean_(d.submitter, 150)) + "</p>" +
    "<p><a href=\"" + sheet.getParent().getUrl() + "\">Open the private review sheet</a></p>" +
    "<p style=\"color:#777\">Submission ID: " + html_(submissionId) + "</p>";
  MailApp.sendEmail({
    to: email,
    subject: "New UR ChemE Instagram submission: " + title,
    body: "A new " + type + " submission is waiting for review: " + title + " (" + submissionId + ")",
    htmlBody: body,
    name: "UR ChemE Instagram Queue"
  });
}

function initializeWorkflow() {
  var sheet = getSheet_();
  backfillSubmissionIds_(sheet);
  var props = PropertiesService.getScriptProperties();
  var token = props.getProperty("MANAGER_TOKEN");
  if (!token) {
    token = (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, "");
    props.setProperty("MANAGER_TOKEN", token);
  }
  var email = props.getProperty("NOTIFICATION_EMAIL") || Session.getEffectiveUser().getEmail();
  if (email) props.setProperty("NOTIFICATION_EMAIL", email);
  console.log("MANAGER_TOKEN=" + token);
  console.log("NOTIFICATION_EMAIL=" + (email || "not set"));
  return { managerToken: token, notificationEmail: email || "" };
}

function requireManager_(token) {
  var expected = PropertiesService.getScriptProperties().getProperty("MANAGER_TOKEN");
  if (!expected) throw new Error("Manager review is not configured. Run initializeWorkflow().");
  if (!token || String(token) !== expected) throw new Error("Manager authorization failed.");
}

function getSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME) || ss.getSheets()[0];
  var range = sheet.getRange(1, 1, 1, HEADERS.length);
  var current = range.getValues()[0];
  var changed = false;
  for (var i = 0; i < HEADERS.length; i++) {
    if (!current[i]) { current[i] = HEADERS[i]; changed = true; }
  }
  if (changed) range.setValues([current]);
  return sheet;
}

function backfillSubmissionIds_(sheet) {
  if (sheet.getLastRow() < 2) return;
  var range = sheet.getRange(2, 16, sheet.getLastRow() - 1, 1);
  var ids = range.getValues(), changed = false;
  for (var i = 0; i < ids.length; i++) {
    if (!ids[i][0]) { ids[i][0] = Utilities.getUuid(); changed = true; }
  }
  if (changed) range.setValues(ids);
}

function getFolder_(name) {
  var it = DriveApp.getFoldersByName(name);
  return it.hasNext() ? it.next() : DriveApp.createFolder(name);
}

function normalizeDriveFileId_(input) {
  var s = String(input || "").trim();
  if (/^[A-Za-z0-9_-]{20,}$/.test(s)) return s;
  var path = s.match(/\/file\/d\/([A-Za-z0-9_-]{20,})/);
  if (path) return path[1];
  var query = s.match(/[?&]id=([A-Za-z0-9_-]{20,})/);
  return query ? query[1] : s;
}

function sanitizeId_(input) {
  var s = String(input || "").trim();
  return /^[A-Za-z0-9_-]{12,100}$/.test(s) ? s : "";
}

function clean_(value, max) {
  return String(value || "").trim().slice(0, max || 1000);
}

function safeFileName_(name) {
  return String(name || "upload").replace(/[^A-Za-z0-9._ -]/g, "_").slice(0, 180);
}

function html_(value) {
  return String(value || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;");
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function jsonp_(obj, callback) {
  var cb = String(callback || "");
  if (/^[A-Za-z_$][A-Za-z0-9_$.]{0,100}$/.test(cb)) {
    return ContentService.createTextOutput(cb + "(" + JSON.stringify(obj) + ");")
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return json_(obj);
}
