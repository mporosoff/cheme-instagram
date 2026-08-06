const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(path.resolve(__dirname, "..", "ig-content-studio.html"), "utf8");
const inlineScript = source.match(/<script>([\s\S]*?)<\/script>/);
assert.ok(inlineScript, "missing Studio script");
new Function(inlineScript[1]);

function extractFunction(name) {
  const start = source.indexOf("function " + name + "(");
  assert.ok(start >= 0, `missing ${name}`);
  const bodyStart = source.indexOf("{", start);
  let depth = 0;
  for (let i = bodyStart; i < source.length; i++) {
    if (source[i] === "{") depth++;
    if (source[i] === "}") depth--;
    if (depth === 0) return source.slice(start, i + 1);
  }
  throw new Error(`unterminated ${name}`);
}

const context = { MAX_HASHTAGS: 5, Set };
vm.createContext(context);
vm.runInContext([
  extractFunction("cleanHashtag_"),
  extractFunction("hashtagTokens_"),
  extractFunction("hashtagSupportedByBrief_"),
  extractFunction("filterDraftHashtags_")
].join("\n"), context);

const batteryBrief = "Lithium metal battery publication in Energy Storage Materials about an ultrathin fluoropolymer and longer battery life.";
assert.deepEqual(Array.from(context.filterDraftHashtags_([
  "Catalysis", "BatteryResearch", "EnergyStorage", "ChemicalEngineering", "#LithiumBattery"
], batteryBrief)), ["BatteryResearch", "EnergyStorage", "ChemicalEngineering", "LithiumBattery"],
"unsupported Catalysis must be removed while battery-specific tags remain");
assert.equal(context.cleanHashtag_("#Battery-Research"), "BatteryResearch");
assert.deepEqual(Array.from(context.filterDraftHashtags_(["BatteryResearch", "batteryresearch"], batteryBrief)), ["BatteryResearch"],
  "generated tags should be de-duplicated case-insensitively");

assert.match(source, /Optional theme pool \(suggestions only, not a checklist\)/);
assert.match(source, /id="tagInput"/);
assert.match(source, /id="addTag"/);
assert.match(source, /tagInput\.onkeydown/,
  "the hashtag editor should support adding tags with Enter");

console.log("Hashtag tests passed");
