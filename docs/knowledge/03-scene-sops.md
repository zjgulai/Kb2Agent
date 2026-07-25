# 第三部分：10 种输入场景完整工程 SOP

> **阅读方式**：每个场景严格遵循同一结构——小白认知比喻 → 微观任务拆解 → GitHub 仓库选型表（分环境）→ 可运行 SOP → 天坑避免。所有仓库均经过一手验证。

---

## 快速场景定位

| 你手里有什么 | 跳到 |
| :--- | :--- |
| PDF / 书籍 / 论文，**内嵌图片 + 表格 + 公式** | 场景 A |
| YouTube / B站 / 本地教程视频 | 场景 B |
| 播客 / 会议录音 / 有声书 | 场景 C |
| 博客文章 / RSS / Twitter Thread | 场景 D |
| GitHub 仓库 / API 文档站 | 场景 E |
| 某位专家/同事/公众人物的经验 | 场景 F |
| Excel / 数据库 / API 数据 | 场景 G |
| 架构图 / 流程图 / UI 截图 | 场景 H |
| BI 看板 / SPA / WebGL 动态内容 | 场景 J |
| 会议录音 / 直播 / 在线课程 | 场景 I |

---

## 场景 A：复杂排版长文本（PDF / 书籍 / 论文）

### 小白认知比喻

**PDF 不是文本文件，是"画在数字纸上的墨水"。** 每个字符只有坐标，没有段落、没有表格、没有语义——只有一堆散落的点阵。解析 PDF 的本质是**逆向工程**：把无序坐标还原成有意义的结构。

用 Python `pdfminer` 直接读双栏学术论文，左右栏文字会交错混合——因为它按坐标从上到下扫，不理解"这里是两栏版式"。

**三个天坑先知道：**
1. **跨页表格撕裂**：表格被页面边界截断，RAG 检索到残缺数据
2. **公式乱码**：`∫₀^∞` 被 OCR 读成 `J0oo`，蒸馏结果彻底失效
3. **双栏阅读顺序灾难**：左右栏文字交错——Agent 读到"精神错乱版"

### 书中有图片时怎么处理？（关键子问题）

这是最容易被忽视的部分。书中的图片可分为三类，每类策略不同：

| 图片类型 | 例子 | 处理策略 | 工具 |
| :--- | :--- | :--- | :--- |
| **纯图片文字**（截图、扫描手写）| 老文献扫描件 | OCR 提取文字 | MinerU / Unlimited-OCR |
| **有语义的图表**（流程图、架构图、统计图）| 技术书籍插图 | VLM Caption → Mermaid | GPT-4o / Qwen2-VL → 场景 H |
| **纯装饰图**（封面、背景）| 书籍封面图 | 直接跳过 | — |

**核心原则**：MinerU 会把文档内嵌图片裁出来保存，但图片内的文字不会自动 OCR——你需要把裁出的图片再送一遍 OCR 或 VLM。

### GitHub 仓库选型

| 工具 | Stars | 定位 | GPU | 最强项 | 弱项 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`opendatalab/MinerU`** | 75K | 精度第一 | 推荐（CPU可降级）| 表格/公式/CJK/图片裁剪 | 速度较慢 |
| **`baidu/Unlimited-OCR`** | — | 32K上下文一次吞入，消灭流水线误差 | 必须（高配）| 跨页连续结构、超复杂混排 | 需高显存 |
| **`datalab-to/marker`** | — | 批量速度最快 | 推荐 | H100 上 2.9页/秒 | 老旧扫描件差 |
| **`DS4SD/docling`** | 63K | CPU友好，MIT协议 | 不需要 | 金融表格（TableFormer）| 复杂公式弱 |
| **`opendatalab/PDF-Extract-Kit`** | — | 模块化工具箱（MinerU底层）| 需要 | 可独立调用子模块 | 需工程集成 |

**选型决策树：**

```
有 GPU（显存≥8GB）？
├── 有 → 文档有跨页连续结构/超长表格？
│   ├── 有 → baidu/Unlimited-OCR（32K上下文一次吞入）
│   └── 没有 → MinerU（--effort high 最强精度）
│             └── 需要批量高吞吐？ → Marker（balanced模式）
└── 没有 → 文档是金融/财报类？
    ├── 是 → Docling（TableFormer 专为此优化）
    └── 否 → MinerU pipeline 后端（纯CPU降级）
```

### 完整 SOP

**路线一：纯 CPU，快速起步（Docling）**

