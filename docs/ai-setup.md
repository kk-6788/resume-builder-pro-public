# AI 配置与事实核对

AI 功能需要本人提供服务商 API Key；应用不内置密钥。调用会将本次操作所需的简历、JD 或导入图片发送给所选服务商。配置前请确认 Base URL 属于你要使用的服务商。密钥不得放进简历、导出文件或备份。

## 服务配置

| 服务 | Base URL | 文本模型预设 | 图片模型 |
|---|---|---|---|
| DeepSeek | `https://api.deepseek.com` | `deepseek-v4-flash` | `deepseek-v4-flash-vision-exp`，实验模型 |
| Agnes | `https://apihub.agnes-ai.com/v1` | `agnes-2.5-flash` | 请填写账号可用的图片理解模型；未填写时尝试当前模型 |
| 自定义 | 服务商提供的 OpenAI 兼容 Base URL | 手动输入或获取模型列表 | 填写支持 OpenAI 图片消息格式的模型 |

2026-09-09 核对依据：[DeepSeek 官方接入文档](https://api-docs.deepseek.com/)、[Agnes 概述](https://www.agnes-ai.com/zh-Hans/docs/overview)、[Agnes 快速开始](https://www.agnes-ai.com/zh-Hans/docs/quickstart)。模型权限与供应情况以账号控制台为准。没有使用真实密钥验证账号可用性或免费额度，界面中的额度状态应显示“未验证”。

模型发现调用 `GET /models`，聊天调用 `POST /chat/completions`。部分兼容服务不提供模型列表，手动填写仍可使用。普通远程地址必须使用 HTTPS；仅本机 `localhost`、`127.0.0.1`、`[::1]` 可以使用 HTTP。Base URL 不接受内嵌账号、查询参数或片段。

浏览器直连要求服务商允许跨域请求。桌面版聊天走隔离的 `resumeDesktop.chat({url,key,body})`，可选模型发现桥为 `resumeDesktop.listModels({url,key})`。客户端默认等待 60 秒，取消请求或超时后忽略迟到结果；桌面请求的实际中止由主进程传输层负责。

## 核对规则

- 导入文本按原文提取；无法定位的值留空并生成待确认项。图片识别保留转录文本，必须对照原图核实姓名、日期、数字等事实。提取结果应进入核对界面，不能直接覆盖简历。
- 润色仅返回个人总结、工作描述和项目描述的对比建议，不直接改动数据。原文必须完全匹配，任何新数字都会被拒绝。措辞仍可能造成事实含义变化，需要本人逐项确认；不能把自动检查视为事实真实性保证。
- 应用采纳建议前再次运行 `validateChanges(result,currentRecord,target)`，防止请求期间编辑导致旧建议覆盖新文字。
- 追问最多五项；审查必须包含调用方给定清单中的所有 ID。每条证据必须能在对应简历字段找到原文，字段缺失且判失败时允许空证据。AI 不产生可信总分；计分和排版测量由应用完成。
- 原材料、JD 和图片里的指令均作为不可信数据，不作为执行命令。结构异常、截断、无证据审查和不允许的字段修改均失败返回，不能标记“审查完成”。

验证命令：`node --test tests/ai.test.cjs`。测试只使用模拟响应，不读取或使用用户密钥。
