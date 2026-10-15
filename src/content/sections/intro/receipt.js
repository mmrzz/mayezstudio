// The markup every receipt shares, so each reads as one sentence (plan/intro.md §3):
// the mark and figure, a real space, then the caption. The arrangement (card, strip,
// compact) is chosen by the box's shape in intro.css, never here.
import './intro.css'

// kind: 'systems' | 'year' | 'team'. figure and caption are strings or nodes; mark is an
// aria-hidden node (or none: the year's ruler sits in its own band, the team's frame wraps the figure).
export function receipt(box, { kind, figure, caption, mark }) {
  const root = document.createElement('p')
  root.className = 'receipt'
  root.dataset.kind = kind

  const figureEl = document.createElement('strong')
  figureEl.className = 'receipt-figure'
  figureEl.append(figure)

  const captionEl = document.createElement('span')
  captionEl.className = 'receipt-caption'
  captionEl.append(caption)

  if (mark) {
    mark.classList.add('receipt-mark')
    mark.setAttribute('aria-hidden', 'true')
    root.append(mark)
  }
  root.append(figureEl, ' ', captionEl)
  box.append(root)
  return root
}
