import './style.css'

// `/test/<container id>` shows one container full screen; everything else is the site.
const test = location.pathname.match(/^\/test\/([^/]+)\/?$/)
if (test) import('./dev/test.js').then((m) => m.mountTest(decodeURIComponent(test[1])))
else import('./site.js')
