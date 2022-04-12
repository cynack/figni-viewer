import axios from 'axios'
import { ModelViewerElement } from './model-viewer'

const VIEW_THRESHOLD = 0.7

export default class FigniViewerBaseElement extends ModelViewerElement {
  // public field
  itemId
  token
  modelTag

  // analytics data
  #websocket
  #initializeTime = 0
  #initializeModelTime = Infinity
  #initializeArViewTIme = Infinity
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
  }

  async initializeWebSocket() {
    if (this.#websocket) {
      this.#websocket.close()
    }

    const { data } = await axios.get(`${API_BASE}/config`, {
      headers: { 'X-Figni-Client-Token': this.token },
    })

    if (data?.analytics) {
      this.#websocket = new WebSocket(WEBSOCKET_BASE)

      this.#initializeTime = performance.now()
      const wasInViewport = this.#isInViewport
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

      setInterval(() => {
        if (this.#websocket.readyState === WebSocket.OPEN) {
          this.#websocket.send(
            JSON.stringify({
              item_id: this.itemId,
              client_token: this.token,
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
        }
      })
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
        this.#initializeModelTime
      ).toFixed(2)
    )
  }

  get #arViewTime() {
    return Number(
      Math.min(
        Math.max(performance.now() - this.#initializeTime, 0),
        this.#initializeArViewTIme
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
