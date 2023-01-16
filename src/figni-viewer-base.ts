import ModelViewerElement from './model-viewer'

export default class FigniViewerBaseElement extends ModelViewerElement {
  constructor() {
    super()

    this.loading = 'lazy'
    this.cameraControls = true
    this.ar = true
    this.arModes = 'scene-viewer quick-look'
    this.arScale = 'fixed'
    this.arPlacement = 'floor'
    this.shadowIntensity = 1
    this.minimumRenderScale = 0.25
    this.animationCrossfadeDuration = 0
    this.maxCameraOrbit = 'auto 180deg 200%'
    this.minCameraOrbit = 'auto 0deg auto'
    this.disablePan = true
    this.disableTap = true
  }
  async connectedCallback() {
    await super.connectedCallback()

    if (!this.querySelector('style')) {
      const style = document.createElement('style')
      style.textContent = `
      
      `
      this.appendChild(style)
    }
  }
}
