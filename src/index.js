import {ModelViewerElement} from '@google/model-viewer';
import axios from 'axios';

const API_BASE = 'https://api.stg.figni.store/api';

class FigniViewerElement extends ModelViewerElement {
  static #OBSERVED_ATTRIBUTE = ['item-id', 'token', 'model-tag'];

  #itemId;
  #token;
  #modelTag;

  constructor() {
    super();
  }
  async connectedCallback() {
    super.connectedCallback();

    const self = this;

    // 値の取得
    this.#itemId = this.getAttribute('item-id');
    this.#token = this.getAttribute('token');
    this.#modelTag = this.getAttribute('model-tag') || '';

    // axios のテスト
    // const res = await axios.get('https://randomuser.me/api/');
    // const modelPosterSrc = res.data.results[0].picture.large;

    // Attribute
    this.setAttribute('seamless-poster', true);
    this.setAttribute('loading', 'eager');
    // this.setAttribute('reveal', 'intaraction');
    this.setAttribute('camera-controls', '');
    this.setAttribute('ar', '');
    this.setAttribute('ar-modes', 'webxr scene-viewer quick-look');
    this.setAttribute('ar-scale', 'fixed');
    this.setAttribute('ar-placement', 'floor');
    this.setAttribute('interaction-prompt', 'none');
    // this.setAttribute('camera-orbit', '45deg 55deg 105%');

    // CSS
    this.style.setProperty('--poster-color', 'transparent');

    // Parts
    const pb = this.shadowRoot.querySelector('[part="default-progress-bar"]');
    pb.style.backgroundColor = '#FF4733';

    // Properties
    // console.log(this.canActivateAR);

    // Methods
    // console.log(this.getDimensions());

    // Events
    // this.addEventListener('camera-change', (eve) => {
    //   console.log(eve.detail);
    // });

    const hotspot = this.querySelector('button[slot="hotspot-anime"]');
    hotspot.onclick = () => {
      if (window.getComputedStyle(hotspot).opacity == 1) {
        const anime = hotspot.getAttribute('anime-clip');
        const lenth = Number(hotspot.getAttribute('anime-length')) || 0;
        if (self.availableAnimations.includes(anime)) {
          self.setAttribute('animation-name', anime);
          self.currentTime = 0;
          self.play();
          if (lenth > 0) {
            setTimeout(() => self.pause(), lenth);
          }
        }
      }
    };

    const style = document.createElement('style');
    style.textContent = `
      figni-viewer > button {
        display: block;
        width: 20px;
        height: 20px;
        border-radius: 10px;
        border: none;
        background-color: blue;
        box-sizing: border-box;
      }
    `;
    this.appendChild(style);

    // * デバッグ用
    const version = document.createElement('span');
    version.textContent = '2';
    version.style.position = 'absolute';
    version.style.right = '0';
    version.style.bottom = '0';
    this.shadowRoot.appendChild(version);
    /*
    this.addEventListener('mousedown', (eve) => {
      const hit = self.positionAndNormalFromPoint(eve.clientX, eve.clientY);
      console.log(hit);
    }, true);
    */
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
          case 'item-id': this.#itemId = newValue; break;
          case 'token': this.#token = newValue; break;
          case 'model-tag': this.#modelTag = newValue; break;
        }
        await this.requestModel();
      }
    }
  }

  async requestModel() {
    if (this.#itemId && this.#token) {
      const tag = this.#modelTag ? `?tag=${this.#modelTag}` : '';
      const res = await axios.get(
          `${API_BASE}/item/${this.#itemId}/model_search${tag}`,
          {
            headers: {
              'accept': 'application/json',
              'X-Figni-Client-Token': this.#token,
            },
          });
      const glb = res.data.filter((item) => item.format=='glb');
      if (glb.length > 0) {
        this.setAttribute('src', glb[0].url);
      }
      const usdz = res.data.filter((item) => item.format=='usdz');
      if (usdz.length > 0) {
        this.setAttribute('ios-src', usdz[0].url);
      }
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
