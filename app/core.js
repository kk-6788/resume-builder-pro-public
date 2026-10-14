(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.ResumeCore=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const FIELDS={basic:['name','phone','email','city','job','photo','gender','age','hometown','political','salary','onboard','targetCity'],edu:['school','major','degree','start','end','gpa','courses','honors'],work:['company','position','start','end','desc'],proj:['name','role','start','end','desc'],skills:['name','level'],certs:['name','date']};
const LABELS={summary:'个人简介',edu:'教育经历',work:'工作 / 实习经历',proj:'项目经历',skills:'专业技能',certs:'证书 / 荣誉'};
const TEMPLATES={classic:'经典商务',minimal:'极简现代',card:'清晰卡片',sidebar:'色带侧栏',banner:'通栏色块',editorial:'书卷 · 新增',timeline:'时间线 · 新增',twocol:'双栏商务 · 新增',table:'表格经典 · 新增',whitespace:'高级留白 · 新增',magazine:'现代杂志 · 新增',fresh:'清新多彩 · 新增',skillbar:'技能仪表 · 新增'};
const clone=x=>JSON.parse(JSON.stringify(x));
const uid=()=>typeof crypto!=='undefined'&&crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);
const str=x=>typeof x==='string'?x.slice(0,60000):typeof x==='number'?String(x):'';
function normalizeData(d){
 d=d&&typeof d==='object'?d:{};const out={basic:{},summary:str(d.summary)};
 for(const [section,keys] of Object.entries(FIELDS)){
  const norm=o=>Object.fromEntries(keys.map(k=>[k,section==='skills'&&k==='level'?Math.max(0,Math.min(5,Math.trunc(Number(o?.[k])||0))):str(o?.[k])]));
  out[section]=section==='basic'?norm(d.basic):(Array.isArray(d[section])?d[section].filter(x=>x&&typeof x==='object').slice(0,100).map(norm):[]);
 }
 const photo=d.basic?.photo;
 out.basic.photo=typeof photo==='string'&&/^data:image\/(png|jpeg|webp);base64,[a-z\d+/=]+$/i.test(photo)&&photo.length<1500000?photo:'';
 return out;
}
function normalizeLayout(l={}){
 const keys=Object.keys(LABELS),order=Array.isArray(l.order)?[...new Set(l.order.filter(k=>keys.includes(k)))]:[];
 return {template:TEMPLATES[l.template]?l.template:'classic',color:/^#[\da-f]{6}$/i.test(l.color||'')?l.color:'#315c79',fontSize:Math.min(14,Math.max(10,Number(l.fontSize)||11)),lineHeight:Math.min(1.9,Math.max(1.25,Number(l.lineHeight)||1.5)),gap:Math.min(24,Math.max(6,Number(l.gap)||12)),fitOnePage:l.fitOnePage!==false,order:[...order,...keys.filter(k=>!order.includes(k))],hidden:Array.isArray(l.hidden)?l.hidden.filter(k=>keys.includes(k)):[]};
}
function createRecord(title='未命名简历',data){return {id:uid(),title:str(title)||'未命名简历',updatedAt:new Date().toISOString(),data:normalizeData(data),layout:normalizeLayout(),history:[],sourceText:'',notes:'',jd:'',review:null,factsConfirmed:false};}
function snapshot(r){return {data:normalizeData(r.data),layout:normalizeLayout(r.layout),title:str(r.title),sourceText:str(r.sourceText),notes:str(r.notes),jd:str(r.jd),factsConfirmed:r.factsConfirmed===true};}
function checkpoint(r,label='自动保存'){
 const snap=snapshot(r),prev=r.history?.[0];r.history=Array.isArray(r.history)?r.history:[];
 if(prev&&JSON.stringify(prev.snapshot)===JSON.stringify(snap))return;
 r.history.unshift({id:uid(),at:new Date().toISOString(),label:str(label),snapshot:snap});r.history=r.history.slice(0,5);
}
function restoreVersion(r,id){const v=r.history.find(h=>h.id===id);if(!v)throw Error('这个历史版本已不存在');const target=clone(v.snapshot);checkpoint(r,'恢复前的版本');Object.assign(r,target,{review:null,updatedAt:new Date().toISOString()});}
function fingerprint(r){const l=normalizeLayout(r.layout);const text=JSON.stringify({data:normalizeData(r.data),jd:str(r.jd),notes:str(r.notes),sourceText:str(r.sourceText),factsConfirmed:!!r.factsConfirmed,hidden:l.hidden,order:l.order});let h=2166136261;for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619);}return (h>>>0).toString(16)+':'+text.length;}
function cleanRecord(raw,newId=false){
 if(!raw||typeof raw!=='object'||!raw.data||typeof raw.data!=='object'||Array.isArray(raw.data))throw Error('备份包含损坏的简历，未导入任何内容');
 if(raw.data.basic!==undefined&&(!raw.data.basic||typeof raw.data.basic!=='object'||Array.isArray(raw.data.basic)))throw Error('备份基本信息格式损坏，未导入任何内容');
 for(const k of Object.keys(FIELDS).filter(k=>k!=='basic'))if(raw.data[k]!==undefined&&(!Array.isArray(raw.data[k])||raw.data[k].length>100||raw.data[k].some(x=>!x||typeof x!=='object'||Array.isArray(x))))throw Error('备份经历或技能格式损坏，未导入任何内容');
 const r=createRecord(raw.title,raw.data);Object.assign(r,snapshot({...r,...raw}));
 if(!newId&&typeof raw.id==='string')r.id=raw.id;
 r.updatedAt=typeof raw.updatedAt==='string'?raw.updatedAt:r.updatedAt;
 r.history=Array.isArray(raw.history)?raw.history.slice(0,5).filter(h=>h&&h.snapshot&&h.snapshot.data).map(h=>({id:uid(),at:str(h.at),label:str(h.label),snapshot:snapshot({...createRecord(),...h.snapshot})})):[];
 // AI 审查只在当前会话产生；恢复/迁移后重新检查，避免信任备份中的伪造分数。
 return r;
}
function makeBackup(records){return JSON.stringify({format:'resume-studio',version:2,exportedAt:new Date().toISOString(),records:records.map(r=>({id:r.id,...snapshot(r),updatedAt:r.updatedAt,history:(r.history||[]).slice(0,5).map(h=>({id:h.id,at:h.at,label:h.label,snapshot:snapshot(h.snapshot)}))}))},null,2);}
function parseBackup(text,existingCount=0){
 if(text.length>30*1024*1024)throw Error('备份超过 30 MB，请拆分后导入');
 let b;try{b=JSON.parse(text);}catch{throw Error('这不是有效的 JSON 备份');}
 if(!b||b.format!=='resume-studio'||b.version!==2||!Array.isArray(b.records))throw Error('备份格式或版本不受支持');
 const MAX=300,room=Math.max(0,MAX-existingCount);
 if(b.records.length&&room===0)throw Error(`本机已有 ${existingCount} 份简历，达到 ${MAX} 份上限；请先整理或删除部分简历后再导入。`);
 // Validate the entire file before importing a prefix. The remainder keeps source IDs;
 // each imported batch still receives fresh IDs and never overwrites existing records.
 const cleaned=b.records.map(r=>cleanRecord(r,true)),accepted=cleaned.slice(0,room);
 const remaining=b.records.slice(accepted.length);
 return {records:accepted,remaining:remaining.length,total:b.records.length,limitExceeded:remaining.length>0,
  remainingBackup:remaining.length?JSON.stringify({...b,records:remaining},null,2):null};
}

