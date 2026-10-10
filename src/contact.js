const box = () => import('./contact/box.js')

export default {
  id: 'contact',
  title: 'Contact',
  items: [
    { id: 'big', content: box, props: { tone: 2 }, landscape: { col: 3, row: 2, cols: 8, rows: 5 }, tablet: { col: 1, row: 2, cols: 8, rows: 5 }, portrait: { col: 1, row: 2, cols: 6, rows: 4 } },
    { id: 'small-1', content: box, props: { tone: 3 }, landscape: { col: 12, row: 2, cols: 3, rows: 2 }, tablet: { col: 10, row: 2, cols: 3, rows: 2 }, portrait: { col: 1, row: 7, cols: 3, rows: 2 } },
    { id: 'small-2', content: box, props: { tone: 5 }, landscape: { col: 12, row: 5, cols: 3, rows: 2 }, tablet: { col: 10, row: 5, cols: 3, rows: 2 }, portrait: { col: 4, row: 7, cols: 3, rows: 2 } },
  ],
}
