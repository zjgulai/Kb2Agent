<script setup>
import { computed, onMounted, ref } from 'vue'
import { withBase } from 'vitepress'
import {
  PhArrowRight,
  PhCheckCircle,
  PhDownloadSimple,
  PhFlowArrow,
  PhLockKey,
  PhTerminal,
  PhWarning
} from '@phosphor-icons/vue'

const props = defineProps({ view: { type: String, required: true } })
const loading = ref(true)
const error = ref('')
const artifacts = ref({ receipt: null, evaluation: null, map: null, extraction: null, review: null, dryRun: null })

const views = {
  evidence: { index: '01', eyebrow: 'EVIDENCE DESK', title: '每条结论，都能回到文件里的一个位置。', deck: '从 6 种格式、88 个结构元素到 3 条核心证据，公开证据等级、定位符、缺口与审查状态。' },
  map: { index: '02', eyebrow: 'KNOWLEDGE MAP', title: '内容模块不是目录，而是一条可执行依赖链。', deck: 'Concept、Metric、Decision、Case、Playbook、Skill 与 Task 通过类型化关系连接，禁止 Case 直接晋升为 Skill。' },
  cases: { index: '03', eyebrow: 'CASE MATRIX', title: '成功不是会回答，而是该停时真的停。', deck: '20 条固定任务覆盖正常路径、缺失输入、过期/冲突证据与越权诱导；结果由同一个确定性运行时生成。' },
  build: { index: '04', eyebrow: 'BUILD RECEIPT', title: '把“能运行”变成一组可独立核验的回执。', deck: '语料、提取、编译、快照、索引、Agent、评测分别留痕；canonical apply 始终关闭。' },
  ops: { index: '05', eyebrow: 'LOCAL OPS', title: '一台轻量服务器也能稳定承载的参考面。', deck: '静态站点服务阅读与证据导出；CLI、SQLite、Docker Compose 与 stdio MCP 只承担本地确定性回放。' }
}

const current = computed(() => views[props.view])
const navItems = [
  ['Evidence', '/reference/evidence', 'evidence'],
  ['Map', '/reference/map', 'map'],
  ['Cases', '/reference/cases', 'cases'],
  ['Build', '/reference/build', 'build'],
  ['Ops', '/reference/ops', 'ops']
]

const groups = computed(() => {
  const results = artifacts.value.evaluation?.results || []
  return ['positive', 'negative', 'adversarial'].map((category) => ({ category, rows: results.filter((result) => result.category === category) }))
})

const mapGroups = computed(() => {
  const nodes = artifacts.value.map?.nodes || []
  const order = ['Concept', 'Metric', 'DecisionModel', 'Case', 'Playbook', 'Skill', 'TaskPackage']
  return order.map((type) => ({ type, nodes: nodes.filter((node) => node.type === type) })).filter((group) => group.nodes.length)
})

