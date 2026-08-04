<script setup>
import { computed } from 'vue'
import { withBase } from 'vitepress'
import { PhCaretDown } from '@phosphor-icons/vue'
import { data as registry } from '../../../acceptance.data.mjs'

const props = defineProps({
  acceptanceId: {
    type: String,
    default: ''
  }
})

const stateLabels = {
  'draft-invalid': '契约无效',
  'regression-blocked': '回归受阻',
  'approval-blocked': '审批受阻',
  accepted: '仓库内容已验收'
}

const blockerLabels = {
  LOCAL_REPLAY_FAILED: '本地复放未通过',
  REGRESSION_DETECTED: '候选结果相对基线退化',
  DATASET_NOT_BUSINESS_AUTHORIZED: '数据集尚非获授权业务样本',
  THRESHOLDS_NOT_APPROVED: '阈值仍是示意值，未获批准',
  OWNER_ACCEPTANCE_INCOMPLETE: '四类具名责任尚未全部接受',
  FINAL_RECEIPT_MISSING: '最终仓库内容验收回执缺失'
}

const metricLabels = {
  passRate: '用例通过率',
  externalCalls: '外部调用',
  sideEffects: '外部副作用'
}

const operatorLabels = {
  eq: '=',
  gte: '≥',
  lte: '≤'
}

const contracts = computed(() => registry.contracts.filter((contract) => (
  !props.acceptanceId || contract.acceptanceId === props.acceptanceId
)))

const acceptedCount = computed(() => contracts.value.filter(
  (contract) => contract.result.computedDecision === 'accepted'
).length)

const locallyReproducibleCount = computed(() => contracts.value.filter(
  (contract) => contract.result.localReplayPassed && contract.result.noRegression
).length)

function documentFor(documentId) {
  return registry.documents[documentId]
}

function documentHref(contract) {
  return `${withBase(documentFor(contract.documentId).route)}#验收契约`
}

function percent(value) {
  return value === null ? '—' : `${(value * 100).toFixed(value === 1 ? 0 : 1)}%`
}

function delta(value) {
  if (value === null) return '—'
  const formatted = `${(value * 100).toFixed(1)} pp`
  return value > 0 ? `+${formatted}` : formatted
}
</script>

<template>
  <section class="acceptance-workbench" :aria-label="acceptanceId ? `验收契约 ${acceptanceId}` : '机器可验收契约工作台'">
    <header class="acceptance-workbench-intro">
      <div>
        <p class="acceptance-eyebrow">Acceptance gate · schema v{{ registry.schemaVersion }}</p>
        <p class="acceptance-workbench-title">本地复放通过，不等于最终接受</p>
      </div>
      <dl class="acceptance-totals" aria-label="验收契约统计">
        <div><dt>本地可复放</dt><dd>{{ locallyReproducibleCount }}/{{ contracts.length }}</dd></div>
        <div><dt>已验收</dt><dd>{{ acceptedCount }}/{{ contracts.length }}</dd></div>
      </dl>
    </header>

    <p class="acceptance-boundary">
      {{ registry.scopeNote }} 当前复核日期 {{ registry.reviewedAt }}。
    </p>

    <div class="acceptance-grid">
      <details
        v-for="contract in contracts"
        :key="contract.acceptanceId"
        class="acceptance-card"
        :data-acceptance-id="contract.acceptanceId"
        :data-state="contract.result.computedState"
      >
        <summary>
          <span>
            <strong>{{ documentFor(contract.documentId).displayNumber }} · {{ documentFor(contract.documentId).title.replace(/^.*?：/, '') }}</strong>
            <small>{{ contract.acceptanceId }}</small>
          </span>
          <span class="acceptance-summary-meta">
            <span class="acceptance-state" :data-state="contract.result.computedState">
              {{ stateLabels[contract.result.computedState] }}
            </span>
            <PhCaretDown :size="16" weight="bold" class="acceptance-disclosure-icon" aria-hidden="true" />
          </span>
        </summary>

        <div class="acceptance-card-body">
          <div class="acceptance-facts">
            <div>
              <span>固定集合</span>
              <strong>{{ contract.result.positiveCaseCount + contract.result.negativeCaseCount }} 例</strong>
              <small>{{ contract.result.negativeCaseCount }} 个负例</small>
            </div>
            <div data-local-pass="true">
              <span>本地复放</span>
              <strong>{{ percent(contract.result.candidatePassRate) }}</strong>
              <small>L2 · 零外部调用</small>
            </div>
            <div>
              <span>基线差异</span>
              <strong>{{ delta(contract.result.passRateDelta) }}</strong>
              <small>{{ contract.result.noRegression ? '未观察到退化' : '已阻断退化' }}</small>
            </div>
            <div data-approval-gap="true">
              <span>责任接受</span>
              <strong>{{ contract.result.ownerRolesAccepted }}/{{ contract.result.ownerRoleCount }}</strong>
              <small>最终回执{{ contract.result.finalReceiptIssued ? '已签发' : '缺失' }}</small>
            </div>
          </div>

          <div class="acceptance-section">
            <p class="acceptance-section-label">固定输入与回归身份</p>
            <dl class="acceptance-identity">
              <div><dt>数据集</dt><dd>{{ contract.dataset.datasetId }} · v{{ contract.dataset.version }}</dd></div>
              <div><dt>数据边界</dt><dd>{{ contract.dataset.authorizationState === 'synthetic-only' ? '合成 fixture，未获业务授权' : '获授权业务集' }}</dd></div>
              <div><dt>基线回执</dt><dd>{{ contract.regression.baselineReceiptId }}</dd></div>
              <div><dt>验收范围</dt><dd>仅仓库内容 · productionReady=false</dd></div>
            </dl>
          </div>

          <div class="acceptance-section">
            <p class="acceptance-section-label">阈值复放与批准状态</p>
            <ul class="acceptance-thresholds">
              <li v-for="threshold in contract.result.thresholdResults" :key="threshold.thresholdId">
                <span>
                  <strong>{{ metricLabels[threshold.metric] }}</strong>
                  实测 {{ threshold.actual }} · {{ operatorLabels[threshold.operator] }} {{ threshold.value }}
                </span>
                <small :data-threshold-status="threshold.status">
                  本地{{ threshold.passed ? '通过' : '失败' }} · {{ threshold.status === 'approved' ? '已批准' : '示意阈值' }}
                </small>
              </li>
            </ul>
          </div>

          <div class="acceptance-section acceptance-blockers">
            <p class="acceptance-section-label">当前阻断</p>
            <ul>
              <li v-for="blocker in contract.result.blockers" :key="blocker">
                <code>{{ blocker }}</code>
                <span>{{ blockerLabels[blocker] }}</span>
              </li>
            </ul>
          </div>

          <p class="acceptance-next"><strong>下一证据</strong>{{ contract.nextEvidence }}</p>
          <a class="acceptance-document-link" :href="documentHref(contract)">
            查看 {{ documentFor(contract.documentId).displayNumber }} 章验收上下文
          </a>
        </div>
      </details>
    </div>
  </section>
</template>
