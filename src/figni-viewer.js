import Lottie from 'lottie-web/build/player/lottie_light'
import QRCode from 'qrcode'
import Values from 'values.js'
import {
  THREED_HIGHLIGHT,
  THREED_CONTROL,
  THREED_ZOOM,
  AR_SCAN,
  LOADING_ANIMATION,
  LOADING_CIRCLE,
  AR_CONTROL,
  AR_ROTATE,
} from './animation'
import { ClassWatcher } from './class-watcher'
import error from './error'
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
import { setup, translate } from './translation'

const OBSERBED_ATTRIBUTES = [
  'item-id',
  'token',
  'model-tag',
  'screenshot',
  'toggle-caption',
]
const SETTINGS = {
  DEFAULT_CAMERA_TARGET: 'auto auto auto',
  DEFAULT_CAMERA_ORBIT: '0deg 75deg 105%',
  DEFAULT_CAMERA_FOV: 'auto',
  DEFAULT_HOTSPOT_POSITION: '0m 0m 0m',
  DEFAULT_HOTSPOT_NORMAL: '0m 1m 0m',
  DEFAULT_PANEL_PLACE: 'left middle',
}
const HELP = {
  TOP: 'top',
  CONTENT: 'content',
  HIGHLIGHT: 'highlight',
  AR: 'ar',
  UNKNOWN: 'unknown',
}
const TIPS = {
  DRAG: 'drag',
  AR: 'ar',
}

export default class FigniViewerElement extends HTMLElement {
  // html element
  #figniViewerBase
  #helpPanelBase
  #tipsPanel
  #initCameraButton
  #loadingPanel
  #errorPanel
  #qrCodePanel
  #helpButton
  #interactionPrompt
  #arButton
  #toggleVisibleHotspotButton
  #downloadScreenshotButton
  #helpTopPage
  #helpContentPage
  #helpHighlightPage
  #helpArPage
  #helpUnknownPage
  #closeHotspotButton
  #tempHidedHotspot = null
  #interactionCursors = {}
  #interactionCursorPool = []
  #hotspots = []
  #panels = []

  #completedInitialModelLoad = false
  #visibleAllHotspots = true
  #openedHelpPages = []
  #tipsHideCallback = null
  #toggleStates = {}

  #ABTEST = {}

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

  get tag() {
    return (this.getAttribute('tag') ?? '').split(' ')
  }

