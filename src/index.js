/* eslint-disable max-len */
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

    // 値の取得
    this.#itemId = this.getAttribute('item-id');
    this.#token = this.getAttribute('token');
    this.#modelTag = this.getAttribute('model-tag') || '';

    // axios のテスト
    // const res = await axios.get('https://randomuser.me/api/');
    // const modelPosterSrc = res.data.results[0].picture.large;

    // Attribute
    this.seamlessPoster = true;
    this.loading = 'eager';
    this.cameraControls = true;
    this.ar = true;
    this.arModes = 'webxr scene-viewer quick-look';
    this.arScale = 'fixed';
    this.arPlacement = 'floor';
    this.interactionPrompt = 'none';

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

    const initCameraButton = document.createElement('button');
    initCameraButton.id = Math.random().toString(36).substring(7);
    const backImg = document.createElement('img');
    backImg.src = 'https://img.icons8.com/material-rounded/48/000000/back--v1.png';
    initCameraButton.appendChild(backImg);
    initCameraButton.addEventListener('click', () => {
      this.setCameraOrbit('auto auto auto');
      this.setCameraTarget('auto auto auto');
      initCameraButton.style.display = 'none';
    });
    initCameraButton.style.display = 'none';
    this.appendChild(initCameraButton);

    const downloadScreenshotButton = document.createElement('button');
    downloadScreenshotButton.id = Math.random().toString(36).substring(7);
    const dlImg = document.createElement('img');
    dlImg.src = 'https://img.icons8.com/material-rounded/48/000000/download--v1.png';
    downloadScreenshotButton.appendChild(dlImg);
    downloadScreenshotButton.addEventListener('click', () => {
      this.downloadScreenshot();
    });
    this.appendChild(downloadScreenshotButton);

    this.animationCrossfadeDuration = 0;
    const hotspots = this.querySelectorAll('button[slot^="hotspot"]');
    hotspots.forEach((hotspot) => {
      this.updateHotspot({
        name: hotspot.getAttribute('slot'),
        position: hotspot.getAttribute('position'),
        normal: hotspot.getAttribute('normal'),
      });

      // Animation
      if (hotspot.getAttribute('anime') == '') {
        hotspot.addEventListener('click', () => {
          if (window.getComputedStyle(hotspot).opacity == 1 && this.paused) {
            const anime = hotspot.getAttribute('clip');
            const lenth = Number(hotspot.getAttribute('length')) || 0;
            if (this.availableAnimations.includes(anime)) {
              this.animationName = anime;
              this.currentTime = 0;
              this.play();
              const f = hotspot.getAttribute('onstart');
              if (f) {
                const func = new Function(f);
                func();
              }
              if (lenth > 0) {
                setTimeout(() => {
                  this.pause();
                  const f = hotspot.getAttribute('onend');
                  if (f) {
                    const func = new Function(f);
                    func();
                  }
                }, lenth);
              }
            }
          }
        });
      }
      // Closeup
      if (hotspot.getAttribute('closeup') == '') {
        hotspot.addEventListener('click', () => {
          if (window.getComputedStyle(hotspot).opacity == 1) {
            const target = hotspot.getAttribute('target') || hotspot.getAttribute('position') || 'auto auto auto';
            this.setCameraTarget(target);
            const orbit = hotspot.getAttribute('orbit') || 'auto auto auto';
            this.setCameraOrbit(orbit);
            initCameraButton.style.display = 'block';
          }
        });
      }
    });

    const arButton = document.createElement('button');
    arButton.setAttribute('slot', 'ar-button');
    arButton.innerHTML = `
      <svg viewBox="0 0 17 15" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M8.50002 8.62017C12.6692 8.62017 16.1338 9.74602 16.8614 11.2244L11.9069 1.12585C11.5836 0.45489 10.8906 0 10.0822 0C9.43548 0 8.86958 0.295679 8.50002 0.761941L0.358032 10.8946C1.40898 9.57544 4.65423 8.62017 8.50002 8.62017Z" fill="#FF733B" />
        <path d="M8.5 14.9886C13.1944 14.9886 17 13.563 17 11.8044C17 10.0458 13.1944 8.62016 8.5 8.62016C3.80558 8.62016 0 10.0458 0 11.8044C0 13.563 3.80558 14.9886 8.5 14.9886Z" fill="#FFAB3B" />
        <path d="M8.49995 12.9985C11.4084 12.9985 13.7663 12.4639 13.7663 11.8044C13.7663 11.1449 11.4084 10.6103 8.49995 10.6103C5.59145 10.6103 3.23364 11.1449 3.23364 11.8044C3.23364 12.4639 5.59145 12.9985 8.49995 12.9985Z" fill="#FF733B" />
        <path d="M9.14678 11.8044C10.9327 11.8044 12.3805 10.3788 12.3805 8.62016C12.3805 6.86156 10.9327 5.43593 9.14678 5.43593C7.36086 5.43593 5.91309 6.86156 5.91309 8.62016C5.91309 10.3788 7.36086 11.8044 9.14678 11.8044Z" fill="#FFCE3B" />
      </svg>
      <span>目の前に置く</span>
    `;
    this.appendChild(arButton);

    const style = document.createElement('style');
    style.textContent = `
      [slot^="hotspot"] {
        display: block;
        border-radius: 1.5rem;
        border: none;
        background-color: #FF733B;
        box-sizing: border-box;
        --min-hotspot-opacity: 0;
        padding: 1.5rem;
      }
      [slot="ar-button"] {
        position: absolute;
        padding: 0.5rem 1rem;
        right: 0.5rem;
        white-space: nowrap;
        bottom: 0.5rem;
        border: 1px solid #FF733B;
        border-radius: 0.75rem;
        background-color: white;
      }
      [slot="ar-button"]:active {
        background-color: white;
      }
      [slot="ar-button"]:focus {
        background-color: white;
        outline: none;
      }
      [slot="ar-button"]:focus-visible {
        background-color: white;
        outline: 1px solid #30333E;
      }
      [slot="ar-button"] svg {
        height: 1rem;
        margin-right: 4px;
        margin-bottom: 2px;
      }
      #${initCameraButton.id} {
        position: absolute;
        padding: 0.5rem;
        right: 0.5rem;
        white-space: nowrap;
        bottom: 0.5rem;
        border: 1px solid #FF733B;
        border-radius: 0.75rem;
      }
      #${downloadScreenshotButton.id} {
        position: absolute;
        padding: 0.5rem;
        left: 0.5rem;
        white-space: nowrap;
        bottom: 0.5rem;
        border: 1px solid #FF733B;
        border-radius: 0.75rem;
      }
    `;
    this.appendChild(style);


    // * デバッグ用
    if (this.getAttribute('debug') == '') {
      this.addEventListener('mousedown', (eve) => {
        const hit = this.positionAndNormalFromPoint(eve.clientX, eve.clientY);
        console.log(hit);
      }, true);
    }
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
        this.src = glb[0].url;
      }
      const usdz = res.data.filter((item) => item.format=='usdz');
      if (usdz.length > 0) {
        this.iosSrc = usdz[0].url;
      }
    }
  }

  setCameraOrbit(orbit) {
    this.cameraOrbit = orbit;
  }

  setCameraTarget(target) {
    this.cameraTarget = target;
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
