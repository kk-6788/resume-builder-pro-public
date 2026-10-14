# 简历工作台 2.0 实施计划

用户已确认范围并授权实施（2026-09-09）。目标：桌面 EXE + 浏览器共享轻量工作台，保留现有功能，改善材料、质量与交付流程。

## 已确定的标准
- 多份简历；每份最近 5 个历史版本；备份/恢复不包含 API Key。
- PDF、DOCX、图片和文本导入，先核对再新建，不能覆盖当前简历。
- AI 追问最多 5 项；不编造事实；润色逐项对比确认；可撤销。
- 交付：岗位匹配 25、经历贡献 25、信息一致 20、表达 15、排版 15；总分 ≥85 且无阻断问题。无 JD 不认证岗位定制达标。AI 未完成审查不伪称完成。
- 优先一页，字号不低于 10pt；超过仍完整显示并提示精简。模块排序/隐藏，7 个版式。
- 导出 PDF、DOCX 和自定义水印 PNG；正式文件无水印。
- DeepSeek / Agnes / 自定义 OpenAI 兼容服务，用户自填 Key。无账号、收费、同步。

## 实现与文件边界
- `app/core.js`：UMD 纯函数、规范化、历史、备份、评分规则。`tests/core.test.cjs` 使用 Node 原生测试。
- `app/render.js`、`app/resume.css`：统一简历内容、七模板、一页压缩测量；供预览和导出。
- `app/app.js`、`app/style.css`、`index.html`：简历列表、编辑器、对话框、核对、质量工作流。
- `app/services.js`：UMD，浏览器全局 `ResumeServices`，导出 DOCX/PNG、PDF 与 Word 读取；依赖本地 vendor。
- `app/ai.js`：UMD，浏览器全局 `ResumeAI`，接口配置/请求/模型发现/结构化提取/润色/审查。
- `desktop/main.cjs`、`desktop/preload.cjs`：Electron 桌面壳，隔离上下文，只暴露受控请求和导出；打包脚本白名单，不包含旧客户文件。

## 数据契约
简历 record：`{id,title,updatedAt,data,layout,history,sourceText,notes,jd,review,factsConfirmed}`。
data 沿用旧版：`{basic:{name,phone,email,city,job,photo,gender,age,hometown,political,salary,onboard,targetCity},edu:[{school,major,degree,start,end,gpa,courses,honors}],work:[{company,position,start,end,desc}],proj:[{name,role,start,end,desc}],skills:[{name,level}],certs:[{name,date}],summary}`。
layout：`{template:'classic',color:'#315c79',fontSize:11,lineHeight:1.5,gap:12,fitOnePage:true,order:['summary','edu','work','proj','skills','certs'],hidden:[]}`。
审查返回逐项 rubric checks（不直接信任 AI 总分）；内容/JD/事实确认变化即失效；排版按当前实际 DOM 测量。

## 执行顺序及验收
- [x] 核心测试先行：五版上限/恢复不丢当前稿/备份原子校验/空简历不高分/未审查不得达标/硬阻断优先。
- [x] 模块实现：保留岗位预设数据（预设技能需本人确认），旧版数据迁移，编辑和保存。
- [x] 导入/AI/导出/桌面：独立子任务；先需求检查再代码质量检查，根代理负责集成。
- [x] UI 工作流：导入核对→JD→最多 5 个追问→润色对比→质量检查→导出。
- [x] 验证：Node 测试、浏览器交互、七模板长内容与打印、DOCX 结构、EXE 启动、发布包不含客户资料/密钥。
- [x] 文档与发布：工作区 outputs 构建；权限允许则复制到用户指定交付目录，否则明确实际位置。

## 界面方向
深蓝灰 #20384b、海蓝 #386d89、浅灰 #f0f4f6、纸白 #ffffff、辅助绿 #25806c。窄简历目录＋左编辑右纸张预览。界面用系统无衬线，简历按版式搭配宋体/雅黑；质量检查以真实五维清单呈现，空状态不灌入假客户数据。
