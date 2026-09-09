const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const context = vm.createContext({console, Date});
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'Code.gs'), 'utf8'), context);
let registry = [], posts = [], reads = 0;
const cache = new Map();
const sheet = rows => ({getLastRow: () => rows.length + 1,
  getRange: (r, c, n, w) => ({getValues: () => rows.slice(r - 2, r - 2 + n).map(row => row.slice(c - 1, c - 1 + w))}),
  appendRow: row => rows.push(row)});
context.paperGallerySheet_ = () => sheet(registry);
context.getSheet_ = () => sheet(posts);
context.CacheService = {getScriptCache: () => ({get: k => cache.get(k), put: (k, v) => cache.set(k, v)})};
context.Utilities = {base64Encode: bytes => Buffer.from(bytes).toString('base64')};
context.DriveApp = {getFileById: id => { reads++; assert.equal(id, 'approved-image');
  return {getBlob: () => ({getContentType: () => 'image/jpeg', getBytes: () => [255, 216, 255]})}; }};
const run = code => vm.runInContext(code, context);
const plain = value => JSON.parse(JSON.stringify(value));
function post(id, status, type = 'Paper', date = '2026-09-09T12:00:00Z') {
  const row = Array(24).fill('');
  row[0] = date; row[1] = 'Private submitter'; row[2] = 'private@example.com'; row[3] = type;
  row[5] = 'Private source notes'; row[10] = 'Private caption'; row[14] = status; row[15] = id;
  row[16] = date; row[18] = 'Private publishing errors'; return row;
}
const id = 'paper-eligible-0001';
posts.push(post(id, 'Posted'), post('historic-paper-0001', 'Posted'));
assert.equal(context.publicPaperGallery_(0, '').total, 0, 'old posts must never be backfilled');
context.registerPaperGallery_({type: 'Paper', title: 'Better thin films', link: '10.1000/example', paperGallery: {
  title: 'Better thin films', journal: 'Materials Journal', authors: 'Researcher Name', year: '2026', summary: 'Surface chemistry changes thin-film properties.'
}}, id, 'approved-image');
context.registerPaperGallery_({type: 'Paper', title: 'Duplicate', link: 'https://doi.org/10.1000/example'}, id, 'approved-image');
assert.equal(registry.length, 1, 'repeated requests must not duplicate registry rows');
const data = plain(context.publicPaperGallery_(0, ''));
assert.equal(data.total, 1);
assert.equal(data.items[0].articleUrl, 'https://doi.org/10.1000/example');
assert.equal(data.items[0].hasImage, true);
assert.equal(Object.keys(data.items[0]).sort().join(','), 'articleUrl,authors,hasImage,id,journal,publishedAt,summary,title,year');
assert.ok(!JSON.stringify(data).includes('Private'));
for (const status of ['Ready', 'Processing', 'Error', 'New', 'Reviewing', 'Reviewed', 'Rejected']) {
  posts[0][14] = status;
  assert.equal(context.publicPaperGallery_(0, '').total, 0, status + ' must stay private');
  assert.equal(context.publicPaperImage_(id).ok, false);
}
posts[0][14] = 'Posted';
assert.equal(context.publicPaperImage_('approved-image').ok, false, 'an arbitrary Drive file ID must not expose media');
assert.equal(context.publicPaperImage_(id).imageBase64, '/9j/');
assert.equal(reads, 1);
assert.equal(context.publicPaperImage_(id).ok, true);
assert.equal(reads, 1, 'small image responses may use the cache');
posts[0][14] = 'Error';
assert.equal(context.publicPaperImage_(id).ok, false, 'cached media must be revoked when a post is no longer Posted');
posts[0][14] = 'Posted';
for (const d of [{type:'Event'}, {type:'Paper', paperGallery:{enabled:false}}, {type:'Paper', link:'javascript:alert(1)'}]) {
  context.registerPaperGallery_(d, 'excluded-paper-0001', 'approved-image');
}
assert.equal(registry.length, 1);
assert.equal(context.publicPaperGallery_(0, 'surface').total, 1);
assert.equal(context.publicPaperGallery_(0, 'researcher').total, 1);
assert.equal(context.publicPaperGallery_(0, 'unmatched').total, 0);
for (const url of ['javascript:alert(1)', 'https://user:pass@example.com/a', 'https://example.com/<script>', '//example.com/a', 'data:text/html,x']) assert.equal(context.paperArticleUrl_(url), '');
assert.equal(run('HEADERS.length'), 24, 'Make queue columns stay compatible');
for (let n = 0; n < 27; n++) {
  const next = 'new-paper-' + String(n).padStart(4, '0'); posts.push(post(next, 'Posted'));
  context.registerPaperGallery_({type:'Paper', title:'Paper ' + n, link:'https://example.com/paper/' + n}, next, '');
}
assert.equal(context.publicPaperGallery_(0, '').items.length, 24);
assert.equal(context.publicPaperGallery_(0, '').nextOffset, 24);
assert.equal(context.publicPaperGallery_(24, '').items.length, 4);
assert.equal(context.publicPaperGallery_(24, '').nextOffset, null);
console.log('Paper gallery eligibility, privacy, registration, images, search and pagination passed');
