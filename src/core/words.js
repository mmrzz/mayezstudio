// Splits an element's text into word spans for animation. Words only: splitting Persian into
// letters would break the joins between them (D-011). The spaces stay plain text, so the line
// reads and breaks as before. revert() puts the original nodes back.
export function splitWords(el) {
  const original = [...el.childNodes]
  const words = []
  const parts = []
  for (const node of original) {
    if (node.nodeType !== Node.TEXT_NODE) {
      parts.push(node)
      continue
    }
    for (const piece of node.data.split(/(\s+)/)) {
      if (!piece) continue
      if (/^\s+$/.test(piece)) {
        parts.push(document.createTextNode(piece))
        continue
      }
      const word = document.createElement('span')
      word.className = 'word'
      word.textContent = piece
      words.push(word)
      parts.push(word)
    }
  }
  el.replaceChildren(...parts)
  return { words, revert: () => el.replaceChildren(...original) }
}
