import { ModelViewerElement } from '@google/model-viewer'
import axios from 'axios'
import { handleError } from './error'
import './style.scss'
import {
  SVG_AR_BUTTON,
  SVG_DOWNLOAD_SCREENSHOT_BUTTON,
  SVG_LOADING_CUBE,
  SVG_TOGGLE_VISIBLE_HOTSPOT_BUTTON_OFF,
  SVG_TOGGLE_VISIBLE_HOTSPOT_BUTTON_ON,
} from './svg'

const API_BASE = 'https://api.stg.figni.io/api'
const SOCKET_BASE = 'wss://api.stg.figni.io/ws'
const VIEW_THRESHOLD = 0.7

class FigniViewerElement extends ModelViewerElement {
  static #FIGNI_OBSERBED_ATTRIBUTES = {
    MODEL: ['item-id', 'token', 'model-tag'],
    TOOL: ['screenshot'],
  }

  static #DEFAULT_CAMERA_TARGET = 'auto auto auto'
  static #DEFAULT_CAMERA_ORBIT = '0deg 75deg 105%'
  static #DEFAULT_HOTSPOT_POSITION = '0m 0m 0m'
  static #DEFAULT_HOTSPOT_NORMAL = '0m 1m 0m'
  static #DEFAULT_PANEL_PLACE = 'left middle'

  static #MAX_CAMERA_ORBIT = 'auto 180deg 200%'
  static #MIN_CAMERA_ORBIT = 'auto 0deg auto'

  itemId
  token
  modelTag

  #initCameraTarget = ''
  #initCameraOrbit = ''
  loop = false
  state = ''
  visibleHotspots = true

  #seed
  #initCameraButton
  #downloadScreenshotButton
  #toggleVisibleHotspotButton
  #progressBar
  #loadingAnimationHolder
  #loadingText
  #panels = []
  #hotspots = []
  #events = {}
  #nextState

  #ws
  #initTime = 0
  #appearedTime = 0
  #sumViewTime = 0
  #wasInViewport = false
  #hotspotClickCount = {}

  constructor() {
    super()

    window.onload = () => {
      this.#ws = new WebSocket(SOCKET_BASE)
      this.#initTime = performance.now()
      this.#wasInViewport = this.#isInViewport
      if (this.#isInViewport) {
        this.#appearedTime = performance.now()
      }
      setInterval(() => {
        this.#ws.send(
          JSON.stringify({
            client_token: this.token,
            client_version: VERSION,
            stay_time: this.#stayTime,
            view_time: this.#viewTime,
            hotspot_click: this.#hotspotClickCount,
          })
        )
      }, 1000)
    }
    window.onscroll = () => {
      if (!this.#wasInViewport && this.#isInViewport) {
        this.#appearedTime = performance.now()
      } else if (this.#wasInViewport && !this.#isInViewport) {
        this.#sumViewTime += performance.now() - this.#appearedTime
      }
      this.#wasInViewport = this.#isInViewport
    }
    this.#seed = Math.random().toString(36).substring(7)
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
    this.interactionPrompt = 'none'
    this.shadowIntensity = 1
    this.minimumRenderScale = 0.25
    this.maxCameraOrbit = FigniViewerElement.#MAX_CAMERA_ORBIT
    this.minCameraOrbit = FigniViewerElement.#MIN_CAMERA_ORBIT

    this.#loadingAnimationHolder = document.createElement('div')
    const loadingAnimation = document.createElement('div')
    const cubes = document.createElement('div')
    const progressBarHolder = document.createElement('span')
    this.#progressBar = document.createElement('span')
    this.#loadingText = document.createElement('span')
    for (let i = 0; i < 4; i++) {
      const cube = document.createElement('div')
      cube.innerHTML = SVG_LOADING_CUBE
      cube.classList.add('figni-viewer-cube')
      cube.classList.add(`figni-viewer-cube${i + 1}`)
      cubes.appendChild(cube)
    }
    this.#loadingText.innerText = 'LOADING'
    this.#loadingAnimationHolder.setAttribute('slot', 'progress-bar')
    this.#progressBar.classList.add('figni-viewer-progress-bar')
    progressBarHolder.classList.add('figni-viewer-progress-bar-holder')
    cubes.classList.add('figni-viewer-cubes')
    loadingAnimation.classList.add('figni-viewer-loading-animation')
    this.#loadingText.classList.add('figni-viewer-loading-text')
    this.#loadingAnimationHolder.classList.add(
      'figni-viewer-loading-animation-holder'
    )
    this.addEventListener('progress', (e) => {
      const p = e.detail.totalProgress
      this.#progressBar.style.setProperty(
        '--progress-bar-width',
        `${Math.ceil(p * 100)}%`
      )
      if (p === 1) {
        this.#loadingAnimationHolder.classList.add(
          'figni-viewer-loading-animation-hide'
        )
      }
    })
    progressBarHolder.appendChild(this.#progressBar)
    loadingAnimation.appendChild(cubes)
    this.#loadingAnimationHolder.appendChild(loadingAnimation)
    this.#loadingAnimationHolder.appendChild(progressBarHolder)
    this.#loadingAnimationHolder.appendChild(this.#loadingText)
    this.appendChild(this.#loadingAnimationHolder)

    // 値の取得
    this.itemId = this.getAttribute('item-id')
    this.token = this.getAttribute('token')
    this.modelTag = this.getAttribute('model-tag') || ''
    this.#requestModel()

    this.#initCameraTarget =
      this.getAttribute('target') || FigniViewerElement.#DEFAULT_CAMERA_TARGET
    this.#initCameraOrbit =
      this.getAttribute('orbit') || FigniViewerElement.#DEFAULT_CAMERA_ORBIT
    this.state = this.getAttribute('state') || this.state
    this.setCameraTarget(this.#initCameraTarget)
    this.setCameraOrbit(this.#initCameraOrbit)

    this.#initCameraButton = document.createElement('button')
    this.#initCameraButton.classList.add('figni-viewer-camera-init-btn')
    this.#initCameraButton.innerHTML = 'カメラ位置を戻す'
    this.#initCameraButton.addEventListener('click', () => {
      this.setCameraTarget(this.#initCameraTarget)
      this.setCameraOrbit(this.#initCameraOrbit)
      this.#initCameraButton.style.display = 'none'
      this.closeAllPanels()
    })
    this.#initCameraButton.style.display = 'none'
    this.appendChild(this.#initCameraButton)

    const arButton = document.createElement('button')
    arButton.setAttribute('slot', 'ar-button')
    arButton.innerHTML = `${SVG_AR_BUTTON}<span>目の前に置く</span>`
    arButton.classList.add('figni-viewer-ar-button')
    this.appendChild(arButton)

    this.animationCrossfadeDuration = 0
    const hotspots = this.querySelectorAll('[slot^="hotspot"]')
    this.#hotspots = Array.from(hotspots)
    hotspots.forEach((hotspot) => {
      this.#modifyHotspot(hotspot)
    })

    if (this.#hotspots.length > 0) {
      this.#addToggleVisibleHotspotButton()
    }

    this.updateState(this.state)
    this.closeAllPanels()

    const observer = new MutationObserver((mutationList) => {
      for (const mutation of mutationList) {
        if (mutation.type == 'childList') {
          for (const node of mutation.addedNodes) {
            if (typeof node == 'element') {
              if (/^hotspot/.test(node.getAttribute('slot'))) {
                if (this.#hotspots.length == 0) {
                  this.#addToggleVisibleHotspotButton()
                }
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
                  this.#removeToggleVisibleHotspotButton()
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
  }

  static get observedAttributes() {
    return super.observedAttributes.concat(
      FigniViewerElement.#FIGNI_OBSERBED_ATTRIBUTES
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
          await this.#requestModel()
        }
      } else if (
        FigniViewerElement.#FIGNI_OBSERBED_ATTRIBUTES.TOOL.includes(name)
      ) {
        switch (name) {
          case 'screenshot': {
            if (newValue == '') {
              this.#addDownloadScreenshotButton()
            } else {
              this.#removeDownloadScreenshotButton()
            }
            break
          }
        }
      }
    }
  }

  async #requestModel() {
    if (this.itemId && this.token) {
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
      } catch (e) {
        handleError(e, this.#loadingText)
      }
    } else {
      throw new ReferenceError('item-id or token is not set.')
    }
  }

  setCameraOrbit(orbit) {
    this.cameraOrbit = orbit
    if (this.#initCameraButton) {
      this.#initCameraButton.style.display = 'block'
    }
  }

  setCameraTarget(target) {
    this.cameraTarget = target
    if (this.#initCameraButton) {
      this.#initCameraButton.style.display = 'block'
    }
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
      if (this.visibleHotspots) {
        const visible = hotspot.getAttribute('visible-state')
        if (visible) {
          if (visible == this.state) {
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

  addHotspot(name, position = null, normal = null, options = null) {
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
    hotspot.setAttribute(
      'normal',
      normal || FigniViewerElement.#DEFAULT_HOTSPOT_NORMAL
    )
    hotspot.setAttribute('slot', `hotspot-${name}`)
    if (options) {
      if (options.anime) {
        hotspot.setAttribute('anime', '')
        if (options.anime.clip) {
          hotspot.setAttribute('clip', options.anime.clip)
        }
        if (options.anime.length) {
          hotspot.setAttribute('length', options.anime.length)
        }
        if (options.anime.onstart) {
          hotspot.setAttribute(
            'onstart',
            `(${options.anime.onstart.toString()})()`
          )
        }
        if (options.anime.onend) {
          hotspot.setAttribute('onend', `(${options.anime.onend.toString()})()`)
        }
      }
      if (options.closeup) {
        hotspot.setAttribute('closeup', '')
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
  }

  editHotspot(name, position = null, normal = null, options = null) {
    if (!name) {
      throw new SyntaxError('name is required')
    }
    const hotspot = this.querySelector(`[slot="hotspot-${name}"]`)
    if (!hotspot) {
      throw new ReferenceError(`Hotspot ${name} not found`)
    }
    if (position) {
      hotspot.setAttribute('position', position)
    }
    if (normal) {
      hotspot.setAttribute('normal', normal)
    }
    if (options) {
      if (options.anime) {
        hotspot.setAttribute('anime', '')
        if (options.anime.clip) {
          hotspot.setAttribute('clip', options.anime.clip)
        }
        if (options.anime.length) {
          hotspot.setAttribute('length', options.anime.length)
        }
        if (options.anime.onstart) {
          hotspot.setAttribute(
            'onstart',
            `(${options.anime.onstart.toString()})()`
          )
        }
        if (options.anime.onend) {
          hotspot.setAttribute('onend', `(${options.anime.onend.toString()})()`)
        }
      }
      if (options.closeup) {
        hotspot.setAttribute('closeup', '')
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
    this.#modifyHotspot(hotspot)
    this.updateState(this.state)
  }

  removeHotspot(name) {
    const hotspot = this.querySelector(`[slot="hotspot-${name}"]`)
    hotspot?.remove()
  }

  toggleVisibleHotspot(visible) {
    this.visibleHotspots = visible
    if (this.#toggleVisibleHotspotButton) {
      if (this.visibleHotspots) {
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
    hotspot.setAttribute(
      'normal',
      hotspot.getAttribute('normal') ||
        FigniViewerElement.#DEFAULT_HOTSPOT_NORMAL
    )
    this.updateHotspot({
      name: hotspot.getAttribute('slot'),
      position: hotspot.getAttribute('position'),
      normal: hotspot.getAttribute('normal'),
    })

    const name = hotspot.getAttribute('slot')
    const isAnime = hotspot.getAttribute('anime') == ''
    const isCloseup = hotspot.getAttribute('closeup') == ''
    const isVisible = hotspot.getAttribute('to-state') != null

    hotspot.removeEventListener('click', this.#events[`${name}-data`])
    const ce = () => {
      if (window.getComputedStyle(hotspot).opacity == 1) {
        this.#hotspotClickCount[name] = (this.#hotspotClickCount[name] || 0) + 1
      }
    }
    hotspot.addEventListener('click', ce)

    if (isAnime) {
      hotspot.removeEventListener('click', this.#events[`${name}-anime`])
      const e = () => {
        if (window.getComputedStyle(hotspot).opacity == 1) {
          const clip = hotspot.getAttribute('clip') || null
          const loopCount = Number(hotspot.getAttribute('loopCount')) || 1
          const toState = hotspot.getAttribute('to-state')
          const onstart = hotspot.getAttribute('onstart')
          const onend = hotspot.getAttribute('onend')
          this.playAnimation(clip, loopCount, toState, onstart, onend)
        }
      }
      hotspot.addEventListener('click', e)
      this.#events[`${name}-anime`] = e
    }
    if (isCloseup) {
      hotspot.removeEventListener('click', this.#events[`${name}-closeup`])
      const e = () => {
        if (window.getComputedStyle(hotspot).opacity == 1) {
          const target =
            hotspot.getAttribute('target') ||
            hotspot.getAttribute('position') ||
            FigniViewerElement.#DEFAULT_HOTSPOT_POSITION
          const orbit = hotspot.getAttribute('orbit') || this.#initCameraOrbit
          if (this.cameraTarget == target && this.cameraOrbit == orbit) {
            this.setCameraTarget(this.#initCameraTarget)
            this.setCameraOrbit(this.#initCameraOrbit)
            this.#initCameraButton.style.display = 'none'
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
        if (window.getComputedStyle(hotspot).opacity == 1) {
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
      if (window.getComputedStyle(hotspot).opacity == 1) {
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

  #addDownloadScreenshotButton() {
    this.#downloadScreenshotButton = document.getElementById(
      `download-screenshot-button-${this.#seed}`
    )
    if (!this.#downloadScreenshotButton) {
      this.#downloadScreenshotButton = document.createElement('button')
      this.#downloadScreenshotButton.id = `download-screenshot-button-${
        this.#seed
      }`
      this.#downloadScreenshotButton.classList.add(
        'figni-viewer-download-screenshot-btn'
      )
      this.#downloadScreenshotButton.innerHTML = SVG_DOWNLOAD_SCREENSHOT_BUTTON
      this.#downloadScreenshotButton.addEventListener('click', () => {
        this.downloadScreenshot()
      })
      this.appendChild(this.#downloadScreenshotButton)
    }
  }

  #removeDownloadScreenshotButton() {
    this.#downloadScreenshotButton.remove()
    this.#downloadScreenshotButton = null
  }

  #addToggleVisibleHotspotButton() {
    this.#toggleVisibleHotspotButton = document.getElementById(
      `toggle-visible-hotspot-button-${this.#seed}`
    )
    if (!this.#toggleVisibleHotspotButton) {
      this.#toggleVisibleHotspotButton = document.createElement('button')
      this.#toggleVisibleHotspotButton.id = `toggle-visible-hotspot-button-${
        this.#seed
      }`
      this.#toggleVisibleHotspotButton.classList.add(
        'figni-viewer-toggle-visible-hotspot-btn'
      )
      this.#toggleVisibleHotspotButton.addEventListener('click', () => {
        this.visibleHotspots = !this.visibleHotspots
        this.toggleVisibleHotspot(this.visibleHotspots)
      })
      this.toggleVisibleHotspot(this.visibleHotspots)
      this.appendChild(this.#toggleVisibleHotspotButton)
    }
  }

  #removeToggleVisibleHotspotButton() {
    this.#toggleVisibleHotspotButton.remove()
    this.#toggleVisibleHotspotButton = null
  }

  async playAnimation(
    clip = null,
    loopCount = 1,
    toState = null,
    onstart = null,
    onend = null
  ) {
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
    if (this.paused || this.loop) {
      this.animationName = clip
      this.currentTime = 0
      await this.updateComplete
      if (onstart) {
        if (typeof onstart === 'function') {
          onstart()
        } else {
          Function(onstart)()
        }
      }
      this.play({ repetitions: loopCount })
      this.loop = loopCount === Infinity
      const onFinishFunc = () => {
        if (onend && !this.loop) {
          if (typeof onend === 'function') {
            onend()
          } else {
            Function(onend)()
          }
        }
        if (toState) {
          this.updateState(toState)
        }
      }
      if (!this.loop) {
        this.addEventListener('finished', onFinishFunc, { once: true })
      } else {
        onFinishFunc()
      }
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
}

customElements.define('figni-viewer', FigniViewerElement)
