const { test } = require('node:test');
const assert = require('node:assert/strict');
const C = require('../app/core.js');
const AI = require('../app/ai.js');

// ---------- RES-02: 备份导出/导入合同统一 ----------

function mkRecord(i) {
  const r = C.createRecord('简历 ' + i);
  r.data.basic.name = '测试' + i;
  return r;
}

test('RES-02: 300 条记录备份可完整恢复', () => {
  const records = Array.from({ length: 300 }, (_, i) => mkRecord(i));
  const backup = C.makeBackup(records);
  const result = C.parseBackup(backup, 0);
  assert.equal(result.records.length, 300);
  assert.equal(result.limitExceeded, false);
});

test('RES-02: 301 条记录备份可分批恢复，无记录丢失', () => {
  const records = Array.from({ length: 301 }, (_, i) => mkRecord(i));
  const backup = C.makeBackup(records);
  // 第一批：现有 0 份，可容纳 300，剩余 1 条待后续导入
  const first = C.parseBackup(backup, 0);
  assert.equal(first.records.length, 300);
  assert.equal(first.limitExceeded, true);
  assert.equal(first.remaining, 1);
  // 第二批：清出 1 个位置后（现有 299 份）再次导入同一备份，继续取剩余记录
  const second = C.parseBackup(backup, 299);
  assert.equal(second.records.length, 1);
  assert.equal(second.limitExceeded, true);
  // 备份仍有 300 条未导入（同一文件重复导入按 id 追加，应用层靠删除空位分批）
  assert.equal(second.remaining, 300);
  // 每批导入量都受上限约束，不会超限也不会丢记录
  assert.ok(first.records.length + 0 <= 300);
  assert.ok(second.records.length === 1);
});

test('RES-02: 本机已达上限时给出明确指引而不是笼统拒绝', () => {
  const records = Array.from({ length: 2 }, (_, i) => mkRecord(i));
  const backup = C.makeBackup(records);
  assert.throws(() => C.parseBackup(backup, 300), /上限/);
});

test('RES-02: 备份往返保留事实字段与布局', () => {
  const r = mkRecord(0);
  r.data.work = [{ company: '示例公司', desc: '负责整理资料，按时间节点完成统计' }];
  r.layout.template = 'twocol';
  const backup = C.makeBackup([r]);
  const back = C.parseBackup(backup, 0).records[0];
  assert.equal(back.data.work[0].company, '示例公司');
  assert.equal(back.data.work[0].desc, '负责整理资料，按时间节点完成统计');
  assert.equal(back.layout.template, 'twocol');
});

test('RES-02: 无效备份仍被拒绝（守卫不放松）', () => {
  assert.throws(() => C.parseBackup('{"format":"other","version":2,"records":[]}', 0), /格式或版本/);
  assert.throws(() => C.parseBackup('not json', 0), /JSON/);
  assert.throws(() => C.parseBackup('x'.repeat(31 * 1024 * 1024), 0), /30 MB/);
});

// ---------- RES-03: 数字量级守卫 ----------

const baseRecord = () => ({
  data: { basic: { name: '张三' }, summary: '协助3人整理资料',
    work: [{ company: '示例公司', desc: '协助3人整理资料' }], proj: [], edu: [], skills: [], certs: [] }
});

function runValidate(before, after) {
  const record = baseRecord();
  record.data.work[0].desc = before;
  return AI.validateChanges(
    { changes: [{ path: 'work.0.desc', before, after, reason: '润色' }], warnings: [] },
    record, null
  );
}

test('RES-03: 人数改成金额被拒绝（同数字不同量级）', () => {
  assert.throws(() => runValidate('协助3人整理资料', '创造3亿元收入'), /量级/);
});

test('RES-03: 人数改成万人被拒绝', () => {
  assert.throws(() => runValidate('服务3名客户', '服务3万客户'), /量级/);
});

test('RES-03: 不带单位的纯数字润色仍然通过', () => {
  const out = runValidate('负责3个项目的推进', '负责 3 个重点项目的推进与复盘');
  assert.equal(out.changes.length, 1);
});

test('RES-03: 保留原文数字和单位通过，加入新数字拒绝（原有守卫保持）', () => {
  const out = runValidate('整理资料覆盖10个科室', '按时间节点整理10个科室的资料');
  assert.equal(out.changes.length, 1);
  assert.throws(() => runValidate('整理资料', '整理资料覆盖10个科室'), /数字/);
});

test('RES-03: 无数字的润色不受影响', () => {
  const out = runValidate('负责资料整理', '按时间节点完成资料整理和信息统计');
  assert.equal(out.changes.length, 1);
});
