# MKD Guide 本地验收回执

基线验收日期：2026-08-02<br>
最新增量复核：2026-08-03<br>
工作目录：`/Users/pray/project/distillation`<br>
最终门禁：`npm run docs:qa`<br>
退出状态：`0`

## 最终串行门禁

| 顺序 | 命令 | 实测结果 |
|---:|---|---|
| 1 | `npm run docs:metrics` | baseline v4 一致：26 页、265 H2、352 个代码块、167 个 Markdown 链接、83 个唯一 Markdown 外链 |
| 2 | `npm run docs:identity` | 26/26 文档注册；26 个唯一身份；路由全部保留；学习序 0–25；显示编号 00–23 加 A/B |
| 3 | `npm run docs:concepts` | 13 concepts、22 aliases、13 first definitions、13 cross-document uses、26 prerequisite edges、8 conflict pairs、31 navigation pairs；7 个较早线索已回链，0 个未回链 |
| 4 | `npm run docs:claims` | 12 条 claim、5 个来源、8 个 evidence、12 个 owner roles；0 个 claim 映射缺口；12 个具名 assignee 待认领、0 accepted，持续 warning |
| 5 | `npm run docs:evidence` | L0=0、L1=6、L2=6、L3/L4=0；来源、路径、状态到等级、职责接受与 anti-promotion 通过 |
| 6 | `npm run docs:acceptance` | 3 个契约；12 个固定用例含 8 个负例；3/3 本地可复放、0/3 accepted；四类审批 blockers 与 26/26 成熟度保护通过 |
| 7 | `npm run docs:audit` | 26 页；265 H2；443 H3；352 个代码块；167 个链接；0 error / 0 warning |
| 8 | `npm run docs:semantic-links` | 49 个知识链接解析；20 个带章节编号的链接标签与目标 `displayNumber` 一致 |
| 9 | `npm run docs:links` | 67 个内部引用全部通过；84 个唯一外链完成三次重试分类；0 个确定性失败；3 个暂时不可自动核验告警 |
| 10 | `npm run docs:snippets` | 7 个 fixture 与 10 个显式 `verify=syntax` Markdown 片段通过；不代表其余 342 个代码块已验证 |
| 11 | `npm run test:content` | 26/26 通过：覆盖无元数据/摘要漂移、错误 artifact、路径逃逸无摘要泄漏、跨合同/用途复用、低等级回执阻断，以及四类独立正确绑定的纯内存接口正例；真实注册表仍全部审批阻断 |
| 12 | `npm run docs:build` | VitePress 1.6.4 完整构建通过；无 chunk size / hydration warning |
| 13 | `npm run docs:headings` | 源文件与构建 HTML 的 H2/H3 对账 26/26 通过 |
| 14 | `npm run docs:preview-isolation` | 静态预览真实绑定 127.0.0.1；首页/知识页/404/405 合同通过；1 个非回环 IPv4 地址连接被拒绝 |
| 15 | `npm run docs:performance` | 30 个唯一初始 JS 资产；最大初始资产 203.7KB；无 Google Fonts 请求，低于 500KB 门槛 |
| 16 | `npm run docs:lighthouse` | 首页 100；安全合规长页 100；均高于 95，且无自动判定失败项 |
| 17 | `npm run test:site` | Chromium 26/26 通过；覆盖暖白唯一外观、响应式四模式、26 个目录链接、15 个黄金查询、搜索/导航/焦点、责任链、概念、验收、axe 与性能预算 |

## G0/G1 专项回执

- 旧审计器的 visitor 回调返回了 `Array.push()` 的数字结果，导致代码块/链接虚报为 2,107 / 182；公共 AST 实现与固定 fixture 已消除此缺陷，真实值为 352 / 161。
- `knowledge-system/audit-baseline.json` 锁定总量、语言分布和 26 页逐页计量；无审查的内容漂移会直接失败。
- `knowledge-system/documents.yml` 分离 `docId`、`displayNumber`、`route`、`learningOrder`；首页已改为按学习序排序、按显示编号呈现。
- 工具手册已从重复“第八章”改为附录 B，仍使用 `/knowledge/08-tools-appendix`，并保留旧 H1 锚点。
- 四处章节标签/目标页面错配已经修复；语义链接门禁可解析中文、阿拉伯数字与附录身份。
- 最终成熟度总账没有被 G0/G1 或 G2.1–G2.4 批量抬高：2 个 runnable、22 个 solution、2 个 principle、0 个 acceptance；24 页仍为 pending。

## G2.1 专项回执

- `knowledge-system/claims.yml` 是三个试点页面的唯一 claim 数据源；页面组件没有复制状态或伪造日期。
- 安全合规：2 条 L1 来源复核、2 条 L0 待验证；没有法律合规或控制执行声明。
- 成本模型：1 条 L1 来源复核、3 条 L2 fixture；USD 135 明确限定为固定测试输入。
- 质量评估：3 条 L1 仓库/方法契约、1 条 L0 代码状态；页面仍是 solution / pending。
- G2.1 快照中 12/12 owner 为空；G2.2 已把该缺口拆成角色映射与具名接受两个可审计状态。
- 第一次串行复跑在复用视觉审计静态预览时出现旧 HTML 引用已重建 hash 资产的 404，导致 9 个浏览器用例失败。终止该预览、让 Playwright 启动隔离 dev server 后，单独 9/9 通过；随后从头执行 `npm run docs:qa`，最终退出状态为 0。这是测试服务器生命周期问题，不是忽略的产品失败。

