/* eslint-disable max-len */
import {
  ModelViewerElement
} from '@google/model-viewer';
import axios from 'axios';

const API_BASE = 'https://api.stg.figni.store/api';

class FigniViewerElement extends ModelViewerElement {
  static MODEL_ATTRIBUTE = ['item-id', 'token', 'model-tag'];
  static TOOL_ATTRIBUTE = ['screenshot'];

  itemId;
  token;
  modelTag;

  seed;

  constructor() {
    super();

    this.seed = Math.random().toString(36).substring(7);
  }

  async connectedCallback() {
    super.connectedCallback();

    // 値の取得
    this.itemId = this.getAttribute('item-id');
    this.token = this.getAttribute('token');
    this.modelTag = this.getAttribute('model-tag') || '';

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
    initCameraButton.id = `init-camera-button-${this.seed}`;
    initCameraButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 70.05 124.12"><defs><style>.cls-1{fill:#8f94a9;}</style></defs><g id="レイヤー_2" data-name="レイヤー 2"><g id="レイヤー_1-2" data-name="レイヤー 1"><path class="cls-1" d="M68.56,6.42,63.63,1.49a5.08,5.08,0,0,0-7.19,0L2.92,55a10,10,0,0,0,0,14.1l53.52,53.52a5.08,5.08,0,0,0,7.19,0l4.93-4.93a5.09,5.09,0,0,0,0-7.19L20.11,62.06,68.56,13.61A5.09,5.09,0,0,0,68.56,6.42Z"/></g></g></svg>';
    initCameraButton.addEventListener('click', () => {
      this.setCameraOrbit('auto auto auto');
      this.setCameraTarget('auto auto auto');
      initCameraButton.style.display = 'none';
    });
    initCameraButton.style.display = 'none';
    this.appendChild(initCameraButton);

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
      #init-camera-button-${this.seed} {
        position: absolute;
        padding: 0.5rem;
        right: 0.5rem;
        white-space: nowrap;
        bottom: 0.5rem;
        border: 1px solid #FF733B;
        border-radius: 0.75rem;
      }
      #download-screenshot-button-${this.seed} {
        position: absolute;
        padding: 0.5rem;
        left: 0.5rem;
        white-space: nowrap;
        bottom: 0.5rem;
        border: 1px solid #FF733B;
        border-radius: 0.75rem;
      }
      #download-screenshot-button-${this.seed} svg {
        width: 1rem;
        height: 1rem;
      }
    `;
    this.appendChild(style);


    // * デバッグ用
    if (this.getAttribute('debug-hotspot') == '') {
      this.addEventListener('mousedown', (eve) => {
        const hit = this.positionAndNormalFromPoint(eve.clientX, eve.clientY);
        console.log(hit);
      }, true);
    }
  }

  static get observedAttributes() {
    return super.observedAttributes.concat(
      FigniViewerElement.MODEL_ATTRIBUTE,
      FigniViewerElement.TOOL_ATTRIBUTE,
    );
  }

  async attributeChangedCallback(name, oldValue, newValue) {
    super.attributeChangedCallback(name, oldValue, newValue);
    if (oldValue != newValue) {
      if (FigniViewerElement.MODEL_ATTRIBUTE.includes(name)) {
        switch (name) {
          case 'item-id':
            this.itemId = newValue;
            break;
          case 'token':
            this.token = newValue;
            break;
          case 'model-tag':
            this.modelTag = newValue;
            break;
        }
        await this.requestModel();
      } else if (FigniViewerElement.TOOL_ATTRIBUTE.includes(name)) {
        switch (name) {
          case 'screenshot': {
            if (newValue == '') {
              let downloadScreenshotButton = document.getElementById(`download-screenshot-button-${this.seed}`);
              if (!downloadScreenshotButton) {
                downloadScreenshotButton = document.createElement('button');
                downloadScreenshotButton.id = `download-screenshot-button-${this.seed}`;
                downloadScreenshotButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 124.12 124.12"><defs><style>.cls-1{fill:#8f94a9;}</style></defs><g id="レイヤー_2" data-name="レイヤー 2"><g id="レイヤー_1-2" data-name="レイヤー 1"><path class="cls-1" d="M70.17,10.85V5.15A5.14,5.14,0,0,1,75.32,0H90.68a33.44,33.44,0,0,1,33.44,33.44V48.8A5.16,5.16,0,0,1,119,54H113a5.15,5.15,0,0,1-5.14-5.15V33.36A17.36,17.36,0,0,0,90.54,16H75.32A5.14,5.14,0,0,1,70.17,10.85ZM16,48.8V33.36A17.36,17.36,0,0,1,33.36,16H48.8A5.15,5.15,0,0,0,54,10.85V5.15A5.15,5.15,0,0,0,48.8,0H33.44A33.44,33.44,0,0,0,0,33.44V48.8A5.15,5.15,0,0,0,5.15,54h5.7A5.15,5.15,0,0,0,16,48.8Zm91.9,26.52V90.54A17.36,17.36,0,0,1,90.54,107.9H75.32A5.14,5.14,0,0,0,70.17,113V119a5.15,5.15,0,0,0,5.15,5.15H90.68a33.44,33.44,0,0,0,33.44-33.44V75.32A5.15,5.15,0,0,0,119,70.17H113A5.14,5.14,0,0,0,107.9,75.32ZM48.8,107.9H33.36A17.36,17.36,0,0,1,16,90.54V75.32a5.14,5.14,0,0,0-5.15-5.15H5.15A5.14,5.14,0,0,0,0,75.32V90.68a33.44,33.44,0,0,0,33.44,33.44H48.8A5.16,5.16,0,0,0,54,119V113A5.15,5.15,0,0,0,48.8,107.9ZM59.67,90A28.12,28.12,0,1,0,33.92,64.23,28.11,28.11,0,0,0,59.67,90ZM50.15,63.5A11.9,11.9,0,1,1,60.4,73.75,11.91,11.91,0,0,1,50.15,63.5Z"/></g></g></svg>'
                downloadScreenshotButton.addEventListener('click', () => {
                  this.downloadScreenshot();
                });
                this.appendChild(downloadScreenshotButton);
              }
            } else {
              downloadScreenshotButton.remove();
            }
            break;
          }
        }
      }
    }
  }

  async requestModel() {
    if (this.itemId && this.token) {
      const tag = this.modelTag ? `?tag=${this.modelTag}` : '';
      const res = await axios.get(
        `${API_BASE}/item/${this.itemId}/model_search${tag}`, {
          headers: {
            'accept': 'application/json',
            'X-Figni-Client-Token': this.token,
          },
        });
      const glb = res.data.filter((item) => item.format == 'glb');
      if (glb.length > 0) {
        this.src = glb[0].url;
      }
      const usdz = res.data.filter((item) => item.format == 'usdz');
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
    const blob = await this.toBlob({
      idealAspect: true
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'model.png';
    a.click();
    URL.revokeObjectURL(url);
  }
}

customElements.define('figni-viewer', FigniViewerElement);