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

    // TODO: figni-api からモデルの情報をとってくる
    const modelSrc = 'https://storage.googleapis.com/cynack-norma/sample/grill_b.glb';
    const modelPosterSrc = 'https://storage.googleapis.com/cynack-norma/sample/grill_b2.png';
    // axios のテスト
    // const res = await axios.get('https://randomuser.me/api/');
    // const modelPosterSrc = res.data.results[0].picture.large;

    // Attribute
    this.setAttribute('src', modelSrc);
    this.setAttribute('poster', modelPosterSrc);
    this.setAttribute('loading', 'eager');
    this.setAttribute('reveal', 'intaraction');
    this.setAttribute('camera-controls', true);
    this.setAttribute('interaction-prompt', 'none');

    // CSS
    this.style.setProperty('--poster-color', 'transparent');

    // Properties
    // console.log(this.loaded);
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
          this.setAttribute('src', newValue=='red' ? 'https://storage.googleapis.com/cynack-norma/sample/grill_r.glb': 'https://storage.googleapis.com/cynack-norma/sample/grill_b.glb');
          this.setAttribute('poster', newValue=='red' ? 'https://storage.googleapis.com/cynack-norma/sample/grill_r.png': 'https://storage.googleapis.com/cynack-norma/sample/grill_b2.png');
          break;
        }
      }
    }
  }
}

customElements.define('figni-viewer', FigniViewerElement);
