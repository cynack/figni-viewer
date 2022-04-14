import { getErrorMessage } from './error'
import './style.scss'
import { SVG_ERROR_ICON } from './svg'

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
const SETTINGS = {
  DEFAULT_CAMERA_TARGET: 'auto auto auto',
  DEFAULT_CAMERA_ORBIT: '0deg 75deg 105%',
  DEFAULT_HOTSPOT_POSITION: '0m 0m 0m',
  DEFAULT_HOTSPOT_NORMAL: '0m 1m 0m',
  DEFAULT_PANEL_PLACE: 'left middle',
}

export default class FigniViewerElement extends HTMLElement {
  // html element
  #figniViewerBase
  #figniHelpPanel
  #initCameraButton
  #errorPanel

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
    return this.getAttribute('target') || SETTINGS.DEFAULT_CAMERA_TARGET
  }

  set target(value) {
    this.setAttribute('target', value)
  }

  get orbit() {
    return this.getAttribute('orbit') || SETTINGS.DEFAULT_CAMERA_ORBIT
  }

  set orbit(value) {
    this.setAttribute('orbit', value)
  }

  constructor() {
    super()
    this.#completedInitialModelLoad = false
  }

  async connectedCallback() {
    // Figni Viewer Base
    this.#figniViewerBase = document.createElement('figni-viewer-base')
    this.#figniViewerBase.style.flex = '1'
    this.#figniViewerBase.style.height = '100%'
    this.appendChild(this.#figniViewerBase)

    // Figni Help Panel
    this.#figniHelpPanel = document.createElement('div')
    this.#figniHelpPanel.style.width = '0px'
    this.appendChild(this.#figniHelpPanel)

    this.loadModel(this.itemId, this.token, this.modelTag)

    // TODO: Hotspot処理変える
    this.querySelectorAll('[slot^="hotspot"]').forEach((hotspot) => {
      this.#modifyHotspot(hotspot)
      this.#figniViewerBase.appendChild(hotspot)
    })

    this.#completedInitialModelLoad = true
  }

  static get observedAttributes() {
    return OBSERBED_ATTRIBUTES
  }

  async attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue !== newValue) {
      switch (name) {
        case 'item-id':
          if (this.#completedInitialModelLoad) this.loadModel()
          break
        case 'token':
          if (this.#completedInitialModelLoad) this.loadModel()
          break
        case 'model-tag':
          if (this.#completedInitialModelLoad) this.loadModel()
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
   * モデルを読み込む
   */
  async loadModel() {
    this.#hideErrorPanel()
    try {
      await this.#figniViewerBase.loadModel(
        this.itemId,
        this.token,
        this.modelTag
      )
    } catch (e) {
      this.#showErrorPanel(getErrorMessage(e))
    }
  }

  #modifyHotspot(hotspot) {
    hotspot.classList.add('figni-viewer-hotspot')

    hotspot.setAttribute(
      'position',
      hotspot.getAttribute('position') || SETTINGS.DEFAULT_HOTSPOT_POSITION
    )
    // TODO: hotspotに処理を追加など
  }

  /**
   * カメラ位置を戻すボタンを表示する
   */
  #showInitCameraButton() {
    if (!this.#initCameraButton) {
      this.#initCameraButton = document.createElement('button')
      this.#initCameraButton.classList.add('figni-viewer-init-camera-button')
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

  /**
   * エラー画面を表示する
   * @param {string} message エラーメッセージ
   */
  #showErrorPanel(message) {
    if (!this.#errorPanel) {
      this.#errorPanel = document.createElement('div')
      this.#errorPanel.classList.add('figni-viewer-error-panel')
      const icon = document.createElement('div')
      icon.innerHTML = SVG_ERROR_ICON
      icon.classList.add('figni-viewer-error-icon')
      this.#errorPanel.appendChild(icon)
      const errorText = document.createElement('span')
      errorText.innerText = message
      errorText.classList.add('figni-viewer-error-text')
      this.#errorPanel.appendChild(errorText)
      const reloadButton = document.createElement('span')
      reloadButton.innerText = '再読み込み'
      reloadButton.classList.add('figni-viewer-error-reload-button')
      reloadButton.addEventListener('click', () => {
        this.#figniViewerBase.loadModel(this.itemId, this.token, this.modelTag)
      })
      this.#errorPanel.appendChild(reloadButton)
      this.appendChild(this.#errorPanel)
    } else {
      this.#errorPanel.style.display = ''
    }
  }

  /**
   * エラー画面を非表示にする
   */
  #hideErrorPanel() {
    if (this.#errorPanel) {
      this.#errorPanel.style.display = 'none'
    }
  }
}
