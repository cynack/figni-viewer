import {ModelViewerElement} from '@google/model-viewer';
// import axios from 'axios';

class FigniViewerElement extends ModelViewerElement {
  constructor() {
    super();
  }
  async connectedCallback() {
    super.connectedCallback();

    // 値の取得
    const itemId = this.getAttribute('item_id');
    const token = this.getAttribute('token');
    const modelIndex = Number(this.getAttribute('model_index')) || 0;
    console.log(itemId);
    console.log(token);
    console.log(modelIndex);

    // axios のテスト
    // const res = await axios.get('https://randomuser.me/api/');
    // const modelPosterSrc = res.data.results[0].picture.large;

    // Attribute
    this.setAttribute('seamless-poster', true);
    this.setAttribute('loading', 'eager');
    this.setAttribute('reveal', 'intaraction');
    this.setAttribute('camera-controls', true);
    this.setAttribute('interaction-prompt', 'none');

    // CSS
    this.style.setProperty('--poster-color', 'transparent');

    // Parts
    const pb = this.shadowRoot.querySelector('[part="default-progress-bar"]');
    pb.style.backgroundColor = '#f00';

    // Properties
    // console.log(this.getDimensions());
  }

  static get observedAttributes() {
    const attr = [
      'item_id',
      'token',
      'model_index',
    ];
    return super.observedAttributes.concat(attr);
  }

  attributeChangedCallback(name, oldValue, newValue) {
    super.attributeChangedCallback(name, oldValue, newValue);
    if (oldValue != newValue) {
      console.log(`${name} changed: ${oldValue} -> ${newValue}`);
      switch (name) {
        case 'item_id': {
          // TODO: figni-api からモデルの情報をとってくる
          let m = '';
          let p = '';
          if (newValue == 'blue') {
            m = 'https://storage.googleapis.com/cynack-norma/sample/grill_b.glb';
            p = 'https://storage.googleapis.com/cynack-norma/sample/grill_b2.png';
          } else if (newValue == 'red') {
            m = 'https://storage.googleapis.com/cynack-norma/sample/grill_r.glb';
            p = 'https://storage.googleapis.com/cynack-norma/sample/grill_r2.png';
          }
          this.setAttribute('src', m);
          this.setAttribute('poster', p);
          this.showPoster();
          break;
        }
      }
    }
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
