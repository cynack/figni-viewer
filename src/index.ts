import FigniViewerBaseElement from './figni-viewer-base'
import './style.scss'

customElements.define(
  'figni-viewer-base',
  FigniViewerBaseElement as unknown as typeof HTMLElement
)
