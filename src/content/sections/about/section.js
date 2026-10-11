export default {
  id: 'about',
  title: 'About',
  items: [
    {
      container: 'about-intro',
      landscape: { col: 1, row: 3, cols: 14, rows: 8 },
      tablet: { col: 1, row: 3, cols: 12, rows: 8 },
      portrait: { col: 1, row: 1, cols: 12, rows: 6 },
    },
    {
      container: 'about-photo',
      landscape: { col: 17, row: 1, cols: 16, rows: 6 },
      tablet: { col: 13, row: 1, cols: 12, rows: 6 },
      portrait: { col: 1, row: 7, cols: 8, rows: 6 },
    },
    {
      container: 'about-stat',
      landscape: { col: 17, row: 9, cols: 6, rows: 6 },
      tablet: { col: 13, row: 9, cols: 6, rows: 6 },
      portrait: { col: 9, row: 7, cols: 4, rows: 6 },
    },
    {
      container: 'about-note',
      landscape: { col: 25, row: 9, cols: 8, rows: 4 },
      tablet: { col: 19, row: 11, cols: 6, rows: 4 },
      portrait: null, // hidden on portrait on purpose
    },
  ],
}
