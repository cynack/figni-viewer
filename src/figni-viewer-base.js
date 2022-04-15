import axios from 'axios'
import { ModelViewerElement } from './model-viewer'

const VIEW_THRESHOLD = 0.7
const SETTINGS = {
  MAX_CAMERA_ORBIT: 'auto 180deg 200%',
  MIN_CAMERA_ORBIT: 'auto 0deg auto',
}

export default class FigniViewerBaseElement extends ModelViewerElement {
  // analytics data
  #websocket
  #initializeTime = 0
  #initializeModelTime = Infinity
  #initializeArViewTime = Infinity
  #appearedTime = 0
  #sumViewTime = 0
  #isInteracting = false
  #interactedTime = 0
  #sumInteractedTime = 0
  #arCount
  #hotspotClickCount = {}
  #animationPlayCount = {}

  constructor() {
    super()

    // model-viewer setup
    this.#setupModelViewer()
  }

  async connectedCallback() {
    super.connectedCallback()

    const style = document.createElement('style')
    style.textContent = `
      :not(style[outline="none"]) {
        outline: none !important;
      }
      ::part(default-progress-bar) {
        display: none;
      }
      ::part(default-ar-button) {
        display: none;
      }
    `
    this.appendChild(style)
  }

  /**
   * アイテムIDとトークン(とタグ)から3DモデルのURLを取得して model-viewer にセットする
   * @param {string} itemId アイテムID
   * @param {string} token トークン
   * @param {string} modelTag モデルのタグ
   */
  async loadModel(itemId, token, modelTag = null) {
    if (itemId && token) {
      const tag = modelTag ? `?tag=${modelTag}` : ''
      const res = await axios.get(
        `${API_BASE}/item/${itemId}/model_search${tag}`,
        {
          headers: {
            accept: 'application/json',
            'X-Figni-Client-Token': token,
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

      const progress = (e) => {
        if (e.detail.progress == 1) {
          this.#initializeModelTime = performance.now()
          this.removeEventListener('progress', progress)
        }
      }
      this.addEventListener('progress', progress)

      this.#initializeWebSocket(itemId, token)
    } else {
      throw new ReferenceError('item-id or token is not set.')
    }
  }

  /**
   * カメラ位置の基準となる座標を設定する
   * @param {string} target 座標("x y z")
   */
  setCameraTarget(target) {
    this.cameraTarget = target
  }

  /**
   * カメラ位置の基準となる座標からの極座標を設定する
   * @param {string} orbit 極座標("deg deg %", "rad rad m", etc.)
   */
  setCameraOrbit(orbit) {
    this.cameraOrbit = orbit
  }

  /**
   * キャプションのクリック回数をカウントする
   * @param {string} hotspotId キャプション名
   */
  incrementHotspotClickCount(hotspotId) {
    if (this.#hotspotClickCount[hotspotId]) {
      this.#hotspotClickCount[hotspotId]++
    } else {
      this.#hotspotClickCount[hotspotId] = 1
    }
  }

  /**
   * アニメーションの再生回数をカウントする
   * @param {string} animationId アニメーション名
   */
  incrementAnimationPlayCount(animationId) {
    if (this.#animationPlayCount[animationId]) {
      this.#animationPlayCount[animationId]++
    } else {
      this.#animationPlayCount[animationId] = 1
    }
  }

  /**
   * ARを起動する
   */
  activateARMode() {
    if (this.canActivateAR) {
      this.#arCount++
      if (this.#arCount == 1) {
        this.#initializeArViewTime = performance.now()
      }
      this.activateAR()
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
      const isLoop = loopCount === Infinity
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
        if (!isLoop) {
          if (options.onEnd) {
            if (typeof options.onEnd === 'function') {
              options.onEnd()
            } else {
              throw new TypeError('onEnd must be a function')
            }
          }
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
      this.incrementAnimationPlayCount(clip)
    }
  }

  #setupModelViewer() {
    this.loading = 'lazy'
    this.cameraControls = true
    this.ar = true
    this.arModes = 'webxr scene-viewer quick-look'
    this.arScale = 'fixed'
    this.arPlacement = 'floor'
    // this.interactionPrompt = 'auto'
    // this.interactionPromptStyle = 'basic'
    // this.interactionPromptThreshold = 0
    this.shadowIntensity = 1
    this.minimumRenderScale = 0.25
    this.animationCrossfadeDuration = 0
    this.maxCameraOrbit = SETTINGS.MAX_CAMERA_ORBIT
    this.minCameraOrbit = SETTINGS.MIN_CAMERA_ORBIT
  }

  async #initializeWebSocket(itemId, token) {
    if (this.#websocket) {
      this.#websocket.close()
    }

    const { data } = await axios.get(`${API_BASE}/config`, {
      headers: { 'X-Figni-Client-Token': token },
    })

    if (data?.analytics) {
      this.#websocket = new WebSocket(WEBSOCKET_BASE)

      this.#initializeTime = performance.now()
      this.#initializeArViewTime = Infinity
      this.#initializeModelTime = Infinity
      let wasInViewport = this.#isInViewport
      if (wasInViewport) {
        this.#appearedTime = performance.now()
      }

      window.addEventListener('scroll', () => {
        if (!wasInViewport && this.#isInViewport) {
          this.#appearedTime = performance.now()
        } else if (wasInViewport && !this.#isInViewport) {
          this.#sumViewTime += performance.now() - this.#appearedTime
        }
        wasInViewport = this.#isInViewport
      })

      let callback = null
      let flag = false
      const interactionStartEvent = new CustomEvent('interaction-start')
      const interactionEndEvent = new CustomEvent('interaction-end')
      this.addEventListener('camera-change', (e) => {
        if (e.detail.source === 'user-interaction') {
          if (callback) {
            clearTimeout(callback)
          }
          if (!flag) {
            this.dispatchEvent(interactionStartEvent)
          }
          flag = true
          callback = setTimeout(() => {
            this.dispatchEvent(interactionEndEvent)
            flag = false
          }, 50)
        }
      })
      this.addEventListener('interaction-start', () => {
        this.#isInteracting = true
        this.#interactedTime = performance.now()
      })
      this.addEventListener('interaction-end', () => {
        this.#isInteracting = false
        this.#sumInteractedTime += performance.now() - this.#interactedTime
      })

      const sendAnalyticsData = setInterval(() => {
        if (this.#websocket.readyState === WebSocket.OPEN) {
          this.#websocket.send(
            JSON.stringify({
              item_id: itemId,
              client_token: token,
              client_version: VERSION,
              stay_time: this.#stayTime,
              view_time: this.#viewTime,
              interaction_time: this.#interactionTime,
              model_view_time: this.#modelViewTime,
              ar_count: this.#arCount,
              ar_view_time: this.#arViewTime,
              hotspot_click: this.#hotspotClickCount,
              animation_play: this.#animationPlayCount,
            })
          )
        } else {
          console.error('Cannot send analytics data. Reconnecting...')
          clearInterval(sendAnalyticsData)
          this.#initializeWebSocket(itemId, token)
        }
      }, 1000)
    }
  }

  get #stayTime() {
    return Number((performance.now() - this.#initializeTime).toFixed(2))
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
        this.#sumInteractedTime +
        (this.#isInteracting ? performance.now() - this.#interactedTime : 0)
      ).toFixed(2)
    )
  }

  get #modelViewTime() {
    return Number(
      Math.min(
        Math.max(performance.now() - this.#initializeTime, 0),
        this.#initializeModelTime - this.#initializeTime
      ).toFixed(2)
    )
  }

  get #arViewTime() {
    return Number(
      Math.min(
        Math.max(performance.now() - this.#initializeTime, 0),
        this.#initializeArViewTime - this.#initializeTime
      ).toFixed(2)
    )
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
}
