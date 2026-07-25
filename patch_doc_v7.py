import os

knowledge_dir = "/Users/pray/project/distillation/docs/knowledge/"

# 新建独立页面
new_page_path = os.path.join(knowledge_dir, "09-skill-distillation-deep-dive.md")

content = """# 第八部分：9大仓库深度解构——从信息源到 Agent 可执行知识的完整工程路线

> **阅读前提**：本章基于对 9 个高星开源仓库的一手代码与文档逐行研究，带着**批判性思维（淘金式分析）**——提炼其方法论精华，同时指出每条路线的设计盲区。目标是给你一张真正可落地的技术决策地图。

---

## 8.1 九个仓库的核心画像

在我们开始对比之前，先建立每个仓库的精准定位。这 9 个仓库看起来"结果都是 Skill"，但它们的**信息源**、**蒸馏深度**、**核心主张**截然不同。

| 仓库 | Stars | 信息源 | 蒸馏对象 | 核心主张 |
| :--- | :--- | :--- | :--- | :--- |
| `kangarooking/cangjie-skill` | 4.6K | 书籍/视频/播客 | **方法论** | 蒸馏书：把方法论拆成可调用工具包 |
| `shenqistart/book2skill` | — | 书籍（经典/商业） | **领域知识框架** | cangjie 的社区实践仓库 |
| `alchaincyf/nuwa-skill` | — | 公众人物公开资料 | **人的思维方式** | 蒸馏人：让名人给你打工 |
| `therealXiaomanChu/ex-skill` | 5.9K | 聊天记录/朋友圈 | **人格/表达DNA** | 蒸馏前任：情感疗愈 |
| `notdog1998/yourself-skill` | 3.2K | 个人日记/聊天 | **自我意识模型** | 蒸馏自己：数字永生 |
| `tmstack/awesome-persona-skills` | 3.4K | 各类人物材料 | **导航目录** | 万物皆可 Skill 生态聚合 |
| `alchaincyf/darwin-skill` | — | 已有 SKILL.md | **Skill 本身** | 进化 Skill：受 Karpathy autoresearch 启发的棘轮优化 |
| `microsoft/Resource2Skill` | 278 | 教程视频/代码/文章/产物 | **可执行工程操作** | 从多模态资源中提炼真正可运行的 Agent 技能 |
| `FLHonker/Awesome-KD` | 2.7K | 学术论文 | **模型参数蒸馏** | 神经网络知识蒸馏学术论文全集（2014-2021）|

---

## 8.2 蒸馏路线全景图：四条技术路线

通过横向分析，这 9 个仓库的本质路线可以归纳为 **4 条**，它们在蒸馏目标、信息损失率、Agent 调用有效性上各有差异。

```mermaid
flowchart LR
    subgraph R1 [路线一: 方法论蒸馏]
        A1[书籍/视频/播客] --> B1[结构化 RIA++ 方法论] --> C1[可调用执行契约 SKILL.md]
    end
    subgraph R2 [路线二: 人格克隆]
        A2[聊天记录/社交痕迹/公开资料] --> B2[双轨提炼 能力+行为] --> C2[角色扮演/决策模拟]
    end
    subgraph R3 [路线三: 工程操作蒸馏]
        A3[教程视频/代码/产物] --> B3[多模态 Skill Wiki 条目] --> C3[带可执行代码的工程 Skill]
    end
    subgraph R4 [路线四: Skill 进化]
        A4[已有 SKILL.md] --> B4[9维评估+棘轮机制] --> C4[更强的下一版 SKILL.md]
    end
    classDef default fill:#fafafa,stroke:#334155,stroke-width:1px;
```

---

## 8.3 路线一：方法论蒸馏（cangjie-skill / book2skill）

### 路线本质

**信息源 → 可执行判断工具包**，不是摘要，不是复述，而是把书里的方法论解构为 Agent 在实际场景中可以直接调用的"决策函数"。

### 核心流程：RIA-TV++ 六阶段

cangjie-skill 的真正竞争壁垒在于它的蒸馏流水线设计极其严格：

```
阶段 0: 整书理解（Adler 分析阅读法）
         ↓ 四步拆解：结构 / 解释 / 批判 / 应用 → BOOK_OVERVIEW.md
阶段 1: 5 路并行提取器
         框架提取器 / 原则提取器 / 案例提取器 / 反例提取器 / 术语对齐器
         ↓ 同时运行，各自产出候选单元
阶段 1.5: 三重验证筛选（淘汰率 50-75%）
         ✅ 必须有 ≥2 处独立佐证（跨章节）
         ✅ 必须具备预测力（能回答书中未明说的问题）
         ✅ 必须非常识（不是人尽皆知的废话）
阶段 2: RIA++ 结构化
         R 原文引用 / I 自己重写 / A1 书中案例 / A2 未来触发场景 / E 执行步骤 / B 边界与盲点
阶段 3: Zettelkasten 链接
         ↓ skill 之间的依赖、对比、组合关系 → INDEX.md
阶段 4: 压力测试
         每个 skill 设计包含诱饵题的测试用例
         未通过 → 回炉 阶段 2
```

### book2skill 的实战证明

book2skill 已经对《缠论》、《茶经》、《微信背后的产品观》等多本书完成了完整蒸馏，产出了 **问题导向的 Skill 索引表**。核心设计：

- 每个 Skill 有对应的"你的问题是..."触发场景
- 保留显式边界（"不确认、不建议、需补数据"）
- 以 `test-prompts.json` 作为质量门控

### 批判性评估

| 维度 | 评分 | 分析 |
| :--- | :---: | :--- |
| **Agent 调用有效性** | ★★★★★ | RIA++ 格式天然贴合 Agent 的 function-calling 逻辑；有触发条件、有执行步骤、有边界说明 |
| **蒸馏深度** | 知识图谱级 | 不是大纲，是方法论的可执行分解，有跨 Skill 的链接关系 |
| **信息损失率** | 中（约 60%）| 三重验证淘汰了大量候选，但保留下来的都是高纯度精华 |
| **维护成本** | 中 | 需要手动跑流水线，更新书本时无自动化增量 |
| **⚠️ 核心缺陷** | — | **仅适用于结构清晰的书籍/文章**；对口语化的视频、对话内容蒸馏效果下降明显 |

---

## 8.4 路线二：人格克隆（nuwa-skill / ex-skill / yourself-skill）

### 路线本质

**人的痕迹 → 可运行的人格模型**，不是总结一个人说了什么，而是复现一个人"会怎么想"。

### 三个仓库的精准差异

```
nuwa-skill（女娲）：公众人物 → 思维操作系统（决策框架+心智模型）
ex-skill（前任）：  私人聊天记录 → 语气复现+情感记忆（情绪价值导向）
yourself-skill：    个人日记/记录 → 自我镜像（Part A:记忆 + Part B:人格）
```

### nuwa-skill 的架构精髓

nuwa-skill 的核心不是让 Agent 说话像某人，而是提取其**可迁移的认知工具（Transferable Cognitive Tools）**：

```
输入：一个人名（如 Naval Ravikant）
       ↓
Phase 1: 6路并行调研 Agent
         → 40+ 一手资料（访谈/著作/演讲/帖子）
Phase 2: 三重验证心智模型
         → 必须有跨场景的一致性
Phase 3: 双轨结构化
         能力轨（工作方法/决策规则）
         行为轨（表达 DNA/语气边界）
Phase 4: SKILL.md 封装
         + darwin-skill 内置评估驱动的持续进化
```

**核心理念**：当用户遇到 SaaS 获客成本高的问题，经过马斯克 Skill 处理后，得到的不是"马斯克的口吻"，而是**第一性原理的解构框架**——先算物理极限，再看实际路径与极限的倍数。

### ex-skill 的第一性原理批判

`ex-skill` 是目前 5.9K Stars 中争议最大的仓库。从纯粹的技术角度进行批判：

**精华（值得借鉴）**：
- 多版本/回滚机制（`/ex-rollback`）→ 说明好的 Persona Skill 需要版本管理
- "放下模式"（`/let-go`）→ 设计了 Skill 的生命周期终态，不是永久保留

**糟粕（应该避免）**：
- **纯语气模仿毫无业务价值**：在生产环境中，"像某人说话"无法提升 Agent 的任务完成率
- **隐私边界模糊**：使用他人聊天记录需要严格的法律合规考量
- **幻觉放大器**：越是情绪化的场景，LLM 的输出越容易偏离真实，变成有害的幻觉

**正确的迁移姿势**：只借鉴其**双轨结构**（能力轨+行为轨），以及**多版本管理**机制。

### 批判性评估

| 维度 | 评分 | 分析 |
| :--- | :---: | :--- |
| **Agent 调用有效性（nuwa/yourself）** | ★★★★☆ | 在需要"换视角决策"时极其有效；在需要精确事实时容易幻觉 |
| **Agent 调用有效性（ex-skill）** | ★★☆☆☆ | 情绪价值场景有效，无法用于任何生产工程任务 |
| **蒸馏深度** | 知识卡片级 | 提取的是人格模式，非结构化知识图谱 |
| **⚠️ 核心缺陷** | — | **幻觉风险极高**：Agent 在模拟已知人格时，会用自己的知识"补充"，产生从未存在过的"引用" |

---

## 8.5 路线三：工程操作蒸馏（microsoft/Resource2Skill）

### 路线本质

**多模态资源（教程/代码/产物）→ 可运行的工程 Skill**，这是目前唯一真正针对"真实软件操作"的 Skill 蒸馏框架，而非知识摘要。

### 架构核心：Skill Wiki 条目结构

Resource2Skill 的每个 Skill 条目（Entry）包含以下字段，这是整条路线最值得学习的设计：

```json
{
  "name": "skill_name",
  "text_body": "何时触发 / 为何使用 / 如何配置",
  "code_field": "可直接运行的代码模板（含完整 import）",
  "visual_examples": ["操作前/操作后截图路径"],
  "source_path": "原始教程的章节路径",
  "acceptance_predicate": {
    "structural_completeness": true,
    "source_traceability": true,
    "code_executable": true,
    "no_duplication": true
  }
}
```

**关键设计**：`acceptance_predicate`（可接受谓词）是一个显式的质量门控，只有同时满足4个条件的 Skill 才能入库。

### 与 cangjie-skill 的本质差异

| 对比维度 | cangjie-skill | Resource2Skill |
| :--- | :--- | :--- |
| **蒸馏目标** | 方法论/框架（声明性知识）| 操作步骤/代码（程序性知识）|
| **代码字段** | 无 | 核心字段，必须可运行 |
| **视觉样例** | 无 | 必须包含 before/after 截图 |
| **验证方式** | 三重验证（人工逻辑验证）| acceptance_predicate（代码可执行验证）|
| **适用场景** | 知识密集型任务 | 操作密集型任务 |

### 批判性评估

| 维度 | 评分 | 分析 |
| :--- | :---: | :--- |
| **Agent 调用有效性** | ★★★★★ | 在 7 个创作领域测试中比无 Skill Agent 高出 +11.9 分；Skill 中有实际可运行代码 |
| **蒸馏深度** | 知识图谱级+可执行 | 最高阶：结构化条目+代码+视觉+溯源链 |
| **⚠️ 核心缺陷** | — | **高度依赖 GPU 与多模态模型**；多模态资源准备成本高；不适合纯文本知识库 |

---

## 8.6 路线四：Skill 进化（darwin-skill）

### 路线本质

这条路线不产生新的 Skill，而是**让已有的 Skill 自动变得更好**。受 Karpathy autoresearch 启发，将模型训练中的"实验-验证-保留"范式移植到 Skill 优化领域。

### 核心机制：达尔文棘轮

棘轮（Ratchet）只能向前转，这是 darwin-skill 最精髓的设计：

```
1. 基线评估（9维度加权打分，满分100）
        ↓
2. 单维度优化实验（每轮只改一个维度）
        ↓
3. validation-gated 验证（独立评委，不复用）
        ↓
   得分提升? → ✅ 保留（git commit）
   得分持平? → ❌ 回滚（git revert）
   得分降低? → ❌ 回滚 + 标注失败模式
```

**9个评估维度**（v2.0，对齐微软 SkillLens 论文）：
1. 触发精确性
2. 执行步骤清晰度
3. 可执行具体性（禁止"视情况而定"等模糊词）
4. 边界与禁忌
5. 失败模式编码
6. 高风险行动黑名单（rm/force-push等）
7. 溯源可追
8. 格式规范
9. 上下文感知

### darwin-skill 的反例黑名单（极其重要）

darwin-skill 明文禁止的 8 条反模式，是整个 Skill 生态中最有价值的工程经验：

| 反模式 | 原因 |
| :--- | :--- |
| 同一个 AI 又改又评 | LLM 自评准确率仅 46.4%（SkillLens 实证）|
| 用 `git reset --hard` 回滚 | 应用 `git revert`，保留变更历史 |
| 为凑分而堆冗余内容 | 评分提升但 Agent 调用时 context 膨胀 |
| 跳过 test-prompts 直接评分 | 等于没有验证 |
| 一轮内改多个维度 | 无法定位哪个改动带来了提升 |
| 干跑比例 > 30% | Skill 覆盖面不足的信号 |
| 静默跳过异常 | 掩盖失败，累积技术债 |
| 忽视维度相关簇 | 维度之间有耦合，需要联动调整 |

### 批判性评估

| 维度 | 评分 | 分析 |
| :--- | :---: | :--- |
| **Agent 调用有效性** | N/A（元工具）| 不直接调用，而是让被优化的 Skill 更有效 |
| **独特价值** | ★★★★★ | 解决了 Skill 库的"熵增老化"问题，将防腐变成自动化流程 |
| **⚠️ 核心缺陷** | — | **Human-in-the-Loop 负担**：关键节点需要人工审核，对小团队有额外时间成本 |

---

## 8.7 FLHonker/Awesome-KD：学术视角的清醒剂

这个仓库是 2014-2021 年神经网络知识蒸馏的学术论文全集（658篇+）。它与上面 8 个仓库属于完全不同的范畴——**模型压缩蒸馏**，而非**知识库蒸馏**。

**之所以在此提及，是因为它提供了一个极其重要的批判性视角**：

> 在模型蒸馏领域，**知识的形态**被严格区分为：
> - Logit-based（输出层概率分布）
> - Feature-based（中间层特征图）
> - Relation-based（样本间关系结构）
> - Graph-based（实体关系图）

**迁移到知识库蒸馏的启示**：我们对书籍/视频/聊天记录做的蒸馏，其实对应的是不同的"知识形态层"。大多数开源仓库（包括 cangjie-skill）只做了表面的 Logit-level（输出文本相似）蒸馏，而没有做到 Relation-level（概念间因果/依赖关系）蒸馏。这正是 LightRAG 的知识图谱路线试图解决的更深层问题。

---

## 8.8 整合视角：四条路线的综合对比评分

基于以上深度分析，我们从 5 个维度对四条路线进行综合评分：

| 评估维度 | 路线一<br/>方法论（cangjie）| 路线二<br/>人格克隆（nuwa）| 路线三<br/>工程操作（R2S）| 路线四<br/>Skill进化（darwin）|
| :--- | :---: | :---: | :---: | :---: |
| **Agent 任务完成率** | ★★★★★ | ★★★☆☆ | ★★★★★ | N/A |
| **信息保真度** | ★★★★☆ | ★★★☆☆ | ★★★★★ | ★★★★★ |
| **幻觉风险** | 低 | **高** | 低 | 极低 |
| **构建成本** | 中 | 低 | 高 | 低（改进已有）|
| **适用范围** | 知识密集型 | 角色扮演/创意 | 工程操作型 | 任何已有 Skill |

---

## 8.9 黄金整合方案：取其精华的终局工程链路

通过对这 9 个仓库的批判性解构，**真正的高质量 Skill 蒸馏**需要将四条路线的精华融合：

```mermaid
flowchart TD
    Input[原始信息源] --> Router{信息类型判断}
    
    Router -- 书籍/视频/文章 --> R1[路线一: cangjie RIA-TV++]
    Router -- 专家/人物经验 --> R2[路线二: nuwa 双轨提炼]
    Router -- 可执行操作/代码 --> R3[路线三: R2S Skill Wiki]
    
    R1 & R2 & R3 --> Validate{三重验证}
    
    Validate -- ≥2处佐证+预测力+非常识 --> Draft[SKILL.md 草稿]
    Validate -- 不通过 --> Discard[丢弃 / 回炉]
    
    Draft --> Darwin[路线四: darwin 棘轮优化]
    Darwin -- 9维评分提升 --> Library[(Skill 知识库)]
    Darwin -- 评分不提升 --> Revert[git revert 回滚]
    
    Library --> Agent[Agent 调用]
    
    classDef default fill:#fafafa,stroke:#334155,stroke-width:1px;
    classDef decision fill:#fef9c3,stroke:#ca8a04,stroke-width:1px;
    classDef danger fill:#fee2e2,stroke:#dc2626,stroke-width:1px;
    classDef success fill:#dcfce7,stroke:#16a34a,stroke-width:1px;
    class Router,Validate decision;
    class Discard,Revert danger;
    class Library,Agent success;
```

### 三条核心整合原则

**原则 1：方法论 Skill 必须用 RIA++ 结构，不能用摘要**

书摘和 Skill 是截然不同的东西。书摘是"书里说了什么"，Skill 是"遇到什么情况应该怎么执行"。
- ✅ 正确：`触发条件 + 执行步骤 + 边界说明`
- ❌ 错误：`本书的核心观点是...`

**原则 2：人格 Skill 只提炼决策框架，不模仿语气**

nuwa-skill 之所以有价值，是因为它提炼的是"马斯克遇到成本问题时的思维路径"，而不是"马斯克说话的语气"。语气是噪音，决策框架才是信号。
- ✅ 正确：`当遇到 X 问题时，先算物理极限，再看实际路径是极限的几倍`
- ❌ 错误：`保持马斯克的口吻和语气风格`

**原则 3：所有入库的 Skill 都必须接入达尔文棘轮**

Skill 不是文档，不能写完就不管。知识会随时间腐烂，Agent 的调用场景会漂移。
- 每次修改 Skill，跑一次 `test-prompts.json`
- 只有 9 维评分提升时才允许 commit
- 显式标记高风险行动的黑名单（对齐 darwin v2.0 规范）

---

## 8.10 写给决策者的最后一页

如果你只能记住这一章的三件事：

1. **蒸馏的本质不是压缩，而是结构化**。把"书里说了很多东西"变成"遇到问题 X 时执行 Y，边界是 Z"——这才是 Agent 能用的知识。

2. **四条路线适用不同场景，不可替代**：方法论用 cangjie，人物思维用 nuwa（只取决策框架，丢掉语气），可执行操作用 Resource2Skill，所有已有 Skill 的维护用 darwin。

3. **幻觉是最大的风险**：越是"像某人"的 Skill，越容易产生从未存在过的"名人语录"。三重验证（佐证+预测力+非常识）是唯一有效的防幻觉机制。
"""

with open(new_page_path, 'w', encoding='utf-8') as f:
    f.write(content)

# 更新 config.js 加入新页面
config_path = "/Users/pray/project/distillation/docs/.vitepress/config.js"
with open(config_path, 'r') as f:
    config = f.read()

old_nav = "{ text: '附录：工具与生态', link: '/knowledge/08-tools-appendix' }"
new_nav = """{ text: '附录：工具与生态', link: '/knowledge/08-tools-appendix' },
            { text: '八、Skill蒸馏深度解构', link: '/knowledge/09-skill-distillation-deep-dive' }"""
config = config.replace(old_nav, new_nav)

with open(config_path, 'w') as f:
    f.write(config)

print("Done: new page + sidebar updated.")
