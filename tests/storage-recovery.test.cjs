const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {JSDOM}=require('jsdom'),{IDBFactory}=require('fake-indexeddb'),C=require('../app/core.js');
const tick=()=>new Promise(r=>setTimeout(r,35));
async function dbValue(database,value){
 return new Promise((resolve,reject)=>{const req=database.open('ResumeStudio',1);req.onupgradeneeded=()=>req.result.createObjectStore('workspace');req.onerror=()=>reject(req.error);req.onsuccess=()=>{const db=req.result,tx=db.transaction('workspace',value===undefined?'readonly':'readwrite'),store=tx.objectStore('workspace'),op=value===undefined?store.get('library'):store.put(value,'library');tx.oncomplete=()=>{db.close();resolve(op.result);};tx.onerror=()=>reject(tx.error);};});
}
async function setup({saved,database,confirm=true,failWrites=false}={}){
 const dom=new JSDOM(fs.readFileSync('index.html','utf8').replace(/<script[\s\S]*?<\/script>/g,''),{url:'https://resume.test',runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window;
 let prompts=0,downloads=[];
 if(database)w.indexedDB=database;
 w.confirm=()=>{prompts++;return confirm;};w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};w.getComputedStyle=()=>({fontSize:'14.666667px'});
 w.URL.createObjectURL=blob=>{downloads.push(blob);return 'blob:test';};w.URL.revokeObjectURL=()=>{};w.HTMLAnchorElement.prototype.click=function(){};
 if(saved)w.localStorage.setItem('resumeStudioV2',JSON.stringify(saved));
 if(failWrites)w.Storage.prototype.setItem=function(){throw Error('quota test');};
 for(const name of ['core','jobs','render','ai'])w.eval(fs.readFileSync('app/'+name+'.js','utf8'));
 w.ResumeServices={};w.eval(fs.readFileSync('app/app.js','utf8'));await tick();
 return {dom,w,doc:w.document,downloads,prompts:()=>prompts,local:()=>JSON.parse(w.localStorage.getItem('resumeStudioV2')),input(value){const el=w.document.querySelector('[data-field="basic.name"]');el.value=value;el.dispatchEvent(new w.Event('input',{bubbles:true}));},async upload(text){const el=w.document.querySelector('#backup-file');Object.defineProperty(el,'files',{configurable:true,value:[{size:text.length,text:async()=>text}]});el.dispatchEvent(new w.Event('change'));await tick();},readBlob:blob=>new Promise((resolve,reject)=>{const reader=new w.FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsText(blob);})};
}
function library(title,revision=0){const record=C.createRecord(title);record.data.basic.name=title;return {records:[record],active:record.id,revision};}

test('fallback edits migrate after IndexedDB becomes available and empty',async()=>{
 const first=await setup({saved:library('客户原稿')});let saved;
 try{first.input('客户修改后的内容');await tick();saved=first.local();}finally{first.dom.window.close();}
 const database=new IDBFactory(),second=await setup({saved,database});
 try{assert.equal(second.doc.querySelector('[data-field="basic.name"]').value,'客户修改后的内容');const stored=await dbValue(database);assert.equal(stored.records[0].data.basic.name,'客户修改后的内容');assert.equal(second.local(),null);assert.equal(second.prompts(),0);}finally{second.dom.window.close();}
});
test('populated backends require a choice, then use IndexedDB revision for migration',async()=>{
 const database=new IDBFactory();await dbValue(database,library('旧主存储',9));
 const t=await setup({saved:library('新备用内容',2),database});
 try{assert.equal(t.prompts(),1);const stored=await dbValue(database);assert.equal(stored.records[0].title,'新备用内容');assert.equal(stored.revision,10);assert.equal(t.local(),null);}finally{t.dom.window.close();}
});
test('declining fallback recovery preserves both stores',async()=>{
 const database=new IDBFactory();await dbValue(database,library('主存储',9));const fallback=library('备用内容',2),t=await setup({saved:fallback,database,confirm:false});
 try{assert.equal(t.prompts(),1);assert.equal((await dbValue(database)).records[0].title,'主存储');assert.deepEqual(t.local(),fallback);}finally{t.dom.window.close();}
});
test('migration transaction abort keeps fallback bytes and shows a save failure',async()=>{
 const database=new IDBFactory(),original=database.open.bind(database);
 database.open=(...args)=>{const req=original(...args);req.addEventListener('success',()=>{const db=req.result,transaction=db.transaction.bind(db);db.transaction=(...a)=>{const tx=transaction(...a);if(a[1]==='readwrite')queueMicrotask(()=>tx.abort());return tx;};});return req;};
 const fallback=library('唯一客户资料',4),t=await setup({saved:fallback,database});
 try{assert.deepEqual(t.local(),fallback);assert.match(t.doc.querySelector('#save-status').textContent,/失败/);assert.equal(t.doc.querySelector('[data-field="basic.name"]').value,'唯一客户资料');}finally{t.dom.window.close();}
});
test('partial restore downloads only the unimported tail after persistence succeeds',async()=>{
 const t=await setup({saved:library('现有简历')});
 try{const source=Array.from({length:301},(_,i)=>C.createRecord('源'+i));await t.upload(C.makeBackup(source));assert.equal(t.local().records.length,300);assert.equal(t.downloads.length,1);const remainder=JSON.parse(await t.readBlob(t.downloads[0]));assert.deepEqual(remainder.records.map(r=>r.title),['源299','源300']);assert.match(t.doc.querySelector('#toast').textContent,/剩余文件/);}finally{t.dom.window.close();}
});
test('failed restore does not advance the remainder or duplicate unsaved records on retry',async()=>{
 const saved=library('原简历'),t=await setup({saved,failWrites:true});
 try{const source=Array.from({length:301},(_,i)=>C.createRecord('源'+i));await t.upload(C.makeBackup(source));assert.equal(t.downloads.length,0);assert.deepEqual(t.local(),saved);assert.equal(t.doc.querySelectorAll('.resume-card').length,1);await t.upload(C.makeBackup(source));assert.equal(t.doc.querySelectorAll('.resume-card').length,1);assert.match(t.doc.querySelector('#save-status').textContent,/失败/);}finally{t.dom.window.close();}
});
