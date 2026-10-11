import { load, render, renderSmall } from '../../../../dev/mock.js'

export default {
  id: 'about-intro',
  props: { tone: 1 },
  load,
  render,
  portrait: { render: renderSmall }, // the portrait swap
}
