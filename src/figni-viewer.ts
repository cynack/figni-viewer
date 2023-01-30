import { SVG_ERROR_ICON } from './cst/svg'
import error from './error'
import FigniViewerBaseElement from './figni-viewer-base'
import { setupTranslation, translate } from './translation'

export default class FigniViewerElement extends HTMLElement {
  // private value field
  #completedSetup: boolean = false

  // private element field
  #figniViewerBase: FigniViewerBaseElement
  #errorPanel: HTMLDivElement

  get root(): ShadowRoot {
    return this.shadowRoot || this.attachShadow({ mode: 'open' })
  }

  get base(): FigniViewerBaseElement {
    return this.#figniViewerBase
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

  constructor() {
    super()

    this.#figniViewerBase = new FigniViewerBaseElement()
    this.#figniViewerBase.setAttribute('part', 'base')
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
    this.root.appendChild(this.#figniViewerBase as any)
  }

  async connectedCallback() {
    this.#completedSetup = false

    // setup translation
    await setupTranslation()

    this.#completedSetup = true

    this.loadModel()
  }

  static get observedAttributes(): string[] {
    return ['item-id', 'token', 'model-tag']
  }

  attributeChangedCallback(name: string, oldValue: string, newValue: string) {
    if (oldValue !== newValue) {
      switch (name) {
        case 'model-tag':
          this.loadModel()
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

  async loadModel(): Promise<void> {
    if (this.#completedSetup) {
      this.#hideErrorPanel()
      try {
        await this.base.loadModel(this.itemId, this.token, this.modelTag)
      } catch (err) {
        this.#showErrorPanel(error(err))
      }
    }
  }

  #showErrorPanel(message: string) {
    if (!this.#errorPanel) {
      this.#errorPanel = document.createElement('div')
      this.#errorPanel.setAttribute('part', 'error-panel')
      this.#errorPanel.classList.add('figni-viewer-error-panel')
      const icon = document.createElement('div')
      icon.innerHTML = SVG_ERROR_ICON
      icon.setAttribute('part', 'error-icon')
      this.#errorPanel.appendChild(icon)
      const text = document.createElement('span')
      text.innerHTML = message
      text.setAttribute('part', 'error-message')
      this.#errorPanel.appendChild(text)
      const button = document.createElement('span')
      button.innerHTML = translate('button.reload')
      button.setAttribute('part', 'error-reload-button')
      button.onclick = () => {
        this.loadModel()
      }
      this.#errorPanel.appendChild(button)
      this.root.appendChild(this.#errorPanel)
    }
    const text = this.#errorPanel.querySelector('::part(error-message)')
    if (text) {
      text.innerHTML = message
    }
    this.#errorPanel.style.display = ''
  }

  #hideErrorPanel() {
    if (this.#errorPanel) {
      this.#errorPanel.style.display = 'none'
    }
  }
}
