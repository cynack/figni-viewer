import FigniViewerElement from './figni-viewer'
import FigniViewerBaseElement from './figni-viewer-base'
import '@dotlottie/player-component'
import './style.scss'

customElements.define('figni-viewer-base', FigniViewerBaseElement)
customElements.define('figni-viewer', FigniViewerElement)
