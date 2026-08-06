const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const source = fs.readFileSync(path.resolve(__dirname, "..", "ig-content-studio.html"), "utf8");

assert.match(source, /name:"Ever Better Light",desc:"Airy serif \+ clean ivory field"/);
assert.match(source, /bg:"#FBFAF6"/,
  "Ever Better Light should use an ivory-white field rather than a yellow field");
assert.doesNotMatch(source, /strokeStyle=s\.accent2;ctx\.lineWidth=26/,
  "Ever Better Light should not draw the distracting blue lens frame");
assert.match(source, /if\(s\.id==="light"\)\{[\s\S]*ctx\.fillRect\(P,H-170,76,7\)/,
  "Ever Better Light should use a restrained footer rule instead of a large yellow band");
assert.doesNotMatch(source, /const meta2=clip\(ctx,g\.meta2\|\|g\.dept/,
  "branded card footers must not repeat the department when detail line 2 is empty");
assert.match(source, /ctx\.font=`600 25px \$\{s\.body\}`[\s\S]*ctx\.fillText\("Department of Chemical &",W-P,43\)/,
  "the top-right department tag should use the former footer typeface at a more legible size");
assert.doesNotMatch(source, /DEPARTMENT OF CHEMICAL &/,
  "the department tag should use the cleaner title-case footer treatment");
assert.match(source, /let y=s\.id==="cobalt"\?190:160/,
  "Cobalt Chevron should give the publication eyebrow breathing room below the header rule");

console.log("Brand preset tests passed");
