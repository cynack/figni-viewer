import Lottie from 'lottie-web'
import QRCode from 'qrcode'
import {
  CAPTION_TAP_ANIMATION,
  CONTENT_OPERATION_ANIMATION,
  CONTENT_PINCH_ANIMATION,
  HOW_TO_AR_ANIMATION,
  LOADING_ANIMATION,
  LOADING_ANIMATION_RING,
  MOVE_AR_CONTENT_ANIMATION,
  ROTATE_AR_CONTENT_ANIMATION,
} from './animation'
import { getErrorMessage } from './error'
import './style.scss'
import {
  SVG_AR_BUTTON,
  SVG_CLOSE_ICON,
  SVG_DOWNLOAD_SCREENSHOT_BUTTON,
  SVG_ERROR_ICON,
  SVG_FIGNI_LOGO,
  SVG_HELP_ARROW,
  SVG_HELP_BACK,
  SVG_HELP_CLOSE_ICON,
  SVG_HELP_ICON,
  SVG_HELP_UNKNOWN_ICON,
  SVG_INTERACTION_PROMPT,
  SVG_TOGGLE_VISIBLE_HOTSPOT_BUTTON_OFF,
  SVG_TOGGLE_VISIBLE_HOTSPOT_BUTTON_ON,
} from './svg'

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
]
const SETTINGS = {
  DEFAULT_CAMERA_TARGET: 'auto auto auto',
  DEFAULT_CAMERA_ORBIT: '0deg 75deg 105%',
  DEFAULT_HOTSPOT_POSITION: '0m 0m 0m',
  DEFAULT_HOTSPOT_NORMAL: '0m 1m 0m',
  DEFAULT_PANEL_PLACE: 'left middle',
}
const HELP = {
  TOP: 'top',
  CONTENT: 'content',
  CAPTION: 'caption',
  AR: 'ar',
  UNKNOWN: 'unknown',
}

export default class FigniViewerElement extends HTMLElement {
  // html element
  #figniViewerBase
  #helpPanelBase
  #initCameraButton
  #loadingPanel
  #errorPanel
  #qrCodePanel
  #helpButton
  #interactionPrompt
  #arButton
  #toggleVisibleHotspotButton
  #downloadScreenshotButton
  #interactionCursors = {}
  #interactionCursorPool = []
  #hotspots = []
  #panels = []

  // private field
  #completedInitialModelLoad = false
  #visibleAllHotspots = true
  #events = {}

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

  get state() {
    return this.getAttribute('state') || ''
  }

  set state(value) {
    this.setAttribute('state', value)
  }

  get base() {
    return this.#figniViewerBase
  }

  constructor() {
    super()
    this.#completedInitialModelLoad = false
  }

  async connectedCallback() {
    // Figni Viewer Base
    if (!this.#figniViewerBase) {
      this.#figniViewerBase = document.createElement('figni-viewer-base')
      this.#figniViewerBase.style.flexGrow = '1'
      this.#figniViewerBase.style.height = '100%'
      this.#figniViewerBase.style.width = 'auto'
      this.appendChild(this.#figniViewerBase)
    }

    // Figni Help Panel
    this.#showHelpPanel()

    // Hotspot
    this.querySelectorAll('[slot^="hotspot"]').forEach((hotspot) => {
      this.#hotspots.push(this.#figniViewerBase.appendChild(hotspot))
    })
    await this.updateComplete
    this.#hotspots.forEach((hotspot) => {
      this.#modifyHotspot(hotspot)
    })

