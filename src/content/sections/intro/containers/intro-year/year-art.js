// Receipt 2's scene: one year, as an orrery. The Earth goes once around the Sun along a Kepler
// ellipse (a real eccentricity, speeding up near the Sun), spinning on an axis tilted 23.4° that
// keeps pointing the same way in space, so its seasons are right; the Moon goes round it on its own
// 5.1° tilted orbit, always showing the same face. The Sun is the only light, so the day and night
// sides, the terminator, the Moon's phases and the glint on the ocean all follow from where
// things are. Sizes and distances are not to scale (they could not be seen), and the spins are
// slower than a real day, but every direction, tilt and ratio of motion is the real one.
//
// Earth: day map, relief by bump mapping, specular ocean, city lights on the night side, a
// separate cloud layer and atmosphere that scatters toward the Sun. Sun: limb darkening, granules,
// sunspots and a corona. The stars and the trail the Earth leaves are drawn here too.
// Colours are the `--sp-*` tokens (year-planets.js); the planets' textures are built in workers.
import {
  AdditiveBlending,
  BackSide,
  BufferAttribute,
  BufferGeometry,
  Color,
  DataTexture,
  Float32BufferAttribute,
  Group,
  LinearFilter,
  LinearMipmapLinearFilter,
  Line,
  LineBasicMaterial,
  Mesh,
  MeshStandardMaterial,
  NoColorSpace,
  PerspectiveCamera,
  PlaneGeometry,
  PointLight,
  Points,
  RGBAFormat,
  RepeatWrapping,
  SRGBColorSpace,
  Scene,
  ShaderMaterial,
  SphereGeometry,
  UnsignedByteType,
  Vector3,
  WebGLRenderer,
  AmbientLight,
} from 'three'
import { seeded } from './year-noise.js'
import { INTRO } from '../../../../../config.js'

const DEG = Math.PI / 180
const TAU = Math.PI * 2

// ---------- The orbit (in Earth radii) ----------
const A = 5.6 // the Earth's distance from the Sun (semi-major axis)
const ECC = 0.0167 // the Earth's orbital eccentricity
const R_SUN = 2.3
const R_MOON = 0.27
const D_MOON = 2.0 // in Earth radii: far nearer than the real 60, so it can be seen
const TILT = 23.44 * DEG // the Earth's axial tilt
const MOON_INCLINATION = 5.14 * DEG
const EARTH_SCALE = 1.25
const FOV = 20
const CAMERA_ELEVATION = 28 * DEG

// Kepler's equation by Newton's method: the Earth's true anomaly for a mean anomaly M.
function trueAnomaly(M) {
  let E = M
  for (let i = 0; i < 6; i++) E -= (E - ECC * Math.sin(E) - M) / (1 - ECC * Math.cos(E))
  return 2 * Math.atan2(Math.sqrt(1 + ECC) * Math.sin(E / 2), Math.sqrt(1 - ECC) * Math.cos(E / 2))
}
// Where the Earth is, counter-clockwise seen from above the ecliptic, starting at perihelion (early January).
function earthAt(M, out) {
  const nu = trueAnomaly(M)
  const r = (A * (1 - ECC * ECC)) / (1 + ECC * Math.cos(nu))
  return out.set(r * Math.cos(nu), 0, -r * Math.sin(nu))
}

// ---------- Shaders ----------

const noiseGLSL = /* glsl */ `
float hash(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float vnoise(vec3 x){
  vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hash(i + vec3(0,0,0)), hash(i + vec3(1,0,0)), f.x), mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x), mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
}
float fbm(vec3 p){ float a = 0.5; float s = 0.0; for (int i = 0; i < 5; i++){ s += a * vnoise(p); p = p * 2.03 + vec3(1.7, 9.2, 3.1); a *= 0.5; } return s; }
`

