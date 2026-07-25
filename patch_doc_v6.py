import os
import re

knowledge_dir = "/Users/pray/project/distillation/docs/knowledge/"

p7 = os.path.join(knowledge_dir, "07-advanced-theory.md")
with open(p7, 'r', encoding='utf-8') as f:
    c7 = f.read()

# ---------------------------------------------------------
# 新增模块：女娲-仓颉-达尔文 深度案例分析
# ---------------------------------------------------------
new_ecosystem_section = """
### 7.5 实战案例深度对决：“女娲-仓颉-达尔文”生态与认知克隆

在 `zjgulai` 的知识图谱高星列表中，隐藏着一条极具工业启发的“认知克隆”路线。这条路线完全抛弃了传统的 Chunk 检索，而是将人类经验提炼为 `Agent Skill` (Level 4/5)，并且形成了闭环的生态系统。

> **核心哲学 (第一性原理)**：知识不是静态的数据快照，而是**可执行的判断启发式 (Decision Heuristics)** 和 **行为函数 (Behavioral Functions)**。

我们对以下核心 SOTA 仓库进行第一性原理审计：

| 仓库名称 | 核心生态定位 | 蒸馏的深度与形态 | 对 Agent 调用的有效性评估 (ROI) |
| :--- | :--- | :--- | :--- |
| **`cangjie-skill` (仓颉)**<br/>`book2skill` | **造书**：从文本/视频/播客提炼方法论 | **结构化动作流**：不提取故事，只提取 `RIA-TV++`（引用/重写/案例/触发/边界）。 | **高**。将几万字杂音浓缩为纯动作指令，解决大语料下 Agent 迷失问题。配合 `test-prompts.json` 强校验。 |
| **`nuwa-skill` (女娲)**<br/>`ex-skill` | **造人**：公众人物/前任的思维与表达克隆 | **双轨认知克隆**：分离 `能力轨道 (工作方法)` 与 `行为轨道 (表达DNA/语气)`。 | **极高**。让通用大模型发生“人格坍缩”，高度聚焦特定场景的决策模式，拒绝废话。 |
| **`darwin-skill` (达尔文)** | **进化**：Skill 的自我博弈与迭代 | **动态生命周期**：9维度加权打分 + 棘轮机制 (Ratchet) = 仅保留带来正向收益的代码。 | **革命性**。引入了类似微软 `SkillOpt` 的 validation-gated 验证拦截，解决人工维护 Skill 库的疲劳。 |

#### 取其精华、去其糟粕的整合选型 (Integrative Selection)

如果你要在生产环境中落地这套体系，请务必带着批判性思维：

1.  **去其糟粕（不要做的事）**：
    *   **❌ 拒绝迷信大纲提取**：很多工具把书“蒸馏”成一个目录大纲，Agent 看了大纲依然不知道具体怎么执行。**知识卡片/大纲 是给人看的，不是给 Agent 用的。**
    *   **❌ 拒绝纯语气模仿（Cosplay）**：像 `ex-skill`（克隆前任）本质是情绪价值的玩具，如果把 `nuwa-skill` 仅用于让 Agent 说话像乔布斯，毫无业务价值。

2.  **取其精华（必须做的事）**：
    *   **✅ 强制双轨提炼 (Dual-Track Distillation)**：
        效仿 `nuwa-skill`，将业务专家经验蒸馏时，必须切分为 **“决策原则 (Capability)”** 与 **“安全边界 (Contraindications)”**。不要把他们混在一整段文字里。
    *   **✅ 三重验证机制 (Triple Validation)**：
        效仿 `cangjie-skill`：所有从原始语料（无论是专家开会还是业务文档）提炼出的结论，必须满足“有2处独立佐证 + 具备预测力 + 非废话常识”，否则直接在蒸馏期淘汰（淘汰率可达 50%）。这极大降低了注入 Knowledge Base 的“有毒数据”。
    *   **✅ 引入达尔文棘轮 (The Darwinian Ratchet)**：
        把每个生成的 `SKILL.md` 当作一段 Python 代码来看待。每次更新 Skill，必须跑一次 `test-prompts.json` 回归测试。只有当 9 维度综合得分（`val_bpb`）提升时，才允许覆盖入库。

#### 落地实践：认知克隆的终局工程链路

综上，从信息源到 Agent 可理解知识库的**最强形态链路**如下：

1.  **输入源剥离**：使用 `Unlimited-OCR` (文本) 或端到端音频模型将专家访谈/核心代码库还原为干净的源数据。
2.  **仓颉式剥离**：不采用 LangChain 切块，直接跑 5 个并发 Agent（框架提取、原则提取、反例提取、术语对齐、操作提炼）。
3.  **女娲式封装**：将上面提取的碎片，组装成带有严格 `System Prompt` 外壳的 `SKILL.md`。例如：“遇到此类超时问题，首先检查 X，绝不能做 Y”。
4.  **达尔文式防腐**：在 CI/CD 中挂载 `darwin-skill` 脚本，每次有人修改知识库，自动生成 10 个极端问题去问 Agent，如果 Agent 按着新的 Skill 执行反而报错（如格式越界、遗漏安全检查），直接阻断该次提交 (`revert`)。

"""

insert_pos = c7.rfind("### 7.4 核心误区：GraphRAG (Level 3) 与 VectorRAG (Level 0) 的终极辩论")
if insert_pos != -1:
    c7 = c7[:insert_pos] + new_ecosystem_section + "\n" + c7[insert_pos:]

with open(p7, 'w', encoding='utf-8') as f:
    f.write(c7)

print("Markdown patched with Nuwa-Cangjie-Darwin deep ecosystem analysis.")
