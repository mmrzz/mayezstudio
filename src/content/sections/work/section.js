const box = () => import('./work/box.js')

export default {
  id: 'work',
  title: 'Work',
  items: [
    { id: 'a', content: box, props: { tone: 1 }, landscape: { col: 1, row: 1, cols: 4, rows: 3 }, tablet: { col: 1, row: 1, cols: 3, rows: 3 }, portrait: { col: 1, row: 1, cols: 3, rows: 2 } },
    { id: 'b', content: box, props: { tone: 2 }, landscape: { col: 5, row: 1, cols: 4, rows: 3 }, tablet: { col: 4, row: 1, cols: 3, rows: 3 }, portrait: { col: 4, row: 1, cols: 3, rows: 2 } },
    { id: 'c', content: box, props: { tone: 3 }, landscape: { col: 9, row: 1, cols: 4, rows: 3 }, tablet: { col: 7, row: 1, cols: 3, rows: 3 }, portrait: { col: 1, row: 3, cols: 3, rows: 2 } },
    { id: 'd', content: box, props: { tone: 4 }, landscape: { col: 13, row: 1, cols: 4, rows: 3 }, tablet: { col: 10, row: 1, cols: 3, rows: 3 }, portrait: { col: 4, row: 3, cols: 3, rows: 2 } },
    { id: 'wide', content: box, props: { tone: 5 }, landscape: { col: 1, row: 5, cols: 16, rows: 3 }, tablet: { col: 1, row: 5, cols: 12, rows: 4 }, portrait: { col: 1, row: 6, cols: 6, rows: 4 } },
  ],
}