const RUBRIC=[
 ['match_core','match','核心要求覆盖','目标岗位最重要的工作要求有真实经历对应，而非仅列关键词。'],
 ['match_evidence','match','匹配证据','相关技能有实际工作、项目或学习事例支撑。'],
 ['match_priority','match','内容取舍','最相关经验突出，次要内容没有挤占主要内容。'],
 ['match_level','match','岗位与资历','职责深度和求职方向相符，不虚构高级职责。'],
 ['match_specific','match','针对性','表达针对给定 JD；无 JD 时仅按意向岗位评估通用相关性，不能宣称定制达标。'],
 ['experience_context','experience','任务背景','读者能理解任务和要解决的问题。'],
 ['experience_action','experience','具体行动','说明具体做法、方法或工具，不只列岗位职责。'],
 ['experience_ownership','experience','个人贡献','区分个人完成与团队成果。'],
 ['experience_result','experience','结果与价值','说明可验证结果、交付物或改进，不强求数字。'],
 ['experience_support','experience','事实支撑','没有超出原始材料或本人补充的技能、职位和业绩。'],
 ['expression_clear','expression','清晰简洁','句子清楚，行动直接，易于扫描。'],
 ['expression_concrete','expression','减少空话','避免口号、夸大形容、机械套话和重复。'],
 ['expression_consistent','expression','语言准确','用词、术语、标点一致，无错字与语义矛盾。']
].map(([id,dimension,label,rule])=>({id,dimension,label,rule,max:5}));
function month(s){const m=String(s||'').match(/^(\d{4})[.\-/年](\d{1,2})月?$/);return m&&+m[2]>=1&&+m[2]<=12?+m[1]*12+(+m[2]):null;}
function visibleData(r){const d=normalizeData(r.data);for(const k of normalizeLayout(r.layout).hidden)d[k]=k==='summary'?'':[];return d;}
function createTargetedCopy(source,job,jd=''){
 const target=str(job).trim();if(!target)throw Error('请填写新岗位名称');
 const r=createRecord();Object.assign(r,snapshot(source));
 r.title=(r.data.basic.name||source.title)+' · '+target;r.data.basic.job=target;r.jd=str(jd).trim();r.factsConfirmed=false;
 return r;
}
function plainText(record){
 const d=visibleData(record),b=d.basic,join=xs=>xs.filter(Boolean).join(' · ');
 const contactLabels={phone:'电话',email:'邮箱',city:'所在城市',targetCity:'意向城市',gender:'性别',age:'年龄',hometown:'籍贯',political:'政治面貌',salary:'期望薪资',onboard:'到岗时间'};
 const parts=[[b.name,b.job,...Object.entries(contactLabels).filter(([k])=>b[k]).map(([k,label])=>label+'：'+b[k])].filter(Boolean).join('\n')];
 for(const key of normalizeLayout(record.layout).order){
  let text='';
  if(key==='summary')text=d.summary;
  else if(key==='skills')text=d.skills.map(e=>join([e.name,['','了解','基础','熟练','精通','专家'][e.level]])).filter(Boolean).join('\n');
  else if(key==='certs')text=d.certs.map(e=>join([e.name,e.date])).filter(Boolean).join('\n');
  else text=d[key].map(e=>{
   const title=key==='edu'?join([e.school,e.major,e.degree]):key==='work'?join([e.company,e.position]):join([e.name,e.role]);
   const desc=key==='edu'?[e.gpa?'GPA / 成绩：'+e.gpa:'',e.courses?'主修课程：'+e.courses:'',e.honors?'在校荣誉：'+e.honors:''].filter(Boolean).join('\n'):e.desc;
   return [title,[e.start,e.end].filter(Boolean).join(' — '),desc].filter(Boolean).join('\n');
  }).filter(Boolean).join('\n\n');
  if(text.trim())parts.push(LABELS[key]+'\n'+text.trim());
 }
 return parts.filter(Boolean).join('\n\n');
}
function score(r,metrics={}){
 const d=visibleData(r),issues=[];let info=20,layout=15;
 const add=(path,reason,suggestion,severity='warning',points=0,dimension='info',evidence='')=>{issues.push({path,reason,suggestion,severity,points,dimension,evidence});if(dimension==='info')info-=points;else if(dimension==='layout')layout-=points;};
 if(!d.basic.name.trim())add('basic.name','缺少姓名','填写真实姓名','blocker',4);
 if(!d.basic.phone.trim()&&!d.basic.email.trim())add('basic.phone','缺少有效联系方式','至少填写电话或邮箱','blocker',4);
 if(d.basic.email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.basic.email))add('basic.email','邮箱格式不正确','检查邮箱地址','blocker',2);
 if(d.basic.phone&&!/^\+?[\d ()-]{6,25}$/.test(d.basic.phone))add('basic.phone','电话格式可能不正确','检查国家区号和号码','blocker',2);
 if(!d.basic.job.trim())add('basic.job','缺少目标岗位','填写意向岗位','blocker',3);
 if(!d.edu.some(e=>e.school&&e.degree))add('edu','教育信息不完整','补充学校和学历，或确认是否适合省略','warning',3);
 if(![...d.work,...d.proj].some(e=>e.desc.trim()))add('work','缺少具体经历','添加工作、实习或项目的具体行动与结果','blocker',4);
 for(const k of ['edu','work','proj'])d[k].forEach((e,i)=>{
  const start=month(e.start),end=month(e.end);
  if(!e.start||!e.end)add(k+'.'+i+'.start','经历缺少起止时间','填写 YYYY.MM，结束时间可填“至今”','warning',1);
  if(e.start&&start===null)add(k+'.'+i+'.start','开始日期格式不正确','使用 YYYY.MM，例如 2024.09','blocker',1);
  if(e.end&&end===null&&!/^(至今|现在|在读)$/.test(e.end))add(k+'.'+i+'.end','结束日期格式不正确','使用 YYYY.MM 或“至今”','blocker',1);
  if(start!==null&&end!==null&&start>end)add(k+'.'+i+'.start','开始日期晚于结束日期','核对经历的起止年月','blocker',2);
 });
 const visit=(o,p)=>{if(typeof o==='string'&&/待填写|待添加|你的名字|示例文字|XXX|\[待补|【待补|某某公司/i.test(o))add(p,'仍有占位或示例文字','替换成自己的真实信息','blocker',2,'info',o);else if(o&&typeof o==='object')Object.entries(o).filter(([k])=>k!=='photo').forEach(([k,v])=>visit(v,p?p+'.'+k:k));};visit(d,'');
 if(!r.factsConfirmed)add('factsConfirmed','真实性尚未确认','核对简历中的经历、技能和数字后确认','blocker');
 if(!r.jd?.trim())add('jd','未提供目标岗位描述','粘贴 JD 后才能认证岗位定制交付；仍可导出通用简历');
 if(metrics.overflow)add('layout','存在横向溢出或内容裁切','调整版式或缩短无法换行的内容','blocker',6,'layout');
 if((metrics.minFontSize??metrics.fontSize??r.layout.fontSize)<9.99)add('layout','字号小于 10pt','扩大字号，精简内容，避免勉强塞满一页','blocker',5,'layout');
 if((metrics.pages||1)>1)add('layout','内容超过一页','精简次要内容或隐藏不相关模块，完整内容仍会导出','warning',3,'layout');
 if(metrics.overlap)add('layout','存在元素重叠','调整字号或模板后重新检查','blocker',6,'layout');
 const fresh=r.review?.fingerprint===fingerprint(r)&&Array.isArray(r.review.checks)&&RUBRIC.every(x=>r.review.checks.some(c=>c.id===x.id&&['pass','partial','fail'].includes(c.status)));
 const dims={match:null,experience:null,info:Math.max(0,info),expression:null,layout:Math.max(0,layout)};
 if(fresh){dims.match=0;dims.experience=0;dims.expression=0;
  for(const rule of RUBRIC){const c=r.review.checks.find(x=>x.id===rule.id),earned=c.status==='pass'?5:c.status==='partial'?2.5:0;dims[rule.dimension]+=earned;if(earned<5)issues.push({path:c.path||'work',reason:rule.label+'：'+(c.reason||'证据不足'),suggestion:c.suggestion||'补充对应的真实事例',evidence:c.evidence||'',severity:'warning',points:5-earned,dimension:rule.dimension});}
  for(const issue of r.review.issues||[])issues.push({...issue,severity:issue.severity==='blocker'?'blocker':'warning'});
 }
 const total=fresh?Math.round(Object.values(dims).reduce((a,b)=>a+b,0)):null;
 const blockers=issues.filter(i=>i.severity==='blocker');
 return {dimensions:dims,total,localTotal:dims.info+dims.layout,ready:fresh&&total>=85&&blockers.length===0&&!!r.jd?.trim(),fresh,issues,blockers};
}
function setPath(obj,path,value){const parts=path.split('.');if(parts.some(x=>['__proto__','constructor','prototype'].includes(x)))throw Error('无效字段');let target=obj;for(const p of parts.slice(0,-1)){if(target[p]===undefined)throw Error('字段已变化');target=target[p];}target[parts.at(-1)]=value;}
function getPath(obj,path){return path.split('.').reduce((v,k)=>v?.[k],obj);}
function parseText(text){
 const d=normalizeData(),uncertainties=[];const t=String(text||'');
 d.basic.phone=t.match(/(?:\+86[- ]?)?1[3-9]\d{9}/)?.[0]||'';d.basic.email=t.match(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/i)?.[0]||'';
 d.basic.name=t.match(/姓名\s*[:：]\s*([^\s|，,]{2,20})/)?.[1]||'';d.basic.job=t.match(/(?:求职意向|意向岗位|求职岗位)\s*[:：]?\s*([^\n|]{2,50})/)?.[1]||'';
 for(const k of ['name','phone','email','job'])uncertainties.push({field:'basic.'+k,reason:d.basic[k]?'本地规则提取，请核对':'未识别，请补充'});
 const headings={edu:/^(教育经历|教育背景|学历背景)\s*[:：]?$/,work:/^(工作经历|实习经历|工作\s*[/／]\s*实习经历|实践经历)\s*[:：]?$/,proj:/^(项目经历|校园经历|在校经历|项目实践)\s*[:：]?$/,skills:/^(专业技能|个人技能|技能特长)\s*[:：]?$/,certs:/^(证书荣誉|证书\s*[/／]\s*荣誉|证书|获奖经历)\s*[:：]?$/,summary:/^(自我评价|个人简介|个人总结)\s*[:：]?$/};
 const chunks={};let section='';
 for(const line of t.split(/\r?\n/).map(x=>x.trim()).filter(Boolean)){
  const found=Object.keys(headings).find(k=>headings[k].test(line));if(found){section=found;chunks[section]??=[];continue;}if(section)chunks[section].push(line);
 }
 const timeRE=/(\d{4}[.\-/年]\d{1,2}月?)\s*(?:-|—|–|~|～|至|到)\s*(\d{4}[.\-/年]\d{1,2}月?|至今|现在|在读)/;
 for(const k of ['edu','work','proj']){let cur=null;for(const line of chunks[k]||[]){
   const times=line.match(timeRE),parts=line.replace(timeRE,'').split(/[|｜]/).map(x=>x.trim()).filter(Boolean);
   const school=k==='edu'?line.match(/([\u4e00-\u9fa5A-Za-z·]+(?:大学|学院|学校))/):null;
   const isHeader=parts.length>=2||school;
   if(isHeader){cur=Object.fromEntries(FIELDS[k].map(f=>[f,'']));
    if(k==='edu'){cur.school=school?.[1]||parts[0];cur.degree=parts.find(p=>/^(本科|专科|大专|中专|硕士|博士|高中)$/.test(p))||'';cur.major=parts.find((p,i)=>i>0&&p!==cur.degree)||'';}
    else if(k==='work'){cur.company=parts[0];cur.position=parts[1]||'';}else{cur.name=parts[0];cur.role=parts[1]||'';}
    d[k].push(cur);
   }
   if(times&&cur){cur.start=times[1];cur.end=times[2];}
   if(!isHeader&&!times&&cur){if(k==='edu'){if(/^主修/.test(line))cur.courses=line.replace(/^主修(?:课程)?[:：]?\s*/,'');else cur.honors=[cur.honors,line].filter(Boolean).join('\n');}else cur.desc=[cur.desc,line.replace(/^[●•]\s*/, '')].filter(Boolean).join('\n');}
  }
  d[k].forEach((_,i)=>uncertainties.push({field:k+'.'+i+'.'+(k==='edu'?'school':k==='work'?'company':'name'),reason:'按标题和分隔符提取，请逐项核对日期、单位及描述是否对应'}));
 }
 d.summary=(chunks.summary||[]).join('\n');
 d.skills=(chunks.skills||[]).filter(x=>x.length<160).map(line=>{const parts=line.split(/[:：]/);return {name:parts[0].replace(/^[●•]\s*/,''),level:/专家/.test(parts[1]||'')?5:/精通/.test(parts[1]||'')?4:/熟练/.test(parts[1]||'')?3:/基础/.test(parts[1]||'')?2:/了解/.test(parts[1]||'')?1:0};});
 d.certs=(chunks.certs||[]).map(name=>({name,date:''}));
 if(d.skills.length)uncertainties.push({field:'skills',reason:'请确认技能归类和熟练度'});
 return {data:d,uncertainties,sourceText:t,unparsed:!d.edu.length&&!d.work.length&&!d.proj.length};
}
return {FIELDS,LABELS,TEMPLATES,RUBRIC,clone,uid,normalizeData,normalizeLayout,createRecord,createTargetedCopy,plainText,cleanRecord,snapshot,checkpoint,restoreVersion,fingerprint,makeBackup,parseBackup,score,visibleData,setPath,getPath,parseText};
});
