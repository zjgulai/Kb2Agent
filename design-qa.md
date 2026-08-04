# MKD Guide Product Design QA

审计日期：2026-08-02<br>
视觉目标：第 3 稿“证据工作台”<br>
设计旋钮：`DESIGN_VARIANCE=4`、`MOTION_INTENSITY=2`、`VISUAL_DENSITY=7`

> 2026-08-03 当前方案 B 以暖白背景为唯一主题，`appearance: false`。下文 2026-08-02 关于深色模式、深色截图和主题切换的记录仅是历史审计，不属于当前候选，也不得作为恢复深色背景的依据。

## 对照证据

- 原始目标：`/Users/pray/.codex/generated_images/019fbbe6-9ef2-7512-952f-511031644cd4/exec-2d4f9695-d771-40e8-a763-34c8c4f15f55.png`
- 归一化目标：`artifacts/design-qa/reference-1440x1024.png`
- 最终实现：`artifacts/design-qa/implementation-1440x1024-final.png`
- 同视口并排对照：`artifacts/design-qa/comparison-1440x1024-final.png`

对照图将第 3 稿与本地实现统一为 1440×1024 后并排呈现。最终实现复现了目标的左对齐窄工作区、紧凑标题与单一搜索入口、高密度目录、右侧成熟度说明、纸白/炭黑/墨蓝配色和克制边框。

## 差异收敛记录

| 轮次 | 发现 | 修复 |
|---|---|---|
| P0 | 初版首页仍偏传统落地页，目录证据状态存在被误读为“全站已验证”的风险 | 改为数据驱动 EvidenceHome；24 个无回执页面保持“待复核”，仅 2 个 fixture 显示“烟测通过” |
| P1 | 工作区居中、标题比例、目录起始位置与第 3 稿不一致 | 收紧导航高度、把工作区固定为约 1000px 左对齐布局，并重排介绍、搜索、快捷入口和目录面板 |
| P1 | 移动目录若保留宽表会缩窄断词 | 960px 以下切换为分组信息行；390px DOM 实测 `scrollWidth === innerWidth` |
| P1 | Mermaid 放大层需要完整键盘路径 | 增加适应窗口与 100%/150%/200%、滚动画布、焦点约束、Escape 关闭和触发器焦点恢复 |
| P2 | 旧样式覆盖阅读页、首页边框和层级过重 | 重构为语义 token、布局、内容、组件四层；首页样式作用域隔离，删除装饰性视觉噪声 |
| P2 | 外部字体与主题锁定削弱一致性和可访问性 | 切换 without-fonts 主题，使用系统字体栈，恢复明暗主题与可见切换按钮 |

## 有意保留的差异

第 3 稿中的绿色“是”和成批日期没有被照抄。实现只允许实际 evidence 驱动验证状态；没有 evidence 的页面显示“待复核”，没有伪造复核日期。该差异属于证据契约要求，不是视觉遗漏。

## 浏览器与无障碍回执

- 视口：390×844、768×1024、1024×768、1440×1024。
- 核心路径：首页目录、唯一搜索实例、主题切换、长文阅读、横向表格、代码复制、Mermaid 放大层与 200% 缩放。
- 键盘：Mermaid 200% 状态为按下；Escape 后弹层消失，焦点恢复到原触发器。
- axe：四个视口均无 critical / serious 问题。
- Lighthouse Accessibility：首页 100，安全合规长页 100；零自动判定失败项。
- 控制台：最终实测无 warning / error。
- 动效：遵循 `prefers-reduced-motion`；触控控件最小尺寸由自动化门禁验证。

## G2.1 证据账本增量审计

- 审计范围：安全合规、成本模型、质量评估三章的 12 条 claim-level 证据卡。
- 桌面：证据等级、风险、截至日期和 owner 形成可比较的高密度四格；右侧 H2 目录可直接到达。
- 移动：元数据切为单列；390×844 自动化确认无横向溢出、状态标签不越界、disclosure 触控高度至少 44px。
- 深色：L0/L1/L2 状态保持差异，未分配 owner 继续使用警示色；展开态的来源、限制和下一动作可读。
- 交互：三个试点页面各 4 张卡；展开后显示证据细节，页面无运行时错误。
- 当前截图：`artifacts/g2-1-design-audit/01-cost-ledger-desktop.png`、`02-security-ledger-mobile.png`、`04-evaluation-evidence-expanded-dark.png`。
- 审计边界：视觉通过不提高内容成熟度；12 个 owner gap 与 3 条 L0 断言继续作为治理阻断项。

