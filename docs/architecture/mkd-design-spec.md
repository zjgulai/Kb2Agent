---
title: MKD 编辑实验室设计规格
description: 编辑出版感与工程实验室融合的界面、状态、响应式和可访问性规格
outline: deep
---

# MKD 编辑实验室设计规格

## 视觉方向

**编辑出版感 × 工程实验室。** 页面像一份经过编辑的研究简报，而不是通用 SaaS Dashboard：大标题和留白建立判断顺序，细线、编号、mono 标签和可展开证据构成工程可信度。

记忆点是 **“证据脊柱”**：Source → Receipt 的七阶段纵向/横向编号贯穿 Home、Lab 和 Result，同一个编号同时连接学习内容、运行状态和证据对象。

## 色彩与字体

沿用现有 token：

| 语义 | Token | 用途 |
|---|---|---|
| Paper | `#faf9f5` | 大面积背景与阅读呼吸 |
| Ink | `#20252b` | 核心结论 |
| Blue | `#294b68` | 操作、链接、当前步骤 |
| Sage | `#466d58` | 已有证据、Replay 完成 |
| Warning | `#8a5c2d` | 未知、阻断、人工批准 |

产品 Hero 使用具有出版气质的衬线字体栈；正文保留清晰中文无衬线；ID、版本、hash 与状态使用 mono。状态不能只靠颜色表达。

## 页面构图

### Home

- 首屏左侧为价值与 CTA，右侧为真实行动包摘录，不放装饰性 AI 图片。
- 七阶段证据脊柱跨越首屏下缘，形成产品独有识别。
- 目录降为第二屏 Guide section。

### Lab

- 顶部显示 `M1-A prototype / Replay / LO-S synthetic` 三个明确标签。
- 左侧固定输入只显示允许修改的枚举和数值参数。
- 中间为逐步运行的证据脊柱。
- 右/下方为 Corpus manifest、预算和版本回执。

### Result

- 先给行动包，不先给 Trace。
- 事实、推断、未知使用不同文案与图标，同时保留文字标签。
- Evidence/Trace/Eval 使用原生 `details` 或具备同等键盘语义的 disclosure。

## 动效

- 页面进入使用一次 260–520ms 的层级 reveal。
- Replay 步骤以 120ms 间隔更新；不得制造模型正在思考的假象。
- `prefers-reduced-motion: reduce` 时取消位移、延迟和连续动画。
- Live 禁用状态不使用呼吸灯或诱导点击。

## 组件状态

| 组件 | 必须状态 |
|---|---|
| CTA | default / hover / focus / disabled |
| Mode switch | replay-selected / live-locked |
| Pipeline step | pending / active / complete / blocked |
| Evidence badge | L0 / L1 / LO-S / L2 / L3 / L4 |
| Maturity badge | draft / replayable / live-candidate / accepted / blocked |
| Disclosure | collapsed / expanded / focus-visible |

## 关键视口验收

| 宽度 | 验收重点 |
|---:|---|
| 1440 | 首屏层次、行动包与证据脊柱视觉平衡 |
| 1280 | 右侧摘要不挤压主 CTA |
| 960 | 双列转单主列，Evidence 改抽屉/Disclosure |
| 768 | 导航、Stepper、行动包顺序正确 |
| 390 | 无横向滚动；触控目标 ≥44px；状态不丢失 |

## 可访问性规格

- 主路径全键盘可操作，焦点顺序与视觉顺序一致。
- Replay 状态变化通过礼貌级 `aria-live` 宣告。
- 完成或阻断后把焦点移动到摘要容器。
- 图与状态始终有文字 fallback。
- 错误文案包含问题、影响和下一步。
- 200% zoom 下主 CTA、模式、摘要和证据仍可访问。
- axe critical/serious 为 0；Lighthouse Accessibility 目标 100。

## 原型证据边界

原型中的 Amazon Ads 数据是 `LO-S synthetic`；运行按钮只在浏览器中切换固定状态，不调用模型、不调用 API、不证明 compiler/runtime 已实现。