const sunMaterial = (c) =>
  new ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uCore: { value: c.sunCore }, uMid: { value: c.sunMid }, uRim: { value: c.sunRim } },
    vertexShader: /* glsl */ `
      varying vec3 vObj; varying vec3 vN; varying vec3 vV;
      void main(){
        vObj = position;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vN = normalize(normalMatrix * normal);
        vV = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform float uTime; uniform vec3 uCore; uniform vec3 uMid; uniform vec3 uRim;
      varying vec3 vObj; varying vec3 vN; varying vec3 vV;
      ${noiseGLSL}
      void main(){
        float mu = clamp(dot(normalize(vN), normalize(vV)), 0.0, 1.0);
        float limb = 1.0 - 0.6 * (1.0 - mu) - 0.22 * (1.0 - mu) * (1.0 - mu); // limb darkening
        vec3 p = normalize(vObj) * 3.0;
        float g = 0.5 * fbm(p * 2.8 + vec3(uTime * 0.04)) + 0.5 * fbm(p * 7.0 - vec3(uTime * 0.08)); // granulation
        float spot = smoothstep(0.64, 0.72, fbm(p * 0.9 + vec3(11.0, 3.0, 7.0))); // a few sunspots
        float k = limb * (0.84 + 0.55 * (g - 0.5)) * (1.0 - 0.5 * spot);
        vec3 col = mix(uRim, uMid, smoothstep(0.25, 0.7, k));
        col = mix(col, uCore, smoothstep(0.66, 1.0, k));
        gl_FragColor = vec4(col * 1.08, 1.0);
        #include <colorspace_fragment>
      }`,
  })

const coronaMaterial = (c, span) =>
  new ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uColor: { value: c.corona }, uSpan: { value: span } },
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    vertexShader: /* glsl */ `
      varying vec2 vP;
      void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform float uTime; uniform vec3 uColor; uniform float uSpan;
      varying vec2 vP;
      ${noiseGLSL}
      void main(){
        float r = length(vP) / ${R_SUN.toFixed(3)}; // in solar radii
        float a = atan(vP.y, vP.x);
        float streak = 0.65 + 0.7 * vnoise(vec3(cos(a) * 2.2, sin(a) * 2.2, uTime * 0.05));
        float inner = exp(-(r - 1.0) * 6.5);
        float outer = exp(-(r - 1.0) * 1.7) * streak;
        float g = (0.75 * inner + 0.45 * outer) * step(0.985, r) * (1.0 - smoothstep(uSpan * 0.55, uSpan, r));
        gl_FragColor = vec4(uColor * g, 1.0);
        #include <colorspace_fragment>
      }`,
  })

