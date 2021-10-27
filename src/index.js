import {ModelViewerElement} from '@google/model-viewer';

class FigniViewerElement extends ModelViewerElement {
  constructor() {
    super();

    console.log('Using FigniViewer!');
  }
}

customElements.define('figni-viewer', FigniViewerElement);
