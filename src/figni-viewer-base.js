/* eslint-disable no-undef */
import ky from 'ky'
import { endMesure, getElapsedTime, getSumTime, startMesure } from './mesure'
import { ModelViewerElement } from './model-viewer.min.js'

const VIEW_THRESHOLD = 0.7
const SETTINGS = {
  MAX_CAMERA_ORBIT: 'auto 180deg 200%',
  MIN_CAMERA_ORBIT: 'auto 0deg auto',
}

export default class FigniViewerBaseElement extends ModelViewerElement {
  // element
  #style

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
  #customData = {}

  async connectedCallback() {
    super.connectedCallback()

    this.#setupModelViewer()

    if (!this.#style) {
      this.#style = document.createElement('style')
      this.#style.textContent = `
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
      this.appendChild(this.#style)
    }
  }

  /**
   * 商品ID、トークンおよびタグから3DモデルのURLを取得する
   * @param {string} itemId 商品ID
   * @param {string} token トークン
   * @param {string} modelTag モデルタグ
   * @param {boolean} staging stg向けか
   * @returns {Promise<{glb: string, usdz: string}>} 3DモデルのURL
   */
  async fetchModelUrl(itemId, token, modelTag = null, staging = false) {
    if (itemId && token) {
      const host = staging ? 'https://api.stg.figni.io/api' : API_BASE
      const url = `${host}/item/${itemId}/model_search${
        modelTag ? `?tag=${modelTag}` : ''
      }`
      const res = await ky
        .get(url, {
          headers: {
            accept: 'application/json',
            'X-Figni-Client-Token': token,
            'X-Figni-Client-Version': VERSION,
          },
        })
        .json()
      if (res.length === 0) {
        throw new Error('NoModelFound')
      }
      const ret = { glb: '', usdz: '' }
      const glb = res.find((model) => model.format === 'glb')
      if (glb) {
        ret.glb = glb.url
      }
      const usdz = res.find((model) => model.format === 'usdz')
      if (usdz) {
        ret.usdz = usdz.url
      }
      return ret
    } else {
      throw new ReferenceError('NotSetItemIdOrClientToken')
    }
  }

  /**
   * アイテムIDとトークン(とタグ)から3DモデルのURLを取得して model-viewer にセットする
   * @param {string} itemId アイテムID
   * @param {string} token トークン
   * @param {string} modelTag モデルのタグ
   * @param {{tags: string[], staging: boolean}} options オプション
   */
  async loadModel(
    itemId,
    token,
    modelTag = null,
    options = { tags: [], staging: false }
  ) {
    const { tags = [], staging = false } = options
    const urls = await this.fetchModelUrl(itemId, token, modelTag, staging)
    if (urls.glb) {
      this.src = urls.glb
    }
    if (urls.usdz) {
      this.iosSrc = urls.usdz
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

    this.#initializeWebSocket(itemId, token, tags, staging)
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
   * カメラの垂直方向の視野を設定する
   * @param {string} fov 角度("deg", "rad", etc.)
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
    endMesure('initial-interaction-from-display-time')
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
    endMesure('initial-interaction-from-display-time')
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
   * WebSocketでサーバーに送信するデータを変更または追加する
   * @param {string} key キー
   * @param {any} value 値
   * @param {"set"|"add"|"sub"|"delete"} action 操作
   */
  updateCustomData(key, value, action) {
    try {
      switch (action) {
        case 'set': {
          this.#customData[key] = value
          break
        }
        case 'add': {
          if (key in this.#customData) {
            if (['number', 'string'].includes(typeof this.#customData[key])) {
              this.#customData[key] += value
            } else if (Array.isArray(this.#customData[key])) {
              this.#customData[key].push(value)
            } else {
              this.#customData[key] = value
            }
          } else {
            this.#customData[key] = value
          }
          break
        }
        case 'sub': {
          if (key in this.#customData) {
            if (['number'].includes(typeof this.#customData[key])) {
              this.#customData[key] -= value
            } else if (Array.isArray(this.#customData[key])) {
              this.#customData[key].pop()
            }
          }
          break
        }
        case 'delete': {
          delete this.#customData[key]
          break
        }
      }
    } catch (e) {
      throw new Error(`Failed to update custom data: ${e.message}`)
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
    this.disablePan = true
    this.disableTap = true
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

  async #initializeWebSocket(itemId, token, tags = [], staging = false) {
    if (this.#websocket) {
      this.#websocket.close()
    }

    const host = staging ? 'https://api.stg.figni.io/api' : API_BASE
    const url = `${host}/config`
    const res = await ky
      .get(url, {
        headers: { 'X-Figni-Client-Token': token },
      })
      .json()

    const canAnalytics = res?.analytics === true
    if (canAnalytics) {
      this.#websocket = new WebSocket(
        staging ? 'wss://api.stg.figni.io/ws' : WEBSOCKET_BASE
      )

      startMesure('stay-time')
      startMesure('initial-model-view-time')
      startMesure('initial-ar-use-time')
      startMesure('initial-interaction-time')
      let wasInViewport = this.#isInViewport
      if (wasInViewport) {
        startMesure('display-time')
        if (getSumTime('initial-interaction-from-display-time') === 0) {
          startMesure('initial-interaction-from-display-time', true)
        }
      }
      this.#registerEventListener(
        'scroll',
        () => {
          if (!wasInViewport && this.#isInViewport) {
            startMesure('display-time')
            if (getSumTime('initial-interaction-from-display-time') === 0) {
              startMesure('initial-interaction-from-display-time', true)
            }
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
        endMesure('initial-interaction-from-display-time')
      })
      this.#registerEventListener('interaction-end', () => {
        endMesure('interaction-time')
      })

      this.#customData.tags = tags

      const sender = setInterval(() => {
        if (this.#websocket.readyState === WebSocket.OPEN) {
          this.#websocket.send(
            JSON.stringify({
              item_id: itemId,
              client_token: token,
              client_version: VERSION,
              stay_time: this.#stayTime,
              display_time: this.#displayTime,
              view_time: this.#viewTime,
              interaction_time: this.#interactionTime,
              initial_model_view_time: this.#initialModelViewTime,
              initial_interaction_time: this.#initialInteractionTime,
              initial_interaction_from_display_time:
                this.#initialInteractionFromDisplayTime,
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
              custom_data: this.#customData,
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

  get #initialInteractionFromDisplayTime() {
    return Number(
      getElapsedTime('initial-interaction-from-display-time').toFixed(2)
    )
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