```bash
pip install docling

# 一行命令：自动保留标题层级、表格结构、阅读顺序
docling your_document.pdf --output ./output/
# 产物：output/your_document.md（图像生成描述占位符）
```

**路线二：有 GPU，高精度（MinerU）**

```bash
pip install mineru

# 普通文档（平衡精度与速度）
mineru -p paper.pdf -o output/ --effort medium

# 复杂文档：跨页表格、密集公式、图片内嵌文字
mineru -p paper.pdf -o output/ --effort high

# 产物：
# output/paper.md       带精确阅读顺序的 Markdown
# output/images/        从文档裁出的高清图片（需要再送 OCR/VLM）
# output/paper.json     结构化 JSON，含每个元素的边界框和类型

# 处理裁出的图片（图片内有文字时）
for img in output/images/*.png; do
  # 送给 VLM 描述
  echo "处理: $img"
done
```

**路线三：超复杂长文档（Unlimited-OCR）**

```python
import fitz, os, tempfile, torch
from transformers import AutoModel, AutoTokenizer

def pdf_to_images(pdf_path, dpi=300):
    """PDF 每页转为高清图片"""
    doc = fitz.open(pdf_path)
    tmp_dir = tempfile.mkdtemp(prefix='pdf_ocr_')
    mat = fitz.Matrix(dpi / 72, dpi / 72)
    paths = []
    for i, page in enumerate(doc):
        out = os.path.join(tmp_dir, f'page_{i+1:04d}.png')
        page.get_pixmap(matrix=mat).save(out)
        paths.append(out)
    return paths

model = AutoModel.from_pretrained(
    'baidu/Unlimited-OCR',
    trust_remote_code=True,
    torch_dtype=torch.bfloat16
).eval().cuda()
tokenizer = AutoTokenizer.from_pretrained('baidu/Unlimited-OCR', trust_remote_code=True)

# 关键：整本书所有页面一次性送入 32K 上下文
# 跨页表格、公式延续、章节引用都能被正确理解
model.infer_multi(
    tokenizer,
    prompt='<image>Multi page parsing.',
    image_files=pdf_to_images('your_doc.pdf', dpi=300),
    output_path='./output/',
    image_size=1024,
    max_length=32768,
    no_repeat_ngram_size=35,  # 防止长文档重复生成
    ngram_window=1024,        # 多页必须用 1024，单页用 128
    save_results=True,
)
```

### 天坑避免

1. **不要用 Token 数切块**：按 500 token 机械切块会从表格中间截断。必须用 MinerU 的 JSON 结构（`type: table`）作为切块边界
2. **Unlimited-OCR 的 ngram_window**：单页用 128，多页必须用 1024，否则中间段出现重复性幻觉
3. **图片内的文字 MinerU 不会自动处理**：用 `output/images/` 下的裁剪图再走一遍 VLM

---

## 场景 B：长视频（YouTube / B站 / 教程 / 课程）

### 小白认知比喻

**视频是"时序状态机"，携带三路信号**：口语文本（低密度）、时间序列操作（高价值）、视觉演示（高价值但不可检索）。大多数工具只抓了口语文本，其余两路全丢。

真正有价值的往往是"第 3 分钟代码报错，第 5 分钟这样改就对了"——这段时序因果，纯字幕无法表达。

### 微观任务拆解

| 任务 | 目标 | 工具 |
| :--- | :--- | :--- |
| 字幕/转写获取 | 口语 → 文本 | `yt-dlp` + `faster-whisper` |
| 说话人分离 | 区分主讲人与提问者 | `pyannote-audio` |
| 关键帧提取 | 捕获操作前后视觉变化 | `ffmpeg` 场景变化检测 |
| 关键帧理解 | 关键帧 → 可检索文字 | GPT-4o / Qwen2-VL |
| 知识蒸馏 | 转写+关键帧 → Skill | `cangjie-skill` / `Resource2Skill` |

### GitHub 仓库选型

| 工具 | Stars | 用途 |
| :--- | :--- | :--- |
| **`yt-dlp/yt-dlp`** | 95K | 下载视频/音频/字幕，支持 1000+ 网站 |
| **`SYSTRAN/faster-whisper`** | 16K | 本地 ASR，比官方 Whisper 快 4x |
| **`pyannote/pyannote-audio`** | 7K | 说话人分离 |
| **`kangarooking/cangjie-skill`** | 4.6K | 方法论/知识类视频 → Skill |
| **`microsoft/Resource2Skill`** | 278 | 工程操作类视频 → 带代码的 Skill |

### 完整 SOP（7步）