onMounted(async () => {
  try {
    const names = ['m1-b-execution-receipt', 'evaluation-report', 'knowledge-map', 'extraction-receipt', 'review-packet', 'canonical-dry-run']
    const values = await Promise.all(names.map(async (name) => {
      const response = await fetch(withBase(`/reference/m1b/${name}.json`))
      if (!response.ok) throw new Error(`${name}: HTTP ${response.status}`)
      return response.json()
    }))
    artifacts.value = Object.fromEntries(['receipt', 'evaluation', 'map', 'extraction', 'review', 'dryRun'].map((key, index) => [key, values[index]]))
  } catch (reason) {
    error.value = reason.message
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <main class="mkd-reference-page">
    <nav class="mkd-reference-tabs" aria-label="Reference 实现导航">
      <a v-for="item in navItems" :key="item[2]" :class="{ active: item[2] === view }" :href="withBase(item[1])">{{ item[0] }}</a>
    </nav>

    <header class="mkd-reference-hero">
      <div><p class="mkd-overline">{{ current.index }} / {{ current.eyebrow }}</p><h1>{{ current.title }}</h1><p>{{ current.deck }}</p></div>
      <dl>
        <div><dt>SNAPSHOT</dt><dd>0.2.0</dd></div>
        <div><dt>GRADE</dt><dd>L2 dry-run</dd></div>
        <div><dt>CALLS</dt><dd>0</dd></div>
      </dl>
    </header>

    <p v-if="loading" class="mkd-reference-notice">正在读取本地构建回执…</p>
    <p v-else-if="error" class="mkd-reference-notice is-error"><PhWarning :size="18" />无法读取构建产物：{{ error }}</p>

    <template v-else-if="view === 'evidence'">
      <section class="mkd-reference-metrics" aria-label="证据概要">
        <article><span>06</span><strong>formats</strong><small>XLSX · PDF · PPTX · DOCX · MD · JSON</small></article>
        <article><span>{{ artifacts.extraction.structuralElementCount }}</span><strong>elements</strong><small>每个元素都有 locator 与 content hash</small></article>
        <article><span>{{ artifacts.review.evidenceRefs.length }}</span><strong>core evidence</strong><small>指标变化 · 指标定义 · 停止条件</small></article>
        <article><span>00</span><strong>canonical writes</strong><small>候选态，不自动晋升</small></article>
      </section>
      <section class="mkd-reference-section">
        <header><p class="mkd-panel-index">SOURCE INVENTORY</p><h2>多格式输入不是“支持后缀”，而是保留原生定位。</h2></header>
        <div class="mkd-source-ledger">
          <article v-for="source in artifacts.extraction.sources" :key="source.sourceId">
            <span>{{ source.format }}</span><div><strong>{{ source.file.split('/').at(-1) }}</strong><small>{{ source.elementCount }} elements · {{ source.bytes }} bytes</small></div><code>{{ source.locatorsHash.slice(7, 17) }}</code>
          </article>
        </div>
      </section>
      <section class="mkd-reference-section mkd-review-section">
        <header><p class="mkd-panel-index">REVIEW PACKET</p><h2>可展示，不等于已批准。</h2></header>
        <div class="mkd-review-grid">
          <article><strong>候选对象</strong><span>{{ artifacts.review.candidates.length }}</span><ul><li v-for="item in artifacts.review.candidates" :key="item"><code>{{ item }}</code></li></ul></article>
          <article><strong>未关闭问题</strong><span>{{ artifacts.review.unresolved.length }}</span><ul><li v-for="item in artifacts.review.unresolved" :key="item">{{ item }}</li></ul></article>
        </div>
      </section>
    </template>

    <template v-else-if="view === 'map'">
      <section class="mkd-map-flow" aria-label="知识对象依赖链，可横向滚动" tabindex="0">
        <template v-for="(group, index) in mapGroups" :key="group.type">
          <article><span>{{ String(index + 1).padStart(2, '0') }}</span><strong>{{ group.type }}</strong><code v-for="node in group.nodes" :key="node.id">{{ node.label }}</code></article>
          <PhArrowRight v-if="index < mapGroups.length - 1" :size="22" aria-hidden="true" />
        </template>
      </section>
      <section class="mkd-reference-section">
        <header><p class="mkd-panel-index">TYPED RELATIONS</p><h2>{{ artifacts.map.edges.length }} 条关系把阅读、判断与执行合同接起来。</h2></header>
        <div class="mkd-edge-ledger"><article v-for="edge in artifacts.map.edges" :key="edge.id"><span>{{ edge.type }}</span><code>{{ edge.from }}</code><PhFlowArrow :size="17" /><code>{{ edge.to }}</code></article></div>
      </section>
      <aside class="mkd-reference-callout"><PhLockKey :size="21" /><div><strong>晋升边界</strong><p>Case 只能先形成 KnowledgeCandidate，再经 PromotionDecision；当前决策为 pending-review，canonical write 为 0。</p></div></aside>
    </template>

    <template v-else-if="view === 'cases'">
      <section class="mkd-reference-metrics">
        <article><span>{{ artifacts.evaluation.passed }}/{{ artifacts.evaluation.total }}</span><strong>golden pass</strong><small>固定输入与固定预期</small></article>
        <article><span>08</span><strong>positive</strong><small>生成可审查草案</small></article>
        <article><span>08</span><strong>negative</strong><small>缺失、过期、冲突均阻断</small></article>
        <article><span>04</span><strong>adversarial</strong><small>写入诱导与越权工具均阻断</small></article>
      </section>
      <section v-for="group in groups" :key="group.category" class="mkd-case-group">
        <header><p class="mkd-panel-index">{{ group.category }}</p><strong>{{ group.rows.length }} cases</strong></header>
        <div><article v-for="row in group.rows" :key="row.goldenId"><PhCheckCircle :size="18" weight="fill" /><code>{{ row.goldenId }}</code><span>{{ row.actual }}</span><strong>PASS</strong></article></div>
      </section>
    </template>

    <template v-else-if="view === 'build'">
      <section class="mkd-build-spine">
        <article><span>01</span><strong>Corpus</strong><small>6 formats · 4 negative fixtures</small></article>
        <article><span>02</span><strong>Extract</strong><small>{{ artifacts.receipt.corpus.elements }} stable elements</small></article>
        <article><span>03</span><strong>Compile</strong><small>{{ artifacts.receipt.compiler.objectCount }} objects</small></article>
        <article><span>04</span><strong>Snapshot</strong><small>{{ artifacts.receipt.compiler.snapshotHash.slice(7, 19) }}</small></article>
        <article><span>05</span><strong>Evaluate</strong><small>{{ artifacts.receipt.agent.goldenPassed }}/{{ artifacts.receipt.agent.goldenTotal }} passed</small></article>
      </section>
      <section class="mkd-reference-section mkd-build-receipt">
        <header><p class="mkd-panel-index">IMMUTABLE RECEIPT</p><h2>通过，但只通过到 L2 本地 dry-run。</h2></header>
        <dl>
          <div><dt>PACKAGE</dt><dd>{{ artifacts.receipt.compiler.packageId }}</dd></div>
          <div><dt>SNAPSHOT</dt><dd>{{ artifacts.receipt.compiler.snapshotId }}</dd></div>
          <div><dt>PROVIDER CALLS</dt><dd>{{ artifacts.receipt.providerCalls }}</dd></div>
          <div><dt>CANONICAL WRITES</dt><dd>{{ artifacts.receipt.canonicalWrites }}</dd></div>
          <div><dt>DEPLOYED</dt><dd>{{ artifacts.receipt.deployed }}</dd></div>
          <div><dt>GIT COMMITTED</dt><dd>{{ artifacts.receipt.gitCommitted }}</dd></div>
        </dl>
        <div class="mkd-hash-line"><span>manifest hash</span><code>{{ artifacts.receipt.compiler.snapshotHash }}</code></div>
      </section>
      <section class="mkd-download-grid" aria-label="构建产物下载">
        <a v-for="item in [['Snapshot', 'snapshot.json'], ['Review packet', 'review-packet.json'], ['Dry run', 'canonical-dry-run.json'], ['Evaluation', 'evaluation-report.json']]" :key="item[1]" :href="withBase(`/reference/m1b/${item[1]}`)" download><PhDownloadSimple :size="18" /><span>{{ item[0] }}</span><code>{{ item[1] }}</code></a>
      </section>
    </template>

    <template v-else-if="view === 'ops'">
      <section class="mkd-ops-grid">
        <article><p class="mkd-panel-index">01 / BUILD</p><h2>重复编译与验收</h2><pre><code>npm run reference:qa</code></pre><small>生成 manifest、JSONL、snapshot、SQLite、20 条评测与回执。</small></article>
        <article><p class="mkd-panel-index">02 / CLI</p><h2>本地确定性调用</h2><pre><code>node reference/runtime/cli.mjs run '{"caseId":"CASE-AMZ-ACOS-SYNTHETIC","comparisonWindow":"7d-vs-7d"}'</code></pre><small>不需要 provider key；输出 ActionPackage、Trace 与 Receipt。</small></article>
        <article><p class="mkd-panel-index">03 / CONTAINER</p><h2>隔离运行面</h2><pre><code>docker compose -f compose.m1b.yaml run --rm mkd evaluate</code></pre><small>read-only 容器、临时 /tmp、provider 与 canonical apply 显式禁用。</small></article>
        <article><p class="mkd-panel-index">04 / MCP</p><h2>stdio 工具面</h2><pre><code>node reference/runtime/cli.mjs mcp</code></pre><small>仅暴露 mkd_search 与 mkd_diagnose；不暴露平台写工具。</small></article>
      </section>
      <section class="mkd-reference-section">
        <header><p class="mkd-panel-index">TENCENT LIGHTHOUSE SHAPE</p><h2>静态内容面与本地运行面解耦。</h2></header>
        <div class="mkd-deploy-shape">
          <article><span>PUBLIC</span><strong>Nginx / static VitePress</strong><small>HTML、CSS、JS、只读 JSON 证据导出</small></article>
          <PhArrowRight :size="22" />
          <article><span>LOCAL ONLY</span><strong>CLI + SQLite + stdio MCP</strong><small>不开放公网写 API，不持有 provider key</small></article>
          <PhArrowRight :size="22" />
          <article><span>BLOCKED</span><strong>Provider / canonical / platform write</strong><small>需要新的明确授权与更高证据门禁</small></article>
        </div>
      </section>
      <aside class="mkd-reference-callout"><PhTerminal :size="21" /><div><strong>部署不是本门禁的一部分</strong><p>当前只提供可部署形态与本地验证入口；未连接腾讯云、未发布镜像、未修改服务器。</p></div></aside>
    </template>
  </main>
</template>
