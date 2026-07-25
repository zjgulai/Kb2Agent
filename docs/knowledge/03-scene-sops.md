# 第三部分：9种输入场景完整SOP

> 每个场景格式统一：输入特征 → 核心挑战 → 工具链 → SOP步骤 → 蒸馏结果形式 → 费用参考

---

### 场景 A：长文本（PDF / 书籍 / Word / 论文）

**输入特征**：结构化程度高，知识密度高，信噪比相对较好。

**核心挑战**：
- 扫描件/复杂排版 PDF 需 OCR，表格识别是难点
- 书籍长度（100页+）超出单次 LLM 上下文
- 知识点隐式编码在章节结构和段落中

**工具链**：
```
PDF 解析路由：
├── 简单文本 PDF → LlamaParse Fast 或 Docling
├── 复杂表格/公式 → MinerU 2.5（精度最高）或 LlamaParse Agentic
├── 扫描件/手写 → MinerU 2.5（含 OCR）
└── EPUB/Word/PPT → markitdown（万能转换）
```

**SOP（6步）**：

```
Step 1: 格式识别与解析路由
  · file_type = detect(input_file)
  · 选择合适解析器（见工具链）
  · 输出：统一 Markdown 文件

Step 2: 长文档分段（超过 50 页时）
  · 按章节/标题边界切分
  · 每段保留上下文重叠（500字）
  · 工具：Docling 原生分块 / LangChain TextSplitter

Step 3: Atomic Insight 提取（Level 1）
  Prompt 模板：
  "从以下段落中提取所有原子事实，
   格式：[主体] [动词/关系] [客体/数值]，
   每条独立一行，不要改写，直接从原文提取"
  
  过滤规则：置信度 < 0.4 丢弃，> 0.8 标记已验证

Step 4: Concept 聚合（Level 2）
  · 将相关 Atomic Insights 聚合为主题群
  · 每个 Concept = 标题 + 3-7 个支撑 Insights
  · 对抗验证：同一 claim 用 5 种措辞重问，不稳定→标记幻觉

Step 5: 摘要与跨文档（Level 3-4）
  · 生成 Document Abstract：目的/范围/主题/关键结论
  · 若已有其他文档：生成 Cross-Document Recollections（对比/矛盾/互补）

Step 6: 入库
  · Atomic Insights → 向量库（精确检索）
  · Concepts + Abstract → Wiki Markdown 页面（探索性查询）
  · 高频流程章节 → 编译为 SKILL.md（Agent 调用）
```

**蒸馏结果形式**：
- 主要：四层金字塔（Atomic JSONL + Concept Markdown + Abstract Markdown）
- 上层：Agent Skill（从方法论章节二次蒸馏）

**费用参考（100页PDF）**：
- 解析：$0（Docling本地）或 $0.5（LlamaParse API）
- LLM蒸馏：~$1.5（约50K字 × Claude Sonnet 4.5 $3/MTok）

---

### 场景 B：长视频（YouTube / B站 / 本地视频）

**输入特征**：时序信息（操作顺序）+ 视觉信息（关键帧）+ 口语文本（低信噪比）。

**核心挑战**：
- LLM 无法直接读取视频，必须先文本化
- 关键信息常在视觉演示（操作画面/图表/白板）中，而非口语
- 1小时视频 ≈ 10,000-15,000字字幕，口语冗余多

**工具链**：
```
字幕获取：
├── YouTube/B站有官方字幕 → yt-dlp --write-subs --skip-download URL
├── 无字幕 → yt-dlp 下载音频 → faster-whisper 本地转写
└── 企业视频 → Docling video pipeline（ASR+关键帧一体化）

关键帧：
└── VLM（GPT-4V / Qwen2-VL）描述关键帧内容
```

**SOP（6步）**：