const earthMaterial = (c, day, data) =>
  new ShaderMaterial({
    uniforms: {
      tDay: { value: day },
      tData: { value: data },
      uSun: { value: new Vector3(-1, 0, 0) },
      uLights: { value: c.lights },
      uAir: { value: c.air },
      uDusk: { value: c.dusk },
      uBump: { value: 0.35 },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv; varying vec3 vNW; varying vec3 vPW;
      void main(){
        vUv = uv;
        vNW = normalize(mat3(modelMatrix) * normal);
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vPW = wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D tDay; uniform sampler2D tData;
      uniform vec3 uSun; uniform vec3 uLights; uniform vec3 uAir; uniform vec3 uDusk; uniform float uBump;
      varying vec2 vUv; varying vec3 vNW; varying vec3 vPW;
      void main(){
        vec3 Ng = normalize(vNW);
        vec3 V = normalize(cameraPosition - vPW);
        vec4 data = texture2D(tData, vUv);
        // relief: perturb the normal by the height's gradient on the screen (bump mapping)
        vec3 dpx = dFdx(vPW); vec3 dpy = dFdy(vPW);
        float dhx = dFdx(data.r); float dhy = dFdy(data.r);
        vec3 r1 = cross(dpy, Ng); vec3 r2 = cross(Ng, dpx);
        float det = dot(dpx, r1);
        vec3 grad = sign(det) * (dhx * r1 + dhy * r2);
        vec3 N = normalize(abs(det) * Ng - uBump * grad);
        float ndl = dot(N, uSun);
        float ndlG = dot(Ng, uSun);
        vec3 albedo = texture2D(tDay, vUv).rgb;
        // the Sun's light, and a soft edge to it: air scatters some past the terminator
        float soft = smoothstep(-0.16, 0.06, ndlG) * 0.1;
        vec3 col = albedo * (0.008 + max(ndl, 0.0) * 1.15 + soft * (0.5 + 0.5 * uDusk));
        // the Sun's glint on the ocean
        vec3 H = normalize(uSun + V);
        float spec = pow(max(dot(N, H), 0.0), 240.0) * data.g * smoothstep(0.0, 0.1, ndlG);
        col += vec3(1.0, 0.96, 0.86) * spec * 0.55;
        // city lights, on the night side
        col += uLights * pow(data.b, 1.4) * smoothstep(0.04, -0.2, ndlG) * 0.9;
        // dusk and dawn: the light is reddened where it grazes the surface
        float tw = exp(-pow((ndlG - 0.03) / 0.1, 2.0));
        col = mix(col, col * uDusk * 1.5, tw * 0.35);
        // air along the limb, brighter on the day side
        float rim = pow(1.0 - max(dot(Ng, V), 0.0), 2.6);
        col += uAir * rim * smoothstep(-0.25, 0.4, ndlG) * 0.7;
        col = 1.0 - exp(-col * 1.3); // compress the highlights, so the sunlit side does not clip
        gl_FragColor = vec4(col, 1.0);
        #include <colorspace_fragment>
      }`,
  })

const cloudMaterial = (c, tex) =>
  new ShaderMaterial({
    uniforms: { tCloud: { value: tex }, uSun: { value: new Vector3(-1, 0, 0) }, uCloud: { value: c.cloud }, uDusk: { value: c.dusk } },
    transparent: true,
    depthWrite: false,
    vertexShader: /* glsl */ `
      varying vec2 vUv; varying vec3 vNW;
      void main(){ vUv = uv; vNW = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D tCloud; uniform vec3 uSun; uniform vec3 uCloud; uniform vec3 uDusk;
      varying vec2 vUv; varying vec3 vNW;
      void main(){
        float cover = texture2D(tCloud, vUv).r;
        float ndl = dot(normalize(vNW), uSun);
        float lit = smoothstep(-0.1, 0.38, ndl);
        float tw = exp(-pow((ndl - 0.04) / 0.12, 2.0));
        vec3 col = mix(uCloud, uCloud * uDusk * 1.4, tw * 0.5) * (0.025 + lit * 1.05);
        col = 1.0 - exp(-col * 1.3);
        gl_FragColor = vec4(col, cover * 0.88 * (0.3 + 0.7 * smoothstep(-0.3, 0.12, ndl)));
        #include <colorspace_fragment>
      }`,
  })

const atmosphereMaterial = (c) =>
  new ShaderMaterial({
    uniforms: { uSun: { value: new Vector3(-1, 0, 0) }, uAir: { value: c.air }, uDusk: { value: c.dusk } },
    transparent: true,
    depthWrite: false,
    side: BackSide,
    blending: AdditiveBlending,
    vertexShader: /* glsl */ `
      varying vec3 vNW; varying vec3 vPW;
      void main(){ vNW = normalize(mat3(modelMatrix) * normal); vec4 wp = modelMatrix * vec4(position, 1.0); vPW = wp.xyz; gl_Position = projectionMatrix * viewMatrix * wp; }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uSun; uniform vec3 uAir; uniform vec3 uDusk;
      varying vec3 vNW; varying vec3 vPW;
      void main(){
        vec3 N = normalize(vNW);
        float x = -dot(N, normalize(cameraPosition - vPW)); // 1 facing us through the shell, 0 at its edge
        float k = clamp(x / 0.36, 0.0, 1.0);
        float ndl = dot(N, uSun);
        float lit = smoothstep(-0.45, 0.5, ndl);
        float dusk = exp(-pow(ndl / 0.22, 2.0)) * 0.75;
        vec3 col = mix(uAir, uDusk, dusk) * pow(k, 2.2) * lit * 1.5;
        gl_FragColor = vec4(col, 1.0);
        #include <colorspace_fragment>
      }`,
  })

// ---------- Textures ----------

function texture(w, h, data, { srgb = false, renderer }) {
  const t = new DataTexture(data, w, h, RGBAFormat, UnsignedByteType)
  t.colorSpace = srgb ? SRGBColorSpace : NoColorSpace
  t.wrapS = RepeatWrapping
  t.magFilter = LinearFilter
  t.minFilter = LinearMipmapLinearFilter
  t.generateMipmaps = true
  t.anisotropy = renderer.capabilities.getMaxAnisotropy()
  t.needsUpdate = true
  return t
}

// ---------- Stars ----------

// A seeded sky: many faint stars, a few bright ones, denser along a band like the Milky Way. Each
// is a soft round point whose size is set here (in device px) rather than by three.
function stars(c, pixelRatio) {
  const rand = seeded(2024)
  const cool = new Color().setRGB(...c.starCool, SRGBColorSpace)
  const warm = new Color().setRGB(...c.starWarm, SRGBColorSpace)
  const tint = new Color()
  const make = (count, size, brightness, band) => {
    const pos = new Float32Array(count * 3)
    const col = new Float32Array(count * 3)
    const sizes = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      let lat
      if (band && rand() < band) lat = (rand() + rand() + rand() - 1.5) * 0.35 // clustered on the band
      else lat = Math.asin(rand() * 2 - 1)
      const lon = rand() * TAU
      const v = new Vector3(Math.cos(lat) * Math.cos(lon), Math.sin(lat), Math.cos(lat) * Math.sin(lon))
      if (band) v.applyAxisAngle(new Vector3(1, 0, 0), 62 * DEG) // tilt the band across the sky
      v.multiplyScalar(500)
      pos.set([v.x, v.y, v.z], i * 3)
      tint.copy(cool).lerp(warm, rand() ** 1.5)
      const m = rand() ** 2 // most stars are faint
      const b = brightness * (0.3 + 0.7 * m)
      col.set([tint.r * b, tint.g * b, tint.b * b], i * 3)
      sizes[i] = size * (0.7 + 0.6 * m)
    }
    const geometry = new BufferGeometry()
    geometry.setAttribute('position', new BufferAttribute(pos, 3))
    geometry.setAttribute('aColor', new BufferAttribute(col, 3))
    geometry.setAttribute('aSize', new BufferAttribute(sizes, 1))
    const material = new ShaderMaterial({
      uniforms: { uPixelRatio: { value: pixelRatio } },
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      vertexShader: /* glsl */ `
        attribute vec3 aColor; attribute float aSize; uniform float uPixelRatio;
        varying vec3 vColor;
        void main(){ vColor = aColor; gl_PointSize = aSize * uPixelRatio; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: /* glsl */ `
        varying vec3 vColor;
        void main(){
          float d = length(gl_PointCoord - 0.5) * 2.0;
          float a = smoothstep(1.0, 0.0, d);
          gl_FragColor = vec4(vColor * a * a, 1.0);
          #include <colorspace_fragment>
        }`,
    })
    const points = new Points(geometry, material)
    points.frustumCulled = false
    return points
  }
  const group = new Group()
  group.add(make(1500, 2.4, 1.6, 0.5), make(280, 3.4, 1.8, 0.2), make(36, 5, 2, 0))
  return group
}

// ---------- The scene ----------

// Where the Sun sits on the card and how big things are, by layout.
function layoutFor(W, H, strip) {
  return strip
    ? { cx: 0.2 * W, cy: 0.58 * H, ppu: 0.056 * H }
    : { cx: 0.46 * W, cy: 0.665 * H, ppu: 0.07 * H }
}

// planets: from year-planets.js; space: the resolved tokens (readSpace); zoom: the CSS zoom the
// canvas is shown at (the test route enlarges boxes), so it stays sharp.
export function createOrrery({ width, height, strip = false, planets, space, zoom = 1 }) {
  const c = Object.fromEntries(Object.entries(space).map(([k, v]) => [k, new Color().setRGB(...v, SRGBColorSpace)]))
  const y = INTRO.year
  const pixelRatio = Math.min(devicePixelRatio || 1, 2) * zoom

  const renderer = new WebGLRenderer({ antialias: true, powerPreference: 'low-power' })
  renderer.setPixelRatio(pixelRatio)
  renderer.setSize(width, height)
  renderer.setClearColor(c.void)
  const canvas = renderer.domElement
  canvas.className = 'orb-canvas'

  const scene = new Scene()
  const { cx, cy, ppu } = layoutFor(width, height, strip)
  const camera = new PerspectiveCamera(FOV, width / height, 1, 2000)
  const distance = height / (2 * ppu * Math.tan((FOV * DEG) / 2)) // so one unit is `ppu` px at the Sun
  camera.position.set(0, distance * Math.sin(CAMERA_ELEVATION), distance * Math.cos(CAMERA_ELEVATION))
  camera.lookAt(0, 0, 0)
  camera.setViewOffset(width, height, width / 2 - cx, height / 2 - cy, width, height)

  scene.add(stars(c, pixelRatio))

  // the Sun, its corona and the light everything shares
  const sun = new Mesh(new SphereGeometry(R_SUN, 64, 48), sunMaterial(c))
  const span = 7
  const corona = new Mesh(new PlaneGeometry(2 * R_SUN * span, 2 * R_SUN * span), coronaMaterial(c, span))
  corona.renderOrder = -1 // behind the planets, which it never washes out
  const light = new PointLight(0xffffff, Math.PI * 1.15, 0, 0)
  // The glow sits behind everything along the line of sight through the Sun, so it lines up with
  // the Sun on screen but a planet is always in front of it; it is made larger to make up for the distance.
  const behind = 8
  corona.position.copy(camera.position).normalize().multiplyScalar(-behind)
  corona.scale.setScalar((distance + behind) / distance)
  scene.add(sun, corona, light, new AmbientLight(0xffffff, 0.02))

  // the Earth, in a group that tilts it and a group that carries it round
  const earthTex = {
    day: texture(planets.earth.w, planets.earth.h, planets.earth.day, { srgb: true, renderer }),
    data: texture(planets.earth.w, planets.earth.h, planets.earth.data, { renderer }),
    clouds: texture(planets.clouds.w, planets.clouds.h, planets.clouds.data, { renderer }),
  }
  const earthMat = earthMaterial(c, earthTex.day, earthTex.data)
  const cloudMat = cloudMaterial(c, earthTex.clouds)
  const airMat = atmosphereMaterial(c)
  const earth = new Group()
  const tilt = new Group()
  tilt.rotation.z = -TILT // the axis leans toward +x, away from the Sun at perihelion: northern winter in January
  const globe = new Mesh(new SphereGeometry(1, 96, 64), earthMat)
  const clouds = new Mesh(new SphereGeometry(1.012, 96, 64), cloudMat)
  tilt.add(globe, clouds)
  const air = new Mesh(new SphereGeometry(1.075, 64, 48), airMat)
  earth.add(tilt, air)
  earth.scale.setScalar(EARTH_SCALE) // the Earth, and the Moon with it, drawn larger than the orbit's scale allows
  scene.add(earth)

  // the Moon, locked to the Earth
  const moonTex = {
    map: texture(planets.moon.w, planets.moon.h, planets.moon.albedo, { srgb: true, renderer }),
    bump: texture(planets.moon.w, planets.moon.h, planets.moon.bump, { renderer }),
  }
  const moon = new Mesh(new SphereGeometry(R_MOON, 48, 32), new MeshStandardMaterial({ map: moonTex.map, bumpMap: moonTex.bump, bumpScale: 2.2, roughness: 1, metalness: 0 }))
  const moonPivot = new Group()
  moonPivot.rotation.x = MOON_INCLINATION
  moonPivot.add(moon)
  earth.add(moonPivot)

  // the trail the Earth leaves: the orbit, drawn up to where she is and fading with age
  const N = 360
  const path = new Float32Array((N + 1) * 3)
  const v = new Vector3()
  for (let i = 0; i <= N; i++) earthAt((i / N) * TAU, v).toArray(path, i * 3)
  const trailColors = new Float32Array((N + 1) * 4)
  const trailGeometry = new BufferGeometry()
  trailGeometry.setAttribute('position', new BufferAttribute(path, 3))
  trailGeometry.setAttribute('color', new Float32BufferAttribute(trailColors, 4))
  const trail = new Line(trailGeometry, new LineBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false }))
  trail.frustumCulled = false
  scene.add(trail)
  const trailTint = c.starCool

  const sunDir = new Vector3()
  const pos = new Vector3()

  // t: how far through the year, 0 to 1; past 1 the years go on (the idle loop).
  function render(t) {
    const M = TAU * t
    earthAt(M, pos)
    earth.position.copy(pos)
    sunDir.copy(pos).multiplyScalar(-1).normalize() // from the Earth toward the Sun
    for (const m of [earthMat, cloudMat, airMat]) m.uniforms.uSun.value.copy(sunDir)

    globe.rotation.y = TAU * y.spins * t // prograde, west to east
    clouds.rotation.y = TAU * y.spins * t * 1.035 + 0.5
    const moonAngle = TAU * y.moonOrbits * t
    moonPivot.position.set(0, 0, 0)
    moon.position.set(D_MOON * Math.cos(moonAngle), 0, -D_MOON * Math.sin(moonAngle))
    moon.rotation.y = moonAngle + Math.PI // tidally locked: one face always toward the Earth

    sun.rotation.y = TAU * y.sunTurns * t
    sun.material.uniforms.uTime.value = t * 60
    corona.material.uniforms.uTime.value = t * 60
    corona.quaternion.copy(camera.quaternion)

    // the trail: bright at the Earth, fading behind her; the whole ring once the year is out,
    // and after that it follows her round
    const later = t > 1
    const head = later ? Math.floor((t % 1) * N) : Math.floor(t * N)
    const colors = trailGeometry.attributes.color
    for (let i = 0; i <= N; i++) {
      const age = head >= i ? (head - i) / N : later ? (head - i + N) / N : 1
      const a = later || i <= head ? 0.5 * Math.pow(Math.max(0, 1 - age), 1.6) : 0
      colors.setXYZW(i, trailTint.r, trailTint.g, trailTint.b, a)
    }
    colors.needsUpdate = true
    trailGeometry.setDrawRange(0, later ? N + 1 : Math.min(N + 1, head + 2))

    renderer.render(scene, camera)
  }

  // The year at t as an image (the finished one by default): what rests in the card when nothing
  // is playing.
  function snapshot(t = 1) {
    render(t)
    const webp = canvas.toDataURL('image/webp', 0.92)
    return webp.startsWith('data:image/webp') ? webp : canvas.toDataURL('image/png')
  }

  function dispose() {
    for (const o of [sun, corona, globe, clouds, air, moon, trail]) {
      o.geometry.dispose()
      o.material.dispose()
    }
    for (const t of [...Object.values(earthTex), ...Object.values(moonTex)]) t.dispose()
    renderer.dispose()
    renderer.forceContextLoss()
    canvas.remove()
  }

  return { canvas, render, snapshot, dispose }
}
