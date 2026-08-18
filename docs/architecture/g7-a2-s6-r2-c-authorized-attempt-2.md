# G7-A2-S6-R2-C：授权的 Attempt-2 实时 Shadow 门禁

## 目标

在不启用 production/live Agent 的前提下，消费一次明确授权，验证 `deepseek-v4-flash` 的两个固定 canary。执行器必须先在同一进程内刷新 DeepSeek 官方价格并通过成本合同，随后才允许读取一次 `ANTHROPIC_API_KEY`，最多调用两次、零重试、每次 10 秒、总成本上限 USD 0.25。

## 确定性执行序列

1. 校验已接受的 R2-B 评审回执、两个固定 canary、传输合同、Provider client 与定价解析器的 SHA-256/字节数。
2. 拒绝覆盖任何既有 R2-C 输出，确保授权只能消费一次。
3. 读取官方公开定价页；失败时仅写安全错误码和终态回执，凭证读取为 0。
4. 解析定价并运行 R2-B 同次刷新、来源、时窗和最坏成本合同；失败时写定价证据与终态回执，凭证读取为 0。
5. 在定价证据已经落盘后读取一次环境变量；缺失时写终态回执，Provider 调用为 0。
6. 顺序执行两个固定 canary。任一调用失败立即停止，不执行第二次，不重试。
7. Provider 原始错误、响应正文与任何凭证值/长度/哈希/指纹均不落盘；只保留固定安全码、正文哈希、usage、时延与成本投影。
8. 生成 0600 的追加式回执，并关闭本轮授权；后续调用、生产启用、远端、Docker、commit/push 均保持未授权。

## 终态

- `passed-authorized-bounded-attempt-2`：两个 canary 均通过，只能进入独立本地 closeout 评审，不代表生产就绪。
- `blocked-*` 或 `failed-*`：授权已消费、零重试；只能另开只读诊断/追加式修正门禁。

## 明确不声明

本门禁不证明 DeepSeek 后端供应商身份、不核对最终账单、不启用公开 runtime、不修改服务器或 Docker，也不构成 production/live Agent 验收。
