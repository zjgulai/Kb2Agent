export const labManifest = {
  caseId: 'CASE-AMZ-ACOS-SYNTHETIC',
  caseLabel: 'Amazon Ads · ACOS 异常诊断',
  packageId: 'PKG-AMZ-ADS-M1B',
  snapshotId: 'SNAPSHOT-AMZ-ADS-M1B',
  snapshotVersion: '0.2.0',
  evidenceGrade: 'LO-S synthetic',
  maturity: 'M1-B local reference',
  mode: 'Replay',
  files: [
    { type: 'XLSX', name: 'portfolio-performance.synthetic.xlsx', role: '指标窗口与异常' },
    { type: 'PDF', name: 'metric-definition.synthetic.pdf', role: '指标口径与限制' },
    { type: 'PPTX', name: 'diagnostic-brief.synthetic.pptx', role: '决策简报与缺口' },
    { type: 'DOCX', name: 'operating-playbook.synthetic.docx', role: '检查顺序与停止条件' },
    { type: 'MD', name: 'diagnosis-notes.synthetic.md', role: '假设、边界与未知项' },
    { type: 'JSON', name: 'account-context.synthetic.json', role: '固定场景参数与权限' }
  ]
}

export const pipelineStages = [
  { id: 'source', number: '01', label: 'Source', detail: '6 种格式 · 88 elements' },
  { id: 'evidence', number: '02', label: 'Evidence', detail: 'locator + synthetic grade' },
  { id: 'decision', number: '03', label: 'Decision', detail: 'unknown-policy first' },
  { id: 'skill', number: '04', label: 'Skill', detail: 'E2 · no side effects' },
  { id: 'task', number: '05', label: 'Task', detail: 'fixed schema + closure' },
  { id: 'agent', number: '06', label: 'Agent', detail: 'rule engine · 8 local tools' },
  { id: 'receipt', number: '07', label: 'Receipt', detail: '20/20 golden · zero effects' }
]

export const replayPresentation = {
  locale: 'zh-CN',
  headlineLead: '先补齐驱动因素，',
  headlineEmphasis: '保持所有优化动作在草案状态。',
  headline: '先补齐驱动因素，保持所有优化动作在草案状态。'
}

export const replayResult = {
  runId: 'RUN-AMZ-M1B-001',
  receiptId: 'RECEIPT-AMZ-M1B-001',
  summary: '固定样本确认 ACOS 从 28.4% 上升至 36.9%，但缺少同窗 CPC、CVR 与零售可售性证据，不能选择竞价或转化干预。',
  recommendation: '先补齐同窗 CPC/CVR 与可售性检查，所有优化动作保持草案状态。',
  facts: [
    { text: '两个相邻 7 日窗口的 ACOS 为 28.4% → 36.9%。', ref: 'EVID-AMZ-ACOS-DELTA' },
    { text: '本次 Replay 外部调用 0、外部副作用 0。', ref: 'RECEIPT-AMZ-M1B-001' }
  ],
  inferences: [
    { text: '流量成本上升或转化率下降均可能解释变化。', ref: 'DECISION-AMZ-ACOS-DIAGNOSIS' }
  ],
  unknowns: [
    { text: 'CPC 与 CVR 是否在同窗发生变化？', next: '补充同口径 CPC/CVR fixture 字段' },
    { text: '商品可售性、价格和库存是否影响转化？', next: '补充 retail-readiness 检查结果' }
  ],
  stopConditions: [
    '禁止修改预算、竞价、否定词或广告活动',
    '归因窗口不可比时停止精确诊断',
    '缺失输入未关闭前不得输出业务阈值'
  ],
  evidence: [
    { id: 'EVID-AMZ-ACOS-DELTA', source: 'portfolio-performance.synthetic.xlsx', locator: 'sheet=Source Data;range=A1:J3', grade: 'LO-S synthetic' },
    { id: 'EVID-AMZ-ACOS-DEFINITION', source: 'metric-definition.synthetic.pdf', locator: 'page=1;block=body', grade: 'LO-S synthetic' },
    { id: 'EVID-AMZ-EVIDENCE-GATE', source: 'operating-playbook.synthetic.docx', locator: 'heading=Stop conditions', grade: 'LO-S synthetic' }
  ],
  trace: [
    { stage: 'Source', event: '读取 SQLite snapshot', duration: '1 ms', output: 'bounded FTS hits' },
    { stage: 'Agent', event: '确定性 ACOS 计算与门禁', duration: '1 ms', output: '28.4% → 36.9%' },
    { stage: 'Receipt', event: '机器可验回执', duration: '1 ms', output: '0 calls · 0 effects' }
  ],
  evaluation: [
    { label: 'Schema', value: 'PASS', state: 'pass' },
    { label: 'Citation', value: '3/3', state: 'pass' },
    { label: 'Permission', value: 'E2', state: 'pass' },
    { label: 'Domain approval', value: 'PENDING', state: 'blocked' }
  ]
}

export function localizeReplayActionPackage(source = {}) {
  return {
    summary: replayResult.summary,
    recommendation: replayResult.recommendation,
    status: source.status === 'draft-for-review' ? source.status : 'draft-for-review',
    facts: replayResult.facts.map((item) => ({ text: item.text, evidenceRefs: [item.ref] })),
    inferences: replayResult.inferences.map((item) => ({ text: item.text, evidenceRefs: [item.ref] })),
    unknowns: replayResult.unknowns.map((item) => ({ question: item.text, nextEvidence: item.next })),
    stopConditions: [...replayResult.stopConditions]
  }
}
