import { ModelViewerElement } from '@google/model-viewer'
import axios from 'axios'
import './style.scss'

const API_BASE = 'https://api.stg.figni.store/api'
const SOCKET_BASE = 'wss://api.stg.figni.store/ws'
const VIEW_THRESHOLD = 0.7

const SVG_AR_BUTTON =
  '<svg viewBox="0 0 17 15" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8.50002 8.62017C12.6692 8.62017 16.1338 9.74602 16.8614 11.2244L11.9069 1.12585C11.5836 0.45489 10.8906 0 10.0822 0C9.43548 0 8.86958 0.295679 8.50002 0.761941L0.358032 10.8946C1.40898 9.57544 4.65423 8.62017 8.50002 8.62017Z" fill="#FF733B" /><path d="M8.5 14.9886C13.1944 14.9886 17 13.563 17 11.8044C17 10.0458 13.1944 8.62016 8.5 8.62016C3.80558 8.62016 0 10.0458 0 11.8044C0 13.563 3.80558 14.9886 8.5 14.9886Z" fill="#FFAB3B" /><path d="M8.49995 12.9985C11.4084 12.9985 13.7663 12.4639 13.7663 11.8044C13.7663 11.1449 11.4084 10.6103 8.49995 10.6103C5.59145 10.6103 3.23364 11.1449 3.23364 11.8044C3.23364 12.4639 5.59145 12.9985 8.49995 12.9985Z" fill="#FF733B" /><path d="M9.14678 11.8044C10.9327 11.8044 12.3805 10.3788 12.3805 8.62016C12.3805 6.86156 10.9327 5.43593 9.14678 5.43593C7.36086 5.43593 5.91309 6.86156 5.91309 8.62016C5.91309 10.3788 7.36086 11.8044 9.14678 11.8044Z" fill="#FFCE3B" /></svg>'
