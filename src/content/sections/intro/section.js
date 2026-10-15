// Section 1: the claim and three receipts (plan/intro.md §2, D-012). Columns count from the
// inline-start edge, so column 1 is the right edge. The claim and the receipt strip are
// centred as one block; the strip is as wide as the claim.
export default {
  id: 'intro',
  title: 'معرفی',
  items: [
    {
      container: 'intro-claim',
      landscape: { col: 5, row: 2, cols: 24, rows: 6 },
      tablet: { col: 2, row: 3, cols: 21, rows: 6 },
      portrait: { col: 1, row: 2, cols: 12, rows: 6 },
    },
    {
      container: 'intro-systems',
      landscape: { col: 5, row: 9, cols: 8, rows: 5 },
      tablet: { col: 2, row: 10, cols: 7, rows: 5 },
      portrait: { col: 1, row: 9, cols: 12, rows: 3 },
    },
    {
      container: 'intro-year',
      landscape: { col: 13, row: 9, cols: 8, rows: 5 },
      tablet: { col: 9, row: 10, cols: 7, rows: 5 },
      portrait: { col: 1, row: 12, cols: 12, rows: 3 },
    },
    {
      container: 'intro-team',
      landscape: { col: 21, row: 9, cols: 8, rows: 5 },
      tablet: { col: 16, row: 10, cols: 7, rows: 5 },
      portrait: { col: 1, row: 15, cols: 12, rows: 3 },
    },
  ],
}
