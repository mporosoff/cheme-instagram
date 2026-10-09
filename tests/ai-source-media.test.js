const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'..','ig-content-studio.html'),'utf8');
const script=source.match(/<script>([\s\S]*?)<\/script>/)[1].split('/* ===== init ===== */')[0];
const fields={figThumb:{innerHTML:'',children:[],appendChild(node){this.children.push(node);}},figDrop:{innerHTML:''},cardDisp:{},doi:{value:'10.1000/paper'},paperText:{value:'Thin-film facts'},paperAngle:{value:''},paperCredit:{value:''}};
const document={getElementById:id=>fields[id]||null,querySelectorAll:()=>[],createElement:()=>{const button={};return{querySelector:()=>button};}};
const storage={getItem:()=>null,setItem:()=>{}};
class FileReader{readAsDataURL(file){this.result=file.dataUrl;this.onload();}}
const context=vm.createContext({console,URL,Blob,setTimeout,clearTimeout,localStorage:storage,sessionStorage:storage,document,FileReader});
vm.runInContext(script,context);
const run=code=>vm.runInContext(code,context);
let draws=0,lastToast='';
context.drawCard=()=>{draws++;};context.renderOutput=()=>{};context.refreshDraftAction_=()=>{};
context.renderLoadedReviewBanner=()=>{};context.renderThumbs=()=>{};context.toast=message=>{lastToast=message;};
run('activeType="paper";reviewSource={submissionId:"paper-1",details:""};current={type:"paper",caption:"Caption",alt_text:"Source image"};currentGraphic={template:"paper",figure:"old-source"};figure={dataUrl:"old-source"};applyAIArt_({dataUrl:"chosen-ai",format:"portrait",alt:"Chosen conceptual image"});');

// Delayed review media must load as source material without replacing the chosen artwork.
run('applyReviewMedia_({submissionId:"paper-1",imageBase64:"bmV3",imageType:"image/png",imageName:"paper-figure.png"});');
assert.equal(run('figure.dataUrl'),'data:image/png;base64,bmV3');
assert.equal(run('currentGraphic.figure'),'chosen-ai');
assert.equal(run('currentGraphic.generatedImage'),true);
assert.equal(run('current.alt_text'),'Chosen conceptual image');
assert.match(run('selectedPaperImage_()'),/chosen-ai/);
assert.equal(draws,0,'arrival of source media must not redraw the selected AI image');

// Adding/removing a paper figure remains a source edit when AI artwork is selected.
run('readFigure({name:"replacement.png",type:"image/png",dataUrl:"uploaded-source"});');
assert.equal(run('figure.dataUrl'),'uploaded-source');
assert.equal(run('currentGraphic.figure'),'chosen-ai');
assert.equal(run('currentGraphic.generatedAlt'),'Chosen conceptual image');
assert.match(lastToast,/selected AI image is still attached/);
const remove=fields.figThumb.children.at(-1).querySelector('button');remove.onclick();
assert.equal(run('figure'),null);
assert.equal(run('currentGraphic.figure'),'chosen-ai');
assert.equal(run('current.alt_text'),'Chosen conceptual image');
assert.match(run('selectedPaperImage_()'),/chosen-ai/);
assert.match(lastToast,/removed.*selected AI image is still attached/);

// Ordinary paper figures still update and clear the visible graphic normally.
run('currentGraphic={template:"paper",figure:null};readFigure({name:"ordinary.png",type:"image/png",dataUrl:"ordinary-source"});');
assert.equal(run('currentGraphic.figure'),'ordinary-source');
fields.figThumb.children.at(-1).querySelector('button').onclick();
assert.equal(run('currentGraphic.figure'),null);
run('applyReviewMedia_({submissionId:"paper-1",imageBase64:"c291cmNl",imageType:"image/jpeg"});');
assert.equal(run('currentGraphic.figure'),'data:image/jpeg;base64,c291cmNl');
assert.equal(draws,3,'ordinary upload, removal and delayed media each update the preview');

// An unrelated submission response is ignored, including its source material.
run('applyReviewMedia_({submissionId:"other-paper",imageBase64:"b3RoZXI="});');
assert.equal(run('figure.dataUrl'),'data:image/jpeg;base64,c291cmNl');

// The shared media loader also preserves a selected AI carousel slide.
run('activeType="photo";current={type:"photo",caption:"Caption",alt_text:"Chosen conceptual image"};currentGraphic={template:"art",generatedImage:true,figure:"chosen-ai"};currentSlides=[{dataUrl:"chosen-ai"}];applyReviewMedia_({submissionId:"paper-1",imageBase64:"cGhvdG8=",imageType:"image/jpeg"});');
assert.equal(run('photos[0].dataUrl'),'data:image/jpeg;base64,cGhvdG8=');
assert.equal(run('currentSlides[0].dataUrl'),'chosen-ai');
assert.equal(run('currentGraphic.figure'),'chosen-ai');
console.log('Selected AI artwork survives source uploads, removals and delayed submission media');
