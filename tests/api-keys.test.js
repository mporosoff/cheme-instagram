const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'..','ig-content-studio.html'),'utf8');
const script=source.match(/<script>([\s\S]*?)<\/script>/)[1].split('/* ===== init ===== */')[0];
function store(){const data=new Map();return{getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,String(v)),removeItem:k=>data.delete(k)};}
function studio(local=store(),session=store()){
  const nodes=[],panels=[];
  const document={getElementById:id=>nodes.findLast(node=>node.id===id&&node.isConnected)||null,querySelectorAll:()=>[]};
  const context=vm.createContext({console,URL,Blob,setTimeout,clearTimeout,localStorage:local,sessionStorage:session,document});
  vm.runInContext(script,context);
  context.modal=html=>{
    const panel={id:'scrim',style:{},isConnected:true,remove(){this.isConnected=false;}};nodes.push(panel);panels.push(panel);
    for(const match of html.matchAll(/<(input|textarea|select|button|div|p|span|img)\b[^>]*\bid="([^"]+)"[^>]*>/g)){
      const node={id:match[2],value:'',checked:/\bchecked\b/.test(match[0]),style:{},focus(){document.focused=this.id;},get isConnected(){return panel.isConnected;}};
      if(match[1]==='textarea')node.value=html.slice(match.index+match[0].length).split('</textarea>')[0];nodes.push(node);
    }
    panel.html=html;
  };
  context.toast=message=>{document.message=message;};
  return{run:code=>vm.runInContext(code,context),context,document,local,session,panels};
}
const s=studio();
s.local.setItem('igs2_key','legacy-anthropic');s.session.setItem('igs2_image_key','legacy-openai');
s.run('openKeyModal()');
assert.equal(s.document.getElementById('keyIn').value,'legacy-anthropic');
assert.equal(s.document.getElementById('imageKeyIn').value,'legacy-openai','existing tab-only OpenAI keys must be available in the shared panel');
assert.equal(s.document.getElementById('rememberApiKey').checked,true);
s.document.getElementById('saveKey').onclick();
const restart=studio(s.local);
assert.equal(restart.run('getApiKey()'),'legacy-anthropic');
assert.equal(restart.run('getImageApiKey()'),'legacy-openai','both keys must survive a new tab/session after Save');
assert.equal(s.session.getItem('igs2_image_key'),'','saving persistently removes stale session copies');
restart.run('openKeyModal()');restart.document.getElementById('imageKeyIn').value='edited-but-cancelled';restart.document.getElementById('closeM').onclick();
assert.equal(restart.run('getImageApiKey()'),'legacy-openai');
restart.run('openKeyModal()');restart.document.getElementById('clearKeys').onclick();restart.document.getElementById('closeM').onclick();
assert.equal(restart.run('getApiKey()'),'legacy-anthropic','clearing fields then cancelling must not remove stored keys');
restart.run('openKeyModal()');restart.document.getElementById('imageKeyIn').value='';restart.document.getElementById('saveKey').onclick();
assert.equal(restart.run('getImageApiKey()'),'');assert.equal(restart.run('getApiKey()'),'legacy-anthropic','one provider may be removed without removing the other');
assert.equal(restart.run('saveApiKeys_("session-anthropic","session-openai",false)'),true);
assert.equal(restart.run('getImageApiKey()'),'session-openai');assert.equal(restart.local.getItem('igs2_key'),'');
restart.run('openKeyModal()');assert.equal(restart.document.getElementById('rememberApiKey').checked,false);restart.document.getElementById('closeM').onclick();
const nextTab=studio(restart.local);assert.equal(nextTab.run('getApiKey()'),'');assert.equal(nextTab.run('getImageApiKey()'),'');
// A partial write failure must roll back both providers, leaving the dialog open.
assert.equal(restart.run('saveApiKeys_("saved-anthropic","saved-openai",true)'),true);
const originalSet=restart.local.setItem;
restart.local.setItem=(key,value)=>{if(key==='igs2_image_key'&&value==='new-openai')throw new Error('quota');originalSet(key,value);};
restart.run('openKeyModal()');restart.document.getElementById('keyIn').value='new-anthropic';restart.document.getElementById('imageKeyIn').value='new-openai';restart.document.getElementById('saveKey').onclick();
assert.match(restart.document.getElementById('apiKeyError').textContent,/Could not save/);
assert.equal(restart.run('getApiKey()'),'saved-anthropic');assert.equal(restart.run('getImageApiKey()'),'saved-openai');
restart.local.setItem=originalSet;
// Shared settings must return to the same image editor, retaining custom prompts.
const flow=studio();flow.run('current={type:"paper",imageSourceBrief:"Thin-film facts"};currentGraphic={headline:"Thin films"};aiArtOptions.method="openai";openAIGraphic_();');
const prompt=flow.document.getElementById('aiPrompt');prompt.value='Keep my custom prompt exactly';prompt.oninput();
flow.document.getElementById('aiDirection').value='Warm palette';flow.document.getElementById('aiManageKeys').onclick();
assert.equal(flow.document.focused,'imageKeyIn');assert.equal(flow.document.getElementById('aiKeyReturn').style.display,'none');
flow.document.getElementById('keyIn').value='anthropic-for-caption';flow.document.getElementById('imageKeyIn').value='openai-for-image';flow.document.getElementById('saveKey').onclick();
assert.equal(flow.document.getElementById('aiPrompt'),prompt);assert.equal(prompt.value,'Keep my custom prompt exactly');
assert.equal(flow.document.getElementById('aiDirection').value,'Warm palette');assert.match(flow.document.getElementById('aiKeyStatus').textContent,/saved in this browser/);
flow.document.getElementById('aiManageKeys').onclick();flow.document.getElementById('closeM').onclick();assert.equal(flow.document.getElementById('aiPrompt'),prompt);
assert.equal(flow.document.getElementById('aiImageKey'),null,'the image dialog must not have a second key-entry location');
(async()=>{
  let received;
  flow.context.generateOpenAIArt_=async(key,prompt,options)=>{received={key,prompt,options};return{dataUrl:'preview-image',alt:'Conceptual artwork'};};
  await flow.document.getElementById('runAIGraphic').onclick();
  assert.equal(received.key,'openai-for-image');assert.equal(received.prompt,'Keep my custom prompt exactly');assert.ok(!JSON.stringify(received).includes('anthropic-for-caption'));
  flow.document.getElementById('aiMethod').value='claude';flow.document.getElementById('aiMethod').oninput();
  flow.context.generateClaudeArt_=async key=>{received={key};return{dataUrl:'diagram',alt:'Diagram'};};
  await flow.document.getElementById('runAIGraphic').onclick();assert.equal(received.key,'anthropic-for-caption');
  // A missing key opens the same panel without starting a provider request.
  flow.run('saveApiKeys_("","",true)');flow.document.getElementById('aiMethod').value='openai';flow.document.getElementById('aiMethod').oninput();
  received=null;await flow.document.getElementById('runAIGraphic').onclick();assert.equal(received,null);assert.equal(flow.document.focused,'imageKeyIn');
  flow.document.getElementById('closeM').onclick();assert.equal(flow.document.getElementById('aiPrompt'),prompt);
  console.log('Shared API key persistence, legacy keys, opt-out, rollback, provider routing and editor continuation passed');
})().catch(error=>{console.error(error);process.exitCode=1;});
