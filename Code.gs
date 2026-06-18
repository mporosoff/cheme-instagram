/**
 * UR ChemE Instagram — intake + publishing queue
 * ---------------------------------------------------------------
 * Google hosts this for free. It catches:
 *   • submissions from cheme-submission-form.html  (Status = "New")
 *   • one-click approvals from ig-content-studio.html (Status = "Ready")
 * It saves any image to a Drive folder and adds a row to your Sheet.
 * Make.com then watches the "Ready" rows and posts them to Instagram.
 *
 * SETUP (full walkthrough in SETUP.md, Part 1):
 *  1. Make a Google Sheet. Rename the first tab to "Posts".
 *  2. Put these 15 headers in row 1 (columns A–O), exactly:
 *     Timestamp | Submitter | Credit | Type | Title | Details |
 *     Date | Time | Location | Link | Caption | MediaURL |
 *     MediaFileId | VideoLink | Status
 *  3. Extensions ▸ Apps Script. Delete the sample, paste THIS, Save.
 *  4. Deploy ▸ New deployment ▸ Web app.
 *       Execute as: Me   |   Who has access: Anyone
 *     Deploy, authorize, copy the Web app URL.
 *  5. Paste that URL into BOTH:
 *       • the form's WEBAPP_URL  (top of its script)
 *       • the studio's Settings ▸ "Publishing queue URL"
 * ---------------------------------------------------------------
 */

var FOLDER_NAME = "UR ChemE IG Media";
var SHEET_NAME  = "Posts";

function doPost(e) {
  try {
    var d = JSON.parse(e.postData.contents);
    var isStudio = (d.source === "studio");

    var mediaUrl = "", fileId = "";
    if (d.imageBase64) {
      var folder = getFolder_(FOLDER_NAME);
      var blob = Utilities.newBlob(
        Utilities.base64Decode(d.imageBase64),
        d.imageType || "image/jpeg",
        d.imageName || ("img-" + Date.now() + ".jpg")
      );
      var file = folder.createFile(blob);
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      fileId = file.getId();
      mediaUrl = "https://drive.google.com/uc?export=view&id=" + fileId;
    }

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(SHEET_NAME) || ss.getSheets()[0];
    sheet.appendRow([
      new Date(),
      d.submitter || (isStudio ? "Content Studio" : ""),
      d.credit || "",
      d.type || "",
      d.title || "",
      d.details || "",
      d.date || "",
      d.time || "",
      d.location || "",
      d.link || "",
      d.caption || "",                 // the text Make actually posts
      mediaUrl,
      fileId,
      d.videoLink || "",
      isStudio ? "Ready" : "New"        // studio approvals are post-ready; form items wait for review
    ]);

    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

function doGet() {
  return ContentService.createTextOutput("UR ChemE endpoint is live.");
}

function getFolder_(name) {
  var it = DriveApp.getFoldersByName(name);
  return it.hasNext() ? it.next() : DriveApp.createFolder(name);
}
function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
