import { ModelViewerElement } from '@google/model-viewer'
import axios from 'axios'
import './style.scss'

const API_BASE = 'https://api.stg.figni.store/api'
const SOCKET_BASE = 'wss://api.stg.figni.store/ws'
const VIEW_THRESHOLD = 0.7

class FigniViewerElement extends ModelViewerElement {
  static #MODEL_ATTRIBUTE = ['item-id', 'token', 'model-tag']
  static #TOOL_ATTRIBUTE = ['screenshot']

  static #DEFAULT_HOTSPOT_POSITION = '0m 0m 0m'
  static #DEFAULT_HOTSPOT_NORMAL = '0m 1m 0m'

  itemId
  token
  modelTag

  initCameraTarget = 'auto auto auto'
  initCameraOrbit = '0deg 75deg 105%'
  loop = false
  state = ''

  #seed
  #initCameraButton
  #panels = []
  #hotspots = []

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
  }

  async connectedCallback() {
    super.connectedCallback()

    // 値の取得
    this.itemId = this.getAttribute('item-id')
    this.token = this.getAttribute('token')
    this.modelTag = this.getAttribute('model-tag') || ''

    // Attribute
    this.loading = 'eager'
    this.cameraControls = true
    this.ar = true
    this.arModes = 'webxr scene-viewer quick-look'
    this.arScale = 'fixed'
    this.arPlacement = 'floor'
    this.interactionPrompt = 'none'
    this.shadowIntensity = 1
    this.initCameraTarget = this.getAttribute('target') || this.initCameraTarget
    this.initCameraOrbit = this.getAttribute('orbit') || this.initCameraOrbit
    this.state = this.getAttribute('state') || this.state
    this.setCameraTarget(this.initCameraTarget)
    this.setCameraOrbit(this.initCameraOrbit)

    this.#initCameraButton = document.createElement('button')
    this.#initCameraButton.classList.add('figni-viewer-camera-init-btn')
    this.#initCameraButton.innerHTML = 'カメラ位置を戻す'
    this.#initCameraButton.addEventListener('click', () => {
      this.setCameraTarget(this.initCameraTarget)
      this.setCameraOrbit(this.initCameraOrbit)
      this.#initCameraButton.style.display = 'none'
      this.closeAllPanels()
    })
    this.#initCameraButton.style.display = 'none'
    this.appendChild(this.#initCameraButton)

    const arButton = document.createElement('button')
    arButton.setAttribute('slot', 'ar-button')
    arButton.innerHTML = `
      <svg viewBox="0 0 17 15" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M8.50002 8.62017C12.6692 8.62017 16.1338 9.74602 16.8614 11.2244L11.9069 1.12585C11.5836 0.45489 10.8906 0 10.0822 0C9.43548 0 8.86958 0.295679 8.50002 0.761941L0.358032 10.8946C1.40898 9.57544 4.65423 8.62017 8.50002 8.62017Z" fill="#FF733B" />
        <path d="M8.5 14.9886C13.1944 14.9886 17 13.563 17 11.8044C17 10.0458 13.1944 8.62016 8.5 8.62016C3.80558 8.62016 0 10.0458 0 11.8044C0 13.563 3.80558 14.9886 8.5 14.9886Z" fill="#FFAB3B" />
        <path d="M8.49995 12.9985C11.4084 12.9985 13.7663 12.4639 13.7663 11.8044C13.7663 11.1449 11.4084 10.6103 8.49995 10.6103C5.59145 10.6103 3.23364 11.1449 3.23364 11.8044C3.23364 12.4639 5.59145 12.9985 8.49995 12.9985Z" fill="#FF733B" />
        <path d="M9.14678 11.8044C10.9327 11.8044 12.3805 10.3788 12.3805 8.62016C12.3805 6.86156 10.9327 5.43593 9.14678 5.43593C7.36086 5.43593 5.91309 6.86156 5.91309 8.62016C5.91309 10.3788 7.36086 11.8044 9.14678 11.8044Z" fill="#FFCE3B" />
      </svg>
      <span>目の前に置く</span>
    `
    arButton.classList.add('figni-viewer-ar-button')
    this.appendChild(arButton)

    this.animationCrossfadeDuration = 0
    const hotspots = this.querySelectorAll('button[slot^="hotspot"]')
    this.#hotspots = Array.from(hotspots)
    hotspots.forEach((hotspot) => {
      this.#modifyHotspot(hotspot)
      const panels = hotspot.querySelectorAll('[slot^="panel"]')
      panels.forEach((panel) => {
        panel.classList.add('figni-viewer-panel')
      })
      this.#panels.push(...panels)
      hotspot.addEventListener('click', () => {
        if (panels.length > 0) {
          panels.forEach((panel) => {
            panel.classList.toggle('figni-viewer-panel-hide')
          })
          this.closeAllPanels(Array.from(panels))
        }
      })
    })

    this.updateState(this.state)
    this.closeAllPanels()

    const observer = new MutationObserver((mutationList) => {
      for (const mutation of mutationList) {
        if (mutation.type == 'childList') {
          for (const node of mutation.addedNodes) {
            if (/^hotspot/.test(node.getAttribute('slot'))) {
              this.#hotspots.push(node)
              this.#modifyHotspot(node)
              this.updateState(this.state)
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
        await this.requestModel()
      } else if (FigniViewerElement.#TOOL_ATTRIBUTE.includes(name)) {
        switch (name) {
          case 'screenshot': {
            if (newValue == '') {
              let downloadScreenshotButton = document.getElementById(
                `download-screenshot-button-${this.#seed}`
              )
              if (!downloadScreenshotButton) {
                downloadScreenshotButton = document.createElement('button')
                downloadScreenshotButton.id = `download-screenshot-button-${
                  this.#seed
                }`
                downloadScreenshotButton.classList.add(
                  'figni-viewer-download-screenshot-btn'
                )
                downloadScreenshotButton.innerHTML =
                  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><defs><style>.figni-viewer-screenshot{fill:#8f94a9;}</style></defs><path class="figni-viewer-screenshot" d="M14.61,0H5.39A5.4,5.4,0,0,0,0,5.39v9.22A5.4,5.4,0,0,0,5.39,20h9.22A5.4,5.4,0,0,0,20,14.61V5.39A5.4,5.4,0,0,0,14.61,0ZM5.39,2.58h9.22a2.81,2.81,0,0,1,2.81,2.81v6L13.63,7.64a1.12,1.12,0,0,0-1.57,0L8.54,11.16a1.11,1.11,0,0,1-1.58,0,1.12,1.12,0,0,0-1.57,0L2.58,14V5.39A2.81,2.81,0,0,1,5.39,2.58Z"/><circle class="figni-viewer-screenshot" cx="5.88" cy="5.88" r="1.92"/></svg>'
                downloadScreenshotButton.addEventListener('click', () => {
                  this.downloadScreenshot()
                })
                this.appendChild(downloadScreenshotButton)
              }
            } else {
              downloadScreenshotButton.remove()
            }
            break
          }
        }
      }
    }
  }

  async requestModel() {
    if (this.itemId && this.token) {
      const tag = this.modelTag ? `?tag=${this.modelTag}` : ''
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
      const visible = hotspot.getAttribute('visible')
      if (visible) {
        if (visible == this.state) {
          hotspot.classList.remove('figni-viewer-hotspot-hide')
        } else {
          hotspot.classList.add('figni-viewer-hotspot-hide')
        }
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
      if (options.visible) {
        hotspot.setAttribute('visible', options.visible)
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
      if (options.visible) {
        hotspot.setAttribute('visible', options.visible)
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

    const isAnime = hotspot.getAttribute('anime') == ''
    const isCloseup = hotspot.getAttribute('closeup') == ''
    const isVisible = hotspot.getAttribute('to-state') != null

    if (isAnime) {
      hotspot.addEventListener('click', () => {
        if (
          window.getComputedStyle(hotspot).opacity == 1 &&
          (this.loop || this.paused)
        ) {
          const clip = hotspot.getAttribute('clip')
          const lenth = Number(hotspot.getAttribute('length')) || 0
          if (this.availableAnimations.includes(clip)) {
            this.animationName = clip
            this.currentTime = 0
            this.play()
            const f = hotspot.getAttribute('onstart')
            if (f) {
              this.#evalEvent(f)
            }
            if (lenth > 0) {
              this.loop = false
              if (isVisible) {
                this.updateState(`temp-${this.#seed}`)
              }
              setTimeout(() => {
                this.pause()
                const f = hotspot.getAttribute('onend')
                if (f) {
                  this.#evalEvent(f)
                }
                if (isVisible) {
                  this.updateState(hotspot.getAttribute('to-state'))
                }
              }, lenth)
            } else {
              this.loop = true
              if (isVisible) {
                this.updateState(hotspot.getAttribute('to-state'))
              }
            }
          }
        }
      })
    }
    if (isCloseup) {
      hotspot.addEventListener('click', () => {
        if (window.getComputedStyle(hotspot).opacity == 1) {
          const target =
            hotspot.getAttribute('target') ||
            hotspot.getAttribute('position') ||
            FigniViewerElement.#DEFAULT_HOTSPOT_POSITION
          const orbit = hotspot.getAttribute('orbit') || this.initCameraOrbit
          if (this.cameraTarget == target && this.cameraOrbit == orbit) {
            this.setCameraOrbit(this.initCameraTarget)
            this.setCameraTarget(this.initCameraOrbit)
            this.#initCameraButton.style.display = 'none'
          } else {
            this.setCameraTarget(target)
            this.setCameraOrbit(orbit)
          }
        }
      })
    }
    if (!isAnime && isVisible) {
      const state = hotspot.getAttribute('to-state')
      hotspot.addEventListener('click', () => {
        if (window.getComputedStyle(hotspot).opacity == 1) {
          this.updateState(state)
        }
      })
    }
  }

  #evalEvent(string) {
    Function(string)()
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
