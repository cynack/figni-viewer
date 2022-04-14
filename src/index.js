import axios from 'axios'
import Lottie from 'lottie-web'
import QRCode from 'qrcode'
import { LOADING_ANIMATION_MINI } from './animation'
import FigniViewerElement from './figni-viewer'
import FigniViewerBaseElement from './figni-viewer-base'
import { ModelViewerElement } from './model-viewer'
import './style.scss'
import {
  SVG_AR_BUTTON,
  SVG_CLOSE_ICON,
  SVG_DOWNLOAD_SCREENSHOT_BUTTON,
  SVG_HELP_ICON,
  SVG_TOGGLE_VISIBLE_HOTSPOT_BUTTON_OFF,
  SVG_TOGGLE_VISIBLE_HOTSPOT_BUTTON_ON,
} from './svg'

const VIEW_THRESHOLD = 0.7
const FIGNI_SETTINGS = {
  DEFAULT_CAMERA_TARGET: 'auto auto auto',
  DEFAULT_CAMERA_ORBIT: '0deg 75deg 105%',
  DEFAULT_HOTSPOT_POSITION: '0m 0m 0m',
  DEFAULT_HOTSPOT_NORMAL: '0m 1m 0m',
  DEFAULT_PANEL_PLACE: 'left middle',
  MAX_CAMERA_ORBIT: 'auto 180deg 200%',
  MIN_CAMERA_ORBIT: 'auto 0deg auto',
}

export class __FigniViewerElement extends ModelViewerElement {
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
  #interactedTime = 0
  #sumInteractionTime = 0
  #isInteracting = false
  #wasInViewport = false
  #arCount = 0
  #hotspotClickCount = {}
  #animationPlayCount = {}

  // HTML要素
  #interactionCursor
  #interactionPrompt
  #arButton
  #qrCodePanel
  #helpButton
  #helpPanel
  #initCameraButton
  #downloadScreenshotButton
  #toggleVisibleHotspotButton
  #loadingPanel
  #errorPanel

  #panels = []
  #hotspots = []

  async connectedCallback() {
    super.connectedCallback()

    this.itemId = this.getAttribute('item-id')
    this.token = this.getAttribute('token')
    this.modelTag = this.getAttribute('model-tag') || ''

    this.#initCameraTarget =
      this.getAttribute('target') || FIGNI_SETTINGS.DEFAULT_CAMERA_TARGET
    this.#initCameraOrbit =
      this.getAttribute('orbit') || FIGNI_SETTINGS.DEFAULT_CAMERA_ORBIT
    this.state = this.getAttribute('state') || this.state

    this.#enableInteractionCursor()
    // TODO: インタラクションプロンプトやる
    // this.#enableInteractionPrompt()
    this.#enableHelpButton()
    this.#enableHelpPanel()
    this.#enableArButton()

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

    this.addEventListener('pointerdown', (e) => {
      this.autoRotate = false
    })
  }

