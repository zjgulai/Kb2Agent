import DefaultTheme from 'vitepress/theme-without-fonts'
import ThemeLayout from './components/ThemeLayout.vue'
import EvidenceHome from './components/EvidenceHome.vue'
import ClaimLedger from './components/ClaimLedger.vue'
import ConceptMap from './components/ConceptMap.vue'
import AcceptanceWorkbench from './components/AcceptanceWorkbench.vue'
import MermaidDiagram from './components/MermaidDiagram.vue'
import MkdProductHome from './components/MkdProductHome.vue'
import ReferenceLab from './components/ReferenceLab.vue'
import ReferenceRunResult from './components/ReferenceRunResult.vue'
import ReferenceSystemPage from './components/ReferenceSystemPage.vue'
import AgentLab from './components/agent-lab/AgentLab.vue'
import './custom.css'

export default {
  extends: DefaultTheme,
  Layout: ThemeLayout,
  enhanceApp({ app }) {
    app.component('EvidenceHome', EvidenceHome)
    app.component('ClaimLedger', ClaimLedger)
    app.component('ConceptMap', ConceptMap)
    app.component('AcceptanceWorkbench', AcceptanceWorkbench)
    app.component('MermaidDiagram', MermaidDiagram)
    app.component('MkdProductHome', MkdProductHome)
    app.component('ReferenceLab', ReferenceLab)
    app.component('ReferenceRunResult', ReferenceRunResult)
    app.component('ReferenceSystemPage', ReferenceSystemPage)
    app.component('AgentLab', AgentLab)
  }
}