```bash
# Step 1: 获取字幕/音频
# 有官方字幕（最快）
yt-dlp --write-subs --sub-langs zh-Hans,en --skip-download "VIDEO_URL"

# 无字幕 → 下载音频转写
yt-dlp -x --audio-format mp3 "VIDEO_URL" -o "audio.%(ext)s"

pip install faster-whisper
faster-whisper \
  --model large-v3 \
  --language zh \
  --output_format txt \
  audio.mp3

# Step 2: 说话人分离（多人视频必做）
pip install pyannote.audio
python3 -c "
from pyannote.audio import Pipeline
pipeline = Pipeline.from_pretrained(
    'pyannote/speaker-diarization-3.1',
    use_auth_token='YOUR_HF_TOKEN'  # 免费申请 huggingface.co
)
diarization = pipeline('audio.mp3')
for turn, _, speaker in diarization.itertracks(yield_label=True):
    print(f'[{turn.start:.1f}s - {turn.end:.1f}s] {speaker}')
"

# Step 3: 提取关键帧（场景变化时，比固定间隔更智能）
ffmpeg -i input_video.mp4 \
  -vf "select='gt(scene,0.3)'" \
  -vsync vfr \
  frames/frame_%04d.jpg
# scene=0.3 表示画面变化超过 30% 才提取，避免冗余帧

# Step 4: 关键帧语义描述（专注操作内容，不描述画面美感）
python3 << 'EOF'
import base64, openai, os

client = openai.OpenAI()
PROMPT = """描述这张视频截图中：
1. 当前操作步骤（代码/UI/终端的具体内容）
2. 与上下文的因果关系（这是操作"之前"还是"之后"的状态）
3. 关键信息（错误信息/重要参数/配置值）
只描述信息，不描述画面风格。"""

results = []
for fname in sorted(os.listdir("frames")):
    with open(f"frames/{fname}", "rb") as f:
        b64 = base64.b64encode(f.read()).decode()
    resp = client.chat.completions.create(
        model="gpt-4o",
        messages=[{"role":"user","content":[
            {"type":"text","text": PROMPT},
            {"type":"image_url","image_url":{"url":f"data:image/jpeg;base64,{b64}"}}
        ]}]
    )
    results.append(f"[{fname}]\n{resp.choices[0].message.content}")

with open("frame_descriptions.md","w") as f:
    f.write("\n\n---\n\n".join(results))
EOF

# Step 5: 合并转写 + 关键帧描述
cat transcript.txt frame_descriptions.md > combined_input.md

# Step 6: 蒸馏为 Skill
# 方法论/知识类视频 → cangjie-skill
# 在 Claude Code / OpenCode 中：
# /cangjie-skill combined_input.md

# 工程操作类视频 → Resource2Skill
# python cli.py agent --domain web --task "..." --model gpt-4o

# Step 7: 压力测试
# cangjie-skill 自动生成 test-prompts.json
# 验证所有测试用例 Agent 能给出正确触发路径
```

### 天坑避免

1. **字幕信噪比只有 30%**：1小时视频大量填充词，必须先清洗（删填充词+按语义段落重组）
2. **固定帧率提取漏掉快速操作**：用 ffmpeg 场景变化检测（`scene=0.3`）比固定时间间隔精准 3-5 倍
3. **cangjie 适合方法论，Resource2Skill 适合工程操作**——根据视频性质选择，混用效果差

---

## 场景 C：播客 / 会议录音 / 有声书

### 小白认知比喻

**音频携带了文字无法表达的"权重信号"**——某人说一句话时，语气急促、犹豫停顿、声调强调，都是判断"这句话对他有多重要"的元信息。大多数蒸馏管道把这些信号全丢了。

2 小时播客中真正有价值的核心观点可能只有 20-30 个，藏在大量"对、嗯、就是那个意思"之中。

### GitHub 仓库选型

| 工具 | Stars | 优势 | 推荐场景 |
| :--- | :--- | :--- | :--- |
| **`FunAudioLLM/SenseVoice`** | 11K | 阿里开源，带情绪识别，中文最强 | 中文播客/会议首选 |
| **`SYSTRAN/faster-whisper`** | 16K | 速度快，多语言支持好 | 英文/多语言内容 |
| **`pyannote/pyannote-audio`** | 7K | 说话人分离 | 多人对话必做 |
| **`QwenLM/Qwen2-Audio`** | — | 端到端音频理解 | 直接问音频问题 |

**中文播客/企业会议优先用 SenseVoice**：比 faster-whisper 中文准确率高 15%+，同时输出情绪标签（`<|NEUTRAL|>` / `<|HAPPY|>` / `<|ANGRY|>`），可用于权重标注。

