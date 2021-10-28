import {ModelViewerElement} from '@google/model-viewer';
import axios from 'axios';

class FigniViewerElement extends ModelViewerElement {
  constructor() {
    super();
  }
  async connectedCallback() {
    super.connectedCallback();

    // 値の取得
    const modelId = this.getAttribute('model_id');
    const accessId = this.getAttribute('access_id');
    console.log(modelId);
    console.log(accessId);

    // TODO: figni-api からモデルの情報をとってくる
    const modelSrc = 'https://storage.googleapis.com/cynack-norma/sample/grill_b.glb';
    const modelPosterSrc = 'https://storage.googleapis.com/cynack-norma/sample/grill_b2.png';
    // axios のテスト
    // const res = await axios.get('https://randomuser.me/api/');
    // const modelPosterSrc = res.data.results[0].picture.large;

    // 値の設定
    this.setAttribute('src', modelSrc);
    this.setAttribute('poster', modelPosterSrc);
    this.setAttribute('loading', 'eager');
    this.setAttribute('reveal', 'intaraction');
    this.setAttribute('camera-controls', true);
    this.setAttribute('interaction-prompt', 'none');

    // Properties へのアクセス
    // console.log(this.loaded);

    // CSS へのアクセス
    // this.style.backgroundColor = '#00F';
  }
}

customElements.define('figni-viewer', FigniViewerElement);