```
Step 1: 字幕/转写获取
  · 有官方字幕：
    yt-dlp --write-subs --sub-langs zh-Hans --skip-download [URL]
  · 无字幕（本地 ASR）：
    yt-dlp -x --audio-format mp3 [URL] -o audio.mp3
    faster-whisper --model large-v3 --language zh audio.mp3

Step 2: 关键帧提取（视觉信息多时必做）
  · 每30秒或场景切换时提取一帧
  · VLM 描述：
    "描述这张截图中展示的操作步骤或关键信息，
     不要描述画面美感，只描述信息内容"
  · 输出：frame_N_description.md（与字幕时间戳对齐）

Step 3: 字幕清洗
  · 去除：时间戳、"呃/那个/就是说"等口语填充
  · 合并：多行碎片按语义重组成连贯段落
  · 结果：clean_transcript.md

Step 4: 内容蒸馏（cangjie-skill 或 Resource2Skill）
  · 方法A — cangjie-skill（推荐，通用）：
    /cangjie-skill [clean_transcript.md]
    → 5个并行提取器（框架/原则/案例/反例/术语）
    → 三重验证（2处佐证/预测力/独特性）
    → RIA++ 结构化输出

  · 方法B — Resource2Skill（视觉内容丰富时）：
    每个关键章节 = 文本描述 + 关键帧图像 + 代码示例 + 元数据
    保留"操作前后"视觉对比作为 visual_examples 字段

Step 5: Zettelkasten 链接
  · 识别跨视频的概念依赖
  · 生成 INDEX.md 和引用图

Step 6: 安装与测试
  · 生成触发场景测试用例
  · 安装：cp SKILL.md ~/.claude/skills/[skill-name]/
  · 测试：用真实查询验证 Agent 能否正确调用
```

**蒸馏结果形式**：
- 主要：Agent Skill（SKILL.md + chapters/ + DIGEST.md）
- 辅助：Flashcard（课程类视频，如吴恩达系列）
- 参考：原转写文本保留在 raw/（可验证来源）

**费用参考（1小时视频）**：
- 字幕：$0（yt-dlp + Whisper 本地）
- LLM 蒸馏：~$0.30（约15K字 × Claude Sonnet）
- 关键帧描述：~$0.20（约20帧 × VLM）

---

### 场景 C：播客 / 音频文件

**输入特征**：纯音频，无视觉信息，常为多人对话，内容密度低。

**核心挑战**：
- 说话人识别（主持人 vs 嘉宾）
- 2-3小时播客有效内容分散，信噪比低
- 中文播客需专门的 ASR 模型

**工具链**：
```
转写：
├── 本地（免费）：faster-whisper large-v3（中文优秀）
├── API（付费）：OpenAI Whisper API（$0.006/分钟）
└── 企业中文：飞书妙记 / 腾讯会议 AI 纪要

说话人分离：
└── pyannote-audio → [SPEAKER_00] / [SPEAKER_01] 标注
```

**SOP（5步）**：

```
Step 1: 音频获取
  · 播客 RSS：
    podcast-dl --url [RSS] --out ./episodes/
    或 yt-dlp [播客平台URL]
  · 音频降噪（可选）：
    ffmpeg -i input.mp3 -af "anlmdn" output.mp3

Step 2: 双轨特征提取（文本 + 韵律学情绪保留）
  · 轨道A（语义转写 + 说话人分离）：
    faster-whisper --model large-v3 --language zh input.mp3
    结合 pyannote-audio 完成 [SPEAKER_00] 标注。
  · 轨道B（情绪与高阶 Meta 信息保留 - 第一性原理增强）：
    纯文本会抹杀发言者的"迟疑"、"强调"和"情绪"。引入 Qwen2-Audio 等端到端原生音频模型，
    捕捉时间戳内的韵律学特征（Prosody），为文本打上标签：
    `[00:15:20] SPEAKER_01 (语气急促/强调): 这点绝对不能妥协。`
  · 合并输出：带有情绪和重音标注的 transcript_with_speakers_and_emotion.txt

Step 3: 对话结构化
  · 识别主持人 vs 嘉宾角色
  · 提取嘉宾核心观点（过滤主持人引导语、重复确认语）
  · 时间戳对齐（便于回溯验证原音频）

Step 4: 蒸馏
  · cangjie-skill 输入：清洗后的转写文本
  · 播客特别注意：
    - 案例/故事 往往是最有价值的部分 → 单独提取为 A1（已有案例）字段
    - 嘉宾的反常识观点 → 提取为 L1（洞察）字段
    - 可操作建议 → 提取为 How 字段

Step 5: 分类交付
  · 方法论类播客 → SKILL.md（可执行方法论）
  · 访谈类 → 人物 Skill（思维方式提炼）
  · 知识科普类 → 原子笔记 + Flashcard
```

