# G6-A4：corrected-current 绑定的本地静态候选

## 决策

采用追加式完整站点候选：两次独立执行 VitePress 构建并冻结摘要，再从第二次构建的 `dist` 生成一个全量、确定性、静态-only 的 G6-A4 包。旧 `mkd-m1c-88d4578f49eda5e0` 清单只作为差异基线，绝不覆盖。

该方案优于两种备选：复用 `m1-c-candidate-manifest.json` 会破坏已上线 88d4 的证据链；只打包 G6 增量文件则不能形成可独立部署、回滚和执行 P9 的完整站点。

## 输入锁

- G6-A3-R1 corrected-current correction receipt；
- G6-A3 corrected acceptance packet 与四份 corrected-current review records；
- 88d4 candidate manifest；
- 两次独立、完整 VitePress build snapshot；
- VitePress base 固定为 `/Kb2Agent/`。

任一 SHA、build digest、文件数量、字节数或必要 G6 surface 不一致，builder 失败关闭。

## 产物

1. 新候选 `site-manifest.json`：包含全站逐文件 SHA-256、候选 release identity 和 corrected-current 来源绑定。
2. `diff-from-88d4.json`：按路径、字节和 SHA-256 给出 added/removed/changed/unchanged 以及 HTML route 差异。
3. `public-p9-plan.json`：锁定未来公网验收维度与 fail-closed 规则，但状态始终为未授权、未执行。
4. 确定性 `ustar+gzip` 静态包：包含完整 `site/`、G6-A3-R1 接受证据、三个 manifest、校验和与只读意图；不包含远端执行资产。
5. G6-A4 本地 closeout receipt：最高证据等级为 L2。

## 包隔离边界

包内明确排除 Compose、Dockerfile、Nginx ingress、edge、证书、renewal、SSH、switch、rollback 和 remote executor。builder 不导入 `child_process/http/https/net/tls`，不执行网络、Docker、Git 或远端操作；所有输出均为新路径并用 exclusive-create/不存在门禁保护。

## 未来公网 P9

P9 计划覆盖 390/768/960/1280/1440 五视口、主页到 Agent Lab、20 个 deterministic fixtures、四类非 completed 终态、证据与工具回执、Reference/search/copy/Mermaid/download、键盘/200% zoom/44px/overflow、Axe、Web Vitals，以及首页和 Agent Lab 各三次 Lighthouse 中位数。

计划不复用旧 18921 upstream 身份；未来必须先通过新的远端只读库存门禁，再分配无冲突 loopback upstream，并分别获得上传、隔离 runtime、edge switch、P9 和回滚授权。

## 退出条件

- 两次站点 build digest 完全一致；
- 新 release 与 88d4 不同，且 Agent Lab 与 G6 replay bundle 被差异清单证明为新增；
- archive 双构建字节完全一致，secret/symlink/macOS metadata findings 为 0；
- G6-A4 合同、全量 content tests 与 VitePress build 全绿；
- public/SSH/upload/remote/Docker/edge/provider/production Agent/commit/push effect ledger 均为 0。