### 完整 SOP（5步）

```bash
# Step 1: 音频获取
pip install podcast-dl
podcast-dl --url "RSS_FEED_URL" --out ./episodes/
# 或
yt-dlp "PODCAST_URL" -x --audio-format mp3

# 降噪（可选，改善转写质量）
ffmpeg -i input.mp3 -af "anlmdn=s=7:p=0.002:r=0.01" output_clean.mp3

# Step 2: 高精度转写 + 情绪识别（SenseVoice）
pip install funasr modelscope

python3 << 'EOF'
from funasr import AutoModel

model = AutoModel(
    model="iic/SenseVoiceSmall",
    trust_remote_code=True,
    vad_model="fsmn-vad",
    vad_kwargs={"max_single_segment_time": 30000},
    device="cuda:0",  # CPU 环境用 "cpu"
)

res = model.generate(
    input="audio_clean.mp3",
    cache={},
    language="auto",
    use_itn=True,   # 自动将"三十二"转为"32"
    batch_size_s=60,
    merge_vad=True,
)

# 输出格式：时间戳 + 情绪标签 + 文本
with open("transcript_with_emotion.txt", "w") as f:
    for seg in res:
        f.write(f"[{seg.get('start',0):.1f}s] {seg['text']}\n")
EOF

# Step 3: 说话人分离（多人对话必做）
python3 << 'EOF'
from pyannote.audio import Pipeline
pipeline = Pipeline.from_pretrained(
    "pyannote/speaker-diarization-3.1",
    use_auth_token="YOUR_HF_TOKEN"  # 免费申请：huggingface.co
)
diarization = pipeline("audio_clean.mp3")
for turn, _, speaker in diarization.itertracks(yield_label=True):
    print(f"[{turn.start:.1f}s-{turn.end:.1f}s] {speaker}")
# 合并两个输出：时间戳对齐 → 每段文字 + 说话人 + 情绪
EOF

# Step 4: 对话结构化
# 核心逻辑：嘉宾 + 强调语气 = 高价值候选
# 主持人 + 中性语气 = 可过滤
# 手动或用 LLM 做分类

# Step 5: 蒸馏
# 方法论类播客：
# /cangjie-skill transcript_with_emotion.txt

# 访谈类（提炼公众人物思维）：
# /nuwa-skill "人物名字"  （nuwa 自动调研，不需要提供录音）

# 个人录音日记：
# /yourself-skill
```

### 天坑避免

1. **飞书妙记生成的是摘要，不是知识**：摘要丢失了大量细节，蒸馏前必须用原始转写，不是纪要
2. **SenseVoice 情绪标签是粗粒度的**：只用作"这句话值得注意"的信号，不要过度解读具体情绪
3. **长播客（2h+）必须启用 VAD**：`fsmn-vad` 自动跳过静音段，速度提升 3-5 倍

---

## 场景 D：网页文章 / RSS / Twitter Thread

### 小白认知比喻

**单篇文章是矿渣，主题聚合才是矿脉。** Paul Graham 一篇文章提炼出 3 个 Insight，但他 20 年的 200 篇文章关于"如何判断创始人"的 Insight 聚合起来就是完整的决策系统。

Twitter Thread 是例外——作者刻意结构化的方法论输出，知识密度极高，可直接当方法论蒸馏。

### GitHub 仓库选型

| 工具 | 用途 | 命令 |
| :--- | :--- | :--- |
| **Jina Reader API** | URL → 干净 Markdown，零配置 | `curl "r.jina.ai/[URL]"` |
| **`kepano/defuddle`** | 本地去广告/导航，提取正文 | `defuddle [URL]` |
| **Obsidian Web Clipper** | 浏览器插件，一键存入 inbox | 浏览器安装 |
| **`kangarooking/cangjie-skill`** | 聚合后的多篇文章 → Skill | `/cangjie-skill inbox/*.md` |

### 完整 SOP（4步）

