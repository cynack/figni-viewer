import FigniViewerBaseElement from './figni-viewer-base'

export default class FigniViewerElement extends HTMLElement {
  #figniViewerBase: FigniViewerBaseElement
  get base(): FigniViewerBaseElement {
    return this.#figniViewerBase
  }

  constructor() {
    super()

    this.#figniViewerBase = new FigniViewerBaseElement()
    this.#figniViewerBase.addEventListener('load', () =>
      this.dispatchEvent(new CustomEvent('load'))
    )
    this.#figniViewerBase.addEventListener('model-visibility', () =>
      this.dispatchEvent(new CustomEvent('model-visibility'))
    )
    this.#figniViewerBase.addEventListener('progress', (e) =>
      this.dispatchEvent(
        new CustomEvent('progress', {
          detail: { progress: e.detail.totalProgress },
        })
      )
    )
    this.#figniViewerBase.addEventListener('finished', () =>
      this.dispatchEvent(new CustomEvent('animation-finished'))
    )
    this.#figniViewerBase.addEventListener('camera-change', (e) =>
      this.dispatchEvent(new CustomEvent('camera-change', { detail: e.detail }))
    )
    this.appendChild(this.#figniViewerBase as any)
  }
}
