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