```bash
# Step 1: 内容获取
# 单篇立即处理
curl "r.jina.ai/https://paulgraham.com/founders.html" > founders.md

# 批量 RSS 监控
pip install feedparser requests
python3 << 'EOF'
import feedparser, requests, os

RSS_FEEDS = [
    "https://paulgraham.com/rss.html",
    "https://www.ruanyifeng.com/blog/atom.xml",
]
os.makedirs("inbox", exist_ok=True)

for feed_url in RSS_FEEDS:
    feed = feedparser.parse(feed_url)
    for entry in feed.entries[:5]:
        content = requests.get(f"https://r.jina.ai/{entry.link}").text
        safe_id = entry.id.replace("/","_").replace(":","_")
        with open(f"inbox/{safe_id}.md", "w") as f:
            f.write(f"# {entry.title}\n\n{content}")
        print(f"保存: {entry.title}")
EOF

# Step 2: 按主题聚合（核心！单篇价值低，聚合后价值倍增）
ls inbox/founder_*.md | xargs cat > topic_founders.md
ls inbox/product_*.md | xargs cat > topic_product.md

# Step 3: 分类蒸馏
# 技术博客/方法论 → cangjie-skill
# /cangjie-skill topic_founders.md

# Twitter Thread（已是结构化方法论）→ 直接蒸馏
curl "r.jina.ai/https://x.com/..." > thread.md
# /cangjie-skill thread.md

# 新闻/资讯 → 摘要卡片（不入永久库，加有效期）
cat >> news_card.md << 'EOF'
---
expires: 2026-10-25
category: news
---
EOF

# Step 4: 持续监控
# 用 wigolo-watch 监控目标博客
# 每月清理 expires 日期已过的临时卡片
```

### 天坑避免

1. **微信公众号无法直接抓取**：需 PC 端打开后用 Obsidian Web Clipper 手动存，或通过 Playwright 渲染后抓取
2. **资讯类内容不入永久库**：事件新闻 3 个月后成为"过时信息污染"，必须打 `expires` 标签定期清理

---

## 场景 E：代码仓库（GitHub Repo / API 文档站）

### 小白认知比喻

**代码不是知识，是知识的实现。** 真正要蒸馏的是：这段代码解决什么问题、什么情况下调用、参数含义是什么。把整个仓库代码都塞给 Agent，就像让人背字典学英语。

两种完全不同的需求，用完全不同的路线：
- **"理解项目架构"** → 主动探索路线（Ananta）
- **"用这个库写代码"** → Skill 化路线（Resource2Skill）

### GitHub 仓库选型

| 工具 | Stars | 用途 |
| :--- | :--- | :--- |
| **`Aider-AI/aider`** 附带 Repomix | 27K | 仓库打包为单文件喂给 LLM |
| **`microsoft/Resource2Skill`** | 278 | 代码/文档 → 带可执行代码的 Skill |
| **Context7 MCP** | — | 实时查询官方最新文档（防文档过时）|
| **`Ovid/ananta`** | 24 | LLM 主动探索大型代码库 |

### 完整 SOP（3条路线）

```bash
# 路线 A: 理解架构（Ananta 主动探索）
pip install ananta

python3 << 'EOF'
import ananta
# LLM 通过"写查询代码"主动探索，而非被动接收全部代码
project = ananta.create_project_from_repo(
    "https://github.com/langchain-ai/langchain"
)
answer = project.ask(
    "What is the main data flow from user input to LLM response?"
)
print(answer)  # 输出：架构图 + 关键文件路径
EOF

# 路线 B: 用库编程（Resource2Skill）
git clone https://github.com/microsoft/Resource2Skill
cd Resource2Skill
python3.11 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

python cli.py agent \
  --domain web \
  --task "Analyze the examples/rag/ directory and create reusable skills.
          Each skill must include: trigger conditions, complete runnable
          code with all imports, and edge cases to avoid." \
  --model gpt-4o \
  --max-iter 40

# 路线 C: 快速 API 速查（Repomix 打包）
npx repomix \
  --include "docs/**,examples/**,README*,*.md" \
  --output repo_packed.md \
  --remote https://github.com/target/repo

# 然后送 cangjie-skill 蒸馏出 API 速查 Skill

# 任何路线的最后一步：Context7 补充最新文档
# 通过 Context7 MCP 实时获取官方最新文档
# 在 Skill 里标注 version: >=X.Y.Z 防止过时
```

### 天坑避免

1. **文档可能比代码旧 6-12 个月**：必须用 Context7 MCP 或访问官方 docs 站补充，在 Skill 里标注版本号
2. **Resource2Skill 的 code 字段必须可执行**：`acceptance_predicate.code_executable: true` 不能跳过——让 LLM 在沙箱里实际运行

---

## 场景 F：人物 / 专家经验

### 小白认知比喻

**蒸馏人的核心不是语气，而是决策框架。** 用"马斯克方式"思考获客成本，有价值的输出是："先算物理极限，再看实际路径是极限的几倍，超过3倍质疑这个步骤是否必要"——这是可迁移的认知工具，而不是"保持强硬口吻"。