## G2.2 专项回执

- Claim schema 升级为 v2.0；安全、成本、评估三章各定义内容维护、证据复核、测试维护和最终批准四个角色，共 12 个角色。
- 12/12 claim 均有四角色映射且职责分离；0 个 claim mapping gap。仓库没有具名接受事实，因此 12 个角色保持 `role-mapped`、0 个 `accepted`，页面显示“4/4 角色已映射 · 0/4 已接受”。
- `CLM-SEC-003`、`CLM-SEC-004`、`CLM-EVAL-004` 由新 fixture/test 从 L0 提升到 L2；当前分布 L0=0、L1=6、L2=6、L3/L4=0。
- 安全 fixture 拒绝 production 标签、非隔离环境与缺失授权的最小化样本，并阻止示例期限在生产字段不完整时升级。
- 评估 fixture 使用三用例确定性 mock provider，覆盖有证据回答、证据不足拒答、解析失败与退化阻断，外部调用为 0。
- `authorized-live` 越级测试除要求 L4 回执外，还要求四角色全部 `accepted`；仅有角色占位不能成为在线授权。
- 页面级成熟度没有变化：2 runnable、22 solution、2 principle、0 acceptance；24 页仍 pending。

## G2.2 浏览器与性能修复记录

- 首次浏览器复跑复用了 4173 上的旧静态预览，产生旧 hash 资产 404 和 9/9 失败。已将 Playwright 固定到独立 4174 端口并设置 `reuseExistingServer: false`，人工预览继续使用 4173。
- 第一次完整 G2.2 串行链测得搜索交互代理 218ms，真实超过 200ms 门槛。没有放宽阈值；首页改为在空闲、悬停或聚焦时预热 VitePress 本地搜索块，单 worker 连续 5/5 性能复放通过。
- 第二次完整串行链的首个浏览器用例因文件系统 `ENOSPC` 在 48ms 内无法创建 trace 目录；其余 8 项通过。Playwright 自动清理后 `test-results` 为 4KB、磁盘可用约 6.4GB，目录写入探针与单独 9/9 通过。
- 第三次从头执行 `npm run docs:qa` 完整退出 0；最终浏览器 9/9、Accessibility 100/100、最大初始 JS 147.6KB。

## G2.3 概念使用图专项回执

- `concepts.yml` 升级为 schema v2；13/13 概念正文锚点、邻近定位文本、首次定义顺序与跨章语义用法可解析。
- 26 条 `prerequisiteOf` 边通过有向无环检查；8 对 `conflictsWith` 与 31 对 `related` 通过双向一致性检查。
- 97 个概念/文档词面线索中，71 个仍在 reviewed semantic sample 之外；7 个位于定义文档之前的线索均已回链首次定义，0 个未回链。
- DIKW 从“三层递进”修正为 Data / Information / Knowledge / Wisdom 四层，并与 LoD 的加工深度定义分离。
- 附录 A 新增 13 卡 `ConceptMap`；数据由注册表加载，桌面双列、390px 单列，Phosphor disclosure 图标与主题 token 保持一致。
- 浏览器验证 RAG 的首次定义入口、专题页、跨章使用 hash、移动触控与无横向溢出；axe 增加附录概念工作台，仍无 critical/serious 问题。
- 第一次 G2.3 完整 QA 在构建阶段真实失败：组件错误导入不存在的 `CaretDown`。改为依赖实际导出的 `PhCaretDown` 后，从构建开始复核通过；最终又从头执行完整 `docs:qa`，没有忽略或降级该失败。

## G2.4 机器可验收契约专项回执

- `acceptance.yml` 登记安全、成本、评估三个仓库内容契约；固定集合和基线回执均有 SHA-256，契约强制 `productionReady: false`。
- 三套集合合计 12 个合成用例、8 个负例；安全 5/5、成本 4/4、评估 3/3，三项相对基线差异均为 0.0 pp，外部调用和副作用为 0。
- 9 条本地阈值均复放通过但仍是 `illustrative`；数据集均为 `synthetic-only`，12 个角色 0 accepted，最终回执 0/3。
- 三个契约由门禁计算为 `approval-blocked`，共同 blockers 为数据未获业务授权、阈值未批准、责任接受不完整和最终回执缺失。
- 内容负例覆盖无负例集合、无证据阈值批准、伪造 accepted、页面提前升级与候选退化；当前内容测试 23/23。
- 附录与三章工作台显示本地通过和审批阻断的不同颜色/语义；桌面、390px、跨页 hash、触控和 axe 进入浏览器门禁。
- 首次新增浏览器用例因中文 hash 被 URL 百分号编码而断言失败；页面行为正确。改为解码 URL 后核对语义锚点，完整浏览器复跑 11/11，随后完整 `docs:qa` 从头退出 0。

