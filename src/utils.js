export function getChildText(node) {
  return Array.from(node.childNodes).reduce((acc, child) => {
    if (child.nodeType === Node.TEXT_NODE) {
      return acc + child.nodeValue
    }
    return acc
  }, '')
}

export function isEmptyOrSpaces(str) {
  return str === null || str.match(/^\s*$/) !== null
}

export async function addLottiePlayer(src, parent, style = null) {
  const player = document.createElement('dotlottie-player')
  player.setAttribute('src', src)
  player.setAttribute('autoplay', '')
  player.setAttribute('loop', '')
  player.setAttribute('mode', 'normal')
  parent.appendChild(player)
  await player.updateComplete
  if (style) {
    player.shadowRoot.appendChild(style)
  }
  return player
}