  async attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue != newValue) {
      switch (name) {
        case 'item-id':
          this.itemId = newValue
          this.#requestModel()
          break
        case 'token':
          this.token = newValue
          this.#requestModel()
          break
        case 'model-tag':
          this.modelTag = newValue
          this.#requestModel()
          break
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

  async #requestModel() {
    if (this.itemId && this.token) {
      // this.#disableErrorPanel()
      this.#enableLoadingPanel()
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
        // this.#enableErrorPanel(getErrorMessage(e))
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
      position || FIGNI_SETTINGS.DEFAULT_HOTSPOT_POSITION
    )
    if (normal) {
      hotspot.setAttribute(
        'normal',
        normal || FIGNI_SETTINGS.DEFAULT_HOTSPOT_NORMAL
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
        position || FIGNI_SETTINGS.DEFAULT_HOTSPOT_POSITION
      )
    }
    if (normal) {
      hotspot.setAttribute(
        'normal',
        normal || FIGNI_SETTINGS.DEFAULT_HOTSPOT_NORMAL
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
        FIGNI_SETTINGS.DEFAULT_HOTSPOT_POSITION
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
            FIGNI_SETTINGS.DEFAULT_HOTSPOT_POSITION
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
      panel.getAttribute('place') || FIGNI_SETTINGS.DEFAULT_PANEL_PLACE
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

  #enableInteractionCursor() {
    if (!this.#interactionCursor) {
      this.#interactionCursor = document.createElement('div')
      this.#interactionCursor.classList.add('figni-viewer-interaction-cursor')
      this.#interactionCursor.style.opacity = 0
      let isDragging = false
      let wasInteracted = false
      let pointerId = null
      this.addEventListener('pointerdown', (e) => {
        isDragging = true
        if (this.#isInteracting) {
          this.#cursorShow()
          const rect = e.currentTarget.getBoundingClientRect()
          this.#cursorMove(e.clientX - rect.left, e.clientY - rect.top)
        }
      })
      this.addEventListener('pointermove', (e) => {
        if (pointerId == null || pointerId == e.pointerId) {
          if (this.#isInteracting && isDragging) {
            if (!wasInteracted) {
              this.#cursorShow()
            }
            const rect = e.currentTarget.getBoundingClientRect()
            this.#cursorMove(e.clientX - rect.left, e.clientY - rect.top)
            wasInteracted = true
            pointerId = e.pointerId
          }
        }
      })
      this.addEventListener('pointerup', (e) => {
        isDragging = false
        this.#cursorHide()
        pointerId = null
      })
      this.addEventListener('scroll', (e) => {
        this.#cursorHide()
      })
      this.addEventListener('interaction-end', (e) => {
        wasInteracted = false
        this.#cursorHide()
      })
      this.appendChild(this.#interactionCursor)
    } else {
      this.#interactionCursor.style.display = 'block'
    }
  }

  #disableInteractionCursor() {
    if (this.#interactionCursor) {
      this.#interactionCursor.style.display = 'none'
    }
  }

  #cursorShow() {
    if (this.#interactionCursor) {
      this.#interactionCursor.style.opacity = 0.075
      this.#interactionCursor.style.width = '8rem'
      this.#interactionCursor.style.height = '8rem'
    }
  }

  #cursorMove(x, y) {
    if (this.#interactionCursor) {
      this.#interactionCursor.style.left = `${x}px`
      this.#interactionCursor.style.top = `${y}px`
    }
  }

  #cursorHide() {
    if (this.#interactionCursor) {
      this.#interactionCursor.style.opacity = 0
      this.#interactionCursor.style.width = 0
      this.#interactionCursor.style.height = 0
    }
  }

  #enableInteractionPrompt() {
    if (!this.#interactionPrompt) {
      this.#interactionPrompt = document.createElement('div')
      this.#interactionPrompt.setAttribute('slot', 'interaction-prompt')
      this.#interactionPrompt.classList.add('figni-viewer-interaction-prompt')
      /*
      Lottie.loadAnimation({
        container: this.#interactionPrompt,
        renderer: 'svg',
        loop: true,
        autoplay: true,
        animationData: INTERACTION_PROMPT_ANIMATION,
      })
      */
      this.appendChild(this.#interactionPrompt)
    } else {
      this.#interactionPrompt.style.display = 'block'
    }
  }

  #disableInteractionPrompt() {
    if (this.#interactionPrompt) {
      this.#interactionPrompt.style.display = 'none'
    }
  }

  #enableArButton() {
    if (!this.#arButton) {
      this.#arButton = document.createElement('button')
      // this.#arButton.setAttribute('slot', 'ar-button')
      this.#arButton.innerHTML = `${SVG_AR_BUTTON}<span>実物大で見る</span>`
      this.#arButton.classList.add('figni-viewer-ar-button')
      this.#arButton.addEventListener('click', () => {
        if (this.canActivateAR) {
          this.#arCount++
          this.#initArViewTime = performance.now()
          this.activateAR()
        } else {
          this.#enableQRCodePanel()
        }
      })
      this.appendChild(this.#arButton)
    } else {
      this.#arButton.style.display = 'block'
    }
  }

  #disableArButton() {
    if (this.#arButton) {
      this.#arButton.style.display = 'none'
    }
  }

  #enableQRCodePanel() {
    if (!this.#qrCodePanel) {
      this.#qrCodePanel = document.createElement('div')
      this.#qrCodePanel.classList.add('figni-viewer-qrcode-panel')
      this.#qrCodePanel.addEventListener('click', () => {
        this.#disableQRCodePanel()
      })
      QRCode.toString(window.top.location.href, { width: 100 }, (err, str) => {
        if (!err) {
          const text = document.createElement('span')
          text.innerText =
            'QRコードを読み取ってスマホ版で\nサイトを閲覧してください'
          this.#qrCodePanel.appendChild(text)
          this.#qrCodePanel.innerHTML += str.replace('#000000', '#222428')
        } else {
          const text = document.createElement('span')
          text.style.color = 'var(--figni-viewer-red)'
          text.innerText = 'QRコードの生成に失敗しました...'
          this.#qrCodePanel.appendChild(text)
          console.error(err)
        }
      })
      this.appendChild(this.#qrCodePanel)
    } else {
      this.#qrCodePanel.style.display = 'block'
    }
  }

  #disableQRCodePanel() {
    if (this.#qrCodePanel) {
      this.#qrCodePanel.style.display = 'none'
    }
  }

  #enableHelpButton() {
    if (!this.#helpButton) {
      this.#helpButton = document.createElement('button')
      this.#helpButton.innerHTML = `${SVG_HELP_ICON}<span>使い方</span>`
      this.#helpButton.classList.add('figni-viewer-help-button')
      const opened = false
      this.#helpButton.addEventListener('click', () => {
        if (opened) {
          this.#helpButton.classList.add('figni-viewer-help-button-hidden')
          this.#helpButton.classList.remove('figni-viewer-help-button-cancel')
          this.#helpButton.innerHTML = `${SVG_HELP_ICON}<span>使い方</span>`
          this.#disableHelpPanel()
        } else {
          this.#helpButton.classList.remove('figni-viewer-help-button-hidden')
          this.#helpButton.classList.add('figni-viewer-help-button-cancel')
          this.#helpButton.innerHTML = `${SVG_CLOSE_ICON}`
          this.#enableHelpPanel()
        }
      })
      this.appendChild(this.#helpButton)
    } else {
      this.#helpButton.style.display = 'block'
    }
  }

  #disableHelpButton() {
    if (this.#helpButton) {
      this.#helpButton.style.display = 'none'
    }
  }

  #enableHelpPanel() {
    if (!this.#helpPanel) {
      this.#helpPanel = document.createElement('div')
      this.#helpPanel.classList.add(
        'figni-viewer-help-panel',
        'figni-viewer-help-panel-hidden'
      )
      this.#helpPanel.innerHTML = `
        <div class="figni-viewer-help-panel-content">
          <div class="figni-viewer-help-panel-content-title">
            <span>使い方</span>
          </div>
          <div class="figni-viewer-help-panel-content-body">
            <p>
              スマホ版では、
              <a href="https://www.google.com/chrome/browser/desktop/index.html" target="_blank">Chrome</a>
              または
              <a href="https://www.mozilla.org/ja/firefox/new/" target="_blank">Firefox</a>
              で閲覧してください。
            </p>
          </div>
        </div>
      `
      this.appendChild(this.#helpPanel)
    } else {
      this.#helpPanel.classList.remove('figni-viewer-help-panel-hidden')
    }
  }

  #disableHelpPanel() {
    if (this.#helpPanel) {
      this.#helpPanel.classList.add('figni-viewer-help-panel-hidden')
    }
  }

  #enableInitCameraButton() {
    if (!this.#initCameraButton) {
      this.#initCameraButton = document.createElement('button')
      this.#initCameraButton.classList.add('figni-viewer-init-camera-button')
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
        'figni-viewer-download-screenshot-button'
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
        'figni-viewer-toggle-visible-hotspot-button'
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
      Lottie.loadAnimation({
        container: loadingAnimation,
        renderer: 'svg',
        loop: true,
        autoplay: true,
        animationData: LOADING_ANIMATION_MINI,
      })
      this.#loadingPanel.appendChild(loadingAnimation)
      // プログレスバー
      const loadingProgressBar = document.createElement('span')
      loadingProgressBar.classList.add('figni-viewer-loading-progress-bar')
      this.#loadingPanel.appendChild(loadingProgressBar)
      const loadingText = document.createElement('div')
      loadingText.innerHTML =
        '<svg width="155" height="14" viewBox="0 0 155 14" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M23.276 12.168C24.98 12.168 26.408 11.256 26.408 9.66C26.408 8.532 25.64 7.8 24.632 7.524V7.476C25.568 7.092 26.108 6.444 26.108 5.508C26.108 4.032 24.944 3.192 23.228 3.192C22.196 3.192 21.344 3.624 20.576 4.284L21.476 5.376C22.004 4.884 22.52 4.572 23.156 4.572C23.912 4.572 24.344 4.968 24.344 5.64C24.344 6.384 23.816 6.924 22.184 6.924V8.196C24.116 8.196 24.632 8.724 24.632 9.552C24.632 10.308 24.02 10.74 23.108 10.74C22.304 10.74 21.668 10.332 21.14 9.816L20.3 10.932C20.924 11.652 21.872 12.168 23.276 12.168ZM28.1701 12H30.7021C33.3181 12 34.9861 10.512 34.9861 7.524C34.9861 4.524 33.3181 3.12 30.6061 3.12H28.1701V12ZM29.9461 10.572V4.536H30.4861C32.1541 4.536 33.1741 5.364 33.1741 7.524C33.1741 9.684 32.1541 10.572 30.4861 10.572H29.9461ZM37.6965 3.192V4.68C38.0445 4.668 38.4285 4.656 38.8605 4.656C39.4485 4.656 43.5765 4.656 44.6445 4.656C45.0765 4.656 45.4005 4.668 45.7125 4.68V3.192C45.4365 3.216 45.0405 3.24 44.6445 3.24C43.5765 3.24 39.8925 3.24 38.8605 3.24C38.4285 3.24 38.0445 3.216 37.6965 3.192ZM41.8245 7.416C41.8245 7.296 41.8245 4.668 41.8245 4.296H40.1805C40.1805 4.692 40.1805 6.9 40.1805 7.356C40.1805 8.064 40.1805 9.672 40.1805 10.464C40.1805 11.676 40.7205 12.42 42.9165 12.42C44.0325 12.42 45.4005 12.384 46.1805 12.336L46.2885 10.704C45.3165 10.812 44.2605 10.872 43.1925 10.872C42.2205 10.872 41.8245 10.632 41.8245 9.984C41.8245 9.564 41.8245 7.968 41.8245 7.416ZM36.9045 6.624V8.196C37.2645 8.172 37.8765 8.148 38.2125 8.148C39.3045 8.148 44.6205 8.148 45.4845 8.148C45.7485 8.148 46.2885 8.136 46.6125 8.184V6.636C46.3005 6.66 45.6885 6.696 45.4365 6.696C44.6445 6.696 39.3165 6.696 38.2125 6.696C37.8525 6.696 37.2405 6.648 36.9045 6.624ZM49.8885 2.952V4.5C50.2605 4.476 50.7645 4.452 51.1845 4.452C51.9285 4.452 54.4005 4.452 55.1085 4.452C55.5165 4.452 55.9845 4.476 56.3925 4.5V2.952C55.9845 3 55.5165 3.036 55.1085 3.036C54.4005 3.036 51.9285 3.036 51.1725 3.036C50.7765 3.036 50.2725 3 49.8885 2.952ZM48.5085 6.012V7.584C48.8325 7.56 49.3005 7.548 49.6485 7.548C50.4045 7.548 56.8005 7.548 57.5085 7.548C57.8445 7.548 58.3125 7.56 58.6125 7.584V6.012C58.2885 6.072 57.7605 6.096 57.5085 6.096C56.8005 6.096 50.4045 6.096 49.6485 6.096C49.2765 6.096 48.8565 6.06 48.5085 6.012ZM54.6405 6.852L52.9725 6.864C52.9725 8.148 52.8165 9.288 52.2165 10.188C51.7365 10.896 50.8845 11.58 50.0325 11.916L51.4485 12.936C52.5165 12.396 53.4405 11.46 53.8605 10.632C54.3645 9.624 54.6405 8.424 54.6405 6.852ZM57.1125 2.124L56.1645 2.508C56.4885 2.976 56.8605 3.684 57.1005 4.176L58.0605 3.768C57.8445 3.324 57.4125 2.556 57.1125 2.124ZM58.5285 1.584L57.5805 1.968C57.9165 2.424 58.3005 3.12 58.5525 3.624L59.5005 3.216C59.2845 2.796 58.8405 2.028 58.5285 1.584ZM65.6685 11.736L66.6765 12.564C66.7965 12.48 66.9405 12.348 67.1925 12.216C68.5485 11.532 70.2645 10.236 71.2605 8.94L70.3485 7.608C69.5325 8.772 68.3565 9.72 67.3725 10.14C67.3725 9.408 67.3725 4.836 67.3725 3.876C67.3725 3.336 67.4565 2.856 67.4565 2.832H65.6805C65.6805 2.856 65.7645 3.324 65.7645 3.864C65.7645 4.836 65.7645 10.224 65.7645 10.86C65.7645 11.184 65.7285 11.508 65.6685 11.736ZM60.1125 11.568L61.5765 12.54C62.6085 11.628 63.3525 10.44 63.7245 9.096C64.0365 7.884 64.0725 5.352 64.0725 3.924C64.0725 3.432 64.1565 2.892 64.1565 2.844H62.3925C62.4645 3.144 62.5125 3.456 62.5125 3.948C62.5125 5.388 62.5005 7.668 62.1525 8.688C61.8285 9.72 61.1805 10.824 60.1125 11.568ZM77.4765 2.376L75.8925 2.244C75.8565 2.856 75.7005 3.588 75.4605 4.236C74.9565 5.556 74.0325 6.852 72.4965 8.268L73.7805 9.228C74.1885 8.7 74.5245 8.268 74.8845 7.908C75.3405 7.476 76.0965 7.08 76.7565 7.08C77.2605 7.08 77.7405 7.332 77.7405 8.1C77.7525 8.748 77.7285 9.768 77.6805 10.332H79.1205C79.1085 9.576 79.0725 8.268 79.0725 7.62C79.0725 6.504 78.3165 5.916 77.3205 5.916C76.9125 5.916 76.2765 6 75.9525 6.144C76.2885 5.664 76.6365 4.98 76.8885 4.392C77.2245 3.528 77.3805 2.82 77.4765 2.376ZM72.9525 3.492V4.884C73.6125 4.944 74.4885 4.968 74.9805 4.968C76.4445 4.968 78.8565 4.86 80.5485 4.62L80.5605 3.228C78.8205 3.54 76.6485 3.624 75.0645 3.624C74.4525 3.624 73.5645 3.576 72.9525 3.492ZM82.4565 6.9L81.8685 5.496C81.4125 5.724 80.9925 5.916 80.5245 6.12C79.8045 6.456 79.0485 6.744 77.9445 7.32C76.5045 8.04 74.7885 9.024 74.7885 10.692C74.7885 12.24 76.1925 12.708 78.0645 12.708C79.2045 12.708 80.6685 12.6 81.4725 12.492L81.5205 10.944C80.4645 11.16 79.1205 11.292 78.1005 11.292C76.9365 11.292 76.3605 11.112 76.3605 10.452C76.3605 9.792 76.9485 9.276 78.0405 8.712C79.1685 8.136 80.2485 7.704 81.0285 7.404C81.4365 7.248 82.0845 7.008 82.4565 6.9ZM88.3245 6.348V8.652H89.5965V7.464H93.7725V8.652H95.1045V6.348H88.3245ZM92.0565 8.052V11.364C92.0565 12.588 92.2845 12.996 93.3525 12.996C93.5445 12.996 93.9525 12.996 94.1565 12.996C95.0085 12.996 95.3445 12.516 95.4525 10.74C95.1045 10.656 94.5285 10.428 94.2765 10.212C94.2525 11.544 94.2045 11.736 94.0125 11.736C93.9285 11.736 93.6525 11.736 93.5805 11.736C93.4005 11.736 93.3885 11.7 93.3885 11.352V8.052H92.0565ZM89.9205 8.04C89.8605 10.08 89.6685 11.256 87.7845 11.952C88.0845 12.228 88.4685 12.768 88.6125 13.116C90.8445 12.192 91.1805 10.56 91.2645 8.04H89.9205ZM88.4565 2.712V3.876H95.0205V2.712H88.4565ZM88.8525 4.596V5.76H94.6605V4.596H88.8525ZM90.9405 1.8V5.196H92.3685V1.8H90.9405ZM84.5325 5.496V6.576H87.8805V5.496H84.5325ZM84.6045 2.184V3.276H87.8445V2.184H84.6045ZM84.5325 7.128V8.22H87.8805V7.128H84.5325ZM83.9925 3.804V4.944H88.2405V3.804H83.9925ZM85.1925 8.796V9.924H86.7285V11.292H85.1925V12.42H87.9045V8.796H85.1925ZM84.4965 8.796V12.924H85.6725V8.796H84.4965ZM98.2005 2.928L98.2605 4.464C98.5725 4.428 98.9925 4.38 99.2445 4.368C99.7845 4.332 100.829 4.296 101.309 4.284C100.949 5.028 100.457 6.204 100.037 7.152C99.6045 8.1 99.1725 9.204 98.7765 9.792C98.5485 10.092 98.3925 10.2 98.1525 10.2C97.8645 10.2 97.6365 9.996 97.6365 9.6C97.6365 8.724 98.6445 7.776 100.397 7.776C102.869 7.776 104.981 9.144 106.457 10.452L107.153 8.784C105.893 7.92 103.445 6.432 100.649 6.432C98.0805 6.432 96.2445 7.908 96.2445 9.828C96.2445 11.052 97.0365 11.772 98.0805 11.772C98.9085 11.772 99.4725 11.448 99.9525 10.716C100.445 9.96 101.021 8.532 101.501 7.428C102.041 6.18 102.689 4.632 103.097 3.948C103.193 3.792 103.337 3.636 103.493 3.456L102.545 2.7C102.329 2.784 102.017 2.856 101.717 2.88C101.165 2.928 99.8925 2.976 99.1965 2.976C98.9445 2.976 98.5245 2.952 98.2005 2.928ZM106.097 5.76L104.525 5.58C104.573 5.952 104.561 6.432 104.537 6.9C104.429 8.304 104.069 10.548 101.105 11.82L102.389 12.864C105.257 11.376 105.929 9.168 106.097 5.76ZM112.493 2.316V3.672H115.025V2.316H112.493ZM114.305 2.316V2.952H114.533C114.749 6.444 115.541 9.468 118.097 10.992C118.361 10.656 118.889 10.128 119.225 9.9C116.717 8.628 115.997 5.736 115.817 2.316H114.305ZM114.257 4.812C113.873 7.128 112.949 8.916 111.269 9.924C111.593 10.164 112.157 10.728 112.373 11.004C114.149 9.768 115.217 7.728 115.745 5.028L114.257 4.812ZM110.969 6.492H108.161V7.824H109.565V10.908H110.969V6.492ZM110.969 10.284H109.649C109.097 10.716 108.449 11.136 107.909 11.472L108.617 12.972C109.265 12.444 109.805 11.988 110.333 11.52C111.113 12.456 112.109 12.804 113.585 12.864C115.025 12.924 117.449 12.9 118.901 12.828C118.961 12.396 119.201 11.7 119.357 11.364C117.737 11.496 115.013 11.532 113.609 11.472C112.361 11.424 111.449 11.076 110.969 10.284ZM108.185 2.952C108.893 3.492 109.757 4.296 110.117 4.86L111.269 3.912C110.849 3.348 109.973 2.592 109.253 2.088L108.185 2.952ZM122.201 2.928L122.261 4.464C122.573 4.428 122.993 4.38 123.245 4.368C123.785 4.332 124.829 4.296 125.309 4.284C124.949 5.028 124.457 6.204 124.037 7.152C123.605 8.1 123.173 9.204 122.777 9.792C122.549 10.092 122.393 10.2 122.153 10.2C121.865 10.2 121.637 9.996 121.637 9.6C121.637 8.724 122.645 7.776 124.397 7.776C126.869 7.776 128.981 9.144 130.457 10.452L131.153 8.784C129.893 7.92 127.445 6.432 124.649 6.432C122.081 6.432 120.245 7.908 120.245 9.828C120.245 11.052 121.037 11.772 122.081 11.772C122.909 11.772 123.473 11.448 123.953 10.716C124.445 9.96 125.021 8.532 125.501 7.428C126.041 6.18 126.689 4.632 127.097 3.948C127.193 3.792 127.337 3.636 127.493 3.456L126.545 2.7C126.329 2.784 126.017 2.856 125.717 2.88C125.165 2.928 123.893 2.976 123.197 2.976C122.945 2.976 122.525 2.952 122.201 2.928ZM130.097 5.76L128.525 5.58C128.573 5.952 128.561 6.432 128.537 6.9C128.429 8.304 128.069 10.548 125.105 11.82L126.389 12.864C129.257 11.376 129.929 9.168 130.097 5.76ZM132.689 3.9V9.984H134.141V5.316H141.101V9.924H142.613V3.9H132.689ZM133.445 7.896V9.312H141.941V7.896H133.445ZM136.853 1.812V13.08H138.377V1.812H136.853ZM145.589 12.168C146.213 12.168 146.693 11.676 146.693 11.016C146.693 10.356 146.213 9.876 145.589 9.876C144.953 9.876 144.497 10.356 144.497 11.016C144.497 11.676 144.953 12.168 145.589 12.168ZM149.491 12.168C150.115 12.168 150.595 11.676 150.595 11.016C150.595 10.356 150.115 9.876 149.491 9.876C148.855 9.876 148.399 10.356 148.399 11.016C148.399 11.676 148.855 12.168 149.491 12.168ZM153.393 12.168C154.017 12.168 154.497 11.676 154.497 11.016C154.497 10.356 154.017 9.876 153.393 9.876C152.757 9.876 152.301 10.356 152.301 11.016C152.301 11.676 152.757 12.168 153.393 12.168Z" fill="#FF733B"/><path fill-rule="evenodd" clip-rule="evenodd" d="M7 3.5C5.067 3.5 3.5 5.067 3.5 7C3.5 8.933 5.067 10.5 7 10.5V13.5C3.41015 13.5 0.5 10.5899 0.5 7C0.5 3.41015 3.41015 0.5 7 0.5C10.5899 0.5 13.5 3.41015 13.5 7H10.5C10.5 5.067 8.933 3.5 7 3.5Z" fill="url(#paint0_angular_0_1)"/><defs><radialGradient id="paint0_angular_0_1" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(7 7) rotate(90) scale(5)"><stop stop-color="#FF733B"/><stop offset="0.755208" stop-color="#FF733B" stop-opacity="0"/></radialGradient></defs></svg>'
      loadingText.classList.add('figni-viewer-loading-text')
      loadingProgressBar.appendChild(loadingText)
      this.appendChild(this.#loadingPanel)
      this.addEventListener('progress', (e) => {
        const p = e.detail.totalProgress
        loadingProgressBar.style.setProperty(
          '--figni-viewer-progress',
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

  get #interactionTime() {
    return Number(
      (
        this.#sumInteractionTime +
        (this.#isInteracting ? performance.now() - this.#interactedTime : 0)
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

customElements.define('figni-viewer-base', FigniViewerBaseElement)
customElements.define('figni-viewer', FigniViewerElement)
