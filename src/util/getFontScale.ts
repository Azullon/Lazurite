const cache = new Map<string, number>()

export default function getFontScale(fontFamily, fontWeight = 400) {
  if (cache.has(fontFamily)) return cache.get(fontFamily)

  const textContainer = document.createElement('span')
  const fontSize = 10
  textContainer.appendChild(document.createTextNode('height'))
  textContainer.style.cssText = `
    opacity: 0;
    font-family: ${fontFamily};
    font-size: ${fontSize}px;
    font-weight: ${fontWeight};
    white-space: nowrap;
    display: inline;`
  document.body.appendChild(textContainer)
  const result = textContainer.offsetHeight / fontSize
  document.body.removeChild(textContainer)

  cache.set(fontFamily, result)
  return result
}
