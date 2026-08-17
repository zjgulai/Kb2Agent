---
title: G7-A2-S6-R1 隐私语义修正与凭证诊断准备
status: authorized-local-preparation
updated: 2026-08-14
---

# G7-A2-S6-R1 隐私语义修正与凭证诊断准备

## 1. 决定对象

本门禁只处理 run `G7A2S6-20260814T024618Z` 的追加式隐私修正和本地诊断准备。冻结对象是官方价格刷新、第一条 call receipt、blocked attempt receipt、S6 执行器/合同/测试和 S5-R1 接受回执。原证据不得改写、删除或公开投影。

已验证事实只有：同一运行官方价格匹配；执行器随后读取一次环境凭证；第一条固定 canary 收到 HTTP 401 `AUTHENTICATION_REJECTED`；没有重试，也没有发送第二条 canary。该结果不证明具体凭证问题、模型 entitlement、usage、成本或生产 Agent 能力。

## 2. 追加式隐私语义

第一条 call receipt 的 Provider 错误文本含遮罩后的凭证引用，但 attempt receipt 声明 `credentialValueOrDerivativeRecorded=false`。R1 必须追加一份 correction，明确：

1. 没有读取或比较完整凭证，因此不得声称完整原值是否出现在返回文本；
2. 已确认存在 Provider 返回的遮罩凭证引用，应按 credential reference / derivative 管理；
3. 原 call receipt 保持 `0600` internal restricted history，禁止进入网站、部署包、公开评审材料或日志；
4. 原 attempt 的隐私声明由追加式 correction 覆盖，但历史本身不得原位修改。

## 3. 错误净化合同

新净化器不得保留 Provider `errorMessage` 或 `errorClass` 原文。输出仅允许固定 `safeCode`、规范化 reason code、是否检测到凭证引用的布尔值，以及明确的零敏感字段声明。未知错误统一失败关闭为 `PROVIDER_ERROR_REDACTED`。

合成 fixture 必须覆盖 API key 标签、`x-api-key`、Authorization/Bearer、token、`sk-`、遮罩片段，以及鉴权、限流、超时、TLS、DNS、网络、HTTP、响应、成本与未知错误。fixture 只使用显式 synthetic 字符串，不使用真实或派生凭证。

## 4. 诊断边界

401 只形成以下未证实假设：凭证已失效或吊销、注入了错误凭证、变量名/进程边界不一致、值含格式污染、账户/项目不匹配、权限/余额/模型 entitlement 不满足。R1 不选择根因。

凭证所有者必须在 DeepSeek 官方控制台和本机安全边界内自行核对，不得把值、长度、前后缀、哈希、指纹或截图粘贴进任务。若需要轮换或修改注入方式，应作为独立外部状态动作处理。任何新 Provider 请求还需要后续单独授权。

## 5. 评审与证据等级

R1 完成后最大证据等级为 `L1 local artifact read + L2 sanitization fixtures`。它只证明追加式语义修正、净化合同和诊断清单被本地物化，不证明凭证已修复或 Provider 可用。

独立评审人建议为 `ll`，冻结三项检查：

1. append-only privacy semantics 与 restricted history；
2. safe-code-only 净化合同和 18/18 fixture；
3. 事实/假设分离与零外部副作用。

本门禁不授权评审结论，也不授权密钥读取/输出、网络、Provider、远端/Docker、配置/服务变更、production/live Agent、commit 或 push。
