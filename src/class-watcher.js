export class ClassWatcher {
  constructor(target, classToWatch, classAddedCallback, classRemovedCallback) {
    this.target = target
    this.classToWatch = classToWatch
    this.classAddedCallback = classAddedCallback
    this.classRemovedCallback = classRemovedCallback
    this.observer = null
    this.lastClassState = target.classList.contains(this.classToWatch)

    this.init()
  }

  init() {
    this.observer = new MutationObserver(this.mutationCallback)
    this.observer.observe(this.target, {
      attributes: true,
      attributeFilter: ['class'],
    })
  }

  mutationCallback = (mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'attributes') {
        const classList = this.target.classList
        const classState = classList.contains(this.classToWatch)
        if (classState !== this.lastClassState) {
          this.lastClassState = classState
          if (classState) {
            this.classAddedCallback(this.target)
          } else {
            this.classRemovedCallback(this.target)
          }
        }
      }
    })
  }
}