**蒸馏结果形式**：
- 方法论播客 → Agent Skill
- 访谈/对话 → 人物 Skill（COLLEAGUE.SKILL 范式）
- 知识科普 → 原子笔记 + Flashcard（Anki格式）

**费用参考（2小时播客）**：
- 转写：$0（faster-whisper本地）或 $0.72（Whisper API）
- LLM蒸馏：~$0.60

---

### 场景 D：网页文章 / RSS / Twitter Thread

**输入特征**：碎片化，单篇价值低，价值在积累和聚合。

**核心挑战**：
- 单篇文章不够形成知识，需要积累后聚合
- Twitter Thread 观点密集但格式特殊
- 新闻资讯有时效性，不应入永久库

**工具链**：
```
内容提取：
├── 单篇：curl "r.jina.ai/[URL]"（零配置，输出干净Markdown）
├── 本地：defuddle [URL]（去广告/导航）
└── 批量：Obsidian Web Clipper（浏览器插件→inbox/）

Twitter Thread：
└── yt-dlp 或 twitter-thread-reader API → 合并为连贯文章
```

**SOP（4步）**：

```
Step 1: 内容收集与规范化
  · 方案A — 单篇立即处理：
    curl "r.jina.ai/[URL]" > article.md
    → 根据内容类型选蒸馏形式（Step 3）
  
  · 方案B — 批量积累（推荐）：
    收集阶段：Obsidian Web Clipper / Readwise → inbox/
    每周批量：/cangjie-skill inbox/*.md

Step 2: 按主题聚合（重要！）
  · 单篇文章价值低，5-10篇同主题聚合后价值倍增
  · 聚合工具：
    llm-brain 5层编译（摘要→概念卡→公司档案→人物档案→索引）
    或 reading-pipeline L3 跨文档综合
  · 聚合后作为单个输入进入蒸馏

Step 3: 按类型蒸馏
  · 技术博客（有方法论）→ cangjie-skill → Agent Skill
  · 观点类文章 → 原子笔记（Zettelkasten格式）
  · Twitter Thread → 直接转为 SKILL.md（Thread本身已是方法论）
  · 新闻/资讯 → 摘要卡片（必须加时效标记：3个月后降权）

Step 4: 持续更新机制
  · wigolo-watch 监控目标博客更新
  · 新内容触发：Jina Reader → cangjie-skill
  · 每月：vault-health 检查孤立笔记和过时内容
```

**蒸馏结果形式**：
- 方法论博客 → Agent Skill 或 原子笔记
- 技术教程 → Skill（含可执行步骤）
- 新闻资讯 → 摘要卡片（不入永久库）

---

### 场景 E：代码仓库（GitHub Repo / API 文档站）

**输入特征**：代码是知识的实现，不是知识本身；需要提取使用模式和最佳实践。

**核心挑战**：
- 文档与代码不一致（文档可能过时）
- 大型仓库（1M+ 行）不可能全量处理
- 需区分"理解架构"和"学会使用 API"两种不同需求

**工具链**：
```
文档站（最可靠来源）：
  Context7 MCP → 精准查询官方最新文档

代码仓库理解：
  Ananta → LLM主动探索代码库（写查询代码自主发现）

代码仓库打包：
  Repomix → 整个仓库打包为单文件给 LLM

Skill 化：
  Resource2Skill → code 资源路径（提取使用模式）
```

**SOP（5步）**：

