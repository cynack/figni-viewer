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
    // const pb = this.shadowRoot.querySelector('[part="default-progress-bar"]');
    // pb.style.backgroundColor = '#FF4733';

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
    initCameraButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 11.83 20.22"><defs><style>.arrow{ fill: white; }</style></defs><path class="arrow" d="M4.13,10.11l7.39-7.38a1,1,0,0,0,0-1.48L10.58.31A1,1,0,0,0,9.1.31L.5,8.91a1.7,1.7,0,0,0,0,2.41l8.6,8.6a1,1,0,0,0,1.48,0l.94-.94a1,1,0,0,0,0-1.48Z" /></svg> ';
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
    arButton.classList.add('ar-button');
    this.appendChild(arButton);

    const style = document.createElement('style');
    style.textContent = `
      [slot^="hotspot"] {
        display: block;
        width: 1.5rem;
        height: 1.5rem;
        border-radius: 50%;
        border: none;
        background-color: rgba(255, 115, 59, 0.5);
        outline: 0.1rem solid #FF733B;
        box-sizing: border-box;
        --min-hotspot-opacity: 0;
        backdrop-filter: blur(3px);
      }
      [slot^="hotspot"]:after {
        display: block;
        width: 1rem;
        height: 1rem;
        border-radius: 50%;
        border: none;
        background-color: rgba(255, 115, 59, 1);
        box-sizing: border-box;
        --min-hotspot-opacity: 0;
      }
      #init-camera-button-${this.seed} {
        position: absolute;
        display: flex;
        -webkit-box-align: center;
        align-items: center;
        -webkit-box-pack: center;
        justify-content: center;
        width: 2.5rem;
        height: 2.5rem;
        padding: 0rem;
        right: 0.5rem;
        bottom: 0.5rem;
        white-space: nowrap;
        border-radius: 50%;
        border: none;
        background-color: #3B5EFF;
      }
      .ar-button {
        // ここにスタイルを記述
      }
      #init-camera-button-${this.seed} svg {
        height: 1rem;
        transform: translateX(-1.5px) translateY(1.25px);
      }
      #download-screenshot-button-${this.seed} {
        position: absolute;
        display: flex;
        -webkit-box-align: center;
        align-items: center;
        -webkit-box-pack: center;
        justify-content: center;
        width: 2.5rem;
        height: 2.5rem;
        padding: 0;
        left: 0.5rem;
        bottom: 0.5rem;
        white-space: nowrap;
        border-radius: 50%;
        border: none;
        background-color: white;
      }
      #download-screenshot-button-${this.seed} svg {
        width: 1.25rem;
        height: 1.25rem;
        transform: translateX(-0.5px) translateY(-0.5px);
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
                downloadScreenshotButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><defs><style>.cls-1{fill:#8f94a9;}</style></defs><path class="cls-1" d="M11.31,1.75V.83A.83.83,0,0,1,12.14,0h2.47A5.39,5.39,0,0,1,20,5.39V7.86a.83.83,0,0,1-.83.83h-1a.83.83,0,0,1-.83-.83V5.38a2.8,2.8,0,0,0-2.8-2.8H12.14A.83.83,0,0,1,11.31,1.75ZM2.58,7.86V5.38a2.8,2.8,0,0,1,2.8-2.8H7.86a.83.83,0,0,0,.83-.83V.83A.83.83,0,0,0,7.86,0H5.39A5.39,5.39,0,0,0,0,5.39V7.86a.83.83,0,0,0,.83.83h.92A.83.83,0,0,0,2.58,7.86Zm14.81,4.28v2.45a2.81,2.81,0,0,1-2.8,2.8H12.14a.83.83,0,0,0-.83.83v1a.83.83,0,0,0,.83.83h2.47A5.39,5.39,0,0,0,20,14.61V12.14a.83.83,0,0,0-.83-.83h-1A.83.83,0,0,0,17.39,12.14ZM7.86,17.39H5.38a2.8,2.8,0,0,1-2.8-2.8V12.14a.83.83,0,0,0-.83-.83H.83a.83.83,0,0,0-.83.83v2.47A5.39,5.39,0,0,0,5.39,20H7.86a.83.83,0,0,0,.83-.83v-1A.83.83,0,0,0,7.86,17.39ZM9.61,14.5a4.53,4.53,0,1,0-4.14-4.15A4.53,4.53,0,0,0,9.61,14.5ZM8.08,10.23a1.92,1.92,0,1,1,1.65,1.65A1.92,1.92,0,0,1,8.08,10.23Z"/></svg>'
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