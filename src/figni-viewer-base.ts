import ky from 'ky'
import ModelViewerElement from './model-viewer'
import {
  LoadModelOptions,
  LoadModelResponse,
  ModelViewerProgressEvent,
} from './type'

// These are defined in esbuild define plugin
declare const API_BASE: string
declare const VERSION: string

export default class FigniViewerBaseElement extends ModelViewerElement {
  constructor() {
    super()

    this.loading = 'lazy'
    this.cameraControls = true
    this.ar = true
    this.arModes = 'scene-viewer quick-look'
    this.arScale = 'fixed'
    this.arPlacement = 'floor'
    this.shadowIntensity = 1
    this.minimumRenderScale = 0.25
    this.animationCrossfadeDuration = 0
    this.maxCameraOrbit = 'auto 180deg 200%'
    this.minCameraOrbit = 'auto 0deg auto'
    this.disablePan = true
    this.disableTap = true
  }

  async loadModel(
    itemId: string,
    token: string,
    modelTag: string = '',
    options: LoadModelOptions = { tags: [], staging: false }
  ) {
    if (itemId && token) {
      const { tags, staging } = options
      const host = staging ? 'https://api.stg.figni.io/api' : API_BASE
      const url = `${host}/item/${itemId}/model_search${
        modelTag ? `?tag=${modelTag}` : ''
      }`
      const res: LoadModelResponse = await ky
        .get(url, {
          headers: {
            accept: 'application/json',
            'X-Figni-Client-Token': token,
            'X-Figni-Client-Version': VERSION,
          },
        })
        .json()
      if (res.length === 0) {
        throw new ReferenceError('there is no model')
      }
      const glb = res.find((model) => model.format === 'glb')
      if (glb) {
        this.src = glb.url
      }
      const usdz = res.find((model) => model.format === 'usdz')
      if (usdz) {
        this.iosSrc = usdz.url
      } else {
        this.iosSrc = ''
      }

      const progress = (event: ModelViewerProgressEvent) => {
        console.log(event.detail.totalProgress)
        if (event.detail.totalProgress === 1) {
          this.removeEventListener('progress', progress)
        }
      }
      this.addEventListener('progress', progress)
    } else {
      throw new ReferenceError('itemId and token are required')
    }
  }

  #websocket: WebSocket
  async #connectWebSocket() {
    if (this.#websocket) {
      this.#websocket.close()
    }
  }
}