```
Step 1: 目标确认（三选一）
  · "理解这个项目的架构" → Step 2A
  · "用这个库编程时如何调用" → Step 2B
  · "快速获取所有 API 一览" → Step 2C

Step 2A: 理解架构（Ananta 路径）
  python -c "
  import ananta
  p = ananta.create_project_from_repo('[github-url]')
  # Agent 自主探索：认证怎么工作？数据流是什么？
  p.ask('What is the main data flow from request to response?')
  "
  输出：架构理解报告 + 关键文件索引

Step 2B: 用库编程（Resource2Skill 路径）
  · 克隆 examples/ 和 docs/
  · Resource2Skill 提取，每个使用模式→ Skill Wiki Entry：
    {
      "name": "库名_功能名",
      "text_body": "何时用/为何用/如何触发",
      "code_field": "可执行代码模板（含完整 import）",
      "visual_examples": [],
      "source_path": "examples/功能名.py"
    }
  · 按功能模块分层组织
  · ⚠️ **防导航迷失技巧：信息嗅觉强化 (Information Scent)**
    在构建层级目录的顶层 `INDEX.md` 时，**绝对不要只写抽象总结**。Agent 没有人类直觉，高级抽象（如"IT 杂项"）会导致 Agent 算不出相关度而错过深层叶子节点。
    **必须在顶层摘要中嵌入「长尾特征布隆过滤器」**：罗列该分支下最硬核、最具体的专有名词。
    错误写法：`本分支包含后端基础设施配置。`
    正确写法：`本分支包含后端基础设施配置（含特征实体：Nginx CORS, K8s CNI, Redis Iris, Kafka 击穿防护）。`

Step 2C: 快速打包（Repomix 路径）
  repomix --output repo-packed.md --include "docs/**,examples/**,README*"
  → 交给 LLM + cangjie-skill 蒸馏

Step 3: Context7 补充最新文档
  · 用 Context7 MCP 查询官方最新 API 文档
  · 修正 Skill 中可能过时信息（标记版本号和文档日期）

Step 4: 代码验证（必做）
  · 每个 Skill 的 code_field 必须实际可运行
  · 接受标准（acceptance_predicate）：
    ✅ 结构完整性：所有字段已填写
    ✅ 溯源可追：source_path 指向真实文件
    ✅ 代码可执行：语法有效，参数签名完整
    ✅ 无重复：与现有 Skill 无重叠

Step 5: 安装
  cp -r [skill-dir]/ ~/.claude/skills/[library-name]/
```

**蒸馏结果形式**：
- 主要：分层 Skill Wiki（文本 + 可执行代码 + 元数据）
- 辅助：原子文档（API 参考，供 RAG 检索）

---

### 场景 F：人物 / 专家经验

**输入特征**：知识高度隐性，多源分散，需双轨提取（能力 + 行为）。

**核心挑战**：
- "能知识"（工作方法/心智模型）vs "行为知识"（沟通风格/边界）需要分离
- 素材来源分散：邮件/聊天/演讲/文章/截图
- 同事经验涉及隐私，公众人物需考虑版权

**工具链**：
```
公众人物（公开内容聚合）：
  cangjie-skill 多源输入 → 综合蒸馏

同事/专家（隐性知识提取）：
  COLLEAGUE.SKILL → 双轨（能力+行为）+ 版本管理

自我蒸馏：
  yourself-skill（3203★） → 个人记录→自我知识库
```

**SOP（5步）**：

```
Step 1: 素材收集与分类
  · 公众人物：
    - 公开演讲/访谈 → 视频/音频 → 走场景B/C
    - 书籍/文章 → 走场景A
    - 汇聚成 person_[name]/ 目录
  
  · 同事/专家：
    - 工作文档/代码审查/设计稿 → COLLEAGUE.SKILL
    - 会议录音 → 场景I → 提炼后接入
  
  · 个人自我蒸馏：
    - 日记/工作日志/回顾 → yourself-skill

Step 2: 双轨提取（COLLEAGUE.SKILL 范式）
  能力轨道（Capability Track）→ work.md：
    · 遇到 X 问题时如何思考和决策？
    · 有哪些判断启发式（heuristics）？
    · 什么情况下会说不/停下来重新想？

  行为轨道（Behavior Track）→ persona.md：
    · 表达风格（正式/随意/直接/迂回）
    · 反馈方式（批评怎么给/认可怎么表达）
    · 沟通边界（什么不说/什么必须说）

Step 3: 渲染 Skill Package
  COLLEAGUE.SKILL 输出结构：
  ├── SKILL.md（主文件，Part A 能力 + Part B 行为）
  ├── work_skill.md（仅能力，独立可调用）
  ├── persona_skill.md（仅风格，独立可调用）
  └── manifest.json（版本+安装元数据）

Step 4: 验证
  · 测试：让 Agent 还原此人对某问题的决策逻辑
  · 修正：自然语言反馈 → patch 对应段落
  · 版本管理：git commit -m "update: [name] skill v2"

Step 5: 多源融合（有多种素材时）
  · 书 + 视频 + 访谈 → 分别蒸馏后合并
  · cangjie-skill 支持多文件输入：
    /cangjie-skill buffett_letters.md buffett_videos/ buffett_interviews.md
  · 输出：完整的投资决策思维体系（多个互相引用的 Skills）
```

