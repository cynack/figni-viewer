import {ModelViewerElement} from '@google/model-viewer';
import axios from 'axios';

const API_BASE = 'https://api.stg.figni.store/api';

class FigniViewerElement extends ModelViewerElement {
  static #OBSERVED_ATTRIBUTE = ['item_id', 'token', 'model_index'];

  #itemId;
  #token;
  #modelIndex;

  constructor() {
    super();
  }
  async connectedCallback() {
    super.connectedCallback();

    // 値の取得
    this.#itemId = this.getAttribute('item_id');
    this.#token = this.getAttribute('token');
    this.#modelIndex = Number(this.getAttribute('model_index')) || 0;

    // axios のテスト
    // const res = await axios.get('https://randomuser.me/api/');
    // const modelPosterSrc = res.data.results[0].picture.large;

    // Attribute
    this.setAttribute('seamless-poster', true);
    this.setAttribute('loading', 'eager');
    // this.setAttribute('reveal', 'intaraction');
    this.setAttribute('camera-controls', '');
    this.setAttribute('ar', '');
    this.setAttribute('ar-modes', 'quick-look scene-viewer webxr');
    this.setAttribute('ar-scale', 'fixed');
    this.setAttribute('ar-placement', 'floor');
    this.setAttribute('interaction-prompt', 'none');
    this.setAttribute('camera-orbit', '45deg 55deg 2.5m');

    // CSS
    this.style.setProperty('--poster-color', 'transparent');

    // Parts
    const pb = this.shadowRoot.querySelector('[part="default-progress-bar"]');
    pb.style.backgroundColor = '#FF4733';

    // Properties
    // console.log(this.canActivateAR);

    // Methods
    // console.log(this.getDimensions());

    // * デバッグ用
    const version = document.createElement('span');
    version.textContent = Math.random().toString(32).substring(2);
    version.style.position = 'absolute';
    version.style.right = '0';
    version.style.bottom = '0';
    this.shadowRoot.appendChild(version);
  }

  static get observedAttributes() {
    return super.observedAttributes.concat(
        FigniViewerElement.#OBSERVED_ATTRIBUTE,
    );
  }

  async attributeChangedCallback(name, oldValue, newValue) {
    super.attributeChangedCallback(name, oldValue, newValue);
    if (oldValue != newValue) {
      if (FigniViewerElement.#OBSERVED_ATTRIBUTE.includes(name)) {
        switch (name) {
          case 'item_id': this.#itemId = newValue; break;
          case 'token': this.#token = newValue; break;
          case 'model_index': this.#modelIndex = newValue; break;
        }
        await this.requestModel();
      }
    }
  }

  async requestModel() {
    if (this.#itemId && this.#token && this.#modelIndex) {
      const res = await axios.get(`${API_BASE}/item/${this.#itemId}/model`, {
        headers: {
          'accept': 'application/json',
          'X-Figni-Client-Token': this.#token,
        },
      });
      if (res.data.length <= this.#modelIndex) {
        throw new Error('invalid model_index');
      }
      this.setAttribute('src', res.data[this.#modelIndex].url);
      console.log(res);
    }
  }

  /**
   * モデルを指定した角度に回転する
   * @param {number} theta - 方位角(度)
   * @param {number} phi - 極角(度)
   * @param {number} radius - 中心からの半径(%)
   */
  rotateTo(theta, phi, radius) {
    this.setAttribute('camera-orbit', `${theta}deg ${phi}deg ${radius}%`);
  }

  rotateReset() {
    this.setAttribute('camera-orbit', `auto auto auto`);
  }

  async downloadScreenshot() {
    const blob = await this.toBlob({idealAspect: true});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'model.png';
    a.click();
    URL.revokeObjectURL(url);
  }
}

customElements.define('figni-viewer', FigniViewerElement);
