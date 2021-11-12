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

  initCameraButton;

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

    this.initCameraButton = document.createElement('button');
    this.initCameraButton.id = `init-camera-button-${this.seed}`;
    this.initCameraButton.innerHTML = 'カメラ位置を戻す';
    this.initCameraButton.addEventListener('click', () => {
      this.setCameraOrbit('auto auto auto');
      this.setCameraTarget('auto auto auto');
      this.initCameraButton.style.display = 'none';
    });
    this.initCameraButton.style.display = 'none';
    this.appendChild(this.initCameraButton);

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
          }
        });
      }
      const panels = hotspot.querySelectorAll('[slot="panel"]');
      panels.forEach((panel) => {
        panel.classList.add('panel-hide');
      });
      hotspot.addEventListener('click', () => {
        const panels = hotspot.querySelectorAll('[slot="panel"]');
        if (panels.length > 0) {
          panels.forEach((panel) => {
            panel.classList.toggle('panel-hide');
          });
        }
      });
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
      @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;700&display=swap');
      figni-viewer * {
        font-family: 'Noto Sans JP', sans-serif;
        color: #222428;
      }
      [slot^="hotspot"] {
        display: block;
        min-width: 1.5rem;
        min-height: 1.5rem;
        padding: 0.25rem 0.5rem;
        border-radius: 1rem;
        border: none;
        background-color: rgba(255, 115, 59, 1.0);
        font-size: 0.75rem;
        color: white;
        outline: 0.3rem solid rgba(255, 115, 59, 0.3);
        box-sizing: border-box;
        --min-hotspot-opacity: 0;
        backdrop-filter: blur(3px);
      }
      #init-camera-button-${this.seed} {
        position: absolute;
        display: flex;
        -webkit-box-align: center;
        align-items: center;
        -webkit-box-pack: center;
        justify-content: center;
        height: 2.5rem;
        padding: 0rem 1rem;
        top: 0.5rem;
        left: 0.5rem;
        white-space: nowrap;
        border-radius: 1.25rem;
        border: none;
        color: white;
        font-weight: bold;
        background-color: #3B5EFF;
        z-index: 9999;
      }
      .ar-button {
        position: absolute;
        display: flex;
        -webkit-box-align: center;
        align-items: center;
        -webkit-box-pack: center;
        justify-content: center;
        height: 2.5rem;
        right: 0.5rem;
        bottom: 0.5rem;
        background-color: white;
        border: 1px solid #FF733B;
        border-radius: 0.75rem;
        padding: 0 1rem;
        font-weight: bold;
        z-index: 9998;
      }
      .ar-button svg {
        width: 1rem;
        margin-top: 0.1rem;
        margin-right: 0.25rem;
      }
      .ar-button span {
        display: block;
        color: #FF733B;
      }
      .panel-hide {
        opacity: 0;
        display: none;
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
        z-index: 9997;
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
                downloadScreenshotButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><defs><style>.figni-viewer-screenshot{fill:#8f94a9;}</style></defs><path class="figni-viewer-screenshot" d="M14.61,0H5.39A5.4,5.4,0,0,0,0,5.39v9.22A5.4,5.4,0,0,0,5.39,20h9.22A5.4,5.4,0,0,0,20,14.61V5.39A5.4,5.4,0,0,0,14.61,0ZM5.39,2.58h9.22a2.81,2.81,0,0,1,2.81,2.81v6L13.63,7.64a1.12,1.12,0,0,0-1.57,0L8.54,11.16a1.11,1.11,0,0,1-1.58,0,1.12,1.12,0,0,0-1.57,0L2.58,14V5.39A2.81,2.81,0,0,1,5.39,2.58Z"/><circle class="figni-viewer-screenshot" cx="5.88" cy="5.88" r="1.92"/></svg>'
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
    if (this.initCameraButton) {
      this.initCameraButton.style.display = 'block';
    }
  }

  setCameraTarget(target) {
    this.cameraTarget = target;
    if (this.initCameraButton) {
      this.initCameraButton.style.display = 'block';
    }
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