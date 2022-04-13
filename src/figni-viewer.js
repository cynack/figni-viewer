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
const FIGNI_SETTINGS = {
  DEFAULT_CAMERA_TARGET: 'auto auto auto',
  DEFAULT_CAMERA_ORBIT: '0deg 75deg 105%',
}

export default class FigniViewerElement extends HTMLElement {
  // html element
  #figniViewerBase
  #figniHelpPanel
  #initCameraButton

  // private field
  #completedInitialModelLoad = false

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

  get target() {
    return this.getAttribute('target') || FIGNI_SETTINGS.DEFAULT_CAMERA_TARGET
  }

  set target(value) {
    this.setAttribute('target', value)
  }

  get orbit() {
    return this.getAttribute('orbit') || FIGNI_SETTINGS.DEFAULT_CAMERA_ORBIT
  }

  set orbit(value) {
    this.setAttribute('orbit', value)
  }

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

  /**
   * カメラ位置の基準となる座標を設定する
   * @param {string} target 座標("x y z")
   */
  setCameraTarget(target) {
    if (this.#figniViewerBase.cameraTarget !== target) {
      this.#showInitCameraButton()
    }
    this.#figniViewerBase.setCameraTarget(target)
    this.target = target
  }

  /**
   * カメラ位置の基準となる座標からの極座標を設定する
   * @param {string} orbit 極座標("deg deg %", "rad rad m", etc.)
   */
  setCameraOrbit(orbit) {
    if (this.#figniViewerBase.cameraOrbit !== orbit) {
      this.#showInitCameraButton()
    }
    this.#figniViewerBase.setCameraOrbit(orbit)
    this.orbit = orbit
  }

  /**
   * カメラ位置を初期位置に戻す
   */
  resetCameraTargetAndOrbit() {
    this.setCameraTarget(this.target)
    this.setCameraOrbit(this.orbit)
    this.#hideInitCameraButton()
  }

  /**
   * カメラ位置を戻すボタンを表示する
   */
  #showInitCameraButton() {
    if (!this.#initCameraButton) {
      this.#initCameraButton = document.createElement('button')
      this.#initCameraButton.classList.add('figni-viewer-init-camera-btn')
      this.#initCameraButton.innerText = 'カメラ位置を戻す'
      this.#initCameraButton.addEventListener('click', () =>
        this.resetCameraTargetAndOrbit()
      )
      this.#figniViewerBase.appendChild(this.#initCameraButton)
    } else {
      this.#initCameraButton.style.display = 'block'
    }
  }

  /**
   * カメラ位置を戻すボタンを非表示にする
   */
  #hideInitCameraButton() {
    if (this.#initCameraButton) {
      this.#initCameraButton.style.display = 'none'
    }
  }
}