## 本地预览隔离修复

- 收尾只读检查发现 VitePress 1.6.4 的 `preview` 实现虽然接收 `--host 127.0.0.1`，但内部只把 `port` 传给 Polka，实际监听 `*.4173`；同一局域网地址可以访问。此前“静态预览只绑定 127.0.0.1”的表述因此不成立。
- `docs:preview` 已切换为仓库内静态预览器，显式 `server.listen(port, '127.0.0.1')`，只允许 GET/HEAD，限制文件路径在构建目录内，并为 404、方法拒绝和静态 MIME 设置确定性响应。
- `docs:preview-isolation` 使用临时端口验证首页、概念页、404、405，并枚举本机非回环 IPv4 地址确认连接失败；该命令已进入完整 `docs:qa`。
- Lighthouse 也改为启动同一隔离预览器，避免无障碍测试期间短暂打开局域网监听。

## 浏览器实测

- 首页目录、搜索、暖白唯一外观、200% 页面缩放、长文、横向表格、代码复制与 Mermaid 放大层均可操作。
- Mermaid 放大层的 200% 状态为 `aria-pressed=true`；Escape 关闭后焦点恢复至原“放大查看流程图”按钮。
- 全量 QA 首轮发现 `figcaption` 无效嵌套；已改为合法的 `figure > figcaption` 结构。修复后构建与 Playwright 重跑不再出现 hydration 告警。
- Lighthouse Accessibility 两个关键页面均为 100，axe 无 critical / serious 问题；浏览器控制台无 warning / error。
- Playwright 输出中的 `NO_COLOR` / `FORCE_COLOR` 提示来自测试进程环境变量，不是页面控制台或 hydration 问题。
- claim ledger、概念工作台与验收工作台均完成桌面/390px 截图复核；验收工作台可同时发现 100% L2 复放与 0/4 owner、示意阈值、缺最终回执。
- 本地性能门禁覆盖 LCP、CLS 与交互延迟代理值；这些是本机预览基线，不是生产 RUM。

## 外链分类告警

1. `https://developers.openai.com/api/docs/quickstart`：自动请求返回 HTTP 403，归类为 access-restricted；观察到端点存在，但自动化没有声称已读取其内容。
2. `https://developers.openai.com/api/docs/models/compare`：claim registry 的一手来源自动请求返回 HTTP 403，归类为 access-restricted；本轮人工来源复核与自动可达性回执保持分开。
3. `https://huggingface.co/Qwen/Qwen3-Embedding-8B`：三次请求超时，归类为 network unreachable；没有把暂时不可达伪报为内容正确。

内部链接没有失败。上述两项保留在 P3，避免网络状态影响本地内容与构建门禁，同时不把它们升级为已复核证据。

## 依赖审计

最终 `npm audit --json` 为只读检查，退出码 1，报告 3 项：2 moderate、1 high、0 critical；均来自固定的 VitePress 1.6.4 → Vite / esbuild 依赖链，`fixAvailable=false`。本轮未执行 `npm audit fix` 或任何 major upgrade；静态预览已用隔离门禁证明只绑定 `127.0.0.1`。

## P3 本地候选增量回执

- `chrome-launcher@1.2.1` 已从 Lighthouse 的偶然传递提升改为项目直接开发依赖；`npm ls --depth=1` 显示 Lighthouse 复用同一去重实例。
- 验收回执现在按合同、用途、主体、批准角色、决策和 artifact SHA-256 绑定；路径 realpath 必须留在仓库内，artifact 必须是精确 JSON v1，并限定为 `L4-authorized-live`。错误 artifact、路径逃逸、摘要漂移、跨合同/用途复用和低等级回执均由负例阻断；纯内存正例只验证四类接口可达，不构成真实批准。三个试点仍为 `approval-blocked`。
- 首页 26 个目录入口恢复为原生链接，移动端每个字段只使用一个真实 DOM 标签；搜索保留普通结果链接，并用唯一 polite status 播报方向键当前选择。P1/P2 聚焦回归 `7/7`、最终目录/响应式聚焦回归 `4/4` 均通过。
- G2.2 记录的搜索空闲预热已在 P3 被当前实现取代：浏览器证明确认预热会在用户意图前下载私有搜索模块后，该逻辑已删除；现在由 VitePress 在点击搜索后原生懒加载。
- P3 全部已接受修复后的最终完整 `npm run docs:qa` 已从头退出 0：内容测试 26/26、最大初始资产 203.7KB、Lighthouse 100/100、Chromium 26/26。新鲜 `npm audit` 仍以 2 moderate / 1 high / 0 critical、`fixAvailable=false` 退出 1；该依赖风险继续开放。

## 范围声明

- 未部署、未推送、未合并、未切流、未导入真实数据、未调用供应商生产服务。
- 未修改或清理 `.omo/run-continuation` 与 `example/` 的既有用户状态。
- 本回执证明本地 G0–P3 内容、身份、契约、构建、设计与浏览器门禁通过，不证明 Git 交付、部署、生产完成、L4 回执真实性或自然人已经接受责任。
