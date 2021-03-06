import axios from 'axios'
import { endMesure, getElapsedTime, startMesure } from './mesure'
import { ModelViewerElement } from './model-viewer'

const VIEW_THRESHOLD = 0.7
const SETTINGS = {
  MAX_CAMERA_ORBIT: 'auto 180deg 200%',
  MIN_CAMERA_ORBIT: 'auto 0deg auto',
}

export default class FigniViewerBaseElement extends ModelViewerElement {
  // analytics data
  #websocket
  #arCount = 0
  #wantUseArCount = 0
  #hotspotClickCount = {}
  #animationPlayCount = {}
  #panelViewCount = {}
  #helpPageViewCount = {}
  #abtest = {}
  #events = {}

  async connectedCallback() {
    super.connectedCallback()

    this.#setupModelViewer()

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
   * @param {string[]} tag タグの配列
   * @param {boolean} isStaging stagig 環境向けか
   */
  async loadModel(itemId, token, modelTag = null, tag = [], isStaging = false) {
    if (itemId && token) {
      const tagStr = modelTag ? `?tag=${modelTag}` : ''
      let apiBase = API_BASE
      if (isStaging) {
        apiBase = 'https://api.stg.figni.io/api'
      }
      const res = await axios.get(
        `${apiBase}/item/${itemId}/model_search${tagStr}`,
        {
          headers: {
            accept: 'application/json',
            'X-Figni-Client-Token': token,
            'X-Figni-Client-Version': VERSION,
          },
        }
      )
      if (res.data.length === 0) {
        throw new Error('ErrNoModelFound')
      }
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

      this.#unregisterEventListener()

      const id = this.#registerEventListener('progress', (e) => {
        if (e.detail.totalProgress == 1) {
          endMesure('initial-model-view-time')
          this.#unregisterEventListener(id)
        }
      })

      this.#initializeWebSocket(itemId, token, tag, isStaging)
    } else {
      throw new ReferenceError('ErrNotSetItemIdOrClientToken')
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
   * カメラのFoVを設定する
   * @param {string} fov
   */
  setFieldOfView(fov) {
    this.fieldOfView = fov
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
    startMesure('view-time')
    endMesure('initial-interaction-time')
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
   * ARの起動を試みる
   */
  tryActivateAR() {
    this.#wantUseArCount++
    startMesure('view-time')
    endMesure('initial-interaction-time')
    if (this.canActivateAR) {
      this.#arCount++
      if (this.#arCount == 1) {
        endMesure('initial-ar-use-time')
      }
    }
  }

  /**
   * カメラ操作ができることを強調するプロンプトを消す
   */
  disableInteractionPrompt() {
    this.interactionPrompt = 'none'
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
      this.timeScale = options.reverse ? -1 : 1
      this.play({ repetitions: loopCount })
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
      }
      if (!this.loop) {
        this.#registerEventListener('finished', onFinishFunc, { once: true })
      } else {
        onFinishFunc()
      }
      this.incrementAnimationPlayCount(clip)
    }
  }

  /**
   * ABテストの結果を設定する
   * @param {string} testName テストの名前
   * @param {string|number} result 結果
   */
  registerABTestResult(testName, result) {
    this.#abtest[testName] = result
  }