const SVG_TOGGLE_VISIBLE_HOTSPOT_BUTTON_ON =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 147.41 147.41"><defs><style>.visible-hotspot-button-on-frame{fill:none;}.visible-hotspot-button-on-icon{fill:#999fae;}</style></defs><rect class="visible-hotspot-button-on-frame" width="147.41" height="147.41"/><path class="visible-hotspot-button-on-icon" d="M102.13,11.65H45.28A33.62,33.62,0,0,0,11.65,45.28v56.85a33.63,33.63,0,0,0,33.63,33.64h56.85a33.64,33.64,0,0,0,33.64-33.64V45.28A33.63,33.63,0,0,0,102.13,11.65ZM119.77,102A17.75,17.75,0,0,1,102,119.77H45.39A17.75,17.75,0,0,1,27.65,102V45.39A17.74,17.74,0,0,1,45.39,27.65H102a17.75,17.75,0,0,1,17.75,17.74ZM36.47,78.7V73.21A5.26,5.26,0,0,1,41.72,68h5.5a5.26,5.26,0,0,1,5.25,5.26V78.7A5.25,5.25,0,0,1,47.22,84h-5.5A5.25,5.25,0,0,1,36.47,78.7Zm24.63.2V73A5.06,5.06,0,0,1,66.15,68h39.73A5.07,5.07,0,0,1,110.94,73V78.9a5.06,5.06,0,0,1-5.06,5H66.15A5,5,0,0,1,61.1,78.9Zm49.6,19.49v5.5a5.25,5.25,0,0,1-5.25,5.25H100a5.25,5.25,0,0,1-5.25-5.25v-5.5A5.25,5.25,0,0,1,100,93.14h5.5A5.25,5.25,0,0,1,110.7,98.39Zm-25-.2v5.9a5,5,0,0,1-5,5H41.52a5,5,0,0,1-5.05-5v-5.9a5,5,0,0,1,5.05-5H80.67A5,5,0,0,1,85.72,98.19Z"/></svg>'
const SVG_TOGGLE_VISIBLE_HOTSPOT_BUTTON_OFF =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 147.41 147.41"><defs><style>.visible-hotspot-button-off-frame{fill:none;}.visible-hotspot-button-off-icon{fill:#999fae;}</style></defs><rect class="visible-hotspot-button-off-frame" width="147.41" height="147.41"/><path class="visible-hotspot-button-off-icon" d="M71.52,109.14l9.34-16a5,5,0,0,1,4.86,5v5.9a5,5,0,0,1-5,5Zm33.93-16H100a5.25,5.25,0,0,0-5.25,5.25v5.5a5.25,5.25,0,0,0,5.25,5.25h5.5a5.25,5.25,0,0,0,5.25-5.25v-5.5A5.25,5.25,0,0,0,105.45,93.14Zm.43-9.19a5.06,5.06,0,0,0,5.06-5V73A5.07,5.07,0,0,0,105.88,68H95.61L86.25,84ZM41.52,93.14a5,5,0,0,0-5.05,5v5.9a5.26,5.26,0,0,0,.18,1.27l7.16-12.22ZM47.22,68h-5.5a5.26,5.26,0,0,0-5.25,5.26V78.7A5.25,5.25,0,0,0,41.72,84h5.5a5.23,5.23,0,0,0,2.27-.53l3-5.1V73.21A5.26,5.26,0,0,0,47.22,68Zm76.65-48.32L115.52,33.9a17.63,17.63,0,0,1,4.25,11.49V102A17.75,17.75,0,0,1,102,119.77H65.3l-9.35,16h46.18a33.64,33.64,0,0,0,33.64-33.64V45.28A33.57,33.57,0,0,0,123.87,19.63ZM23.54,127.79l8.35-14.27A17.67,17.67,0,0,1,27.65,102V45.39A17.74,17.74,0,0,1,45.39,27.65H82.11l9.36-16H45.28A33.62,33.62,0,0,0,11.65,45.28v56.85A33.56,33.56,0,0,0,23.54,127.79Zm17.82,17.07,78.5-134.23a5.15,5.15,0,0,0-1.85-7L113.11.71a5.16,5.16,0,0,0-7.06,1.85L27.55,136.78a5.16,5.16,0,0,0,1.85,7.06l4.9,2.87A5.17,5.17,0,0,0,41.36,144.86Z"/></svg>'
const SVG_DOWNLOAD_SCREENSHOT_BUTTON =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><defs><style>.figni-viewer-screenshot{fill:#8f94a9;}</style></defs><path class="figni-viewer-screenshot" d="M14.61,0H5.39A5.4,5.4,0,0,0,0,5.39v9.22A5.4,5.4,0,0,0,5.39,20h9.22A5.4,5.4,0,0,0,20,14.61V5.39A5.4,5.4,0,0,0,14.61,0ZM5.39,2.58h9.22a2.81,2.81,0,0,1,2.81,2.81v6L13.63,7.64a1.12,1.12,0,0,0-1.57,0L8.54,11.16a1.11,1.11,0,0,1-1.58,0,1.12,1.12,0,0,0-1.57,0L2.58,14V5.39A2.81,2.81,0,0,1,5.39,2.58Z"/><circle class="figni-viewer-screenshot" cx="5.88" cy="5.88" r="1.92"/></svg>'

class FigniViewerElement extends ModelViewerElement {
  static #MODEL_ATTRIBUTE = ['item-id', 'token', 'model-tag']
  static #TOOL_ATTRIBUTE = ['screenshot']

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
  #panels = []
  #hotspots = []
  #events = {}
  #nextState

  #initTime = 0
  #appearedTime = 0
  #sumViewTime = 0
  #wasInViewport = false
  #ws

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

    for (const ch of this.children) {
      console.log(ch)
      ch.style.visibility = 'hidden'
    }
  }

  async connectedCallback() {
    super.connectedCallback()

    this.shadowRoot
      .querySelectorAll(':not(style[outline="none"])')
      .forEach((d) => (d.style.outline = 'none'))

    // 値の取得
    this.itemId = this.getAttribute('item-id')
    this.token = this.getAttribute('token')
    this.modelTag = this.getAttribute('model-tag') || ''

    this.#requestModel()

    // Attribute
    this.loading = 'eager'
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

    const loadingAnimationHolder = document.createElement('div')
    const progressBarHolder = document.createElement('span')
    this.#progressBar = document.createElement('span')
    const loadingAnimationSpinner = document.createElement('span')
    loadingAnimationHolder.setAttribute('slot', 'progress-bar')
    this.#progressBar.classList.add('figni-viewer-progress-bar')
    progressBarHolder.classList.add('figni-viewer-progress-bar-holder')
    loadingAnimationSpinner.classList.add('figni-viewer-loading-animation-spinner')
    loadingAnimationHolder.classList.add('figni-viewer-loading-animation-holder')
    this.addEventListener('progress', (e) => {
      const p = e.detail.totalProgress
      this.#progressBar.style.setProperty('--progress-bar-width', `${Math.ceil(p * 100)}%`)
      if (p === 1) {
        loadingAnimationHolder.classList.add('figni-viewer-loading-animation-hide')
        if (loadingAnimationHolder.style.opacity === 0) {
          loadingAnimationHolder.style.display = 'none'
        }
      }
    })
    progressBarHolder.appendChild(this.#progressBar)
    loadingAnimationHolder.appendChild(loadingAnimationSpinner)
    loadingAnimationHolder.appendChild(progressBarHolder)
    this.appendChild(loadingAnimationHolder)

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

    for (const ch of this.children) {
      ch.style.visibility = 'visible'
    }
  }

  static get observedAttributes() {
    return super.observedAttributes.concat(
      FigniViewerElement.#MODEL_ATTRIBUTE,
      FigniViewerElement.#TOOL_ATTRIBUTE
    )
  }

  async attributeChangedCallback(name, oldValue, newValue) {
    super.attributeChangedCallback(name, oldValue, newValue)
    if (oldValue != newValue) {
      if (FigniViewerElement.#MODEL_ATTRIBUTE.includes(name)) {
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
      } else if (FigniViewerElement.#TOOL_ATTRIBUTE.includes(name)) {
        switch (name) {
          case 'screenshot': {
            if (newValue == '') {
              this.#addDownloadScreenshotButton()
              this.#toggleVisibleHotspotButton.style.display = 'none'
            } else {
              this.#removeDownloadScreenshotButton()
              this.#toggleVisibleHotspotButton.style.display = 'display'
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
        console.error(e.response.data)
      }
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

    if (isAnime) {
      hotspot.removeEventListener('click', this.#events[`${name}-anime`])
      const e = () => {
        if (window.getComputedStyle(hotspot).opacity == 1) {
          const clip = hotspot.getAttribute('clip')
          const lenth = Number(hotspot.getAttribute('length')) || 0
          const toState = hotspot.getAttribute('to-state')
          const onstart = hotspot.getAttribute('onstart')
          const onend = hotspot.getAttribute('onend')
          this.playAnimation(clip, lenth, toState, onstart, onend)
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
            this.setCameraOrbit(this.#initCameraTarget)
            this.setCameraTarget(this.#initCameraOrbit)
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
              )}px - 4rem )`
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

  playAnimation(clip, length = 0, toState = '', onstart, onend) {
    if (!this.availableAnimations.includes(clip)) {
      throw new ReferenceError(`${clip} is not available`)
    }
    if (this.loop || this.paused) {
      this.animationName = clip
      this.currentTime = 0
      this.play()
      if (onstart) {
        if (typeof onstart === 'function') {
          onstart()
        } else {
          Function(onstart)()
        }
      }
      if (length > 0) {
        this.loop = false
        this.#nextState = toState
        if (this.#nextState) {
          this.updateState(`temp-${this.#seed}`)
        }
        setTimeout(() => {
          this.pause()
          if (onend) {
            if (typeof onend === 'function') {
              onend()
            } else {
              Function(onend)()
            }
          }
          if (toState) {
            this.updateState(toState)
          }
        }, length)
      } else {
        this.loop = true
        if (toState) {
          this.updateState(toState)
        }
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
