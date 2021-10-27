import {ModelViewerElement} from '@google/model-viewer';

class FigniViewerElement extends ModelViewerElement {
  constructor() {
    super();
  }
  connectedCallback() {
    super.connectedCallback();

    console.log(this.shadowRoot);

    // 値の取得
    const modelId = this.getAttribute('model_id');
    const accessId = this.getAttribute('access_id');
    console.log(modelId);
    console.log(accessId);

    // TODO: figni-api からモデルの情報をとってくる
    const modelSrc = 'https://storage.googleapis.com/cynack-norma/sample/grill_b.glb';

    // 値の設定
    this.setAttribute('src', modelSrc);
    this.setAttribute('camera-controls', true);
  }
}

customElements.define('figni-viewer', FigniViewerElement);