  /**
   * ヘルプページの閲覧時間の計測を始める
   * @param {string} helpPageName ヘルプページ名
   */
  startMesureHelpPage(helpPageName) {
    startMesure('help-page-view-time-' + helpPageName)
    if (!this.#helpPageViewCount[helpPageName]) {
      this.#helpPageViewCount[helpPageName] = {
        views: 1,
        get length() {
          return getElapsedTime('help-page-view-time-' + helpPageName)
        },
      }
    } else {
      this.#helpPageViewCount[helpPageName].views++
    }
  }

  /**
   * ヘルプページの閲覧時間の計測を終わる
   * @param {string} helpPageName ヘルプページ名
   */
  endMesureHelpPage(helpPageName) {
    endMesure('help-page-view-time-' + helpPageName)
  }

  /**
   * パネルの閲覧時間の計測を始める
   * @param {string} panelName パネル名
   */
  startMesurePanel(panelName) {
    startMesure('panel-view-time-' + panelName)
    if (!this.#panelViewCount[panelName]) {
      this.#panelViewCount[panelName] = {
        views: 1,
        get length() {
          return getElapsedTime('panel-view-time-' + panelName)
        },
      }
    } else {
      this.#panelViewCount[panelName].views++
    }
  }

  /**
   * パネルの閲覧時間の計測を終わる
   * @param {string} panelName パネル名
   */
  endMesurePanel(panelName) {
    endMesure('panel-view-time-' + panelName)
  }

  #setupModelViewer() {
    this.loading = 'lazy'
    this.cameraControls = true
    this.ar = true
    this.arModes = 'scene-viewer quick-look'
    this.arScale = 'fixed'
    this.arPlacement = 'floor'
    this.shadowIntensity = 1
    this.minimumRenderScale = 0.25
    this.animationCrossfadeDuration = 0
    this.maxCameraOrbit = SETTINGS.MAX_CAMERA_ORBIT
    this.minCameraOrbit = SETTINGS.MIN_CAMERA_ORBIT
  }

  #registerEventListener(eventName, callback, options, target = this) {
    const id =
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15)
    target.addEventListener(eventName, callback, options)
    this.#events[id] = { eventName, callback, target }
    return id
  }

  #unregisterEventListener(id = null) {
    if (id) {
      this.#events[id].target.removeEventListener(
        this.#events[id].eventName,
        this.#events[id].callback
      )
      delete this.#events[id]
    } else {
      Object.keys(this.#events).forEach((key) => {
        this.#events[key].target.removeEventListener(
          this.#events[key].eventName,
          this.#events[key].callback
        )
      })
      this.#events = {}
    }
  }

  async #initializeWebSocket(itemId, token, tag = [], isStaging = false) {
    if (this.#websocket) {
      this.#websocket.close()
    }

    let apiBase = API_BASE
    if (isStaging) {
      apiBase = 'https://api.stg.figni.io/api'
    }
    const { data } = await axios.get(`${apiBase}/config`, {
      headers: { 'X-Figni-Client-Token': token },
    })

    const canAnalytics = data?.analytics === true
    if (canAnalytics) {
      let websocketBase = WEBSOCKET_BASE
      if (isStaging) {
        websocketBase = 'wss://api.stg.figni.io/ws'
      }
      this.#websocket = new WebSocket(websocketBase)

      startMesure('stay-time')
      startMesure('initial-model-view-time')
      startMesure('initial-ar-use-time')
      startMesure('initial-interaction-time')
      let wasInViewport = this.#isInViewport
      if (wasInViewport) {
        startMesure('display-time')
      }
      this.#registerEventListener(
        'scroll',
        () => {
          if (!wasInViewport && this.#isInViewport) {
            startMesure('display-time')
          } else if (wasInViewport && !this.#isInViewport) {
            endMesure('display-time')
            endMesure('view-time')
          }
          wasInViewport = this.#isInViewport
        },
        {},
        window
      )

      let callback = null
      let flag = false
      const interactionStartEvent = new CustomEvent('interaction-start')
      const interactionEndEvent = new CustomEvent('interaction-end')
      this.#registerEventListener('camera-change', (e) => {
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
      this.#registerEventListener('interaction-start', () => {
        startMesure('view-time')
        startMesure('interaction-time')
        endMesure('initial-interaction-time')
      })
      this.#registerEventListener('interaction-end', () => {
        endMesure('interaction-time')
      })

      const sender = setInterval(() => {
        if (this.#websocket.readyState === WebSocket.OPEN) {
          this.#websocket.send(
            JSON.stringify({
              item_id: itemId,
              tag: tag,
              client_token: token,
              client_version: VERSION,
              stay_time: this.#stayTime,
              display_time: this.#displayTime,
              view_time: this.#viewTime,
              interaction_time: this.#interactionTime,
              initial_model_view_time: this.#initialModelViewTime,
              initial_interaction_time: this.#initialInteractionTime,
              ar_count: this.#arCount,
              want_use_ar_count: this.#wantUseArCount,
              initial_ar_use_time: this.#initialArUseTime,
              hotspot_click: this.#hotspotClickCount,
              animation_play: this.#animationPlayCount,
              current_camera_target: this.#currentCameraTarget,
              current_camera_orbit: this.#currentCameraOrbit,
              abtest: this.#abtest,
              help_page_view: this.#helpPageViewCount,
              panel_view: this.#panelViewCount,
            })
          )
        } else {
          console.error('Disconnect analytics server.')
          this.#websocket.close()
          clearInterval(sender)
        }
      }, 1000)
    }
  }

  get #stayTime() {
    return Number(getElapsedTime('stay-time').toFixed(2))
  }

  get #displayTime() {
    return Number(getElapsedTime('display-time').toFixed(2))
  }

  get #viewTime() {
    return Number(getElapsedTime('view-time').toFixed(2))
  }

  get #interactionTime() {
    return Number(getElapsedTime('interaction-time').toFixed(2))
  }

  get #initialModelViewTime() {
    return Number(getElapsedTime('initial-model-view-time').toFixed(2))
  }

  get #initialArUseTime() {
    return Number(getElapsedTime('initial-ar-use-time').toFixed(2))
  }

  get #initialInteractionTime() {
    return Number(getElapsedTime('initial-interaction-time').toFixed(2))
  }

  get #isInViewport() {
    const rect = this.parentElement.getBoundingClientRect()
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

  get #currentCameraTarget() {
    const { x, y, z } = this.getCameraTarget()
    return { x, y, z }
  }

  get #currentCameraOrbit() {
    const { theta, phi, radius } = this.getCameraOrbit()
    return {
      theta: theta * (180 / Math.PI),
      phi: phi * (180 / Math.PI),
      radius,
    }
  }
}
