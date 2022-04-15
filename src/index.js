import FigniViewerElement from './figni-viewer'
import FigniViewerBaseElement from './figni-viewer-base'
import { ModelViewerElement } from './model-viewer'
import './style.scss'
import { SVG_CLOSE_ICON, SVG_HELP_ICON } from './svg'

export class __FigniViewerElement extends ModelViewerElement {
  // HTML要素
  #helpButton
  #helpPanel

  #enableHelpButton() {
    if (!this.#helpButton) {
      this.#helpButton = document.createElement('button')
      this.#helpButton.innerHTML = `${SVG_HELP_ICON}<span>使い方</span>`
      this.#helpButton.classList.add('figni-viewer-help-button')
      const opened = false
      this.#helpButton.addEventListener('click', () => {
        if (opened) {
          this.#helpButton.classList.add('figni-viewer-help-button-hidden')
          this.#helpButton.classList.remove('figni-viewer-help-button-cancel')
          this.#helpButton.innerHTML = `${SVG_HELP_ICON}<span>使い方</span>`
          this.#disableHelpPanel()
        } else {
          this.#helpButton.classList.remove('figni-viewer-help-button-hidden')
          this.#helpButton.classList.add('figni-viewer-help-button-cancel')
          this.#helpButton.innerHTML = `${SVG_CLOSE_ICON}`
          this.#enableHelpPanel()
        }
      })
      this.appendChild(this.#helpButton)
    } else {
      this.#helpButton.style.display = 'block'
    }
  }

  #disableHelpButton() {
    if (this.#helpButton) {
      this.#helpButton.style.display = 'none'
    }
  }

  #enableHelpPanel() {
    if (!this.#helpPanel) {
      this.#helpPanel = document.createElement('div')
      this.#helpPanel.classList.add(
        'figni-viewer-help-panel',
        'figni-viewer-help-panel-hidden'
      )
      this.#helpPanel.innerHTML = `
        <div class="figni-viewer-help-panel-content">
          <div class="figni-viewer-help-panel-content-title">
            <span>使い方</span>
          </div>
          <div class="figni-viewer-help-panel-content-body">
            <p>
              スマホ版では、
              <a href="https://www.google.com/chrome/browser/desktop/index.html" target="_blank">Chrome</a>
              または
              <a href="https://www.mozilla.org/ja/firefox/new/" target="_blank">Firefox</a>
              で閲覧してください。
            </p>
          </div>
        </div>
      `
      this.appendChild(this.#helpPanel)
    } else {
      this.#helpPanel.classList.remove('figni-viewer-help-panel-hidden')
    }
  }

  #disableHelpPanel() {
    if (this.#helpPanel) {
      this.#helpPanel.classList.add('figni-viewer-help-panel-hidden')
    }
  }
}

customElements.define('figni-viewer-base', FigniViewerBaseElement)
customElements.define('figni-viewer', FigniViewerElement)
