const box = () => import('./about/box.js')

export default {
  id: 'about',
  title: 'About',
  items: [
    {
      id: 'intro',
      content: box,
      props: { tone: 1 },
      landscape: { col: 1, row: 2, cols: 7, rows: 4 },
      tablet: { col: 1, row: 2, cols: 6, rows: 4 },
      portrait: { col: 1, row: 1, cols: 6, rows: 3, content: () => import('./about/box-small.js') },
    },
    {
      id: 'photo',
      content: box,
      props: { tone: 2 },
      landscape: { col: 9, row: 1, cols: 8, rows: 3 },
      tablet: { col: 7, row: 1, cols: 6, rows: 3 },
      portrait: { col: 1, row: 4, cols: 4, rows: 3 },
    },
    {
      id: 'stat',
      content: box,
      props: { tone: 3 },
      landscape: { col: 9, row: 5, cols: 3, rows: 3 },
      tablet: { col: 7, row: 5, cols: 3, rows: 3 },
      portrait: { col: 5, row: 4, cols: 2, rows: 3 },
    },
    {
      id: 'note',
      content: box,
      props: { tone: 4 },
      landscape: { col: 13, row: 5, cols: 4, rows: 2 },
      tablet: { col: 10, row: 6, cols: 3, rows: 2 },
      portrait: null, // hidden on portrait on purpose
    },
  ],
}
