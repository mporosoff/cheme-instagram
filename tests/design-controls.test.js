const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(path.resolve(__dirname, "..", "ig-content-studio.html"), "utf8");
const script = source.match(/<script>([\s\S]*?)<\/script>/)[1].split("/* ===== init ===== */")[0];
const storage = new Map();
const storageApi = {getItem: key => storage.get(key) || null, setItem: (key, value) => storage.set(key, value)};
const context = vm.createContext({localStorage: storageApi, sessionStorage: storageApi, console, setTimeout, clearTimeout,
  document:{getElementById:()=>null}, Blob, URL});
vm.runInContext(script, context);
const run = code => vm.runInContext(code, context);
const json = code => JSON.parse(run(`JSON.stringify(${code})`));

const design = json('normalizeDesign_({titleSize:500,bodySize:-10,gap:NaN,focusX:250,bg:"red",font:"remote-font",showLogo:false,showDept:"false",headline:"stale",apiKey:"secret"},{stylePreset:"editorial"})');
assert.equal(design.titleSize,108);
assert.equal(design.bodySize,24);
assert.equal(design.gap,28);
assert.equal(design.focusX,100);
assert.equal(design.bg,"#FFFFFF");
assert.equal(design.font,"serif");
assert.equal(design.showLogo,false);
assert.equal(design.showDept,true);
assert.equal(design.headline,undefined);
assert.equal(design.apiKey,undefined);
assert.equal(json('normalizeDesign_(null,{stylePreset:"__proto__"})').bg,"#001E5F");

run('currentGraphic={stylePreset:"blueprint",theme:"dark",imageFit:"cover",headline:"Keep this headline",figure:"photo",design:{align:"right",bg:"#123456"}};current={caption:"Keep this caption"};');
const recipe = json('addDesignPreset_("  My series  ",currentGraphic)');
assert.equal(recipe.name,"My series");
assert.equal(recipe.design.align,"right");
assert.equal(recipe.headline,undefined);
assert.equal(recipe.figure,undefined);
assert.equal(recipe.design.bg,"#123456");
assert.throws(()=>run('addDesignPreset_("my series",currentGraphic)'),/different name/);
assert.throws(()=>run('addDesignPreset_("  ",currentGraphic)'),/name/);
run('currentGraphic.design.bg="#654321";');
assert.equal(json('getDesignPresets_()')[0].design.bg,"#123456","saving snapshots the look independently of later edits");
run('rememberDesign_();applyDesign_(getDesignPresets_()[0]);');
assert.equal(run('currentGraphic.headline'),"Keep this headline");
assert.equal(run('current.caption'),"Keep this caption");
assert.equal(run('currentGraphic.figure'),"photo");
assert.equal(run('currentGraphic.design.bg'),"#123456");
run('applyDesign_(designHistory.pop());');
assert.equal(run('currentGraphic.design.bg'),"#654321");
run('rememberDesign_("titleSize");currentGraphic.design.titleSize=60;rememberDesign_("titleSize");currentGraphic.design.titleSize=65;');
assert.equal(run('designHistory.length'),1,"a continuous slider edit should be one undo step");
const selected = json(`defaultDesign_({stylePreset:${JSON.stringify('saved:'+recipe.id)}})`);
assert.equal(selected.design.bg,"#123456");
assert.equal(selected.imageFit,"cover");
assert.equal(json('defaultDesign_({stylePreset:"saved:missing"})').stylePreset,"rochester");
run('renderOutput=()=>{};renderTab=()=>{};');
context.defaultId='saved:'+recipe.id;
run('localStorage.setItem("igs2_settings",JSON.stringify({...DEFAULTS,stylePreset:defaultId}));activeType="paper";initOutput({headline:"A fresh story",caption:"New caption"},{brief:"Materials research"});');
assert.equal(run('currentGraphic.design.bg'),"#123456","new posts must resolve the saved default in initOutput");
assert.equal(run('currentGraphic.headline'),"A fresh story");
assert.equal(run('currentGraphic.imageFit'),"cover");
assert.equal(run('designHistory.length'),0,"new posts begin with an independent undo history");

context.importText=JSON.stringify({type:"cheme-design-presets",version:1,presets:[{...recipe,headline:"Do not import",apiKey:"secret"}]});
assert.equal(run('importDesignPresets_(importText)'),1);
const imported = json('getDesignPresets_()');
assert.equal(imported[1].name,"My series (2)");
assert.equal(imported[1].headline,undefined);
assert.equal(imported[1].apiKey,undefined);
context.importText=JSON.stringify({type:"cheme-design-presets",version:1,presets:[recipe,{name:"invalid"}]});
assert.throws(()=>run('importDesignPresets_(importText)'),/No presets were imported/);
assert.equal(json('getDesignPresets_()').length,2,"invalid imports leave the entire library intact");
assert.throws(()=>run('parseDesignImport_("not json")'),/not valid/);
assert.throws(()=>run('parseDesignImport_(" ".repeat(100001))'),/100 KB/);
run('localStorage.setItem(DESIGN_STORAGE,"{}");');
assert.deepEqual(json('getDesignPresets_()'),[]);
run('localStorage.setItem(DESIGN_STORAGE,"corrupt json");');
assert.deepEqual(json('getDesignPresets_()'),[]);
run('toast=message=>{globalThis.lastToast=message;};');
context.localStorage={getItem:storageApi.getItem,setItem:()=>{throw new Error("quota");}};
assert.equal(run('addDesignPreset_("Cannot save",currentGraphic)'),null);
assert.match(run('lastToast'),/Could not save presets/);
context.localStorage=storageApi;