## G2.2 责任链增量审计

- 卡片摘要从单一“责任人”升级为“4/4 角色已映射 · 0/4 已接受”，不再把角色槽位伪装成具名 owner。
- 展开态按内容维护、证据复核、测试维护、最终批准显示四角色；`role-mapped` 使用警示色，只有带接受回执的 `accepted` 才允许使用验证色。
- 桌面保持高密度两列元数据；390px 下责任链列表改为纵向，状态文字不会挤压角色名称或造成横向溢出。
- 安全章两条、评估章一条从 L0 变为 L2，使用既有 sage 验证色；页面文字同时保留 fixture 边界，没有出现“生产已验证”的绿色暗示。
- Chromium 9/9 最终通过；责任链展开态、移动重排、axe critical/serious=0 与本地性能预算均进入门禁。
- 首次浏览器复跑误用了 4173 上残留的静态预览，旧 HTML/hash 资产导致 9/9 假红；终止该进程后隔离复跑通过，随后将测试服务器固定为独立 4174 且禁止复用。

## G2.3 概念工作台增量审计

- 附录 A 新增数据驱动概念工作台：13 个概念按教学顺序排列，摘要只保留术语、别名与跨章用法数，详细定义和关系默认折叠，符合高密度但克制的证据工作台语言。
- 桌面采用两列卡片；390px 切为单列。自动化确认所有 summary 至少 44px、页面无横向溢出，长别名按容器截断而不挤压 disclosure。
- 展开态区分首次定义、专题页、已复核使用、学习后续、不可混同与相关导航；“不可混同”使用警示色，普通关系使用墨蓝，不使用代表验证状态的鼠尾草绿。
- disclosure 使用项目依赖实际导出的 Phosphor `PhCaretDown`，没有手写 SVG 或 CSS 图形；遵循 reduced motion。
- 组件内部不生成 H2/H3，Markdown 的“概念使用图”是唯一新标题，因此源文件与构建 HTML 标题继续 26/26 对账。
- Chromium 新增概念卡数量、RAG 定义入口、跨章 hash、390px 触控与运行时错误检查；axe 把附录工作台加入关键表面，仍无 critical/serious 问题。
- 当前截图：`artifacts/g2-3-design-audit/concept-workbench-desktop.png`、`artifacts/g2-3-design-audit/concept-workbench-mobile.png`、`artifacts/g2-3-design-audit/concept-workbench-rag-expanded.png`。
- 视觉通过只证明工作台可读和可操作；71 个未迁移词面线索与学习效果验证继续作为内容阻断，不因卡片可视化而升级。

## G2.4 验收工作台增量审计

- 附录 A 新增 3 卡 `AcceptanceWorkbench`，三个试点页复用同一组件的单契约模式；固定集、负例、本地复放、回归差异、责任接受和最终回执形成同一比较结构。
- 桌面默认两列，展开卡横跨全宽；390px 切为单列，四格指标变为 2×2，长 dataset/receipt ID 和 blocker code 可换行且不造成横向溢出。
- 鼠尾草绿只用于 100% L2 本地复放这一已观察事实；`approval-blocked`、9 条示意阈值、0/4 owner 与 4 类 blockers 均保持警示色，避免把局部绿色解释为整章验收。
- disclosure 继续使用 Phosphor `PhCaretDown`；summary 至少 44px，跨页链接直达章节“验收契约”锚点，组件内部不生成额外 H2/H3。
- Chromium 验证 3 张卡、3 例/2 负例、0.0 pp、4 blockers、跨页 hash、390px 触控与 axe；最终 11/11 通过且无 critical/serious 问题。
- 首次测试按未编码中文 hash 比较 URL 而失败；页面跳转正确。断言改为 URL 解码后核对语义锚点，未放宽目标路径或交互标准。
- 当前截图：`artifacts/g2-4-design-audit/acceptance-workbench-desktop.png`、`artifacts/g2-4-design-audit/acceptance-workbench-mobile.png`。
- 视觉通过只证明验收条件可发现、可比较、可操作；三个契约仍为 `approval-blocked`，0/3 accepted。

## 判定

P0、P1、P2 视觉与交互问题已关闭；P3 进一步恢复首页目录链接语义并补足搜索方向键选中播报。当前候选坚持暖白背景；剩余内容、组织、生产、学习效果、CI 与依赖风险归入 `content-audit.md` 的 P3 清单。

final result: passed（仅限本地暖白方案 B 的视觉与交互候选）
