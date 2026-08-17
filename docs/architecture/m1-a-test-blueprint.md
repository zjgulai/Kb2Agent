---
title: M1-A 测试蓝图
description: 产品合同、Schema、正负 fixture、高保真原型和证据语言的测试门禁
outline: deep
---

# M1-A 测试蓝图

## 门禁矩阵

| 层 | 检查 | 失败条件 |
|---|---|---|
| Contract | 决策、授权、产品线、角色和声明注册表 | 缺字段、越权、把角色映射写成接受 |
| Schema | JSON Schema 编译与正例校验 | Schema 无法编译或正例失败 |
| Cross-object | ID、端点类型、引用、revision、supersedes、snapshot hash | 悬空引用、端点错型、有环、hash 不符 |
| Negative | 固定负例必须失败 | 负例通过或失败原因不匹配 |
| UI | Home/Lab/Result 主路径 | runtime error、状态误导、键盘不可达 |
| Responsive | 1440/1280/960/768/390 | 横向溢出、触控目标不足、内容顺序错误 |
| Accessibility | axe、焦点、announcement、reduced motion、200% zoom | critical/serious、焦点丢失、仅颜色表达 |
| Existing Guide | 现有 docs QA | 26 路由、身份、Claim、Concept、Acceptance 退化 |

## Schema 正例

一个最小 Reference Package 应覆盖：

- SourceArtifact / StructuralElement / EvidenceFragment。
- Concept / Metric / DecisionModel / Case / Playbook。
- E2 Skill / TaskPackage。
- typed relations。
- ActionPackage / KnowledgeReceipt / ReleaseSnapshot。

## 固定负例

| Fixture | 预期错误 |
|---|---|
| `missing-locator` | EvidenceFragment 缺少可解析 locator |
| `invalid-e3-skill` | 首案 Skill 越过 E2 |
| `invalid-relation-endpoint` | 关系端点类型不符合 registry |
| `supersedes-cycle` | revision/supersedes 形成有向环 |
| `snapshot-hash-mismatch` | manifest hash 与 canonical 序列化不一致 |
| `case-auto-promotes-skill` | Case 直接产生 approved Skill，缺 PromotionDecision |

## UI 主路径

1. Home 主 CTA 到 `/lab/`。
2. Lab 默认 Replay，Live 禁用并有原因。
3. 运行 Replay 后七阶段全部完成并出现结果入口。
4. Result 默认展示行动包；Evidence/Trace/Eval 可键盘展开。
5. 页面始终显示 `LO-S synthetic`、`local prototype` 和 `not accepted`。

## 证据声明测试

静态扫描阻止以下短语在 M1-A 页面无标签出现：

- `production-ready`
- `已上线`
- `真实客户验证`
- `已验收`
- `实时 Agent 已运行`

允许的词语必须带状态：`本地原型`、`固定 fixture`、`LO-S synthetic`、`M1-A candidate`。

## 执行顺序

```text
reference:contracts
→ reference:schemas
→ reference:fixtures
→ test:content
→ docs:build
→ focused Playwright
→ full docs:qa
```

M1-A 的通过是本地候选回执，不是 commit、PR、发布或生产回执。
