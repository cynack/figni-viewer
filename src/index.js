import {ModelViewerElement} from '@google/model-viewer';

class FigniViewerElement extends ModelViewerElement {
  constructor() {
    super();

    console.log('aaa');
  }
}

customElements.define('figni-viewer', FigniViewerElement);