**语气是噪音，决策框架才是信号。**

### 路线选型

| 来源类型 | 推荐工具 | 蒸馏目标 |
| :--- | :--- | :--- |
| 公众人物（公开资料丰富）| `alchaincyf/nuwa-skill` | 思维框架 + 决策启发式 |
| 同事/内部专家 | `titanwings/colleague-skill` | 工作方法 + 安全边界 |
| 个人自我蒸馏 | `notdog1998/yourself-skill` | 自我意识模型 |
| 情感陪伴（非生产）| `therealXiaomanChu/ex-skill` | ⚠️ 仅情绪价值，幻觉风险高 |

### 完整 SOP：双轨提炼（铁律，不可合并）

```bash
# 轨道 A（能力轨）：工作方法 / 心智模型 / 决策启发式 → work_skill.md
# 轨道 B（行为轨）：沟通边界 / 表达风格（非语气模仿）→ persona_skill.md

# 公众人物：nuwa-skill（自动调研 40+ 一手资料 + 三重验证）
npx skills add alchaincyf/nuwa-skill
# /nuwa "Naval Ravikant"
# nuwa 六路并行调研 → 三重验证 → 双轨封装 → SKILL.md

# 同事/专家：colleague-skill
npx skills add titanwings/colleague-skill
# /colleague
# 输入：工作文档、会议记录、代码审查
# 输出：work_skill.md + persona_skill.md + manifest.json

# 多来源聚合（书+视频+访谈）
# 先分别用 A/B/C 场景处理各类来源，再合并
# /cangjie-skill buffett_letters.md buffett_speeches/ buffett_interviews.md
```

### 天坑避免

1. **幻觉是最大威胁**：nuwa 的六路调研+三重验证是防幻觉机制，不能绕过。输出的"名言"若不确定真实性，必须人工核实
2. **ex-skill 不适合生产环境**：它蒸馏的是语气 DNA，不是决策逻辑，无法提升工程任务完成率

---

## 场景 G：结构化数据（Excel / 数据库 / API）

### 小白认知比喻

**数字本身没有语义。** `42000000` 是无意义的，但 `Q3 净利润 = 4200万，同比+23%，超分析师预期` 才是知识。蒸馏结构化数据的本质：**给数字装上业务上下文的外壳，使其变成可被推理的命题**。

### GitHub 仓库选型

| 工具 | Stars | 用途 |
| :--- | :--- | :--- |
| **`opendatalab/MinerU`** | 75K | Excel/CSV → 保留结构的 Markdown（表格不变形）|
| **`francyjglisboa/bdistill-skills`** | — | 从数据中提取 IF-THEN 决策规则 |
| **`google/langextract`** | 37.7K | 从文本提取结构化信息 |

### 完整 SOP（4步）

```python
# Step 1: 结构保留解析（不用 pandas，保留行列合并）
# MinerU 会把 Excel 的合并单元格正确还原为 HTML
import subprocess
subprocess.run(["mineru", "-p", "financial_report.xlsx",
                "-o", "output/", "--effort", "high"])

# Step 2: 决策规则提炼（bdistill）
# 适合有明确阈值的业务规则提取
# pip install bdistill

# bdistill 工作流：
# 1. 描述需求 → 2. 结构化提取 → 3. 对抗验证（5种措辞重问）→ 4. JSONL持久化
# 示例输出：
# {"rule": "IF Q3增速<10% AND 净利率<5% THEN 预警:增长质量低",
#  "confidence": 0.85,
#  "evidence": ["Q3数据段落", "同期分析师报告"],
#  "tags": ["financial", "growth_quality"]}

# Step 3: 语义标注（给数字加业务外壳）
PROMPT = """
以下是财务数据：{raw_data}
请为每个核心指标生成语义说明，格式：
[指标名]: [数值] → [业务含义]（同比[变化] / 行业对比 / 趋势判断）
"""

# Step 4: 分类入库
# 决策规则 → Rules JSONL（用于自动化监控）
# 分析洞察 → 摘要原子笔记（带有效期：生成日期 + 有效期）
# 原始表格 → 向量库（元数据：quarter/year/metric_type）
```

### 天坑避免

1. **pandas 读 Excel 丢失合并单元格**：必须用 MinerU 或 openpyxl 保留结构，否则表头和数据对应关系错乱
2. **bdistill 的对抗验证不能跳过**：同一个规则用 5 种措辞重问，不稳定 = 幻觉规则，直接丢弃

---

## 场景 H：图像 / 图表 / 设计稿

### 小白认知比喻