**蒸馏结果形式**：
- 公众人物/专家 → Agent Skill（cangjie-skill 范式）
- 同事/团队成员 → COLLEAGUE.SKILL（含版本管理）
- 个人自我 → yourself-skill

---

### 场景 G：结构化数据（表格 / 数据库 / API）

**输入特征**：数字无天然语义，需领域知识解读，时效性强。

**核心挑战**：
- 维度信息（行列关系）必须保留，否则数据失去意义
- 数值需要结合业务背景才有语义
- 数据会变，知识库中的数值需要时效标记

**SOP（4步）**：

```
Step 1: 结构保留解析
  · Excel/CSV：
    MinerU 2.5（表格→HTML保留结构）
    或 Docling（表格→Markdown，保留行列）
  · 数据库：
    SELECT 查询 → 导出为结构化 Markdown
  · API：
    curl [api] | python -c "import sys,json; print(json.dumps(json.load(sys.stdin), indent=2, ensure_ascii=False))"

Step 2: 领域规则提取（bdistill）
  bdistill-extract --mode rules --input data.md --domain [领域]
  
  提取 IF-THEN 规则，例：
  "IF 季度营收增长 < 10% AND 净利润率 < 5% THEN 预警：增长质量低"
  
  对抗验证：同一规则5种措辞重问，稳定→可信，不稳定→标记幻觉

Step 3: 语义标注
  · LLM 为每个关键字段生成语义说明：
    "Q3 Revenue = $42M → 同比+23%，超预期，但环比持平"
  · 关联上下文：数值 + 业务含义 + 趋势判断

Step 4: 入库分类
  · 决策规则 → Rules JSONL（bdistill，用于自动化/监控）
  · 数据分析洞察 → 摘要卡片（带时效标记：生成日期 + 有效期）
  · 参考数据 → 原子笔记（带溯源：数据来源 + 采集日期）
```

**蒸馏结果形式**：
- 决策规则 → Rules JSONL（IF-THEN，适合自动化）
- 分析洞察 → 结构化文档（带时效标签）

---

### 场景 H：图像 / 图表 / 设计稿

**输入特征**：视觉关系 > 文本，无法被文本 RAG 直接检索，需先文字化。

**核心挑战**：
- 图像中的信息（布局/颜色/空间关系）在文字化时会损失
- 数据图表需要精确提取数值，不能靠描述近似
- 架构图的"关系"比单个节点节点更重要

**SOP（4步）**：

```
Step 1: 双轨解析与特征提取（基于第一性原理防视觉降维）
  · 轨道A（检索轨 / 无损感知）：
    使用 ColPali / BGE-Visual 直接生成文档/图像的原生视觉 Embedding，存入向量库。
    目的：直接通过视觉相似度或跨模态语义检索，不通过 VLM 的文本翻译，保留100%空间关系、色彩和细微特征。
  · 轨道B（执行轨 / 可执行提炼）：
    仅当需要生成可执行代码时，使用 GPT-4V 或 Qwen2-VL：
    - 流程图/架构图 → 直接提炼为 Mermaid 代码
    - UI设计稿 → 直接提炼为 CSS Design Token 和 组件树（抛弃对美感和布局的废话描述）
    - 数据图表 → 提取为 CSV / Markdown 表格 + 单行核心趋势

Step 2: 图文关联与降级入库
  · 计算图像哈希（SHA-256）→ 避免重复处理
  · 原生视觉嵌入直接入库（选择 Qdrant / Milvus 等支持多模态的向量库）
  · 可执行代码（Mermaid / CSS / CSV）存入 Markdown

Step 3: 蒸馏形式选择
  · 架构/流程图 → Skill（流程决策支持，依靠轨道B的 Mermaid 代码）
  · 复杂研究图表 → 原生视觉 Embedding 检索（依靠轨道A，检索到图表后由 Agent 的 VLM 实时研判）
  · UI设计系统 → Skill（直接输出硬编码的设计 Token 供开发端消费）
```

