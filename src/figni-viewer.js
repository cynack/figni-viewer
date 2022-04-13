const OBSERBED_ATTRIBUTES = [
  'item-id',
  'token',
  'model-tag',
  'target',
  'orbit',
  'screenshot',
  'toggle-caption',
  'state',
  'environment-image',
  'debug-hotspot',
]

export default class FigniViewerElement extends HTMLElement {
  // html element
  #figniViewerBase
  #figniHelpPanel

  // private field
  #completedInitialModelLoad = false

  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
    this.#completedInitialModelLoad = false
  }

  async connectedCallback() {
    // Figni Viewer Base
    this.#figniViewerBase = document.createElement('figni-viewer-base')
    this.#figniViewerBase.style.flex = '1'
    this.#figniViewerBase.style.height = '100%'
    this.shadowRoot.appendChild(this.#figniViewerBase)

    // Figni Help Panel
    this.#figniHelpPanel = document.createElement('div')
    this.#figniHelpPanel.style.width = '100px'
    this.shadowRoot.appendChild(this.#figniHelpPanel)

    this.#figniViewerBase.loadModel(this.itemId, this.token, this.modelTag)
    this.#completedInitialModelLoad = true
  }

  static get observedAttributes() {
    return OBSERBED_ATTRIBUTES
  }

  async attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue !== newValue) {
      switch (name) {
        case 'item-id':
          if (this.#completedInitialModelLoad)
            this.#figniViewerBase?.loadModel(
              this.itemId,
              this.token,
              this.modelTag
            )
          break
        case 'token':
          if (this.#completedInitialModelLoad)
            this.#figniViewerBase?.loadModel(
              this.itemId,
              this.token,
              this.modelTag
            )
          break
        case 'model-tag':
          if (this.#completedInitialModelLoad)
            this.#figniViewerBase?.loadModel(
              this.itemId,
              this.token,
              this.modelTag
            )
          break
      }
    }
  }

  get itemId() {
    return this.getAttribute('item-id')
  }

  set itemId(value) {
    this.setAttribute('item-id', value)
  }

  get token() {
    return this.getAttribute('token')
  }

  set token(value) {
    this.setAttribute('token', value)
  }

  get modelTag() {
    return this.getAttribute('model-tag')
  }

  set modelTag(value) {
    this.setAttribute('model-tag', value)
  }
}
