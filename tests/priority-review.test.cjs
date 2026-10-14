const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const C=require('../app/core.js'),AI=require('../app/ai.js');
const check=(before,after)=>AI.validateChanges({changes:[{path:'summary',before,after,reason:'润色'}],warnings:[]},{data:{summary:before}});
for(const [before,after] of [['服务3万人','创造3万元收入'],['带领3名同事','提升效率3%'],['收入3元','收入3万元'],['增长3%','完成3个项目'],['运输3吨','运输3瓶'],['长3英尺','长3英寸'],['测试3widgets','测试3wombats'],['服务3万位客户','新增3万人次']]){
 test('numeric measure changes rejected: '+before+' → '+after,()=>assert.throws(()=>check(before,after),/数字|量级/));
}
for(const [before,after] of [['服务3万人','累计服务 3 万人'],['协助3名同事','协助 3 位同事'],['提高效率3％','效率提高3%'],['负责3个项目','负责 3 个重点项目']]){
 test('same numeric measure allowed: '+before,()=>assert.equal(check(before,after).changes.length,1));
}
test('remainder backups cover every source once with initial blank and partially full libraries',()=>{
 const source=Array.from({length:605},(_,i)=>C.createRecord('源记录'+i));
 let text=C.makeBackup(source),seen=[],batch=0;
 do{const result=C.parseBackup(text,batch++===0?1:250);seen.push(...result.records);text=result.remainingBackup;assert.ok(result.records.length<=300);}while(text);
 assert.deepEqual(seen.map(r=>r.title),source.map(r=>r.title));assert.equal(new Set(seen.map(r=>r.id)).size,605);
 assert.ok(seen.every((r,i)=>r.id!==source[i].id));
});
test('invalid tail rejects a partial backup atomically',()=>{
 const source=Array.from({length:300},()=>C.createRecord());const backup=JSON.parse(C.makeBackup(source));backup.records.push({data:{work:'broken'}});
 assert.throws(()=>C.parseBackup(JSON.stringify(backup),1),/损坏/);
});
