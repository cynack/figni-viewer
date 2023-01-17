import FigniViewerElement from './figni-viewer'
import FigniViewerBaseElement from './figni-viewer-base'
import './style.scss'

customElements.define('figni-viewer-base', FigniViewerBaseElement as any)
customElements.define('figni-viewer', FigniViewerElement)