**图像是信息的另一种物理形态。** 一张架构图里的一条箭头，表达了两个系统的调用关系——被忽略后 Agent 永远不知道 A 调用了 B。

视觉信息的蒸馏有根本矛盾：**转为文本损失空间信息，不转无法检索**。2026 年的解法是双轨：检索轨用原生视觉嵌入（ColPali），执行轨用 Mermaid 代码。

### GitHub 仓库选型

| 工具 | Stars | 用途 |
| :--- | :--- | :--- |
| **`illuin-tech/colpali`** | 2K | 文档图像直接嵌入为多模态向量（无需 OCR）|
| **`opendatalab/MinerU`** | 75K | 从 PDF/文档裁出高清图片元素 |
| **`mermaid-js/mermaid`** | 72K | Markdown 中的图表渲染引擎 |
| GPT-4o / Qwen2-VL | — | 图像理解 + Mermaid 生成 |

### 双轨 SOP

```python
# ============= 轨道 A：检索轨（ColPali 原生视觉嵌入）=============
# 图像直接变向量，检索时无需 OCR，通过视觉相似度召回
pip install colpali-engine

from colpali_engine.models import ColPali, ColPaliProcessor
import torch
from PIL import Image

model = ColPali.from_pretrained(
    "vidore/colpali-v1.2",
    torch_dtype=torch.bfloat16,
    device_map="cuda"
)
processor = ColPaliProcessor.from_pretrained("vidore/colpali-v1.2")

images = [Image.open(f) for f in image_paths]
batch = processor.process_images(images)
with torch.no_grad():
    embeddings = model(**batch)  # 可直接存入 Qdrant 多向量索引

# ============= 轨道 B：执行轨（VLM → 结构化代码）=============
# 只对"需要执行"的图像做，不是所有图像都需要
import openai, base64
client = openai.OpenAI()

PROMPTS = {
    "flowchart": "将这张流程图转为 Mermaid flowchart LR 代码。保留所有节点名称和箭头标签。",
    "data_chart": "提取图表中所有数值（X轴/Y轴标签、每个数据点）。输出为 Markdown 表格，然后用一句话描述最重要的趋势。",
    "architecture": "描述：1.所有组件名称 2.组件间连接关系和数据流向 3.系统分层结构",
    "ui_design": "提取：1.主要 UI 组件列表 2.颜色值（如有）3.布局规律（对齐/间距）",
}

def describe_image(image_path: str, image_type: str) -> str:
    with open(image_path, "rb") as f:
        b64 = base64.b64encode(f.read()).decode()
    resp = client.chat.completions.create(
        model="gpt-4o",
        messages=[{"role":"user","content":[
            {"type":"text","text": PROMPTS[image_type]},
            {"type":"image_url","image_url":{"url":f"data:image/png;base64,{b64}"}}
        ]}]
    )
    return resp.choices[0].message.content
```

### 天坑避免

1. **不要对所有图像都做 VLM Caption**：成本高且产生废话。优先 ColPali，只有需要"理解并执行"的图像（架构图、流程图）才用 VLM 转 Mermaid
2. **Mermaid 节点名不要用中文特殊字符**：某些字符导致渲染失败，用英文 ID + 中文 Label

---

## 场景 J：动态/交互式画布（BI看板 / SPA / WebGL）

### 小白认知比喻

**BI 看板的数据是冰山，视觉只是水面上的 10%。** 截图只能拿到静态外观，真正的知识藏在"点击这个筛选项后会出现什么"、"下钻到某维度看到什么"。普通网页抓取只能得到 HTML 外壳，JavaScript 动态渲染的内容根本不在初始 HTML 里。

### GitHub 仓库选型

| 工具 | Stars | 用途 |
| :--- | :--- | :--- |
| **`microsoft/playwright`** | 68K | 无头浏览器自动化，可触发 JS 交互 |
| **`nicepkg/openclaw`** | — | 通过 CDP 控制真实浏览器（含登录态）|

### 完整 SOP（3步）

```python
pip install playwright
playwright install chromium

from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=False)  # 有 UI 便于调试
    page = browser.new_page()

    # 拦截所有 API 数据请求（绕过 UI 直接拿数据立方体）
    api_responses = []
    def handle_response(response):
        if "api" in response.url and response.status == 200:
            try:
                api_responses.append({
                    "url": response.url,
                    "data": response.json()
                })
            except:
                pass
    page.on("response", handle_response)

    page.goto("https://your-bi-dashboard.com")
    page.wait_for_load_state("networkidle")

    # 模拟交互：点击所有筛选项、展开所有折叠
    for btn in page.query_selector_all("[data-testid='filter-button']"):
        btn.click()
        page.wait_for_load_state("networkidle")

    # 截图存档
    page.screenshot(path="dashboard_full.png", full_page=True)
    browser.close()

# 将拦截到的 API JSON 扁平化为结构化 Markdown
import pandas as pd
for resp in api_responses:
    df = pd.json_normalize(resp["data"])
    fname = resp["url"].split("/")[-1]
    df.to_markdown(f"data_{fname}.md")

# 然后送入场景 G 的蒸馏流程
```

