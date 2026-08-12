const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const formSource = fs.readFileSync(path.join(root, "cheme-submission-form.html"), "utf8");
const studioSource = fs.readFileSync(path.join(root, "ig-content-studio.html"), "utf8");
const codeSource = fs.readFileSync(path.join(root, "Code.gs"), "utf8");

const formScript = formSource.match(/<script>([\s\S]*?)<\/script>/);
const studioScript = studioSource.match(/<script>([\s\S]*?)<\/script>/);
assert.ok(formScript && studioScript, "both pages should contain an inline script");
new Function(formScript[1]);
new Function(studioScript[1]);

assert.match(formSource, /id="file"[^>]*multiple/,
  "the public form should accept multiple images in one picker action");
assert.match(formSource, /images=selectedImages\.map/,
  "the public form should send an ordered images array");
assert.match(formSource, /id="photoErr"[^>]*aria-live="assertive"/,
  "image-selection errors should appear beside the public form picker");
assert.match(formSource, /activeType==="Photo"&&!selectedImages\.length/,
  "Photo submissions should not be accepted without a rendered image preview");
assert.match(formSource, /HEIC\/HEIF photos must be exported or shared as JPEG first/,
  "unsupported phone photo formats should receive actionable guidance");
assert.match(studioSource, /id="fileInput"[^>]*multiple/,
  "the Content Studio should accept multiple images in one picker action");
assert.match(studioSource, /Plain photo \+ per-image text/,
  "the Content Studio should expose the plain per-image caption template");
assert.match(studioSource, /currentSlides\[activeSlideIndex\]\.overlayCaption=slideCaption\.value/,
  "each slide should keep its own overlay caption");
assert.match(studioSource, /id="gOverlayFont"/,
  "plain overlays should provide a per-slide font selector");
assert.match(studioSource, /id="gOverlayColor"[^>]*type="color"|type="color"[^>]*id="gOverlayColor"/,
  "plain overlays should provide a per-slide text color selector");
assert.match(studioSource, /id="gOverlayOutline"/,
  "plain overlays should provide outline thickness options");
assert.match(studioSource, /id="gOverlayOutlineColor"/,
  "plain overlays should provide an outline color selector");
assert.match(studioSource, /id="gOverlayPosition"[\s\S]*bottom-right/,
  "plain overlays should provide nine-position placement options");
assert.match(studioSource, /id="gOverlayBackground"/,
  "plain overlays should let each slide toggle its text background");
assert.match(studioSource, /id="gOverlayBackgroundColor"[^>]*type="color"|type="color"[^>]*id="gOverlayBackgroundColor"/,
  "plain overlays should provide a background color selector");
assert.match(studioSource, /id="gOverlayBackgroundOpacity"[^>]*type="range"|type="range"[^>]*id="gOverlayBackgroundOpacity"/,
  "plain overlays should provide a background transparency control");
assert.match(studioSource, /ctx\.strokeText\(line,x,cursorY\)/,
  "the canvas renderer should draw the selected font outline");
assert.match(studioSource, /styled\.overlayBackground!=="off"&&backgroundOpacity>0/,
  "the canvas renderer should honor the per-slide background toggle");
assert.match(studioSource, /hexRgba\(styled\.overlayBackgroundColor,backgroundOpacity\)/,
  "the canvas renderer should use the selected background color and transparency");
assert.match(studioSource, /drawPlainPhoto\(ctx,fig,slide,W,H/,
  "plain rendering should use the selected slide's full overlay style");
assert.match(studioSource, /async function renderedApprovalImages_\(\)/,
  "approval should render every carousel slide");
assert.match(studioSource, /images,imageBase64:/,
  "Studio approval should send the ordered images payload");
assert.match(codeSource, /"MediaFileIds",\s*\n\s*"MediaURLs", "OverlayCaptions", "MediaCount"/,
  "the Sheet schema should persist carousel order and overlay captions");

global.CacheService = { getScriptCache() { return { get() { return null; }, put() {}, remove() {} }; } };
global.Utilities = { base64Encode(bytes) { return Buffer.from(bytes).toString("base64"); } };
vm.runInThisContext(codeSource, { filename: "Code.gs" });

const images = normalizeSubmissionImages_({
  images: [
    { imageBase64: "AQID", imageType: "image/png", imageName: "one.png", overlayCaption: "First" },
    { imageBase64: "BAUG", imageType: "image/jpeg", imageName: "two.jpg", overlayCaption: "Second" }
  ],
  imageBase64: "legacy-copy-is-ignored"
});
assert.equal(images.length, 2);
assert.deepEqual(images.map((image) => image.overlayCaption), ["First", "Second"]);
assert.doesNotThrow(() => validateSubmission_({ consent: true, submitter: "Tester", title: "Carousel", images }, false));
assert.throws(() => validateSubmission_({
  consent: true,
  submitter: "Tester",
  title: "Too many",
  images: new Array(MAX_CAROUSEL_IMAGES + 1).fill(null).map((_, index) => ({
    imageBase64: "AQID",
    imageType: "image/png",
    imageName: `${index}.png`
  }))
}, false), /up to 10 images/);

const row = new Array(24).fill("");
row[12] = "first-id";
row[15] = "submission-carousel";
row[20] = JSON.stringify(["first-id", "second-id"]);
row[21] = JSON.stringify(["https://example.edu/one", "https://example.edu/two"]);
row[22] = JSON.stringify(["First", "Second"]);
row[23] = 2;
const item = rowObject_(row, 2);
assert.equal(item.mediaCount, 2);
assert.deepEqual(item.mediaFileIds, ["first-id", "second-id"]);
assert.deepEqual(item.overlayCaptions, ["First", "Second"]);

let requestedFileId = "";
global.DriveApp = {
  getFileById(fileId) {
    requestedFileId = fileId;
    return { getBlob() { return {
      getBytes() { return [4, 5, 6]; },
      getContentType() { return "image/jpeg"; },
      getName() { return "two.jpg"; }
    }; } };
  }
};
const second = getReviewMediaFromItem_(item, 1);
assert.equal(requestedFileId, "second-id");
assert.equal(second.mediaIndex, 1);
assert.equal(second.mediaCount, 2);
assert.equal(second.overlayCaption, "Second");

console.log("Carousel tests passed");
