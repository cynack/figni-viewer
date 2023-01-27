import error from './error'
import FigniViewerBaseElement from './figni-viewer-base'
import { setupTranslation, translate } from './translation'

export default class FigniViewerElement extends HTMLElement {
  #figniViewerBase: FigniViewerBaseElement
  get base(): FigniViewerBaseElement {
    return this.#figniViewerBase
  }

  constructor() {
    super()

    const shadow = this.attachShadow({ mode: 'open' })

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

    shadow.appendChild(this.#figniViewerBase as any)
  }

  async connectedCallback() {
    // setup translation
    await setupTranslation()
  }

  static get observedAttributes(): string[] {
    return ['item-id', 'token', 'model-tag']
  }

  attributeChangedCallback(name: string, oldValue: string, newValue: string) {
    if (oldValue !== newValue) {
      switch (name) {
        case 'model-tag':
          break
      }
      if (oldValue !== '') {
        switch (name) {
          case 'item-id':
          case 'token': {
            this.loadModel()
            break
          }
        }
      }
    }
  }

  get itemId(): string {
    return this.getAttribute('item-id') || ''
  }

  set itemId(value: string) {
    this.setAttribute('item-id', value)
  }

  get token(): string {
    return this.getAttribute('token') || ''
  }

  set token(value: string) {
    this.setAttribute('token', value)
  }

  get modelTag(): string {
    return this.getAttribute('model-tag') || ''
  }

  set modelTag(value: string) {
    this.setAttribute('model-tag', value)
  }

  async loadModel(): Promise<void> {
    try {
      await this.base.loadModel(this.itemId, this.token, this.modelTag)
    } catch (err) {
      console.log(error(err))
    }
  }
}
