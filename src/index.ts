import {ModelViewerElement} from '@google/model-viewer';

class PopupInfo extends HTMLElement {
  constructor() {
    super();

    console.log(ModelViewerElement);
  }
}

customElements.define('popup-info', PopupInfo);
