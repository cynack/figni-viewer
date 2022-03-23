import axios from 'axios'
import { getErrorMessage } from './error'
import { ModelViewerElement } from './model-viewer'
import './style.scss'
import {
  SVG_AR_BUTTON,
  SVG_DOWNLOAD_SCREENSHOT_BUTTON,
  SVG_ERROR_ICON,
  SVG_LOADING_CUBE,
  SVG_TOGGLE_VISIBLE_HOTSPOT_BUTTON_OFF,
  SVG_TOGGLE_VISIBLE_HOTSPOT_BUTTON_ON,
} from './svg'

const VIEW_THRESHOLD = 0.7

export class FigniViewerElement extends ModelViewerElement {
  static #FIGNI_OBSERBED_ATTRIBUTES = {
    MODEL: ['item-id', 'token', 'model-tag'],
    TOOL: ['screenshot', 'toggle-caption'],
  }

  static #DEFAULT_CAMERA_TARGET = 'auto auto auto'
  static #DEFAULT_CAMERA_ORBIT = '0deg 75deg 105%'
  static #DEFAULT_HOTSPOT_POSITION = '0m 0m 0m'
  static #DEFAULT_HOTSPOT_NORMAL = '0m 1m 0m'
  static #DEFAULT_PANEL_PLACE = 'left middle'

  static #MAX_CAMERA_ORBIT = 'auto 180deg 200%'
  static #MIN_CAMERA_ORBIT = 'auto 0deg auto'

  // 公開する値
  itemId
  token
  modelTag
  loop = false
  state = ''

  // 内部で使う値
  #initCameraTarget = ''
  #initCameraOrbit = ''
  #visibleAllHotspots = true
  #events = {}
  #nextState

  // 利用データ
  #ws
  #initTime = 0
  #initModelTime = Infinity
  #initArViewTime = Infinity
  #appearedTime = 0
  #sumViewTime = 0
  #wasInViewport = false
  #arCount = 0
  #hotspotClickCount = {}
  #animationPlayCount = {}

  // HTML要素
  #initCameraButton
  #downloadScreenshotButton
  #toggleVisibleHotspotButton
  #loadingPanel
  #errorPanel

  #panels = []
  #hotspots = []

  async initializeDataConnection() {
    if (this.#ws) {
      this.#ws.close()
    }

    const { data } = await axios.get(`${API_BASE}/config`, {
      headers: {
        'X-Figni-Client-Token': this.token,
      },
    })

    if (data?.analytics) {
      this.#ws = new WebSocket(WEBSOCKET_BASE)

      this.#initTime = performance.now()
      this.#wasInViewport = this.#isInViewport
      if (this.#isInViewport) {
        this.#appearedTime = performance.now()
      }

      setInterval(() => {
        this.#ws.send(
          JSON.stringify({
            item_id: this.itemId,
            client_token: this.token,
            client_version: VERSION,
            stay_time: this.#stayTime,
            view_time: this.#viewTime,
            model_view_time: this.#modelViewTime,
            ar_count: this.#arCount,
            ar_view_time: this.#arViewTime,
            hotspot_click: this.#hotspotClickCount,
            animation_play: this.#animationPlayCount,
          })
        )
      }, 1000)

      window.addEventListener('scroll', () => {
        if (!this.#wasInViewport && this.#isInViewport) {
          this.#appearedTime = performance.now()
        } else if (this.#wasInViewport && !this.#isInViewport) {
          this.#sumViewTime += performance.now() - this.#appearedTime
        }
        this.#wasInViewport = this.#isInViewport
      })
    }
  }

  async connectedCallback() {
    super.connectedCallback()

    // 輪郭線を削除
    this.shadowRoot
      .querySelectorAll(':not(style[outline="none"])')
      .forEach((d) => (d.style.outline = 'none'))

    // model-viewerのセットアップ
    this.loading = 'lazy'
    this.cameraControls = true
    this.ar = true
    this.arModes = 'webxr scene-viewer quick-look'
    this.arScale = 'fixed'
    this.arPlacement = 'floor'
    this.interactionPrompt = 'auto'
    this.shadowIntensity = 1
    this.minimumRenderScale = 0.25
    this.maxCameraOrbit = FigniViewerElement.#MAX_CAMERA_ORBIT
    this.minCameraOrbit = FigniViewerElement.#MIN_CAMERA_ORBIT

    this.itemId = this.getAttribute('item-id')
    this.token = this.getAttribute('token')
    this.modelTag = this.getAttribute('model-tag') || ''

    this.#initCameraTarget =
      this.getAttribute('target') || FigniViewerElement.#DEFAULT_CAMERA_TARGET
    this.#initCameraOrbit =
      this.getAttribute('orbit') || FigniViewerElement.#DEFAULT_CAMERA_ORBIT
    this.state = this.getAttribute('state') || this.state

    const arButton = document.createElement('button')
    arButton.setAttribute('slot', 'ar-button')
    arButton.innerHTML = `${SVG_AR_BUTTON}<span>目の前に置く</span>`
    arButton.classList.add('figni-viewer-ar-button')
    arButton.addEventListener('click', () => {
      this.#arCount++
      this.#initArViewTime = performance.now()
    })
    this.appendChild(arButton)

    this.animationCrossfadeDuration = 0
    const hotspots = this.querySelectorAll('[slot^="hotspot"]')
    this.#hotspots = Array.from(hotspots)
    hotspots.forEach((hotspot) => {
      this.#modifyHotspot(hotspot)
    })

    this.#requestModel()
    this.setCameraTarget(this.#initCameraTarget)
    this.setCameraOrbit(this.#initCameraOrbit)
    this.#disableInitCameraButton()
    this.updateState(this.state)
    this.closeAllPanels()

    const observer = new MutationObserver((mutationList) => {
      for (const mutation of mutationList) {
        if (mutation.type == 'childList') {
          for (const node of mutation.addedNodes) {
            if (typeof node == 'element') {
              if (/^hotspot/.test(node.getAttribute('slot'))) {
                this.#hotspots.push(node)
                this.#modifyHotspot(node)
                this.updateState(this.state)
              }
            }
          }
          for (const node of mutation.removedNodes) {
            if (typeof node == 'element') {
              if (/^hotspot/.test(node.getAttribute('slot'))) {
                const index = this.#hotspots.indexOf(node)
                if (index > -1) {
                  this.#hotspots.splice(index, 1)
                }
                if (this.#hotspots.length == 0) {
                  this.#disableToggleVisibleHotspotButton()
                }
              }
            }
          }
        }
      }
    })
    observer.observe(this, {
      childList: true,
      attributes: false,
    })

    // * デバッグ用
    if (this.getAttribute('debug-hotspot') == '') {
      this.addEventListener(
        'mousedown',
        (eve) => {
          const hit = this.positionAndNormalFromPoint(eve.clientX, eve.clientY)
          console.log(hit)
        },
        true
      )
    }

    await this.initializeDataConnection()
  }

  static get observedAttributes() {
    return super.observedAttributes.concat(
      FigniViewerElement.#FIGNI_OBSERBED_ATTRIBUTES.MODEL,
      FigniViewerElement.#FIGNI_OBSERBED_ATTRIBUTES.TOOL
    )
  }

  async attributeChangedCallback(name, oldValue, newValue) {
    super.attributeChangedCallback(name, oldValue, newValue)
    if (oldValue != newValue) {
      if (FigniViewerElement.#FIGNI_OBSERBED_ATTRIBUTES.MODEL.includes(name)) {
        switch (name) {
          case 'item-id':
            this.itemId = newValue
            break
          case 'token':
            this.token = newValue
            break
          case 'model-tag':
            this.modelTag = newValue
            break
        }
        if (oldValue !== null) {
          this.#requestModel()
        }
      } else if (
        FigniViewerElement.#FIGNI_OBSERBED_ATTRIBUTES.TOOL.includes(name)
      ) {
        switch (name) {
          case 'screenshot': {
            if (newValue == '') {
              this.#enableDownloadScreenshotButton()
            } else {
              this.#disableDownloadScreenshotButton()
            }
            break
          }
          case 'toggle-caption': {
            if (newValue == '') {
              this.#enableToggleVisibleHotspotButton()
            } else {
              this.#enableToggleVisibleHotspotButton()
            }
            break
          }
        }
      }
    }
  }

  async #requestModel() {
    if (this.itemId && this.token) {
      this.#disableErrorPanel()
      const tag = this.modelTag ? `?tag=${this.modelTag}` : ''
      try {
        const res = await axios.get(
          `${API_BASE}/item/${this.itemId}/model_search${tag}`,
          {
            headers: {
              accept: 'application/json',
              'X-Figni-Client-Token': this.token,
              'X-Figni-Client-Version': VERSION,
            },
          }
        )
        const glb = res.data.filter((item) => item.format == 'glb')
        if (glb.length > 0) {
          this.src = glb[0].url
        }
        const usdz = res.data.filter((item) => item.format == 'usdz')
        if (usdz.length > 0) {
          this.iosSrc = usdz[0].url
        } else {
          this.iosSrc = ''
        }
        this.#enableLoadingPanel()
      } catch (e) {
        this.#enableErrorPanel(getErrorMessage(e))
      }
    } else {
      throw new ReferenceError('item-id or token is not set.')
    }
  }

  setCameraOrbit(orbit) {
    if (this.cameraOrbit !== orbit) {
      this.#enableInitCameraButton()
    }
    this.cameraOrbit = orbit
  }

  setCameraTarget(target) {
    if (this.cameraTarget !== target) {
      this.#enableInitCameraButton()
    }
    this.cameraTarget = target
  }

  resetCameraTargetAndOrbit() {
    this.setCameraTarget(this.#initCameraTarget)
    this.setCameraOrbit(this.#initCameraOrbit)
    this.closeAllPanels()
    this.#disableInitCameraButton()
  }

  closeAllPanels(excludePanels = []) {
    this.#panels.forEach((panel) => {
      if (!excludePanels.includes(panel)) {
        panel.classList.add('figni-viewer-panel-hide')
      }
    })
  }

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

  async downloadScreenshot() {
    const blob = await this.toBlob({
      idealAspect: true,
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'model.png'
    a.click()
    URL.revokeObjectURL(url)
  }

  async addHotspot(name, position = null, normal = null, options = null) {
    if (!name) {
      throw new SyntaxError('name is required')
    }
    const existHotspot = this.querySelector(`[slot="hotspot-${name}"]`)
    if (existHotspot) {
      throw new Error(`Hotspot ${name} was already exists`)
    }
    const hotspot = document.createElement('button')
    hotspot.setAttribute(
      'position',
      position || FigniViewerElement.#DEFAULT_HOTSPOT_POSITION
    )
    if (normal) {
      hotspot.setAttribute(
        'normal',
        normal || FigniViewerElement.#DEFAULT_HOTSPOT_NORMAL
      )
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
    this.appendChild(hotspot)

    await this.updateComplete
    this.#modifyHotspot(hotspot)
    this.updateState(this.state)
  }

  async editHotspot(name, position = null, normal = null, options = null) {
    if (!name) {
      throw new SyntaxError('name is required')
    }
    const hotspot = this.querySelector(`[slot="hotspot-${name}"]`)
    if (!hotspot) {
      throw new ReferenceError(`Hotspot ${name} not found`)
    }
    if (position) {
      hotspot.setAttribute(
        'position',
        position || FigniViewerElement.#DEFAULT_HOTSPOT_POSITION
      )
    }
    if (normal) {
      hotspot.setAttribute(
        'normal',
        normal || FigniViewerElement.#DEFAULT_HOTSPOT_NORMAL
      )
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

  removeHotspot(name) {
    const hotspot = this.querySelector(`[slot="hotspot-${name}"]`)
    hotspot?.remove()
  }

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

  #modifyHotspot(hotspot) {
    hotspot.classList.add('figni-viewer-hotspot')

    hotspot.setAttribute(
      'position',
      hotspot.getAttribute('position') ||
        FigniViewerElement.#DEFAULT_HOTSPOT_POSITION
    )
    if (hotspot.getAttribute('normal')) {
      this.updateHotspot({
        name: hotspot.getAttribute('slot'),
        position: hotspot.getAttribute('position'),
        normal: hotspot.getAttribute('normal'),
      })
    } else {
      hotspot.classList.add('figni-viewer-hotspot-no-normal')
      this.updateHotspot({
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

    hotspot.removeEventListener('click', this.#events[`${name}-data`])
    const ce = () => {
      if (this.#clickableHotspot(hotspot)) {
        this.#hotspotClickCount[name] = (this.#hotspotClickCount[name] || 0) + 1
      }
    }
    hotspot.addEventListener('click', ce)

    if (isAnime) {
      hotspot.removeEventListener('click', this.#events[`${name}-anime`])
      const e = () => {
        if (this.#clickableHotspot(hotspot)) {
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
      hotspot.addEventListener('click', e)
      this.#events[`${name}-anime`] = e
    }
    if (isCloseup) {
      hotspot.removeEventListener('click', this.#events[`${name}-closeup`])
      const e = () => {
        if (this.#clickableHotspot(hotspot)) {
          const target =
            hotspot.getAttribute('target') ||
            hotspot.getAttribute('position') ||
            FigniViewerElement.#DEFAULT_HOTSPOT_POSITION
          const orbit = hotspot.getAttribute('orbit') || this.#initCameraOrbit
          if (this.cameraTarget == target && this.cameraOrbit == orbit) {
            this.setCameraTarget(this.#initCameraTarget)
            this.setCameraOrbit(this.#initCameraOrbit)
            this.#disableInitCameraButton()
          } else {
            this.setCameraTarget(target)
            this.setCameraOrbit(orbit)
          }
        }
      }
      hotspot.addEventListener('click', e)
      this.#events[`${name}-closeup`] = e
    }
    if (!isAnime && isVisible) {
      const state = hotspot.getAttribute('to-state')
      hotspot.removeEventListener(
        'click',
        this.#events[`${hotspot.getAttribute('slot')}-visible`]
      )
      const e = () => {
        if (this.#clickableHotspot(hotspot)) {
          this.updateState(state)
        }
      }
      hotspot.addEventListener('click', e)
      this.#events[`${name}-visible`] = e
    }

    const panels = hotspot.querySelectorAll('[slot^="panel"]')
    this.#panels.push(...Array.from(panels))
    this.#panels.forEach((panel) => {
      this.#modifyPanel(panel)
    })

    hotspot.removeEventListener('click', this.#events[`${name}-panel`])
    const e = () => {
      if (this.#clickableHotspot(hotspot)) {
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
          this.closeAllPanels(Array.from(panels))
        }
      }
    }
    hotspot.addEventListener('click', e)
    this.#events[`${name}-panel`] = e
  }

  #clickableHotspot(hotspot) {
    return window.getComputedStyle(hotspot).opacity > 0.5
  }

  #modifyPanel(panel) {
    panel.classList.add('figni-viewer-panel')
    const place =
      panel.getAttribute('place') || FigniViewerElement.#DEFAULT_PANEL_PLACE
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

  #enableInitCameraButton() {
    if (!this.#initCameraButton) {
      this.#initCameraButton = document.createElement('button')
      this.#initCameraButton.classList.add('figni-viewer-init-camera-btn')
      this.#initCameraButton.innerText = 'カメラ位置を戻す'
      this.#initCameraButton.addEventListener('click', () =>
        this.resetCameraTargetAndOrbit()
      )
      this.appendChild(this.#initCameraButton)
    } else {
      this.#initCameraButton.style.display = 'block'
    }
  }

  #disableInitCameraButton() {
    if (this.#initCameraButton) {
      this.#initCameraButton.style.display = 'none'
    }
  }

  #enableDownloadScreenshotButton() {
    if (!this.#downloadScreenshotButton) {
      this.#downloadScreenshotButton = document.createElement('button')
      this.#downloadScreenshotButton.classList.add(
        'figni-viewer-download-screenshot-btn'
      )
      this.#downloadScreenshotButton.innerHTML = SVG_DOWNLOAD_SCREENSHOT_BUTTON
      this.#downloadScreenshotButton.addEventListener('click', () => {
        this.downloadScreenshot()
      })
      this.appendChild(this.#downloadScreenshotButton)
    } else {
      this.#downloadScreenshotButton.style.display = 'block'
    }
  }

  #disableDownloadScreenshotButton() {
    if (this.#downloadScreenshotButton) {
      this.#downloadScreenshotButton.style.display = 'none'
    }
  }

  #enableToggleVisibleHotspotButton() {
    if (!this.#toggleVisibleHotspotButton) {
      this.#toggleVisibleHotspotButton = document.createElement('button')
      this.#toggleVisibleHotspotButton.classList.add(
        'figni-viewer-toggle-visible-hotspot-btn'
      )
      this.#toggleVisibleHotspotButton.addEventListener('click', () => {
        this.#visibleAllHotspots = !this.#visibleAllHotspots
        this.toggleVisibleHotspot(this.#visibleAllHotspots)
      })
      this.toggleVisibleHotspot(this.#visibleAllHotspots)
      this.appendChild(this.#toggleVisibleHotspotButton)
    } else {
      this.#toggleVisibleHotspotButton.style.display = 'block'
    }
  }

  #disableToggleVisibleHotspotButton() {
    if (this.#toggleVisibleHotspotButton) {
      this.#toggleVisibleHotspotButton.style.display = 'none'
    }
  }

  #enableLoadingPanel() {
    if (!this.#loadingPanel) {
      this.#loadingPanel = document.createElement('div')
      this.#loadingPanel.classList.add('figni-viewer-loading-panel')
      this.#loadingPanel.setAttribute('slot', 'progress-bar')
      // ローディングアニメ
      const loadingAnimation = document.createElement('div')
      loadingAnimation.classList.add('figni-viewer-loading-animation')
      const loadingAnimationCubes = document.createElement('div')
      loadingAnimationCubes.classList.add(
        'figni-viewer-loading-animation-cubes'
      )
      for (let i = 0; i < 4; i++) {
        const cube = document.createElement('div')
        cube.innerHTML = SVG_LOADING_CUBE
        cube.classList.add('figni-viewer-loading-animation-cube')
        cube.classList.add(`figni-viewer-loading-animation-cube${i + 1}`)
        loadingAnimationCubes.appendChild(cube)
      }
      loadingAnimation.appendChild(loadingAnimationCubes)
      this.#loadingPanel.appendChild(loadingAnimation)
      // プログレスバー
      const loadingProgressBarBase = document.createElement('span')
      loadingProgressBarBase.classList.add(
        'figni-viewer-loading-progress-bar-base'
      )
      const loadingProgressBar = document.createElement('span')
      loadingProgressBar.classList.add('figni-viewer-loading-progress-bar')
      loadingProgressBarBase.appendChild(loadingProgressBar)
      this.#loadingPanel.appendChild(loadingProgressBarBase)
      // ローディングテキスト
      const loadingText = document.createElement('span')
      loadingText.innerText = 'LOADING'
      loadingText.classList.add('figni-viewer-loading-text')
      this.#loadingPanel.appendChild(loadingText)
      this.appendChild(this.#loadingPanel)
      this.addEventListener('progress', (e) => {
        const p = e.detail.totalProgress
        loadingProgressBar.style.setProperty(
          '--progress-bar-width',
          `${Math.ceil(p * 100)}%`
        )
        if (p === 1) {
          this.#initModelTime = performance.now()
          this.#disableLoadingPanel()
        }
      })
    } else {
      this.#loadingPanel.style.display = ''
    }
  }

  #disableLoadingPanel() {
    if (this.#loadingPanel) {
      this.#loadingPanel.style.display = 'none'
    }
  }

  #enableErrorPanel(message) {
    if (!this.#errorPanel) {
      this.#errorPanel = document.createElement('div')
      this.#errorPanel.classList.add('figni-viewer-error-panel')
      // エラーアイコン
      const icon = document.createElement('div')
      icon.innerHTML = SVG_ERROR_ICON
      icon.classList.add('figni-viewer-error-icon')
      this.#errorPanel.appendChild(icon)
      // エラーテキスト
      const errorText = document.createElement('span')
      errorText.innerText = message
      errorText.classList.add('figni-viewer-error-text')
      this.#errorPanel.appendChild(errorText)
      this.appendChild(this.#errorPanel)
      // 再読み込みボタン
      const errorReload = document.createElement('span')
      errorReload.innerText = '再読み込み'
      errorReload.classList.add('figni-viewer-error-reload')
      errorReload.addEventListener('click', () => {
        this.#requestModel()
      })
      this.#errorPanel.appendChild(errorReload)
      this.appendChild(this.#errorPanel)
    } else {
      this.#errorPanel.style.display = ''
    }
  }

  #disableErrorPanel() {
    if (this.#errorPanel) {
      this.#errorPanel.style.display = 'none'
    }
  }

  /**
   * アニメーションを再生する
   * @param {string} clip 再生するアニメーション名
   * @param {{ loopCount: number, reverse: boolean, toState: string, onStart: Function, onEnd: Function }} options オプション
   */
  async playAnimation(clip = null, options = {}) {
    if (!clip) {
      if (this.availableAnimations.length > 0) {
        clip = this.availableAnimations[0]
      }
    }
    if (clip == null) {
      throw new ReferenceError(`${clip} should be specified`)
    }
    if (!this.availableAnimations.includes(clip)) {
      throw new ReferenceError(`${clip} is not available`)
    }
    if (this.timeScale === 0) {
      throw new RangeError(`Animation timeScale is 0`)
    }
    if (this.paused || this.loop) {
      this.animationName = clip
      this.currentTime = 0
      await this.updateComplete
      if (options.onStart) {
        if (typeof options.onStart === 'function') {
          options.onStart()
        } else {
          throw new TypeError('onStart must be a function')
        }
      }
      const loopCount = options.loopCount || 1
      this.loop = loopCount === Infinity
      if (!this.loop) {
        this.toggleVisibleHotspot(false)
      }
      if (options.reverse === true) {
        this.timeScale = -this.timeScale
      }
      if (this.timeScale < 0) {
        this.play({ repetitions: loopCount + 1 })
        this.addEventListener('loop', () => {
          this.play({ repetitions: loopCount })
        })
      } else {
        this.play({ repetitions: loopCount })
      }
      const onFinishFunc = () => {
        if (!this.loop) {
          if (options.onEnd) {
            if (typeof options.onEnd === 'function') {
              options.onEnd()
            } else {
              throw new TypeError('onEnd must be a function')
            }
          }
          this.toggleVisibleHotspot(true)
        }
        if (options.toState) {
          this.updateState(options.toState)
        }
        if (options.reverse === true) {
          this.timeScale = -this.timeScale
        }
      }
      if (!this.loop) {
        this.addEventListener('finished', onFinishFunc, { once: true })
      } else {
        onFinishFunc()
      }
      this.#animationPlayCount[clip] = (this.#animationPlayCount[clip] || 0) + 1
    }
  }

  stopAnimation() {
    this.pause()
    if (this.#nextState) {
      this.updateState(this.#nextState)
    }
  }

  get #isInViewport() {
    const rect = this.getBoundingClientRect()
    const area = rect.width * rect.height
    const viewArea =
      (Math.max(
        Math.min(
          rect.bottom,
          window.innerHeight || document.documentElement.clientHeight
        ),
        0
      ) -
        Math.min(
          Math.max(rect.top, 0),
          window.innerHeight || document.documentElement.clientHeight
        )) *
      (Math.max(
        Math.min(
          rect.right,
          window.innerWidth || document.documentElement.clientWidth
        ),
        0
      ) -
        Math.min(
          Math.max(rect.left, 0),
          window.innerWidth || document.documentElement.clientWidth
        ))
    const ratio = viewArea / area
    return ratio > VIEW_THRESHOLD
  }

  get #stayTime() {
    return Number((performance.now() - this.#initTime).toFixed(2))
  }

  get #viewTime() {
    return Number(
      (
        this.#sumViewTime +
        (this.#isInViewport ? performance.now() - this.#appearedTime : 0)
      ).toFixed(2)
    )
  }

  get #modelViewTime() {
    return Number(
      Math.min(
        Math.max(performance.now() - this.#initTime, 0),
        this.#initModelTime
      ).toFixed(2)
    )
  }

  get #arViewTime() {
    return Number(
      Math.min(
        Math.max(performance.now() - this.#initTime, 0),
        this.#initArViewTime
      ).toFixed(2)
    )
  }
}

customElements.define('figni-viewer', FigniViewerElement)