function canvasContext() {
  const ctx = {font:"600 24px Inter", textAlign:"left", textBaseline:"top", records:[],
    measureText(text){return {width:Array.from(String(text)).length * (Number(this.font.match(/([\d.]+)px/)?.[1])||24)*.52};},
    fillText(text,x,y){this.records.push({type:"text",text,x,y,width:this.measureText(text).width,font:this.font,align:this.textAlign});},
    drawImage(...args){assert.ok(args.slice(1).every(Number.isFinite));assert.ok(args.at(-1)>0&&args.at(-2)>0);this.records.push({type:"image",args});},
    createLinearGradient(){return {addColorStop(){}};}
  };
  for(const name of ["save","restore","clearRect","fillRect","strokeRect","beginPath","moveTo","lineTo","arcTo","closePath","clip","fill","stroke"])ctx[name]=()=>{};
  return ctx;
}
context.ctx=canvasContext();
const fitted=json('designText_(ctx,"First line\\n"+"Unbroken".repeat(100),{x:40,y:40,w:240,h:160},{size:60,min:24})');
assert.equal(fitted.overflow,true);
assert.ok(fitted.height<=160);
assert.ok(context.ctx.records.every(record=>record.width<=240));
assert.ok(context.ctx.records.at(-1).text.endsWith("…"));
assert.deepEqual(json('designWrap_(ctx,"First\\nSecond",1000)'),["First","Second"]);
context.img={width:1600,height:900};
run('designCover_(ctx,img,{x:0,y:0,w:500,h:900},{focusX:100,focusY:0});');
const crop=context.ctx.records.at(-1).args;
assert.equal(crop[1]+crop[3],1600,"right focal position reaches the right edge of the image");
assert.equal(crop[2],0);

for(const preset of json('Object.keys(STYLE_PRESETS)')) {
  for(const template of ["paper","event","quote","photo","reel"]) {
    context.ctx=canvasContext();context.preset=preset;context.template=template;
    const result=json('drawFlexibleCard_(ctx,{stylePreset:preset,template,headline:"Small pores. Big possibilities.",subhead:"Materials for water reuse.",pull_quote:"Every discovery starts with a question.",eyebrow:"Student research",dept:"Chemical & Sustainability Engineering",handle:"@ur.cheme",meta1:"Our department",meta2:"Fall 2026",imageFit:"cover",design:{padding:110,titleSize:108,bodySize:44,gap:52,imageShare:55}},img,1080,template==="reel"?1920:template==="photo"?1350:1080,null)');
    assert.equal(typeof result.overflow,"boolean");
    for(const record of context.ctx.records.filter(record=>record.type==="text")){
      const left=record.align==="right"?record.x-record.width:record.align==="center"?record.x-record.width/2:record.x;
      assert.ok(left>=0&&left+record.width<=1081,`${preset}/${template}: text stays inside the canvas`);
      assert.ok(record.y>=0&&record.y<(template==="reel"?1920:template==="photo"?1350:1080));
    }
  }
}
(async()=>{
  // Both manual creation and AI drafting resolve the same design defaults.
  const errBox={innerHTML:""};
  context.document={getElementById:id=>id==="srcErr"?errBox:null};
  context.fetch=async(url,options)=>{context.sentPrompt=JSON.parse(options.body);return{ok:true,status:200,json:async()=>({content:[{type:"text",text:JSON.stringify({headline:"A new question",caption:"Grounded in the source",hashtags:[]})}]})};};
  run('getApiKey=()=>"test-key";buildBrief=()=>({brief:"Research on water reuse",withImage:false});val=id=>id==="creativeDirection"?"Lead with a question about the students":"";setLoading=()=>{};');
  await run('draft()');
  assert.match(context.sentPrompt.system,/Lead with a question about the students/);
  assert.match(context.sentPrompt.system,/graphic wording only/);
  assert.equal(run('current.caption'),"Grounded in the source\n\nRead the paper via the link in bio.");
  assert.equal(errBox.innerHTML,"");

  // A slow image from an older render must not replace the latest edited preview.
  context.ctx=canvasContext();
  const canvas={id:"cardDisp",getContext:()=>context.ctx};
  context.document={getElementById:id=>id==="cardDisp"?canvas:null};
  const pending={};
  context.loadImg=source=>new Promise(resolve=>{pending[source]=resolve;});
  run('fontsReady=true;current={type:"paper"};currentGraphic={template:"paper",stylePreset:"blueprint",headline:"Old headline",figure:"old-image",design:{showLogo:false,showDept:false,showHandle:false,showDetails:false}};');
  const oldRender=run('drawCard("cardDisp")');
  await new Promise(resolve=>setImmediate(resolve));
  run('currentGraphic.headline="Latest headline";currentGraphic.figure="new-image";');
  const newRender=run('drawCard("cardDisp")');
  await new Promise(resolve=>setImmediate(resolve));
  pending["new-image"](context.img);await newRender;
  pending["old-image"](context.img);await oldRender;
  const texts=context.ctx.records.filter(r=>r.type==="text").map(r=>r.text).join(" ");
  assert.match(texts,/Latest headline/);
  assert.doesNotMatch(texts,/Old headline/);
  console.log("Design controls, preset persistence, import safety, render bounds, and preview races passed");
})().catch(error=>{console.error(error);process.exitCode=1;});