    this.loadModel(this.itemId, this.token, this.modelTag)
    this.resetCameraTargetAndOrbit()
    this.#closeAllPanels()
    this.updateState(this.state)
    this.#setupInteractionCursor()
    this.#showArButton()
    this.#showInteractionPrompt()
    // TODO: ヘルプページの実装
    this.#showHelpButton()

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
        case 'screenshot':
          if (newValue === '') this.#showDownloadScreenshotButton()
          else this.#hideDownloadScreenshotButton()
          break
        case 'toggle-caption':
          if (newValue === '') this.#showToggleVisibleHotspotButton()
          else this.#hideToggleVisibleHotspotButton()
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
    this.#hideLoadingPanel()
    try {
      this.#showLoadingPanel()
      await this.#figniViewerBase.loadModel(
        this.itemId,
        this.token,
        this.modelTag
      )
    } catch (e) {
      this.#showErrorPanel(getErrorMessage(e))
    }
  }

  /**
   * スクリーンショットを撮る
   */
  async downloadScreenshot() {
    const blob = await this.#figniViewerBase.toBlob({
      idealAspect: true,
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'model.png'
    a.click()
    URL.revokeObjectURL(url)
  }

  /**
   * アニメーションを再生する
   * @param {string} clip 再生するアニメーション名
   * @param {{ loopCount: number, reverse: boolean, toState: string, onStart: Function, onEnd: Function }} options オプション
   */
  async playAnimation(clip = null, options = {}) {
    this.#figniViewerBase.playAnimation(clip, options)
    const loopCount = options.loopCount || 1
    const isLoop = loopCount === Infinity
    if (!isLoop) {
      this.toggleVisibleHotspot(false)
    }
    const onFinishFunc = () => {
      if (!isLoop) {
        this.toggleVisibleHotspot(true)
      }
      if (options.toState) {
        this.updateState(options.toState)
      }
    }
    if (!isLoop) {
      this.#figniViewerBase.addEventListener('finished', onFinishFunc, {
        once: true,
      })
    } else {
      onFinishFunc()
    }
  }

  /**
   * state を更新する
   * @param {string} state 更新する state
   */
  updateState(state) {
    this.state = state
    this.#hotspots.forEach((hotspot) => {
      if (this.#visibleAllHotspots) {
        const visible = hotspot.getAttribute('visible-state')?.split(' ')
        if (visible) {
          if (visible.includes(this.state)) {
            hotspot.classList.remove('figni-viewer-hotspot-hide')
          } else {
            hotspot.classList.add('figni-viewer-hotspot-hide')
          }
        } else {
          hotspot.classList.remove('figni-viewer-hotspot-hide')
        }
      } else {
        hotspot.classList.add('figni-viewer-hotspot-hide')
      }
    })
  }

  /**
   * キャプションの表示非表示を切り替える
   * @param {boolean} visible true:表示, false:非表示
   */
  toggleVisibleHotspot(visible) {
    this.#visibleAllHotspots = visible
    if (this.#toggleVisibleHotspotButton) {
      if (this.#visibleAllHotspots) {
        this.#toggleVisibleHotspotButton.innerHTML =
          SVG_TOGGLE_VISIBLE_HOTSPOT_BUTTON_OFF
      } else {
        this.#toggleVisibleHotspotButton.innerHTML =
          SVG_TOGGLE_VISIBLE_HOTSPOT_BUTTON_ON
      }
    }
    this.updateState(this.state)
  }

  /**
   * キャプションを追加する
   * @param {string} name キャプション名
   * @param {string} position 位置("x y z")
   * @param {string} normal 法線("x y z")
   * @param {object} options オプション
   */
  async addHotspot(name, position = null, normal = null, options = null) {
    if (!name) {
      throw new SyntaxError('name is required')
    }
    const existHotspot = this.#figniViewerBase.querySelector(
      `[slot="hotspot-${name}"]`
    )
    if (existHotspot) {
      throw new Error(`Hotspot ${name} was already exists`)
    }
    const hotspot = document.createElement('span')
    hotspot.setAttribute(
      'position',
      position || SETTINGS.DEFAULT_HOTSPOT_POSITION
    )
    if (normal) {
      hotspot.setAttribute('normal', normal || SETTINGS.DEFAULT_HOTSPOT_NORMAL)
    }
    hotspot.setAttribute('slot', `hotspot-${name}`)
    if (options) {
      if (options.anime) {
        if (options.anime.clip) {
          hotspot.setAttribute('clip', options.anime.clip)
        }
        if (options.anime.loopCount) {
          hotspot.setAttribute('loopCount', options.anime.loopCount)
        }
        if (options.anime.reverse === true) {
          hotspot.setAttribute('reverse', '')
        }
        if (options.anime.onStart) {
          hotspot.setAttribute(
            'onstart',
            `(${options.anime.onStart.toString()})()`
          )
        }
        if (options.anime.onEnd) {
          hotspot.setAttribute('onend', `(${options.anime.onEnd.toString()})()`)
        }
      }
      if (options.closeup) {
        if (options.closeup.target) {
          hotspot.setAttribute('target', options.closeup.target)
        }
        if (options.closeup.orbit) {
          hotspot.setAttribute('orbit', options.closeup.orbit)
        }
      }
      if (options.visibleState) {
        hotspot.setAttribute('visible-state', options.visibleState)
      }
      if (options.toState) {
        hotspot.setAttribute('to-state', options.toState)
      }
    }
    this.#figniViewerBase.appendChild(hotspot)

    await this.updateComplete
    this.#modifyHotspot(hotspot)
    this.updateState(this.state)
    this.#hotspots.push(hotspot)
  }

  /**
   * キャプションを編集する
   * @param {string} name キャプション名
   * @param {string} position 位置("x y z")
   * @param {string} normal 法線("x y z")
   * @param {object} options オプション
   */
  async editHotspot(name, position = null, normal = null, options = null) {
    if (!name) {
      throw new SyntaxError('name is required')
    }
    const hotspot = this.#figniViewerBase.querySelector(
      `[slot="hotspot-${name}"]`
    )
    if (!hotspot) {
      throw new ReferenceError(`Hotspot ${name} not found`)
    }
    if (position) {
      hotspot.setAttribute(
        'position',
        position || SETTINGS.DEFAULT_HOTSPOT_POSITION
      )
    }
    if (normal) {
      hotspot.setAttribute('normal', normal || SETTINGS.DEFAULT_HOTSPOT_NORMAL)
    }
    if (options) {
      if (options.anime) {
        if (options.anime.clip) {
          hotspot.setAttribute('clip', options.anime.clip)
        }
        if (options.anime.loopCount) {
          hotspot.setAttribute('loopCount', options.anime.loopCount)
        }
        if (options.anime.reverse === true) {
          hotspot.setAttribute('reverse', '')
        } else if (options.anime.reverse === false) {
          hotspot.removeAttribute('reverse')
        }
        if (options.anime.onStart) {
          hotspot.setAttribute(
            'onstart',
            `(${options.anime.onStart.toString()})()`
          )
        }
        if (options.anime.onEnd) {
          hotspot.setAttribute('onend', `(${options.anime.onEnd.toString()})()`)
        }
      }
      if (options.closeup) {
        if (options.closeup.target) {
          hotspot.setAttribute('target', options.closeup.target)
        }
        if (options.closeup.orbit) {
          hotspot.setAttribute('orbit', options.closeup.orbit)
        }
      }
      if (options.visibleState) {
        hotspot.setAttribute('visible-state', options.visibleState)
      }
      if (options.toState) {
        hotspot.setAttribute('to-state', options.toState)
      }
    }

    await this.updateComplete
    this.#modifyHotspot(hotspot)
    this.updateState(this.state)
  }

  /**
   * キャプションを削除する
   * @param {string} name キャプション名
   */
  removeHotspot(name) {
    const hotspot = this.#figniViewerBase.querySelector(
      `[slot="hotspot-${name}"]`
    )
    hotspot?.remove()
  }

  #openedHelpPages = []
  /**
   * ヘルプページを開く。
   * @param {string} page ページ
   */
  openHelpPanel(page = HELP.TOP) {
    this.#helpPanelBase.classList.remove('figni-viewer-help-panel-hidden')
    let openPage = null
    switch (page) {
      case HELP.TOP:
        openPage = this.#createOrGetHelpTopPage()
        break
      case HELP.CONTENT:
        openPage = this.#createOrGetHelpContentPage()
        break
      case HELP.CAPTION:
        openPage = this.#createOrGetHelpCaptionPage()
        break
      case HELP.AR:
        openPage = this.#createOrGetHelpArPage()
        break
      case HELP.UNKNOWN:
        openPage = this.#createOrGetHelpUnknownPage()
        break
    }
    if (openPage) {
      if (this.#openedHelpPages.length === 0) {
        openPage.style.left = 0
      } else {
        openPage.style.left = '100%'
      }
      this.#helpPanelBase.appendChild(openPage)
      this.#openedHelpPages.push(openPage)
      setTimeout(() => {
        openPage.style.left = 0
      }, 1)
    } else {
      throw new ReferenceError('The specified page is not found')
    }
  }

  backHelpPanel() {
    if (this.#openedHelpPages.length > 1) {
      const openedPage = this.#openedHelpPages.pop()
      openedPage.style.left = '100%'
      setTimeout(() => {
        openedPage.remove()
      }, 300)
    } else {
      this.closeHelpPanel()
    }
  }

  /**
   * ヘルプページを閉じる。
   */
  closeHelpPanel() {
    this.#helpPanelBase.classList.add('figni-viewer-help-panel-hidden')
    while (this.#helpPanelBase.firstChild) {
      this.#helpPanelBase.firstChild.remove()
    }
    this.#openedHelpPages = []
  }

  #setupInteractionCursor() {
    this.#interactionCursorPool.push(
      ...[...Array(3)].map(() => this.#createCursor())
    )
    this.#figniViewerBase.addEventListener('pointerdown', (e) => {
      if (!this.#interactionCursors[e.pointerId]) {
        const rect = e.currentTarget.getBoundingClientRect()
        const cursor = this.#getOrCreateCursor(
          e.clientX - rect.left,
          e.clientY - rect.top
        )
        this.#interactionCursors[e.pointerId] = cursor
      }
    })
    this.#figniViewerBase.addEventListener('pointermove', (e) => {
      if (this.#interactionCursors[e.pointerId]) {
        const rect = e.currentTarget.getBoundingClientRect()
        this.#moveCursor(
          this.#interactionCursors[e.pointerId],
          e.clientX - rect.left,
          e.clientY - rect.top
        )
      }
    })
    this.#figniViewerBase.addEventListener('pointerup', (e) => {
      if (this.#interactionCursors[e.pointerId]) {
        this.#deleteCursor(this.#interactionCursors[e.pointerId])
        delete this.#interactionCursors[e.pointerId]
      }
    })
    this.#figniViewerBase.addEventListener('pointerout', (e) => {
      if (this.#interactionCursors[e.pointerId]) {
        this.#deleteCursor(this.#interactionCursors[e.pointerId])
        delete this.#interactionCursors[e.pointerId]
      }
    })
    window.addEventListener('scroll', (e) => {
      Object.keys(this.#interactionCursors).forEach((key) => {
        this.#deleteCursor(this.#interactionCursors[key])
        delete this.#interactionCursors[key]
      })
    })
  }

  #createCursor() {
    const cursor = this.#figniViewerBase.appendChild(
      document.createElement('div')
    )
    cursor.classList.add('figni-viewer-interaction-cursor')
    return cursor
  }

  #getOrCreateCursor(x, y) {
    let cursor = null
    if (this.#interactionCursorPool.length > 0) {
      cursor = this.#interactionCursorPool.pop()
    } else {
      cursor = this.#createCursor()
    }
    cursor.style.top = `${y}px`
    cursor.style.left = `${x}px`
    return cursor
  }

  #moveCursor(cursor, x, y) {
    cursor.style.top = `${y}px`
    cursor.style.left = `${x}px`
    cursor.style.opacity = 0.075
    cursor.style.width = '8rem'
    cursor.style.height = '8rem'
  }

  #deleteCursor(cursor) {
    cursor.style.opacity = 0
    cursor.style.width = 0
    cursor.style.height = 0
    this.#interactionCursorPool.push(cursor)
  }

  #closeAllPanels(excludePanels = []) {
    this.#panels.forEach((panel) => {
      if (!excludePanels.includes(panel)) {
        panel.classList.add('figni-viewer-panel-hide')
      }
    })
  }

  #subscribeEventLinstener(element, eventName, tag, callback) {
    element.removeEventListener(eventName, this.#events[tag])
    element.addEventListener(eventName, callback)
    this.#events[tag] = callback
  }

  #modifyHotspot(hotspot) {
    hotspot.classList.add('figni-viewer-hotspot')
    hotspot.classList.add('figni-viewer-hotspot-highlight')

    hotspot.setAttribute(
      'position',
      hotspot.getAttribute('position') || SETTINGS.DEFAULT_HOTSPOT_POSITION
    )
    if (hotspot.getAttribute('normal')) {
      this.#figniViewerBase.updateHotspot({
        name: hotspot.getAttribute('slot'),
        position: hotspot.getAttribute('position'),
        normal: hotspot.getAttribute('normal'),
      })
    } else {
      hotspot.classList.add('figni-viewer-hotspot-no-normal')
      this.#figniViewerBase.updateHotspot({
        name: hotspot.getAttribute('slot'),
        position: hotspot.getAttribute('position'),
      })
    }

    const name = hotspot.getAttribute('slot').replace(/^hotspot-/, '')
    const isAnime =
      hotspot.getAttribute('clip') != null ||
      hotspot.getAttribute('anime') == ''
    const isCloseup =
      hotspot.getAttribute('target') != null ||
      hotspot.getAttribute('orbit') != null ||
      hotspot.getAttribute('closeup') == ''
    const isVisible = hotspot.getAttribute('to-state') != null

    this.#subscribeEventLinstener(hotspot, 'click', `${name}-data`, (e) => {
      if (this.#clickableHotspot(hotspot)) {
        if (e.target === hotspot) {
          this.#figniViewerBase.incrementHotspotClickCount(name)
          this.#figniViewerBase.disableInteractionPrompt()
          hotspot.classList.remove('figni-viewer-hotspot-highlight')
        }
      }
    })

    if (isAnime) {
      this.#subscribeEventLinstener(hotspot, 'click', `${name}-anime`, (e) => {
        if (this.#clickableHotspot(hotspot)) {
          if (e.target === hotspot) {
            const clip = hotspot.getAttribute('clip') || null
            const loopCount = Number(hotspot.getAttribute('loopCount')) || 1
            const reverse = hotspot.getAttribute('reverse') == '' || false
            const toState = hotspot.getAttribute('to-state')
            const onStart = Function(hotspot.getAttribute('onstart'))
            const onEnd = Function(hotspot.getAttribute('onend'))
            this.playAnimation(clip, {
              loopCount,
              reverse,
              toState,
              onStart,
              onEnd,
            })
          }
        }
      })
    }
    if (isCloseup) {
      this.#subscribeEventLinstener(
        hotspot,
        'click',
        `${name}-closeup`,
        (e) => {
          if (this.#clickableHotspot(hotspot)) {
            if (e.target === hotspot) {
              const target =
                hotspot.getAttribute('target') ||
                hotspot.getAttribute('position') ||
                SETTINGS.DEFAULT_HOTSPOT_POSITION
              const orbit = hotspot.getAttribute('orbit') || this.orbit
              if (
                this.#figniViewerBase.cameraTarget === target &&
                this.#figniViewerBase.cameraOrbit === orbit
              ) {
                this.resetCameraTargetAndOrbit()
              } else {
                this.setCameraTarget(target)
                this.setCameraOrbit(orbit)
              }
            }
          }
        }
      )
    }
    if (!isAnime && isVisible) {
      const state = hotspot.getAttribute('to-state')
      this.#subscribeEventLinstener(
        hotspot,
        'click',
        `${name}-visible`,
        (e) => {
          if (this.#clickableHotspot(hotspot)) {
            if (e.target === hotspot) {
              this.updateState(state)
            }
          }
        }
      )
    }

    const panels = hotspot.querySelectorAll('[slot^="panel"]')
    this.#panels.push(...Array.from(panels))
    this.#panels.forEach((panel) => {
      this.#modifyPanel(panel)
    })
    this.#subscribeEventLinstener(hotspot, 'click', `${name}-panel`, (e) => {
      if (this.#clickableHotspot(hotspot)) {
        if (e.target == hotspot) {
          if (panels.length > 0) {
            panels.forEach((panel) => {
              panel.style.maxWidth = `${
                Number(window.getComputedStyle(this).width.slice(0, -2)) * 0.4
              }px`
              if (panel.dataset.vertical == 'middle') {
                panel.style.maxHeight = `calc(${Number(
                  window.getComputedStyle(this).height.slice(0, -2)
                )}px - 5rem )`
              } else {
                panel.style.maxHeight = `calc(${
                  Number(window.getComputedStyle(this).height.slice(0, -2)) / 2
                }px - 3rem )`
              }
              panel.classList.toggle('figni-viewer-panel-hide')
            })
            this.#closeAllPanels(Array.from(panels))
          }
        }
      }
    })
  }

  #clickableHotspot(hotspot) {
    return window.getComputedStyle(hotspot).opacity > 0.5
  }

  #modifyPanel(panel) {
    panel.classList.add('figni-viewer-panel')
    const place = panel.getAttribute('place') || SETTINGS.DEFAULT_PANEL_PLACE
    const array = place.split(' ')
    let vertical = ''
    let horizontal = ''
    array.forEach((name) => {
      if (['top', 'middle', 'bottom'].includes(name)) {
        vertical = name
      }
      if (['left', 'center', 'right'].includes(name)) {
        horizontal = name
      }
    })
    panel.dataset.vertical = vertical
    panel.dataset.horizontal = horizontal

    if (horizontal == 'left' && vertical == 'top') {
      panel.classList.add('figni-viewer-panel-place-left-top')
    } else if (horizontal == 'center' && vertical == 'top') {
      panel.classList.add('figni-viewer-panel-place-center-top')
    } else if (horizontal == 'right' && vertical == 'top') {
      panel.classList.add('figni-viewer-panel-place-right-top')
    } else if (horizontal == 'left' && vertical == 'middle') {
      panel.classList.add('figni-viewer-panel-place-left-middle')
    } else if (horizontal == 'center' && vertical == 'middle') {
      panel.classList.add('figni-viewer-panel-place-center-middle')
    } else if (horizontal == 'right' && vertical == 'middle') {
      panel.classList.add('figni-viewer-panel-place-right-middle')
    } else if (horizontal == 'left' && vertical == 'bottom') {
      panel.classList.add('figni-viewer-panel-place-left-bottom')
    } else if (horizontal == 'center' && vertical == 'bottom') {
      panel.classList.add('figni-viewer-panel-place-center-bottom')
    } else if (horizontal == 'right' && vertical == 'bottom') {
      panel.classList.add('figni-viewer-panel-place-right-bottom')
    }
  }

  /**
   * インタラクションプロンプトを表示する
   */
  #showInteractionPrompt() {
    if (!this.#interactionPrompt) {
      this.#interactionPrompt = document.createElement('div')
      this.#interactionPrompt.classList.add('figni-viewer-interaction-prompt')
      this.#interactionPrompt.innerHTML = SVG_INTERACTION_PROMPT
      this.#interactionPrompt.setAttribute('slot', 'interaction-prompt')
      this.#figniViewerBase.appendChild(this.#interactionPrompt)
    } else {
      this.#interactionPrompt.style.display = ''
    }
  }

  /**
   * インタラクションプロンプトを非表示にする
   */
  #hideInteractionPrompt() {
    if (this.#interactionPrompt) {
      this.#interactionPrompt.style.display = 'none'
    }
  }

  /**
   * ARボタンを表示する
   */
  #showArButton() {
    if (!this.#arButton) {
      this.#arButton = document.createElement('span')
      this.#arButton.innerHTML = `${SVG_AR_BUTTON}<span>実物大で見る</span>`
      this.#arButton.classList.add('figni-viewer-ar-button')
      this.#arButton.addEventListener('click', () => {
        if (this.#figniViewerBase.canActivateAR) {
          this.#figniViewerBase.activateARMode()
        } else {
          this.#showQRCodePanel()
        }
      })
      this.#figniViewerBase.appendChild(this.#arButton)
    } else {
      this.#arButton.style.display = ''
    }
  }

  #showQRCodePanel() {
    if (!this.#qrCodePanel) {
      this.#qrCodePanel = document.createElement('div')
      this.#qrCodePanel.classList.add('figni-viewer-qrcode-panel-base')
      this.#qrCodePanel.addEventListener('click', () => {
        this.#hideQRCodePanel()
      })
      this.#figniViewerBase.appendChild(this.#qrCodePanel)
      const bg = document.createElement('div')
      bg.classList.add('figni-viewer-qrcode-panel-bg')
      this.#qrCodePanel.appendChild(bg)
      const panel = document.createElement('div')
      panel.classList.add('figni-viewer-qrcode-panel')
      QRCode.toString(window.location.href, { width: 100 }, (err, str) => {
        if (!err) {
          const text = document.createElement('span')
          text.innerText =
            'QRコードを読み取ってスマホ版で\nサイトを閲覧してください'
          panel.appendChild(text)
          panel.innerHTML += str.replace('#000000', '#222428')
        } else {
          const text = document.createElement('span')
          text.style.color = 'var(--figni-viewer-error)'
          text.innerText = 'QRコードの生成に失敗しました...'
          panel.appendChild(text)
          console.error(err)
        }
      })
      this.#qrCodePanel.appendChild(panel)
    } else {
      this.#qrCodePanel.style.display = ''
    }
  }

  #hideQRCodePanel() {
    if (this.#qrCodePanel) {
      this.#qrCodePanel.style.display = 'none'
    }
  }

  /**
   * カメラ位置を戻すボタンを表示する
   */
  #showInitCameraButton() {
    if (!this.#initCameraButton) {
      this.#initCameraButton = document.createElement('span')
      this.#initCameraButton.classList.add('figni-viewer-init-camera-button')
      this.#initCameraButton.innerHTML = SVG_CLOSE_ICON
      this.#initCameraButton.addEventListener('click', () => {
        this.resetCameraTargetAndOrbit()
        this.#closeAllPanels()
      })
      this.#figniViewerBase.appendChild(this.#initCameraButton)
    } else {
      this.#initCameraButton.style.display = ''
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
   * ローディングパネルを表示する
   */
  #showLoadingPanel() {
    if (!this.#loadingPanel) {
      this.#loadingPanel = document.createElement('div')
      this.#loadingPanel.classList.add('figni-viewer-loading-panel')
      this.#loadingPanel.setAttribute('slot', 'progress-bar')
      // ローディングアニメ
      const loadingAnimation = document.createElement('div')
      loadingAnimation.classList.add('figni-viewer-loading-animation')
      Lottie.loadAnimation({
        container: loadingAnimation,
        renderer: 'svg',
        loop: true,
        autoplay: true,
        animationData: LOADING_ANIMATION,
      })
      this.#loadingPanel.appendChild(loadingAnimation)
      // プログレスバー
      const loadingProgressBar = document.createElement('span')
      loadingProgressBar.classList.add('figni-viewer-loading-progress-bar')
      this.#loadingPanel.appendChild(loadingProgressBar)
      const loadingIcon = document.createElement('span')
      Lottie.loadAnimation({
        container: loadingIcon,
        renderer: 'svg',
        loop: true,
        autoplay: true,
        animationData: LOADING_ANIMATION_RING,
      })
      loadingIcon.classList.add('figni-viewer-loading-animation-ring')
      loadingProgressBar.appendChild(loadingIcon)
      const loadingText = document.createElement('span')
      loadingText.innerText = '3Dモデルを読み込み中...'
      loadingText.classList.add('figni-viewer-loading-text')
      loadingProgressBar.appendChild(loadingText)
      this.appendChild(this.#loadingPanel)
      const progress = (e) => {
        const p = e.detail.totalProgress
        loadingProgressBar.style.setProperty(
          '--figni-viewer-progress',
          `${Math.ceil(p * 100)}%`
        )
        if (p === 1) {
          this.#hideLoadingPanel()
          this.#figniViewerBase.removeEventListener('progress', progress)
        }
      }
      this.#figniViewerBase.addEventListener('progress', progress)
    } else {
      this.#loadingPanel.style.display = ''
    }
  }

  /**
   * ローディングパネルを非表示にする
   */
  #hideLoadingPanel() {
    if (this.#loadingPanel) {
      this.#loadingPanel.style.display = 'none'
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

  /**
   * キャプションの表示非表示を切り替えるボタンを表示する
   */
  #showToggleVisibleHotspotButton() {
    if (!this.#toggleVisibleHotspotButton) {
      this.#toggleVisibleHotspotButton = document.createElement('span')
      this.#toggleVisibleHotspotButton.classList.add(
        'figni-viewer-toggle-visible-hotspot-button'
      )
      this.#toggleVisibleHotspotButton.addEventListener('click', () => {
        this.#visibleAllHotspots = !this.#visibleAllHotspots
        this.toggleVisibleHotspot(this.#visibleAllHotspots)
      })
      this.toggleVisibleHotspot(this.#visibleAllHotspots)
      this.#figniViewerBase.appendChild(this.#toggleVisibleHotspotButton)
    } else {
      this.#toggleVisibleHotspotButton.style.display = ''
    }
  }

  /**
   * キャプションの表示非表示を切り替えるボタンを非表示にする
   */
  #hideToggleVisibleHotspotButton() {
    if (this.#toggleVisibleHotspotButton) {
      this.#toggleVisibleHotspotButton.style.display = 'none'
    }
  }

  /**
   * スクリーンショットをダウンロードするボタンを表示する
   */
  #showDownloadScreenshotButton() {
    if (!this.#downloadScreenshotButton) {
      this.#downloadScreenshotButton = document.createElement('span')
      this.#downloadScreenshotButton.classList.add(
        'figni-viewer-download-screenshot-button'
      )
      this.#downloadScreenshotButton.innerHTML = SVG_DOWNLOAD_SCREENSHOT_BUTTON
      this.#downloadScreenshotButton.addEventListener('click', () => {
        this.downloadScreenshot()
      })
      this.#figniViewerBase.appendChild(this.#downloadScreenshotButton)
    } else {
      this.#downloadScreenshotButton.style.display = ''
    }
  }

  /**
   * スクリーンショットをダウンロードするボタンを非表示にする
   */
  #hideDownloadScreenshotButton() {
    if (this.#downloadScreenshotButton) {
      this.#downloadScreenshotButton.style.display = 'none'
    }
  }

  /**
   * ヘルプ画面を表示するボタンを表示する
   */
  #showHelpButton() {
    if (!this.#helpButton) {
      this.#helpButton = document.createElement('span')
      this.#helpButton.innerHTML = `${SVG_HELP_ICON}<span>使い方</span>`
      this.#helpButton.classList.add('figni-viewer-help-button')
      this.#helpButton.addEventListener('click', () => {
        if (
          this.#helpPanelBase.classList.contains(
            'figni-viewer-help-panel-hidden'
          )
        ) {
          this.#helpButton.innerHTML = `${SVG_HELP_CLOSE_ICON}`
          this.openHelpPanel()
        } else {
          this.#helpButton.innerHTML = `${SVG_HELP_ICON}<span>使い方</span>`
          this.closeHelpPanel()
        }
      })
      this.#figniViewerBase.appendChild(this.#helpButton)
    } else {
      this.#helpButton.style.display = ''
    }
  }

  #showHelpPanel() {
    if (!this.#helpPanelBase) {
      this.#helpPanelBase = document.createElement('div')
      this.#helpPanelBase.classList.add('figni-viewer-help-panel')
      this.#helpPanelBase.classList.add('figni-viewer-help-panel-hidden')
      this.appendChild(this.#helpPanelBase)
    }
  }

  #helpTopPage
  #createOrGetHelpTopPage() {
    if (!this.#helpTopPage) {
      this.#helpTopPage = document.createElement('div')
      this.#helpTopPage.classList.add('figni-viewer-help-page')
      // ページタイトル
      const title = document.createElement('h3')
      title.innerText = '使い方ヘルプ'
      this.#helpTopPage.appendChild(title)
      // ページアイテムを包含するdivを追加
      const helpItemContainer = document.createElement('div')
      helpItemContainer.classList.add('figni-viewer-help-page-item-container')
      this.#helpTopPage.appendChild(helpItemContainer)
      // ボタンを生成する関数を設定
      const createButton = (text, animationData, link) => {
        // ボタンを追加
        const helpBtn = document.createElement('div')
        this.#helpTopPage.appendChild(helpBtn)
        helpBtn.classList.add('figni-viewer-help-page-btn')
        // アニメーションのホルダーを追加
        const animationHolder = document.createElement('div')
        animationHolder.classList.add('figni-viewer-help-page-animation-holder')
        helpBtn.appendChild(animationHolder)
        // アニメーションを追加
        Lottie.loadAnimation({
          container: animationHolder,
          renderer: 'svg',
          loop: true,
          autoplay: true,
          animationData: animationData,
        })
        // タイトルのホルダーを追加
        const titleHolder = document.createElement('div')
        titleHolder.classList.add('figni-viewer-help-page-btn-title-holder')
        helpBtn.appendChild(titleHolder)
        // タイトルを追加
        const btnTitle = document.createElement('h4')
        titleHolder.appendChild(btnTitle)
        btnTitle.innerText = text
        // 矢印アイコンを追加
        const btnArrow = document.createElement('span')
        btnArrow.innerHTML = SVG_HELP_ARROW
        btnArrow.style.height = '1.25rem'
        titleHolder.appendChild(btnArrow)
        // クリックイベントを設定
        helpBtn.onclick = () => {
          this.openHelpPanel(link)
        }
        helpItemContainer.appendChild(helpBtn)
      }
      // 「コンテンツの操作」ボタンを生成
      createButton(
        'コンテンツの操作',
        CONTENT_OPERATION_ANIMATION,
        HELP.CONTENT
      )
      // 「キャプションの操作」ボタンを生成
      createButton('キャプションの操作', CAPTION_TAP_ANIMATION, HELP.CAPTION)
      // 「実物大で見る」ボタンを生成
      createButton('実物大で見る', HOW_TO_AR_ANIMATION, HELP.AR)
      // 「上手く行かない場合」ボタンを生成
      const unknownBtn = document.createElement('div')
      unknownBtn.classList.add(
        'figni-viewer-help-page-btn',
        'figni-viewer-help-page-unknown-btn'
      )
      // はてなアイコンを追加
      const btnIcon = document.createElement('span')
      btnIcon.innerHTML = SVG_HELP_UNKNOWN_ICON
      btnIcon.style.height = '1.75rem'
      unknownBtn.appendChild(btnIcon)
      // テキストを追加
      const btnText = document.createElement('h4')
      unknownBtn.appendChild(btnText)
      btnText.innerText = '上手く行かない場合はこちら'
      // クリックイベントを設定
      unknownBtn.onclick = () => {
        this.openHelpPanel(HELP.UNKNOWN)
      }
      this.#helpTopPage.appendChild(unknownBtn)
      // フッター追加
      const footer = document.createElement('div')
      footer.classList.add('figni-viewer-help-page-footer')
      // Figniロゴの追加
      const figniLogo = document.createElement('a')
      figniLogo.innerHTML = SVG_FIGNI_LOGO
      figniLogo.style.display = 'block'
      figniLogo.style.width = '4rem'
      figniLogo.setAttribute('href', 'https://figni.io')
      footer.appendChild(figniLogo)
      // コピーライトの追加
      const copyRight = document.createElement('small')
      copyRight.innerText = '© 2022 Cynack Inc.'
      footer.appendChild(copyRight)
      this.#helpTopPage.appendChild(footer)
    }
    return this.#helpTopPage
  }
  #createHelpItem(animationData, stepNum, title, description) {
    const item = document.createElement('div')
    item.classList.add('figni-viewer-help-page-item')
    if (animationData !== null) {
      // アニメーションホルダーを追加
      const animationHolder = document.createElement('div')
      animationHolder.classList.add(
        'figni-viewer-help-page-item-animation-holder'
      )
      item.appendChild(animationHolder)
      // アニメーションを追加
      Lottie.loadAnimation({
        container: animationHolder,
        renderer: 'svg',
        loop: true,
        autoplay: true,
        animationData: animationData,
      })
    }
    // stepを追加
    const step = document.createElement('span')
    step.classList.add('figni-viewer-help-page-item-step')
    step.innerText = `Step.${stepNum}`
    item.appendChild(step)
    // タイトルを追加
    const itemTitle = document.createElement('h5')
    itemTitle.innerText = title
    itemTitle.classList.add('figni-viewer-help-page-item-title')
    item.appendChild(itemTitle)
    // 説明を追加
    const itemDescription = document.createElement('p')
    itemDescription.classList.add('figni-viewer-help-page-item-description')
    itemDescription.innerText = description
    item.appendChild(itemDescription)
    return item
  }
  #helpContentPage
  #createOrGetHelpContentPage() {
    if (!this.#helpContentPage) {
      this.#helpContentPage = document.createElement('div')
      this.#helpContentPage.classList.add('figni-viewer-help-page')
      const title = document.createElement('h3')
      title.innerText = 'コンテンツの操作'
      this.#helpContentPage.appendChild(title)
      const helpItemContainer = document.createElement('div')
      helpItemContainer.classList.add('figni-viewer-help-page-item-container')
      this.#helpContentPage.appendChild(helpItemContainer)
      helpItemContainer.appendChild(
        this.#createHelpItem(
          CONTENT_OPERATION_ANIMATION,
          1,
          '指を置いてモデルを回転させる',
          'ビューワー内をドラッグすると、薄い円が表示されます。その状態で指を動かすと、コンテンツを回転することができます。画面をスクロールしてしまう場合、一度左右に動かしてから上下に動かすことでコンテンツを回転させることができます。'
        )
      )
      helpItemContainer.appendChild(
        this.#createHelpItem(
          CONTENT_PINCH_ANIMATION,
          2,
          'コンテンツをピンチして拡大縮小する',
          '二本指で広げるようにドラッグすると、コンテンツを拡大して見ることができます。縮小したい場合は、逆に二本指で縮めるようにドラッグしてください。'
        )
      )
      // 「上手く行かない場合」ボタンを生成
      const unknownBtn = document.createElement('div')
      unknownBtn.classList.add('figni-viewer-help-page-unknown-btn')
      // はてなアイコンを追加
      const btnIcon = document.createElement('span')
      btnIcon.innerHTML = SVG_HELP_UNKNOWN_ICON
      btnIcon.style.height = '1.75rem'
      unknownBtn.appendChild(btnIcon)
      // テキストを追加
      const btnText = document.createElement('h4')
      unknownBtn.appendChild(btnText)
      btnText.innerText = '上手く行かない場合はこちら'
      // クリックイベントを設定
      unknownBtn.onclick = () => {
        this.openHelpPanel(HELP.UNKNOWN)
      }
      this.#helpContentPage.appendChild(unknownBtn)
      // フッター追加
      const footer = document.createElement('div')
      footer.classList.add('figni-viewer-help-page-footer')
      // コピーライトの追加
      const copyRight = document.createElement('small')
      copyRight.innerText = '© 2022 Cynack Inc.'
      footer.appendChild(copyRight)
      this.#helpContentPage.appendChild(footer)
      // 戻るボタンの追加
      const backBtn = document.createElement('div')
      backBtn.classList.add('figni-viewer-help-page-item-back-btn')
      backBtn.innerHTML = `${SVG_HELP_BACK}<span>戻る</span>`
      backBtn.onclick = () => {
        this.backHelpPanel()
      }
      this.#helpContentPage.appendChild(backBtn)
    }
    return this.#helpContentPage
  }
  #helpCaptionPage
  #createOrGetHelpCaptionPage() {
    if (!this.#helpCaptionPage) {
      this.#helpCaptionPage = document.createElement('div')
      this.#helpCaptionPage.classList.add('figni-viewer-help-page')
      const title = document.createElement('h3')
      title.innerText = 'キャプションの操作'
      this.#helpCaptionPage.appendChild(title)
      const helpItemContainer = document.createElement('div')
      helpItemContainer.classList.add('figni-viewer-help-page-item-container')
      this.#helpCaptionPage.appendChild(helpItemContainer)
      helpItemContainer.appendChild(
        this.#createHelpItem(
          CAPTION_TAP_ANIMATION,
          1,
          'エフェクトが出ている点をタップする',
          'コンテンツの各所にあるエフェクトが出ている点をタップすると、その点をよく見たり、説明を閲覧したり、その部位の動作などを見るたりすることができます。'
        )
      )
      helpItemContainer.appendChild(
        this.#createHelpItem(
          null,
          2,
          '左下のボタンでコンテンツの位置をリセットする',
          '元の位置・角度にコンテンツを戻したい場合は、左下のボタンをタップして下さい。'
        )
      )
      // 「上手く行かない場合」ボタンを生成
      const unknownBtn = document.createElement('div')
      unknownBtn.classList.add('figni-viewer-help-page-unknown-btn')
      // はてなアイコンを追加
      const btnIcon = document.createElement('span')
      btnIcon.innerHTML = SVG_HELP_UNKNOWN_ICON
      btnIcon.style.height = '1.75rem'
      unknownBtn.appendChild(btnIcon)
      // テキストを追加
      const btnText = document.createElement('h4')
      unknownBtn.appendChild(btnText)
      btnText.innerText = '上手く行かない場合はこちら'
      // クリックイベントを設定
      unknownBtn.onclick = () => {
        this.openHelpPanel(HELP.UNKNOWN)
      }
      this.#helpCaptionPage.appendChild(unknownBtn)
      // フッター追加
      const footer = document.createElement('div')
      footer.classList.add('figni-viewer-help-page-footer')
      // コピーライトの追加
      const copyRight = document.createElement('small')
      copyRight.innerText = '© 2022 Cynack Inc.'
      footer.appendChild(copyRight)
      this.#helpCaptionPage.appendChild(footer)
      // 戻るボタンの追加
      const backBtn = document.createElement('div')
      backBtn.classList.add('figni-viewer-help-page-item-back-btn')
      backBtn.innerHTML = `${SVG_HELP_BACK}<span>戻る</span>`
      backBtn.onclick = () => {
        this.backHelpPanel()
      }
      this.#helpCaptionPage.appendChild(backBtn)
    }
    return this.#helpCaptionPage
  }
  #helpArPage
  #createOrGetHelpArPage() {
    if (!this.#helpArPage) {
      this.#helpArPage = document.createElement('div')
      this.#helpArPage.classList.add('figni-viewer-help-page')
      const title = document.createElement('h3')
      title.innerText = '実物大で見る'
      this.#helpArPage.appendChild(title)
      const helpItemContainer = document.createElement('div')
      helpItemContainer.classList.add('figni-viewer-help-page-item-container')
      this.#helpArPage.appendChild(helpItemContainer)
      helpItemContainer.appendChild(
        this.#createHelpItem(
          null,
          1,
          '"実物大で見る"ボタンをタップ',
          '左下の"実物大で見る"をタップすると、スマートフォンのカメラ映像を通してコンテンツを実物大で見ることができます。'
        )
      )
      helpItemContainer.appendChild(
        this.#createHelpItem(
          HOW_TO_AR_ANIMATION,
          2,
          'スマホを動かしながらできる限り多くの床面をカメラに映す',
          'カメラであたりを見回すようにして 、できる限り多くの床面をカメラに映します。カメラが空間を認識すると、自然とコンテンツが現れます。'
        )
      )
      helpItemContainer.appendChild(
        this.#createHelpItem(
          MOVE_AR_CONTENT_ANIMATION,
          3,
          'コンテンツをドラッグして移動させる',
          '一本指でコンテンツをドラッグすると、コンテンツを移動させることができます。'
        )
      )
      helpItemContainer.appendChild(
        this.#createHelpItem(
          ROTATE_AR_CONTENT_ANIMATION,
          4,
          '二本指でコンテンツを回転させる',
          '二本指でコンテンツをドラッグして回転させると、コンテンツの向きを回転させることができます。'
        )
      )
      // 「上手く行かない場合」ボタンを生成
      const unknownBtn = document.createElement('div')
      unknownBtn.classList.add('figni-viewer-help-page-unknown-btn')
      // はてなアイコンを追加
      const btnIcon = document.createElement('span')
      btnIcon.innerHTML = SVG_HELP_UNKNOWN_ICON
      btnIcon.style.height = '1.75rem'
      unknownBtn.appendChild(btnIcon)
      // テキストを追加
      const btnText = document.createElement('h4')
      unknownBtn.appendChild(btnText)
      btnText.innerText = '上手く行かない場合はこちら'
      // クリックイベントを設定
      unknownBtn.onclick = () => {
        this.openHelpPanel(HELP.UNKNOWN)
      }
      this.#helpArPage.appendChild(unknownBtn)
      // フッター追加
      const footer = document.createElement('div')
      footer.classList.add('figni-viewer-help-page-footer')
      // コピーライトの追加
      const copyRight = document.createElement('small')
      copyRight.innerText = '© 2022 Cynack Inc.'
      footer.appendChild(copyRight)
      this.#helpArPage.appendChild(footer)
      // 戻るボタンの追加
      const backBtn = document.createElement('div')
      backBtn.classList.add('figni-viewer-help-page-item-back-btn')
      backBtn.innerHTML = `${SVG_HELP_BACK}<span>戻る</span>`
      backBtn.onclick = () => {
        this.backHelpPanel()
      }
      this.#helpArPage.appendChild(backBtn)
    }
    return this.#helpArPage
  }
  #createHelpUnknownItem(title, description) {
    const item = document.createElement('div')
    item.classList.add('figni-viewer-help-page-item')
    // タイトルを追加
    const itemTitle = document.createElement('h5')
    itemTitle.innerText = title
    itemTitle.classList.add('figni-viewer-help-page-item-title')
    item.appendChild(itemTitle)
    // 説明を追加
    const itemDescription = document.createElement('p')
    itemDescription.classList.add('figni-viewer-help-page-item-description')
    itemDescription.innerText = description
    item.appendChild(itemDescription)
    return item
  }
  #helpUnknownPage
  #createOrGetHelpUnknownPage() {
    if (!this.#helpUnknownPage) {
      this.#helpUnknownPage = document.createElement('div')
      this.#helpUnknownPage.classList.add('figni-viewer-help-page')
      const title = document.createElement('h3')
      title.innerText = '上手く行かない場合'
      this.#helpUnknownPage.appendChild(title)
      const helpItemContainer = document.createElement('div')
      helpItemContainer.classList.add('figni-viewer-help-page-item-container')
      this.#helpUnknownPage.appendChild(helpItemContainer)
      helpItemContainer.appendChild(
        this.#createHelpUnknownItem(
          'コンテンツを回転させようとするとスクロールしてしまう',
          'コンテンツを上下に動かしたい場合は、はじめに左右に動かしてから上下に動かしてください。'
        )
      )
      helpItemContainer.appendChild(
        this.#createHelpUnknownItem(
          '実物大コンテンツを表示できない',
          '明るく広い場所で機能を使用してください。また、床面をカメラに映す際に遮るものがないか確認してください。'
        )
      )
      helpItemContainer.appendChild(
        this.#createHelpUnknownItem(
          '表示がおかしくなってしまう',
          '一度機能を終了し、「実物大で見る」ボタンからもう一度機能を起動してください。'
        )
      )
      // フッター追加
      const footer = document.createElement('div')
      footer.classList.add('figni-viewer-help-page-footer')
      // コピーライトの追加
      const copyRight = document.createElement('small')
      copyRight.innerText = '© 2022 Cynack Inc.'
      footer.appendChild(copyRight)
      this.#helpUnknownPage.appendChild(footer)
      // 戻るボタンの追加
      const backBtn = document.createElement('div')
      backBtn.classList.add('figni-viewer-help-page-item-back-btn')
      backBtn.innerHTML = `${SVG_HELP_BACK}<span>戻る</span>`
      backBtn.onclick = () => {
        this.backHelpPanel()
      }
      this.#helpUnknownPage.appendChild(backBtn)
    }
    return this.#helpUnknownPage
  }
}