**蒸馏结果形式**：
- 架构/流程图 → Mermaid + Skill（可执行决策流程）
- 数据图表 → 结构化表格 + 摘要原子笔记
- 设计系统 → Skill（含设计 Token）

---

### 场景 J：动态/交互式画布（BI看板 / SPA / WebGL）

**输入特征**：信息不直接暴露在 DOM 中，依赖用户的 Hover/Click 交互或隐藏的 API 响应。

**核心挑战**：
- 传统网页抓取（Jina Reader / 无头爬虫）只能抓到外壳骨架，丢失深层数据。
- 视觉截图无法还原数据立方体（Data Cube）的下钻逻辑。

**解决方案工具链**：
```
状态树遍历：
├── 视觉渲染层 → Kimi WebBridge / Playwright (基于 CDP 的自主交互提取)
└── 数据接口层 → 拦截 XHR/Fetch JSON 响应，绕过 UI 直接拿底层数据
```

**SOP（3步）**：
```
Step 1: Agentic 深度遍历（Playwright / CDP）
  · 编写 RPA 脚本或使用 WebBridge 驱动浏览器
  · 自动触发页面上所有的 Hover/Expand/Tab 按钮
  · 记录完整的展现状态快照（State Snapshots）

Step 2: 底层数据还原（API 拦截）
  · 拦截渲染 BI 图表的底层 JSON 数据
  · 将不可读的高维 JSON 扁平化为 Markdown 表格

Step 3: 交互逻辑蒸馏
  · 提取交互关系：将 "点击A出现B" 转化为逻辑因果关系
  · 存入图谱（GraphRAG）或写成包含状态机的 SKILL.md
```

**蒸馏结果形式**：
- 底层数据 → 结构化表格 / API 原子笔记
- 交互流 → 状态机 Skill（模拟面板的下钻过程）

---

### 场景 I：实时/动态内容（会议 / 直播 / 在线课程）

**输入特征**：必须先结束/录制才能处理，噪音极大，需要双轨处理。

**核心挑战**：
- 决策性内容与闲聊/打招呼/技术问题混合
- 行动项（做什么）和知识（知道什么）必须分开
- 隐私问题（会议内容可能含敏感信息）

**SOP（4步）**：

```
Step 1: 录制与转写
  · 企业会议（推荐）：
    飞书妙记 / 腾讯会议 AI 纪要（中文最佳，说话人分离已内置）
  
  · 手动处理（精确控制时）：
    录制 → mp4/mp3
    → faster-whisper 转写
    → pyannote-audio 说话人分离
    → 合并为带说话人标注的文稿

Step 2: 噪音过滤
  识别并删除（LLM 过滤）：
  · 签到/打招呼/技术问题（"听得到我说话吗"）
  · 重复确认（"对对对"/"嗯嗯"/"好的好的"）
  · 与议题无关的闲聊
  
  保留：
  · 决策（"我们决定..."/"确认方案是..."）
  · 行动项（"[人名] 负责...，下周五前完成"）
  · 知识性内容（方法论/经验分享/技术判断）

Step 3: 双轨提取
  轨道A — 项目管理（当天处理）：
    行动项格式：
    · [负责人] [任务描述] [截止时间]
    → 导入任务管理系统（钉钉/飞书/Notion）
    → 不入知识库（不可复用）

  轨道B — 知识提炼（值得保留的内容）：
    · 方法论讨论 → cangjie-skill → Agent Skill
    · 技术判断 → 原子笔记（带日期/参与者/决策背景）
    · 架构决策 → ADR 格式（Architecture Decision Record）：
      标题、状态、背景、决策内容、后果

Step 4: 存档与关联
  · 会议原始转写 → raw/meetings/[日期]-[主题].md（只读存档）
  · 提炼结果 → wiki/decisions/ 或 wiki/concepts/
  · ADR → wiki/architecture-decisions/
```

**蒸馏结果形式**：
- 行动项 → 任务系统（不入知识库）
- 方法论讨论 → Agent Skill 或原子笔记
- 架构决策 → ADR 格式文档

---