---

## 场景 I：实时内容（会议 / 直播 / 在线课程）

### 小白认知比喻

**会议是知识最容易"蒸发"的地方。** 一个两小时架构评审会，真正有价值的知识可能只有 3 个：被否决的方案（有理由）、被采纳的方案（有依据）、未来需要验证的假设。这些信息被淹没在打招呼、等待入会、重复确认之中。

**双轨处理是铁律：行动项不入知识库，知识性内容不入任务系统。**

### GitHub 仓库选型

| 场景 | 工具 | 原因 |
| :--- | :--- | :--- |
| 中文企业会议 | 飞书妙记 / 腾讯会议 AI | 中文说话人分离最佳，零配置 |
| 需要精确控制 | `FunAudioLLM/SenseVoice` + `pyannote` | 完全本地，可后处理 |
| 方法论提炼 | `kangarooking/cangjie-skill` | 同场景 B/C |
| 架构决策记录 | ADR 格式 | 标准化决策存档 |

### 完整 SOP（4步）

```bash
# Step 1: 转写（企业推荐飞书妙记，个人用 SenseVoice）

# Step 2: LLM 噪音过滤
FILTER_PROMPT="以下是会议转写。请：
1. 删除：签到/打招呼/听得到吗/重复确认/无关闲聊
2. 保留并打标签：[决策] [行动项] [技术判断] [方法论]
3. 行动项格式：[责任人] [任务描述] [截止日期]"

# Step 3: 双轨分离
# [行动项] → 钉钉/飞书/Notion（不入知识库）
# [方法论] + [技术判断] → cangjie-skill 蒸馏
# [决策] → ADR 格式

cat > adr_template.md << 'TEMPLATE'
# ADR-{编号}: {决策标题}
**状态**: 已采纳 / 被否决 / 待验证
**日期**: YYYY-MM-DD

## 背景
{为什么需要做这个决策}

## 决策内容
{具体决定了什么}

## 后果
{正面影响 / 负面影响 / 待验证假设}

## 被否决的方案
{方案名}: {否决原因}
TEMPLATE

# Step 4: 存档结构
# raw/meetings/YYYY-MM-DD-主题.md   ← 原始转写，只读，永不删除
# wiki/decisions/                   ← 提炼的方法论 Skill
# wiki/architecture-decisions/      ← ADR 文档
```

### 天坑避免

1. **飞书妙记的 AI 纪要是摘要，不是知识**：蒸馏前必须用原始转写，不是纪要
2. **行动项和知识必须彻底分开**：行动项是当天消耗品，知识是长期资产，混在一起会污染知识库

---

## 附录：场景选型快速对照

| 输入特征 | 有 GPU | 首选工具 | 关键仓库 |
| :--- | :--- | :--- | :--- |
| 原生 PDF（非扫描）| 任意 | Docling | `DS4SD/docling` |
| 扫描 PDF / 复杂排版 | 有 | MinerU effort=high | `opendatalab/MinerU` |
| 跨页超复杂表格 | 有（高配）| Unlimited-OCR | `baidu/Unlimited-OCR` |
| 书内嵌图片（含文字）| 有 | MinerU 裁图 + GPT-4o VLM | MinerU → 场景 H |
| YouTube 教程视频 | 任意 | yt-dlp + faster-whisper + cangjie | 场景 B |
| 中文播客/会议 | 任意 | SenseVoice（情绪识别最强）| `FunAudioLLM/SenseVoice` |
| 技术博客聚合 | 任意 | Jina Reader + cangjie 批量 | `kangarooking/cangjie-skill` |
| GitHub 仓库用法 | 任意 | Resource2Skill | `microsoft/Resource2Skill` |
| 公众人物思维框架 | 任意 | nuwa-skill | `alchaincyf/nuwa-skill` |
| BI 看板数据 | 任意 | Playwright CDP 拦截 | `microsoft/playwright` |
| 架构图/流程图 | 有 | ColPali 嵌入 + VLM Mermaid | `illuin-tech/colpali` |