  set tag(value) {
    this.setAttribute('tag', value.join(' '))
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

  get fov() {
    return this.getAttribute('fov') || SETTINGS.DEFAULT_CAMERA_FOV
  }

  set fov(value) {
    this.setAttribute('fov', value)
  }

  get state() {
    return this.getAttribute('state') || ''
  }

  set state(value) {
    this.setAttribute('state', value)
  }

  get enablePan() {
    return this.getAttribute('enable-pan') === ''
  }

  get staging() {
    return this.getAttribute('staging') === ''
  }

  get base() {
    return this.#figniViewerBase
  }

  constructor() {
    super()

    this.addEventListener('camera-change', () => {
      if (this.#tempHidedHotspot) {
        if (!this.#clickableHotspot(this.#tempHidedHotspot.target)) {
          this.#showInitCameraButton()
        } else {
          this.#hideInitCameraButton()
        }
      }
    })
  }

  async connectedCallback() {
    this.#completedInitialModelLoad = false

    if (!this.base) {
      this.#figniViewerBase = document.createElement('figni-viewer-base')
      // イベントの登録
      this.base.addEventListener('load', () => {
        this.dispatchEvent(new CustomEvent('load'))
      })
      this.base.addEventListener('model-visibility', () => {
        this.dispatchEvent(new CustomEvent('model-visibility'))
      })
      this.base.addEventListener('progress', (e) => {
        this.dispatchEvent(
          new CustomEvent('progress', {
            detail: { progress: e.detail.totalProgress },
          })
        )
      })
      this.base.addEventListener('finished', () => {
        this.dispatchEvent(new CustomEvent('animation-finished'))
      })
      this.base.addEventListener('camera-change', (e) => {
        this.dispatchEvent(
          new CustomEvent('camera-change', { detail: e.detail })
        )
      })
      this.appendChild(this.base)
    }

    // Hotspot
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach(async (node) => {
            if (node.slot && node.slot.startsWith('hotspot-')) {
              if (!node.classList.contains('figni-viewer-hotspot')) {
                this.base.appendChild(node)
                await this.base.updateComplete
                this.#modifyHotspot(node)
                if (this.#hotspots.findIndex((h) => h === node) === -1) {
                  this.#hotspots.push(node)
                }
              }
            }
          })
        }
      })
    })
    observer.observe(this, { childList: true })
    this.querySelectorAll('[slot^="hotspot-"]').forEach((hotspot) => {
      if (hotspot.parentNode !== this.base) {
        this.#hotspots.push(this.appendChild(hotspot))
      }
    })
    this.addEventListener('load', () => {
      setTimeout(() => {
        this.#enableAllHotspots()
      }, 100)
    })

    await setup()

    this.#loadModel()
    this.resetCameraTargetAndOrbit()
    this.updateState(this.state)

    this.#showHelpPanel()
    this.#showTipsPanel()
    this.#showArButton()
    this.#showInteractionPrompt()
    this.#showHelpButton()
    this.#setupInteractionCursor()
    this.#closeAllPanels()
    this.updateColorSettings()

    if (this.enablePan) {
      this.base.disablePan = false
    }

    this.#completedInitialModelLoad = true
  }

  static get observedAttributes() {
    return OBSERBED_ATTRIBUTES
  }

  async attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue !== newValue) {
      switch (name) {
        case 'item-id':
          if (this.#completedInitialModelLoad) this.#loadModel()
          break
        case 'token':
          if (this.#completedInitialModelLoad) this.#loadModel()
          break
        case 'model-tag':
          if (this.#completedInitialModelLoad) this.#loadModel()
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
    if (this.base.cameraTarget !== target) {
      this.#showInitCameraButton()
    }
    this.#setCameraTarget(target)
  }

  #setCameraTarget(target) {
    this.base.setCameraTarget(target)
  }

  /**
   * カメラ位置の基準となる座標からの極座標を設定する
   * @param {string} orbit 極座標("deg deg %", "rad rad m", etc.)
   */
  setCameraOrbit(orbit) {
    if (this.base.cameraOrbit !== orbit) {
      this.#showInitCameraButton()
    }
    this.#setCameraOrbit(orbit)
  }

  #setCameraOrbit(orbit) {
    this.base.setCameraOrbit(orbit)
  }

  /**
   * カメラの垂直方向の視野を設定する
   * @param {string} fov 角度("deg", "rad", etc.)
   */
  setCameraFov(fov) {
    if (this.base.fieldOfView !== fov) {
      this.#showInitCameraButton()
    }
    this.#setCameraFov(fov)
  }

  #setCameraFov(fov) {
    this.base.setFieldOfView(fov)
  }

  /**
   * カメラ位置を初期位置に戻す
   */
  resetCameraTargetAndOrbit() {
    this.setCameraTarget(this.target)
    this.setCameraOrbit(this.orbit)
    this.setCameraFov(this.fov)
    this.#showTemporaryHidedHotspot()
    this.#hideInitCameraButton()
  }

  /**
   * モデルを読み込む
   */
  async #loadModel() {
    this.#hideErrorPanel()
    this.#hideLoadingPanel()
    this.closeHelpPanel()
    this.#disableAllHotspots()
    try {
      this.#showLoadingPanel()
      await this.base.loadModel(this.itemId, this.token, this.modelTag, {
        tags: this.tag,
        staging: this.staging,
      })
    } catch (e) {
      this.#hideLoadingPanel()
      this.#showErrorPanel(await error(e))
    }
  }

  /**
   * スクリーンショットを撮る
   */
  async downloadScreenshot() {
    const blob = await this.base.toBlob({
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
   * 現在有効なアニメーションを全て列挙して返す
   * @return {string[]} アニメーション名の配列
   */
  get availableAnimations() {
    return this.base.availableAnimations
  }

  /**
   * アニメーションを再生する
   * @param {string} clip 再生するアニメーション名
   * @param {{ loopCount: number, reverse: boolean, toState: string, onStart: Function, onEnd: Function }} options オプション
   */
  playAnimation(clip = null, options = {}) {
    this.base.playAnimation(clip, options)
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
      this.addEventListener('animation-finished', onFinishFunc, {
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
    const existHotspot = this.base.querySelector(`[slot="hotspot-${name}"]`)
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
    this.base.appendChild(hotspot)

    await this.base.updateComplete
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
    const hotspot = this.base.querySelector(`[slot="hotspot-${name}"]`)
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

    await this.base.updateComplete

    this.#modifyHotspot(hotspot)
    this.updateState(this.state)
  }

  /**
   * キャプションを削除する
   * @param {string} name キャプション名
   */
  removeHotspot(name) {
    const hotspot = this.base.querySelector(`[slot="hotspot-${name}"]`)
    hotspot?.remove()
  }

  /**
   * ヘルプページを開く。
   * @param {string} page ページ
   */
  openHelpPanel(page = HELP.TOP) {
    this.closeTipsPanel()
    this.#helpPanelBase.classList.remove('figni-viewer-help-panel-hidden')
    let openPage = null
    switch (page) {
      case HELP.TOP:
        openPage = this.#createOrGetHelpTopPage()
        break
      case HELP.CONTENT:
        openPage = this.#createOrGetHelpContentPage()
        break
      case HELP.HIGHLIGHT:
        openPage = this.#createOrGetHelpHighlightPage()
        break
      case HELP.AR:
        openPage = this.#createOrGetHelpArPage()
        break
      case HELP.UNKNOWN:
        openPage = this.#createOrGetHelpUnknownPage()
        break
    }
    if (openPage) {
      this.#helpButton.innerHTML = `${SVG_HELP_CLOSE_ICON}`
      if (this.#openedHelpPages.length === 0) {
        openPage.style.left = 0
        this.#closeAllPanels()
        this.resetCameraTargetAndOrbit()
      } else {
        openPage.style.left = '100%'
        this.base.endMesureHelpPage(
          this.#openedHelpPages[this.#openedHelpPages.length - 1].name
        )
      }
      this.base.startMesureHelpPage(page)
      openPage.scrollTop = 0
      this.#helpPanelBase.appendChild(openPage)
      this.#openedHelpPages.push({
        name: page,
        page: openPage,
      })
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
      openedPage.page.style.left = '100%'
      this.base.endMesureHelpPage(openedPage.name)
      if (this.#openedHelpPages[this.#openedHelpPages.length - 1]) {
        this.base.startMesureHelpPage(
          this.#openedHelpPages[this.#openedHelpPages.length - 1].name
        )
      }
      setTimeout(() => {
        openedPage.page.remove()
      }, 300)
    } else {
      this.closeHelpPanel()
    }
  }

  /**
   * ヘルプページを閉じる。
   */
  closeHelpPanel() {
    if (this.#helpPanelBase) {
      this.#closeAllPanels()
      this.resetCameraTargetAndOrbit()
      this.#helpPanelBase.classList.add('figni-viewer-help-panel-hidden')
      while (this.#helpPanelBase.firstChild) {
        this.#helpPanelBase.firstChild.remove()
      }
      if (this.#openedHelpPages.length > 0) {
        this.base.endMesureHelpPage(
          this.#openedHelpPages[this.#openedHelpPages.length - 1].name
        )
      }
      this.#openedHelpPages = []
      this.#helpButton &&
        (this.#helpButton.innerHTML = `${SVG_HELP_ICON}<span>${translate(
          'help.button'
        )}</span>`)
    }
  }

  /**
   * Tipsを開く。
   * @param {string} tips Tips
   * @param {number} delay 表示時間(ms)
   */
  openTipsPanel(tips, delay = 6000) {
    this.closeTipsPanel()
    this.closeHelpPanel()
    let text = null
    let animation = null
    let help = HELP.TOP
    let minimizeHelpButton = true
    switch (tips) {
      case TIPS.DRAG: {
        text = translate('tips.drag')
        animation = THREED_CONTROL
        help = HELP.CONTENT
        this.#tipsPanel.style.inset = '0.75em 0.75em auto auto'
        this.#tipsPanel.style.transformOrigin = 'top right'
        minimizeHelpButton = true
        break
      }
      case TIPS.AR: {
        text = translate('tips.ar')
        animation = AR_SCAN
        help = HELP.AR
        this.#tipsPanel.style.inset = 'auto auto 3.75em 0.75em'
        this.#tipsPanel.style.transformOrigin = 'bottom left'
        minimizeHelpButton = false
        break
      }
    }
    if (text && animation) {
      if (minimizeHelpButton) {
        this.#helpButton.innerHTML = `${SVG_HELP_ICON}`
      }
      this.#tipsPanel.querySelector('.figni-viewer-tips-panel-text').innerHTML =
        text
      const animationElement = this.#tipsPanel.querySelector(
        '.figni-viewer-tips-panel-animation'
      )
      animationElement.innerHTML = ''
      Lottie.loadAnimation({
        container: animationElement,
        renderer: 'svg',
        loop: true,
        autoplay: true,
        animationData: animation,
      })
      this.#tipsHideCallback = setTimeout(() => this.closeTipsPanel(), delay)
      this.#tipsPanel.addEventListener(
        'click',
        () => this.openHelpPanel(help),
        {
          once: true,
        }
      )
      this.#tipsPanel.classList.remove('figni-viewer-tips-panel-hidden')
    }
  }

  // TODO: TIPSごとに関数分ける
  // TODO: ARではARボタンのテキストをなくしてボタンを丸くする
  openDragTipsPanel() {
    this.#helpButton.innerHTML = `${SVG_HELP_ICON}`
  }

  closeTipsPanel() {
    if (this.#tipsHideCallback) clearTimeout(this.#tipsHideCallback)
    this.#helpButton.innerHTML = `${SVG_HELP_ICON}<span>${translate(
      'help.button'
    )}</span>`
    this.#tipsPanel.classList.add('figni-viewer-tips-panel-hidden')
  }

  /**
   * CSSの変数で指定した値を元に色を初期化する。
   */
  updateColorSettings() {
    const style = window.getComputedStyle(this)
    const primary = new Values(
      style.getPropertyValue('--figni-viewer-primary').replace(' ', '')
    )
    // const secondary = new Values(
    //   style.getPropertyValue('--figni-viewer-secondary').replace(' ', '')
    // )
    const background = new Values(
      style.getPropertyValue('--figni-viewer-background').replace(' ', '')
    )
    this.style.setProperty(
      '--figni-viewer-primary-tint-95',
      primary.tint(95).hexString()
    )
    this.style.setProperty(
      '--figni-viewer-gray-shade-10',
      background.shade(10).hexString()
    )
    this.style.setProperty(
      '--figni-viewer-gray-shade-20',
      background.shade(20).hexString()
    )
    this.style.setProperty(
      '--figni-viewer-gray-shade-30',
      background.shade(30).hexString()
    )
    this.style.setProperty(
      '--figni-viewer-gray-shade-50',
      background.shade(50).hexString()
    )
  }

  #setupInteractionCursor() {
    this.#interactionCursorPool.push(
      ...[...Array(3)].map(() => this.#createCursor())
    )
    this.base.addEventListener('pointerdown', (e) => {
      if (!this.#interactionCursors[e.pointerId]) {
        const rect = e.currentTarget.getBoundingClientRect()
        const cursor = this.#getOrCreateCursor(
          e.clientX - rect.left,
          e.clientY - rect.top
        )
        this.#interactionCursors[e.pointerId] = cursor
      }
    })
    this.base.addEventListener('pointermove', (e) => {
      if (this.#interactionCursors[e.pointerId]) {
        const rect = e.currentTarget.getBoundingClientRect()
        this.#moveCursor(
          this.#interactionCursors[e.pointerId],
          e.clientX - rect.left,
          e.clientY - rect.top
        )
      }
    })
    this.base.addEventListener('pointerup', (e) => {
      if (this.#interactionCursors[e.pointerId]) {
        this.#deleteCursor(this.#interactionCursors[e.pointerId])
        delete this.#interactionCursors[e.pointerId]
      }
    })
    this.base.addEventListener('pointerout', (e) => {
      if (this.#interactionCursors[e.pointerId]) {
        this.#deleteCursor(this.#interactionCursors[e.pointerId])
        delete this.#interactionCursors[e.pointerId]
      }
    })
    window.addEventListener('scroll', () => {
      Object.keys(this.#interactionCursors).forEach((key) => {
        this.#deleteCursor(this.#interactionCursors[key])
        delete this.#interactionCursors[key]
      })
    })
  }

  #createCursor() {
    const cursor = this.base.appendChild(document.createElement('div'))
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
    cursor.style.width = '8em'
    cursor.style.height = '8em'
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

  #enableAllHotspots() {
    this.#hotspots.forEach((hotspot) => {
      hotspot.classList.remove('figni-viewer-hotspot-none')
    })
  }

  #disableAllHotspots() {
    this.#hotspots.forEach((hotspot) => {
      hotspot.classList.add('figni-viewer-hotspot-none')
    })
  }

  count = 1
  #modifyHotspot(hotspot) {
    hotspot.classList.add('figni-viewer-hotspot')
    hotspot.classList.add('figni-viewer-hotspot-highlight')

    hotspot.setAttribute(
      'position',
      hotspot.getAttribute('position') || SETTINGS.DEFAULT_HOTSPOT_POSITION
    )
    if (hotspot.getAttribute('normal')) {
      this.base.updateHotspot({
        name: hotspot.getAttribute('slot'),
        position: hotspot.getAttribute('position'),
        normal: hotspot.getAttribute('normal'),
      })
    } else {
      hotspot.classList.add('figni-viewer-hotspot-no-normal')
      this.base.updateHotspot({
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
      hotspot.getAttribute('fov') != null ||
      hotspot.getAttribute('closeup') == ''
    const isVisible = hotspot.getAttribute('to-state') != null
    const isToggle = hotspot.getAttribute('toggle-clip') != null

    hotspot.addEventListener('click', (e) => {
      if (this.#clickableHotspot(hotspot)) {
        if (e.target === hotspot) {
          if (this.#tempHidedHotspot?.name !== name) {
            this.base.incrementHotspotClickCount(name)
          }
          this.base.disableInteractionPrompt()
          hotspot.classList.remove('figni-viewer-hotspot-highlight')
        }
      }
    })

    if (isAnime && !isToggle) {
      hotspot.addEventListener('click', (e) => {
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
    if (isToggle && !isAnime) {
      hotspot.addEventListener('click', (e) => {
        if (this.#clickableHotspot(hotspot)) {
          if (e.target === hotspot) {
            const toggleText = hotspot.getAttribute('toggle-text')
            const toggleClip = hotspot.getAttribute('toggle-clip')
            const loopCount = Number(hotspot.getAttribute('loopCount')) || 1
            let reverse = hotspot.getAttribute('reverse') == '' || false
            const toggleState = hotspot.getAttribute('toggle-state') || name
            const onStart = Function(hotspot.getAttribute('onstart'))
            const onEnd = Function(hotspot.getAttribute('onend'))
            if (!this.#toggleStates[name]) {
              this.#toggleStates[name] = {
                baseText: Array.from(hotspot.childNodes)
                  .map((ch) => ch.nodeValue)
                  .join(''),
                toggle: false,
              }
            }
            const toggle = this.#toggleStates[name].toggle
            if (!toggle) {
              this.#toggleStates[name].state = this.state
            }
            reverse = toggle ? !reverse : reverse
            const toState = toggle
              ? this.#toggleStates[name].state
              : toggleState
            this.playAnimation(toggleClip, {
              loopCount,
              reverse,
              toState,
              onStart,
              onEnd: () => {
                if (toggleText) {
                  hotspot.childNodes.forEach((child) => {
                    child.nodeValue = toggle
                      ? this.#toggleStates[name].baseText
                      : toggleText
                  })
                }
                onEnd()
              },
            })
            this.#toggleStates[name].toggle = !this.#toggleStates[name].toggle
          }
        }
      })
    }
    if (isCloseup) {
      hotspot.addEventListener('click', (e) => {
        if (this.#clickableHotspot(hotspot)) {
          if (e.target === hotspot) {
            const target =
              hotspot.getAttribute('target') ||
              hotspot.getAttribute('position') ||
              this.target
            const orbit = hotspot.getAttribute('orbit') || this.orbit
            const fov = hotspot.getAttribute('fov') || this.fov
            if (
              this.base.cameraTarget === target &&
              this.base.cameraOrbit === orbit &&
              this.base.fieldOfView === fov
            ) {
              this.resetCameraTargetAndOrbit()
            } else {
              this.#setCameraTarget(target)
              this.#setCameraOrbit(orbit)
              this.#setCameraFov(fov)
              this.#temporaryHideHotspot(name, hotspot)
            }
          }
        }
      })
    }
    if (!isAnime && isVisible) {
      const state = hotspot.getAttribute('to-state')
      hotspot.addEventListener('click', (e) => {
        if (this.#clickableHotspot(hotspot)) {
          if (e.target === hotspot) {
            this.updateState(state)
          }
        }
      })
    }

    const panels = hotspot.querySelectorAll('[slot^="panel-"]')
    this.#panels.push(...Array.from(panels))
    panels.forEach((panel) => {
      this.#modifyPanel(panel)
    })
    hotspot.addEventListener('click', (e) => {
      if (this.#clickableHotspot(hotspot)) {
        if (e.target == hotspot) {
          panels.forEach((panel) => {
            if (panel.classList.contains('figni-viewer-panel-hide')) {
              const baseWidth = Number(
                window.getComputedStyle(this.base).width.slice(0, -2)
              )
              const baseHeight = Number(
                window.getComputedStyle(this.base).height.slice(0, -2)
              )
              const hotspotWidth = Number(
                window.getComputedStyle(hotspot).width.slice(0, -2)
              )
              const hotspotHeight = Number(
                window.getComputedStyle(hotspot).height.slice(0, -2)
              )
              const v = panel.dataset.vertical
              const h = panel.dataset.horizontal
              if (v === 'top' && h == 'center') {
                panel.style.maxWidth = `${baseWidth / 2}px`
                panel.style.maxHeight = `calc(${
                  (baseHeight - hotspotHeight) / 2
                }px - 1em)`
              } else if (v === 'top' && (h === 'left' || h === 'right')) {
                panel.style.maxWidth = `calc(${
                  (baseWidth - hotspotWidth) / 2
                }px - 0.5em)`
                panel.style.maxHeight = `calc(${
                  (baseHeight - hotspotHeight) / 2
                }px - 2.25em)`
              } else if (v === 'middle' && h == 'center') {
                panel.style.maxWidth = `${baseWidth / 2}px`
                panel.style.maxHeight = `calc(${baseHeight}px - 4em)`
              } else if (v === 'middle' && (h === 'left' || h === 'right')) {
                panel.style.maxWidth = `calc(${
                  (baseWidth - hotspotWidth) / 2
                }px - 1.5em)`
                panel.style.maxHeight = `calc(${baseHeight}px - 4em)`
              } else if (v === 'bottom' && h == 'center') {
                panel.style.maxWidth = `${baseWidth / 2}px`
                panel.style.maxHeight = `calc(${
                  (baseHeight - hotspotHeight) / 2
                }px - 1em)`
              } else if (v === 'bottom' && (h === 'left' || h === 'right')) {
                panel.style.maxWidth = `calc(${
                  (baseWidth - hotspotWidth) / 2
                }px - 0.5em)`
                panel.style.maxHeight = `calc(${
                  (baseHeight - hotspotHeight) / 2
                }px - 2.25em)`
              }
              panel.classList.remove('figni-viewer-panel-hide')
            } else {
              panel.classList.add('figni-viewer-panel-hide')
            }
          })
          if (isCloseup || panels.length > 0) {
            this.#closeAllPanels(Array.from(panels))
          }
        }
      }
    })
  }

  #clickableHotspot(hotspot) {
    const isClickableOpacity = window.getComputedStyle(hotspot).opacity > 0.5
    const isClickablePosition = (function (_this) {
      const viewerRect = _this.base.getBoundingClientRect()
      const hotspotRect = hotspot.getBoundingClientRect()
      const hotspotRectSize = hotspotRect.width * hotspotRect.height
      const viewHotspotRectSize =
        (Math.min(hotspotRect.right, viewerRect.right) -
          Math.max(hotspotRect.left, viewerRect.left)) *
        (Math.min(hotspotRect.bottom, viewerRect.bottom) -
          Math.max(hotspotRect.top, viewerRect.top))
      const ratio = viewHotspotRectSize / hotspotRectSize
      return ratio > 0.5
    })(this)
    return isClickableOpacity && isClickablePosition
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
      console.warn(
        '警告：パネルをキャプションの中心に配置することは推奨されていません'
      )
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

    const name = panel.getAttribute('slot').replace(/^panel-/, '')
    delete panel.classWatcher
    panel.classWatcher = new ClassWatcher(
      panel,
      'figni-viewer-panel-hide',
      () => {
        this.base.endMesurePanel(name)
      },
      () => {
        this.base.startMesurePanel(name)
      }
    )
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
      this.base.appendChild(this.#interactionPrompt)
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
      this.#arButton.innerHTML = `${SVG_AR_BUTTON}<span>${translate(
        'ar.button'
      )}</span>`
      this.#arButton.classList.add('figni-viewer-ar-button')
      this.addEventListener('load', () => {
        if (this.base.canActivateAR) {
          this.#arButton.setAttribute('slot', 'ar-button')
        } else {
          this.#arButton.removeAttribute('slot')
        }
      })
      this.#arButton.addEventListener('click', () => {
        this.base.tryActivateAR()
        if (!this.base.canActivateAR) {
          this.#showQRCodePanel()
        }
      })
      this.base.appendChild(this.#arButton)
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
      this.base.appendChild(this.#qrCodePanel)
      const bg = document.createElement('div')
      bg.classList.add('figni-viewer-qrcode-panel-bg')
      this.#qrCodePanel.appendChild(bg)
      const panel = document.createElement('div')
      panel.classList.add('figni-viewer-qrcode-panel')
      QRCode.toString(window.location.href, { width: 100 }, (err, str) => {
        if (!err) {
          const title = document.createElement('div')
          title.innerText = translate('ar.qrcode.title')
          title.classList.add('figni-viewer-qrcode-panel-title')
          panel.appendChild(title)
          const text = document.createElement('div')
          text.innerText = translate('ar.qrcode.text')
          text.classList.add('figni-viewer-qrcode-panel-text')
          panel.appendChild(text)
          panel.innerHTML += str.replace('#000000', '#222428')
        } else {
          const text = document.createElement('span')
          text.style.color = 'var(--figni-viewer-error)'
          text.innerText = translate('error.FailedToGenerateQRCode')
          panel.appendChild(text)
          console.error(err)
        }
      })
      this.#qrCodePanel.appendChild(panel)
    } else {
      this.#qrCodePanel.classList.remove('figni-viewer-qrcode-panel-base-hide')
      this.#qrCodePanel.style.display = ''
    }
  }

  #hideQRCodePanel() {
    if (this.#qrCodePanel) {
      this.#qrCodePanel.classList.add('figni-viewer-qrcode-panel-base-hide')
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
      this.base.appendChild(this.#initCameraButton)
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
      loadingIcon.classList.add('figni-viewer-loading-animation-ring')
      Lottie.loadAnimation({
        container: loadingIcon,
        renderer: 'svg',
        loop: true,
        autoplay: true,
        animationData: LOADING_CIRCLE,
      })
      loadingProgressBar.appendChild(loadingIcon)
      const loadingText = document.createElement('span')
      loadingText.innerText = translate('loading')
      loadingText.classList.add('figni-viewer-loading-text')
      loadingProgressBar.appendChild(loadingText)
      this.appendChild(this.#loadingPanel)
      this.addEventListener('progress', (e) => {
        const p = e.detail.progress
        loadingProgressBar.style.setProperty(
          '--figni-viewer-progress',
          `${Math.ceil(p * 100)}%`
        )
      })
      this.addEventListener('load', () => {
        this.#hideLoadingPanel()
        this.openTipsPanel(TIPS.AR)
      })
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
      reloadButton.innerText = translate('reload')
      reloadButton.classList.add('figni-viewer-error-reload-button')
      reloadButton.addEventListener('click', () => {
        this.base.loadModel(this.itemId, this.token, this.modelTag)
      })
      this.#errorPanel.appendChild(reloadButton)
      this.appendChild(this.#errorPanel)
    } else {
      this.#errorPanel.querySelector('.figni-viewer-error-text').innerText =
        message
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
      this.base.appendChild(this.#toggleVisibleHotspotButton)
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
      this.base.appendChild(this.#downloadScreenshotButton)
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
      this.#helpButton = document.createElement('div')
      this.#helpButton.innerHTML = `${SVG_HELP_ICON}<span>${translate(
        'help.button'
      )}</span>`
      this.#helpButton.classList.add('figni-viewer-help-button')
      this.#helpButton.addEventListener('click', () => {
        if (
          this.#helpPanelBase.classList.contains(
            'figni-viewer-help-panel-hidden'
          )
        ) {
          this.openHelpPanel()
        } else {
          this.closeHelpPanel()
        }
      })
      this.base.appendChild(this.#helpButton)
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

  #createOrGetHelpTopPage() {
    if (!this.#helpTopPage) {
      this.#helpTopPage = document.createElement('div')
      this.#helpTopPage.classList.add('figni-viewer-help-page-base')
      const page = document.createElement('div')
      page.classList.add('figni-viewer-help-page')
      this.#helpTopPage.appendChild(page)
      // ページタイトル
      const title = document.createElement('h3')
      title.innerText = translate('help.title')
      page.appendChild(title)
      // ページアイテムを包含するdivを追加
      const helpItemContainer = document.createElement('div')
      helpItemContainer.classList.add('figni-viewer-help-page-item-container')
      page.appendChild(helpItemContainer)
      // ボタンを生成する関数を設定
      const createButton = (text, animation, link) => {
        // ボタンを追加
        const helpBtn = document.createElement('div')
        page.appendChild(helpBtn)
        helpBtn.classList.add('figni-viewer-help-page-btn')
        // アニメーションのホルダーを追加
        const animationHolder = document.createElement('div')
        animationHolder.classList.add('figni-viewer-help-page-animation-holder')
        helpBtn.appendChild(animationHolder)
        Lottie.loadAnimation({
          container: animationHolder,
          renderer: 'svg',
          loop: true,
          autoplay: true,
          animationData: animation,
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
        btnArrow.style.height = '1.25em'
        titleHolder.appendChild(btnArrow)
        // クリックイベントを設定
        helpBtn.onclick = () => {
          this.openHelpPanel(link)
        }
        helpItemContainer.appendChild(helpBtn)
      }
      createButton(
        translate('help.pages.content.title'),
        THREED_CONTROL,
        HELP.CONTENT
      )
      createButton(
        translate('help.pages.highlight.title'),
        THREED_HIGHLIGHT,
        HELP.HIGHLIGHT
      )
      createButton(translate('help.pages.ar.title'), AR_SCAN, HELP.AR)
      const unknownBtn = document.createElement('div')
      unknownBtn.classList.add(
        'figni-viewer-help-page-btn',
        'figni-viewer-help-page-unknown-btn'
      )
      const btnIcon = document.createElement('span')
      btnIcon.innerHTML = SVG_HELP_UNKNOWN_ICON
      btnIcon.style.height = '1.75em'
      unknownBtn.appendChild(btnIcon)
      const btnText = document.createElement('h4')
      unknownBtn.appendChild(btnText)
      btnText.innerText = translate('help.pages.unknown.title')
      unknownBtn.onclick = () => {
        this.openHelpPanel(HELP.UNKNOWN)
      }
      page.appendChild(unknownBtn)
      // フッターの追加
      const footer = document.createElement('div')
      footer.classList.add('figni-viewer-help-page-item-footer')
      // Powered byの追加
      const powered = document.createElement('small')
      powered.innerText = 'Powered by'
      footer.appendChild(powered)
      // Figniロゴの追加
      const figniLogo = document.createElement('a')
      figniLogo.setAttribute('href', 'https://figni.io/')
      figniLogo.setAttribute('target', '_blank')
      figniLogo.innerHTML = SVG_FIGNI_LOGO
      figniLogo.style.display = 'block'
      figniLogo.style.width = '3em'
      footer.appendChild(figniLogo)
      page.appendChild(footer)
    }
    return this.#helpTopPage
  }
  #createHelpItem(animation, stepNum, title, description) {
    const item = document.createElement('div')
    item.classList.add('figni-viewer-help-page-item')
    if (animation !== null) {
      // アニメーションホルダーを追加
      const animationHolder = document.createElement('div')
      animationHolder.classList.add(
        'figni-viewer-help-page-item-animation-holder'
      )
      item.appendChild(animationHolder)
      Lottie.loadAnimation({
        container: animationHolder,
        renderer: 'svg',
        loop: true,
        autoplay: true,
        animationData: animation,
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

  #createOrGetHelpContentPage() {
    if (!this.#helpContentPage) {
      this.#helpContentPage = document.createElement('div')
      this.#helpContentPage.classList.add('figni-viewer-help-page-base')
      const page = document.createElement('div')
      page.classList.add('figni-viewer-help-page')
      this.#helpContentPage.appendChild(page)
      const title = document.createElement('h3')
      title.innerText = translate('help.pages.content.title')
      page.appendChild(title)
      const helpItemContainer = document.createElement('div')
      helpItemContainer.classList.add('figni-viewer-help-page-item-container')
      page.appendChild(helpItemContainer)
      helpItemContainer.appendChild(
        this.#createHelpItem(
          THREED_CONTROL,
          1,
          translate('help.pages.content.step1.title'),
          translate('help.pages.content.step1.text')
        )
      )
      helpItemContainer.appendChild(
        this.#createHelpItem(
          THREED_ZOOM,
          2,
          translate('help.pages.content.step2.title'),
          translate('help.pages.content.step2.text')
        )
      )
      const unknownBtn = document.createElement('div')
      unknownBtn.classList.add('figni-viewer-help-page-unknown-btn')
      const btnIcon = document.createElement('span')
      btnIcon.innerHTML = SVG_HELP_UNKNOWN_ICON
      btnIcon.style.height = '1.75em'
      unknownBtn.appendChild(btnIcon)
      const btnText = document.createElement('h4')
      unknownBtn.appendChild(btnText)
      btnText.innerText = translate('help.pages.unknown.title')
      // クリックイベントを設定
      unknownBtn.onclick = () => {
        this.openHelpPanel(HELP.UNKNOWN)
      }
      page.appendChild(unknownBtn)
      const backBtn = document.createElement('div')
      backBtn.classList.add('figni-viewer-help-page-item-back-btn')
      backBtn.innerHTML = `${SVG_HELP_BACK}<span>${translate(
        'help.back'
      )}</span>`
      backBtn.onclick = () => {
        this.backHelpPanel()
      }
      page.appendChild(backBtn)
    }
    return this.#helpContentPage
  }

  #createOrGetHelpHighlightPage() {
    if (!this.#helpHighlightPage) {
      this.#helpHighlightPage = document.createElement('div')
      this.#helpHighlightPage.classList.add('figni-viewer-help-page-base')
      const page = document.createElement('div')
      page.classList.add('figni-viewer-help-page')
      this.#helpHighlightPage.appendChild(page)
      const title = document.createElement('h3')
      title.innerText = translate('help.pages.highlight.title')
      page.appendChild(title)
      const helpItemContainer = document.createElement('div')
      helpItemContainer.classList.add('figni-viewer-help-page-item-container')
      page.appendChild(helpItemContainer)
      helpItemContainer.appendChild(
        this.#createHelpItem(
          THREED_HIGHLIGHT,
          1,
          translate('help.pages.highlight.step1.title'),
          translate('help.pages.highlight.step1.text')
        )
      )
      helpItemContainer.appendChild(
        this.#createHelpItem(
          null,
          2,
          translate('help.pages.highlight.step2.title'),
          translate('help.pages.highlight.step2.text')
        )
      )
      const unknownBtn = document.createElement('div')
      unknownBtn.classList.add('figni-viewer-help-page-unknown-btn')
      const btnIcon = document.createElement('span')
      btnIcon.innerHTML = SVG_HELP_UNKNOWN_ICON
      btnIcon.style.height = '1.75em'
      unknownBtn.appendChild(btnIcon)
      const btnText = document.createElement('h4')
      unknownBtn.appendChild(btnText)
      btnText.innerText = translate('help.pages.unknown.title')
      unknownBtn.onclick = () => {
        this.openHelpPanel(HELP.UNKNOWN)
      }
      page.appendChild(unknownBtn)
      const backBtn = document.createElement('div')
      backBtn.classList.add('figni-viewer-help-page-item-back-btn')
      backBtn.innerHTML = `${SVG_HELP_BACK}<span>${translate(
        'help.back'
      )}</span>`
      backBtn.onclick = () => {
        this.backHelpPanel()
      }
      page.appendChild(backBtn)
    }
    return this.#helpHighlightPage
  }

  #createOrGetHelpArPage() {
    if (!this.#helpArPage) {
      this.#helpArPage = document.createElement('div')
      this.#helpArPage.classList.add('figni-viewer-help-page-base')
      const page = document.createElement('div')
      page.classList.add('figni-viewer-help-page')
      this.#helpArPage.appendChild(page)
      const title = document.createElement('h3')
      title.innerText = translate('help.pages.ar.title')
      page.appendChild(title)
      const helpItemContainer = document.createElement('div')
      helpItemContainer.classList.add('figni-viewer-help-page-item-container')
      page.appendChild(helpItemContainer)
      helpItemContainer.appendChild(
        this.#createHelpItem(
          null,
          1,
          translate('help.pages.ar.step1.title'),
          translate('help.pages.ar.step1.text')
        )
      )
      helpItemContainer.appendChild(
        this.#createHelpItem(
          AR_SCAN,
          2,
          translate('help.pages.ar.step2.title'),
          translate('help.pages.ar.step2.text')
        )
      )
      helpItemContainer.appendChild(
        this.#createHelpItem(
          AR_CONTROL,
          3,
          translate('help.pages.ar.step3.title'),
          translate('help.pages.ar.step3.text')
        )
      )
      helpItemContainer.appendChild(
        this.#createHelpItem(
          AR_ROTATE,
          4,
          translate('help.pages.ar.step4.title'),
          translate('help.pages.ar.step4.text')
        )
      )
      const unknownBtn = document.createElement('div')
      unknownBtn.classList.add('figni-viewer-help-page-unknown-btn')
      const btnIcon = document.createElement('span')
      btnIcon.innerHTML = SVG_HELP_UNKNOWN_ICON
      btnIcon.style.height = '1.75em'
      unknownBtn.appendChild(btnIcon)
      const btnText = document.createElement('h4')
      unknownBtn.appendChild(btnText)
      btnText.innerText = translate('help.pages.unknown.title')
      unknownBtn.onclick = () => {
        this.openHelpPanel(HELP.UNKNOWN)
      }
      page.appendChild(unknownBtn)
      const backBtn = document.createElement('div')
      backBtn.classList.add('figni-viewer-help-page-item-back-btn')
      backBtn.innerHTML = `${SVG_HELP_BACK}<span>${translate(
        'help.back'
      )}</span>`
      backBtn.onclick = () => {
        this.backHelpPanel()
      }
      page.appendChild(backBtn)
    }
    return this.#helpArPage
  }
  #createHelpUnknownItem(title, description) {
    const item = document.createElement('div')
    item.classList.add('figni-viewer-help-page-item')
    const itemTitle = document.createElement('h5')
    itemTitle.innerText = title
    itemTitle.classList.add('figni-viewer-help-page-item-title')
    item.appendChild(itemTitle)
    const itemDescription = document.createElement('p')
    itemDescription.classList.add('figni-viewer-help-page-item-description')
    itemDescription.innerText = description
    item.appendChild(itemDescription)
    return item
  }

  #createOrGetHelpUnknownPage() {
    if (!this.#helpUnknownPage) {
      this.#helpUnknownPage = document.createElement('div')
      this.#helpUnknownPage.classList.add('figni-viewer-help-page-base')
      const page = document.createElement('div')
      page.classList.add('figni-viewer-help-page')
      this.#helpUnknownPage.appendChild(page)
      const title = document.createElement('h3')
      title.innerText = translate('help.pages.unknown.title')
      page.appendChild(title)
      const helpItemContainer = document.createElement('div')
      helpItemContainer.classList.add('figni-viewer-help-page-item-container')
      page.appendChild(helpItemContainer)
      helpItemContainer.appendChild(
        this.#createHelpUnknownItem(
          translate('help.pages.unknown.step1.title'),
          translate('help.pages.unknown.step1.text')
        )
      )
      helpItemContainer.appendChild(
        this.#createHelpUnknownItem(
          translate('help.pages.unknown.step2.title'),
          translate('help.pages.unknown.step2.text')
        )
      )
      helpItemContainer.appendChild(
        this.#createHelpUnknownItem(
          translate('help.pages.unknown.step3.title'),
          translate('help.pages.unknown.step3.text')
        )
      )
      const backBtn = document.createElement('div')
      backBtn.classList.add('figni-viewer-help-page-item-back-btn')
      backBtn.innerHTML = `${SVG_HELP_BACK}<span>${translate(
        'help.back'
      )}</span>`
      backBtn.onclick = () => {
        this.backHelpPanel()
      }
      page.appendChild(backBtn)
    }
    return this.#helpUnknownPage
  }

  #showTipsPanel() {
    if (!this.#tipsPanel) {
      this.#tipsPanel = document.createElement('div')
      this.#tipsPanel.classList.add('figni-viewer-tips-panel')
      this.#tipsPanel.classList.add('figni-viewer-tips-panel-hidden')
      const content = document.createElement('div')
      content.classList.add('figni-viewer-tips-panel-content')
      this.#tipsPanel.appendChild(content)
      const text = document.createElement('p')
      text.classList.add('figni-viewer-tips-panel-text')
      content.appendChild(text)
      const animation = document.createElement('div')
      animation.classList.add('figni-viewer-tips-panel-animation')
      this.#tipsPanel.appendChild(animation)
      this.base.appendChild(this.#tipsPanel)
    }
  }

  #temporaryHideHotspot(name, hotspot) {
    if (this.#tempHidedHotspot && this.#tempHidedHotspot.name !== name) {
      this.#showTemporaryHidedHotspot()
    }

    // 一時保存
    this.#tempHidedHotspot = {
      name: name,
      target: hotspot,
      text: [],
    }

    hotspot.childNodes.forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE) {
        this.#tempHidedHotspot.text.push(child.nodeValue)
        child.nodeValue = ''
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        if (!(child.getAttribute('slot') ?? '').match(/^panel/)) {
          child.style.display = 'none'
        }
      }
    })

    if (!this.#closeHotspotButton) {
      this.#closeHotspotButton = document.createElement('div')
      this.#closeHotspotButton.classList.add(
        'figni-viewer-hotspot-close-button'
      )
      this.#closeHotspotButton.innerHTML = SVG_CLOSE_ICON
    }
    hotspot.appendChild(this.#closeHotspotButton)
  }
  #showTemporaryHidedHotspot() {
    if (this.#tempHidedHotspot) {
      this.#tempHidedHotspot.target.removeChild(this.#closeHotspotButton)
      this.#tempHidedHotspot.target.childNodes.forEach((child) => {
        if (child.nodeType === Node.TEXT_NODE) {
          child.nodeValue = this.#tempHidedHotspot.text.shift()
        } else if (child.nodeType === Node.ELEMENT_NODE) {
          child.style.display = ''
        }
      })
      this.#tempHidedHotspot = null
    }
  }

  /**
   * WebSocketでサーバーに送信するデータを変更または追加する
   * @param {string} key キー
   * @param {any} value 値
   * @param {"set"|"add"|"sub"|"delete"} action 操作
   */
  updateCustomData(key, value, action) {
    try {
      this.base.updateCustomData(key, value, action)
    } catch (e) {
      console.error(e)
    }
  }
}
