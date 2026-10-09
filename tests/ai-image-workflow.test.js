const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'..','ig-content-studio.html'),'utf8');
const script=source.match(/<script>([\s\S]*?)<\/script>/)[1].split('/* ===== init ===== */')[0];
function store(){const data=new Map();return{getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,String(value)),removeItem:key=>data.delete(key)};}
function decode(text){return text.replace(/&(amp|lt|gt|quot|#39);/g,(_,entity)=>({amp:'&',lt:'<',gt:'>',quot:'"','#39':"'"})[entity]);}
function deferred(){let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return{promise,resolve,reject};}
function studio(local=store()){
  const nodes=[],copies=[],panels=[];
  const document={getElementById:id=>nodes.findLast(node=>node.id===id&&node.isConnected)||null,querySelectorAll:()=>[]};
  const context=vm.createContext({console,URL,Blob,setTimeout,clearTimeout,localStorage:local,sessionStorage:store(),document});
  vm.runInContext(script,context);
  context.modal=html=>{
    const panel={id:'scrim',style:{},isConnected:true,remove(){this.isConnected=false;}};nodes.push(panel);panels.push(panel);
    for(const match of html.matchAll(/<(input|textarea|select|button|div|p|span|img)\b[^>]*\bid="([^"]+)"[^>]*>/g)){
      const node={id:match[2],value:'',checked:/\bchecked\b/.test(match[0]),hidden:/\bhidden\b/.test(match[0]),disabled:/\bdisabled\b/.test(match[0]),style:{},focus(){document.focused=this.id;},get isConnected(){return panel.isConnected;}};
      if(match[1]==='textarea')node.value=decode(html.slice(match.index+match[0].length).split('</textarea>')[0]);
      nodes.push(node);
    }
  };
  context.renderOutput=()=>{};
  context.toast=message=>{document.message=message;};
  context.copy=(text,message)=>{copies.push(text);document.message=message;};
  context.sourceData={brief:'Nickel oxide thin films respond to surface treatment.',sourceKey:'doi:10.1000/film',headlineHint:'Surface treatment and conductivity'};
  context.buildSourceBrief_=()=>({...context.sourceData});
  const run=code=>vm.runInContext(code,context);
  const element=id=>{const node=document.getElementById(id);assert.ok(node,`Missing visible element ${id}`);return node;};
  const input=(id,value)=>{const node=element(id);node.value=value;if(node.oninput)node.oninput();return node;};
  const click=id=>element(id).onclick();
  run('initOutput({caption:"",headline:"Thin films",hashtags:[]},buildSourceBrief_())');
  return{local,context,document,panels,copies,run,element,input,click,open:()=>run('openAIGraphic_()'),close:()=>click('closeAI')};
}
async function main(){
  // A real generator is the default; an explicit choice survives opening a new Studio.
  const empty=studio();assert.equal(empty.run('preferredAIArtMethod_()'),'openai');empty.open();
  assert.equal(empty.element('aiMethod').value,'openai');assert.match(empty.element('runAIGraphic').textContent,/Add OpenAI key/);
  const ready=studio();ready.run('saveApiKeys_("","openai-test-key",true)');assert.equal(ready.run('preferredAIArtMethod_()'),'openai');
  const claude=studio();claude.run('saveApiKeys_("anthropic-test-key","",true)');assert.equal(claude.run('preferredAIArtMethod_()'),'claude');
  empty.input('aiMethod','prompt');const restarted=studio(empty.local);restarted.open();assert.equal(restarted.element('aiMethod').value,'prompt');
  let promptRequests=0;restarted.context.generateOpenAIArt_=async()=>{promptRequests++;};restarted.context.generateClaudeArt_=async()=>{promptRequests++;};
  assert.equal(restarted.element('runAIGraphic').hidden,false,'prompt-only mode must still present a clear primary action');
  assert.match(restarted.element('runAIGraphic').textContent,/Copy prompt/);await restarted.click('runAIGraphic');
  assert.equal(promptRequests,0);assert.equal(restarted.copies[0],restarted.element('aiPrompt').value);assert.match(restarted.element('aiStatus').textContent,/Upload generated image/);

  const flow=ready;flow.open();let requests=0,requestData;
  flow.context.generateOpenAIArt_=async(key,prompt,options)=>{requests++;requestData={key,prompt,options};return{dataUrl:'first-image',alt:'Initial preview description'};};
  await flow.click('runAIGraphic');assert.equal(requests,1);assert.equal(flow.element('aiResult').hidden,false);assert.equal(flow.run('currentGraphic.generatedImage'),undefined,'a preview must not attach itself to the post');
  flow.input('aiSource','Reviewed source facts & evidence');flow.input('aiDirection','A warm color palette');flow.input('aiStyle','analogy');
  flow.input('aiAudience','student');flow.input('aiText','none');flow.input('aiFormat','square');flow.input('aiQuality','high');
  flow.input('aiPrompt','Keep my exact custom prompt <with> & symbols');flow.input('aiResultAlt','My reviewed image description');
  // Closing also saves the latest values when the browser has not delivered an input event yet.
  flow.element('aiDirection').value='Latest direction before closing';flow.close();flow.open();
  for(const [id,value] of Object.entries({aiSource:'Reviewed source facts & evidence',aiDirection:'Latest direction before closing',aiStyle:'analogy',aiAudience:'student',aiText:'none',aiFormat:'square',aiQuality:'high',aiPrompt:'Keep my exact custom prompt <with> & symbols',aiResultAlt:'My reviewed image description'}))assert.equal(flow.element(id).value,value,`${id} must survive reopening`);
  assert.equal(flow.element('aiResultImage').src,'first-image');

  // A reopened editor follows the same pending request and cannot submit a duplicate.
  const pending=deferred();flow.context.generateOpenAIArt_=async(key,prompt,options)=>{requests++;requestData={key,prompt,options};return pending.promise;};
  const waiting=flow.click('runAIGraphic');assert.equal(flow.element('runAIGraphic').disabled,true);flow.close();flow.open();
  assert.equal(flow.element('runAIGraphic').disabled,true);assert.equal(flow.element('useAIImage').disabled,true);assert.equal(flow.element('aiImportImage').disabled,true);
  assert.match(flow.element('aiStatus').textContent,/Creating your image/);await flow.click('runAIGraphic');assert.equal(requests,2,'reopening or clicking again must not duplicate the API request');
  pending.resolve({dataUrl:'second-image',alt:'Fresh generated description'});await waiting;
  assert.equal(requestData.prompt,'Keep my exact custom prompt <with> & symbols');assert.equal(requestData.options.format,'square');assert.equal(requestData.options.quality,'high');
  assert.equal(flow.element('aiResultImage').src,'second-image');assert.equal(flow.element('runAIGraphic').disabled,false);assert.equal(flow.element('useAIImage').disabled,false);assert.equal(flow.element('aiImportImage').disabled,false);
  assert.equal(flow.run('aiArtBusy'),false);assert.equal(flow.run('current.aiArtSession.busy'),false);

  // Provider completion can safely update the image editor behind the shared key dialog.
  const keyFlow=studio();keyFlow.run('saveApiKeys_("","openai-test-key",true)');keyFlow.open();const duringKeys=deferred();
  keyFlow.context.generateOpenAIArt_=()=>duringKeys.promise;const keyRequest=keyFlow.click('runAIGraphic');const originalEditor=keyFlow.element('scrim');
  keyFlow.click('aiManageKeys');assert.equal(keyFlow.element('aiKeyReturn'),originalEditor);assert.equal(originalEditor.style.display,'none');
  const keyPanel=keyFlow.element('scrim');duringKeys.resolve({dataUrl:'image-while-editing-keys',alt:'Conceptual film diagram'});await keyRequest;
  assert.equal(keyFlow.element('scrim'),keyPanel,'provider completion must not dismiss the key settings');assert.equal(keyFlow.element('aiResultImage').src,'image-while-editing-keys');
  keyFlow.click('saveKey');assert.equal(keyFlow.element('scrim'),originalEditor);assert.equal(originalEditor.style.display,'');assert.equal(keyFlow.element('useAIImage').disabled,false);
  assert.equal(keyFlow.element('aiResultImage').src,'image-while-editing-keys');keyFlow.click('useAIImage');assert.equal(keyFlow.run('currentGraphic.figure'),'image-while-editing-keys');

  // Caption initialization must keep an unselected candidate and its editable session.
  const session=flow.run('current.aiArtSession');flow.close();flow.run('initOutput({caption:"A grounded caption",headline:"Reworded headline",hashtags:[]},buildSourceBrief_())');
  assert.equal(flow.run('current.aiArtSession'),session);flow.open();assert.equal(flow.element('aiResultImage').src,'second-image');
  assert.equal(flow.element('aiPrompt').value,'Keep my exact custom prompt <with> & symbols');
  flow.input('aiResultAlt','Reviewed description of the selected image');flow.click('useAIImage');
  assert.equal(flow.document.getElementById('scrim'),null);assert.equal(flow.run('currentGraphic.figure'),'second-image');assert.equal(flow.run('currentGraphic.template'),'art-square');
  assert.equal(flow.run('current.alt_text'),'Reviewed description of the selected image');assert.equal(flow.run('activeTab'),'caption');
  flow.run('initOutput({caption:"New caption",headline:"A different caption headline",hashtags:[]},buildSourceBrief_())');
  assert.equal(flow.run('currentGraphic.figure'),'second-image');assert.equal(flow.run('current.aiArtSession'),session);assert.equal(flow.run('current.alt_text'),'Reviewed description of the selected image');
  flow.open();assert.equal(flow.element('aiResultImage').src,'second-image');assert.match(flow.element('runAIGraphic').textContent,/Generate another/);

  // An error releases the controls while retaining the prior reviewed candidate and selected image.
  flow.context.generateOpenAIArt_=async()=>{requests++;throw new Error('The image service reached a rate or account balance limit.');};
  await flow.click('runAIGraphic');assert.match(flow.element('aiStatus').textContent,/account balance limit/);
  assert.equal(flow.element('aiResultImage').src,'second-image');assert.equal(flow.element('aiResultAlt').value,'Reviewed description of the selected image');
  assert.equal(flow.run('currentGraphic.figure'),'second-image');assert.equal(flow.run('aiArtBusy'),false);assert.equal(flow.element('runAIGraphic').disabled,false);
  flow.close();flow.open();assert.match(flow.element('aiStatus').textContent,/account balance limit/);
  flow.context.generateOpenAIArt_=async()=>({dataUrl:'replacement-preview',alt:'Replacement illustration'});await flow.click('runAIGraphic');
  assert.equal(flow.element('aiResultImage').src,'replacement-preview');assert.equal(flow.run('currentGraphic.figure'),'second-image','regeneration must await explicit selection before replacing the attached image');
  flow.click('useAIImage');assert.equal(flow.run('currentGraphic.figure'),'replacement-preview');flow.open();assert.equal(flow.element('aiResultImage').src,'replacement-preview');flow.close();

  // Results generated for a replaced draft must never become a candidate for the new paper.
  const stale=studio();stale.run('saveApiKeys_("","openai-test-key",true)');stale.open();const obsolete=deferred();
  stale.context.generateOpenAIArt_=()=>obsolete.promise;const obsoleteRequest=stale.click('runAIGraphic');
  stale.context.sourceData={brief:'A different paper about membranes.',sourceKey:'doi:10.1000/membrane',headlineHint:'Membranes'};
  stale.close();stale.run('initOutput({caption:"New paper",hashtags:[]},buildSourceBrief_())');stale.open();
  obsolete.resolve({dataUrl:'wrong-paper-image',alt:'Old paper'});await obsoleteRequest;
  assert.equal(stale.run('current.aiArtSession.candidate'),null);assert.equal(stale.element('aiResult').hidden,true);assert.equal(stale.run('currentGraphic.generatedImage'),undefined);assert.equal(stale.run('aiArtBusy'),false);

  // Correcting the same paper while a provider request runs also invalidates the old facts.
  const changedFacts=studio();changedFacts.run('saveApiKeys_("","openai-test-key",true)');changedFacts.open();const earlierFacts=deferred();
  changedFacts.context.generateOpenAIArt_=()=>earlierFacts.promise;const earlierRequest=changedFacts.click('runAIGraphic');
  changedFacts.context.sourceData.brief='Corrected facts entered while image generation is pending.';
  earlierFacts.resolve({dataUrl:'outdated-facts-image',alt:'Outdated illustration'});await earlierRequest;
  assert.equal(changedFacts.run('current.aiArtSession.candidate'),null,'same DOI must not allow an image generated from facts that changed during the request');
  assert.equal(changedFacts.element('aiResult').hidden,true);assert.equal(changedFacts.element('runAIGraphic').disabled,false);assert.equal(changedFacts.run('aiArtBusy'),false);

  // Correcting source facts inside the image editor invalidates only the pending result.
  const editedFacts=studio();editedFacts.run('saveApiKeys_("","openai-test-key",true)');editedFacts.open();
  editedFacts.context.generateOpenAIArt_=async()=>({dataUrl:'earlier-reviewed-candidate',alt:'Earlier reviewed description'});await editedFacts.click('runAIGraphic');
  const changedInEditor=deferred();editedFacts.context.generateOpenAIArt_=()=>changedInEditor.promise;const editorRequest=editedFacts.click('runAIGraphic');
  editedFacts.input('aiSource','Corrected evidence entered in the source editor');changedInEditor.resolve({dataUrl:'superseded-modal-facts-image',alt:'Incorrect earlier facts'});await editorRequest;
  assert.equal(editedFacts.element('aiResultImage').src,'earlier-reviewed-candidate');assert.equal(editedFacts.element('aiResultAlt').value,'Earlier reviewed description');
  assert.equal(editedFacts.element('aiSource').value,'Corrected evidence entered in the source editor');assert.match(editedFacts.element('aiStatus').textContent,/facts changed during generation/);
  assert.equal(editedFacts.element('runAIGraphic').disabled,false);assert.equal(editedFacts.run('aiArtBusy'),false);

  // A source change with the same DOI updates automatic source/prompt text on reopening.
  const corrected=studio();corrected.open();const originalPrompt=corrected.element('aiPrompt').value;corrected.close();
  corrected.context.sourceData.brief='Corrected abstract: the treatment reduces conductivity.';
  corrected.run('initOutput({caption:"Corrected caption",hashtags:[]},buildSourceBrief_())');corrected.open();
  assert.equal(corrected.element('aiSource').value,corrected.context.sourceData.brief);assert.notEqual(corrected.element('aiPrompt').value,originalPrompt);
  assert.match(corrected.element('aiPrompt').value,/reduces conductivity/);assert.match(corrected.element('aiStatus').textContent,/paper details changed/);
  corrected.input('aiSource','Manually checked source facts');corrected.input('aiPrompt','My reviewed custom prompt');corrected.close();
  corrected.context.sourceData.brief='Another corrected abstract for the same DOI.';
  corrected.run('initOutput({caption:"Another caption",hashtags:[]},buildSourceBrief_())');corrected.open();
  assert.equal(corrected.element('aiSource').value,'Manually checked source facts');assert.equal(corrected.element('aiPrompt').value,'My reviewed custom prompt');
  console.log('AI image defaults, visible actions, editor persistence, async lifecycle, selection, caption carryover, stale responses and error recovery passed');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
