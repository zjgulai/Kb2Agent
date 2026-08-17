---
title: M1-A 高保真原型视觉审计
description: Home、Reference Lab 与 Result 在桌面和移动端的视觉、交互与证据边界回执
outline: deep
---

# M1-A 高保真原型视觉审计

## 审计边界

- 日期：2026-08-09
- 页面：Home、`/lab/`、`/lab/runs/amazon-ads-replay-001`
- 视口：1440、1280、960、768、390
- 状态：本地 VitePress candidate
- 数据：`LO-S synthetic`
- 禁止解释：不证明 compiler、模型、API、live 或部署已实现

## 设计结论

| 维度 | 结果 | 证据 |
|---|---|---|
| 品牌 | PASS | 出版型衬线标题、暖白纸张、工程 mono 标签形成统一识别 |
| 任务叙事 | PASS | 首页主 CTA 为旗舰 Replay；26 章目录降为第二叙事 |
| A1 默认层 | PASS | Result 先展示行动包、事实/推断/未知、停止条件与批准状态 |
| A2 展开层 | PASS | Evidence、Trace、Eval、Object Closure 使用渐进 disclosure |
| 状态诚实 | PASS | M1-A、Replay、LO-S、0 calls/0 effects、0/4 accepted 均可见 |
| 响应式 | PASS | 五个关键宽度无横向溢出；390px 转为单列 |
| 触控与键盘 | PASS | 移动端可见交互目标 ≥44px；Replay 完成后焦点进入摘要 |
| 可访问性 | PASS | 新增页面 axe critical/serious 为 0 |
| Guide 兼容 | PASS | 成熟度、推荐入口、26 章目录与搜索焦点返回合同保留 |

## 参考图

本地候选参考图保存在：

- `output/playwright/m1-a/home-1440.png`
- `output/playwright/m1-a/lab-1440.png`
- `output/playwright/m1-a/lab-390.png`
- `output/playwright/m1-a/result-1440.png`
- `output/playwright/m1-a/result-390.png`

这些图片是本地视觉回执，不是发布 artifact。

## 交互回执

1. Lab 默认 Replay；Live radio 禁用并说明 M1-C 门禁。
2. 页面不存在文件、自由文本或 URL 输入。
3. Replay 在固定 7 阶段完成，`aria-live` 逐步通知状态。
4. 完成后焦点进入摘要，结果显示外部调用 0、外部副作用 0。
5. Result 的工程证据默认折叠并可键盘展开。
6. “检查导出合同”只说明 M1-B 才实现文件下载，不制造未完成能力。

## 自动化回执

- `npm run docs:qa`：通过。
- Playwright：`35 passed`，覆盖 390/768/960/1280/1440、200% zoom、搜索焦点、导航和本地 Web Vitals。
- Lighthouse accessibility：首页 `100`，安全页 `100`。
- axe：Home/Lab/Result 与关键 Guide 表面无 critical/serious。
- 性能：45 个初始 JS assets；最大 theme chunk 250.3 KB；无外部 Google Fonts。

## 视觉判断

推荐保留当前方向进入 Owner 复核。首页全量 Guide 表格很长，但已位于产品叙事之后，适合作为兼容阶段的次级目录；M1-B 可进一步增加折叠或按任务筛选，不在 M1-A 强行改变 26 页数据合同。
