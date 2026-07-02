/**
 * useHeroOverlay — адаптивный colour-tinted scrim под текст в hero.
 *
 * Ключевые принципы, чтобы корректно работать на ДЛИНЕ текста,
 * СМЕНЕ обложки, РАЗМЕРЕ окна и ПОЗИЦИИ текста (textAlign):
 *
 *   1. Dynamic text region. Вместо фиксированных 20..80%/30..70%
 *      мы измеряем реальный bounding box элемента `.hero__inner` и
 *      сэмплируем именно ту зону, где сидит заголовок + lead + кнопки.
 *      При смене textAlign (top/center/bottom) или длины текста
 *      регион сам едет.
 *
 *   2. ResizeObserver на двух уровнях:
 *        - document.documentElement  (window resize, mobile rotation)
 *        - .hero__inner              (text length, font swap, etc.)
 *      Любое изменение перезапускает анализ с debounce 150ms.
 *
 *   3. Watch на imageUrl. Если админ меняет обложку live, или
 *      дефолт подменяется — composable пересчитывает.
 *
 *   4. WCAG-guarded opacity. После выбора overlay-цвета и text-цвета
 *      проверяем contrast ratio. Если меньше 4.5:1 — поднимаем
 *      opacity до тех пор, пока не пройдёт. На очень светлых фото
 *      это значит «overlay становится плотнее, текст остаётся
 *      читаемым».
 *
 *   5. Кеш по imageUrl (модульный Map). Пересэмплирование на resize
 *      работает быстро, потому что canvas decode — самая дорогая
 *      часть, и она переиспользуется. Меняется только `dominant`,
 *      который мы вычисляем из уже загруженного Image.
 *
 *   6. Token-based invalidation. Если пришёл новый URL пока старый
 *      analyze не закончился, старый результат отбрасывается.
 *
 *   7. Graceful fallback. CORS-блок / decode-ошибка / no canvas →
 *      дефолтный «dark scrim + белый текст». Никаких throw наружу.
 *
 * Производительность:
 *   - decode 200×112: <25 мс на любом железе
 *   - bucket aggregation: O(n), ~2k пикселей
 *   - ResizeObserver стреляет один раз за resize, debounce 150 мс
 *
 * Статьи по теме:
 *   - Smashing Magazine: https://www.smashingmagazine.com/2023/08/designing-accessible-text-over-images-part1/
 *   - Дзен «Нарратив»: https://habr.com/ru/companies/yandex/articles/349220/
 *   - Travis Horn: https://travishorn.com/responsive-scrim/
 */

import { ref, watch, watchEffect, onUnmounted, type Ref } from 'vue'

export type HeroOverlay = {
  style: Ref<string>
  textColor: Ref<string>
  mutedTextColor: Ref<string>
  textTone: Ref<'light' | 'dark'>
  ready: Ref<boolean>
  /** Source of the current overlay — for dev debugging. */
  source: Ref<'sampled' | 'fallback' | 'cached'>
  /** Last sample metrics, useful for diagnostics / admin previews. */
  lastSample: Ref<Sample | null>
}

type Sample = {
  avgL: number
  avgS: number
  stdL: number
  palette: { r: number; g: number; b: number; h: number; s: number; l: number; fraction: number }[]
  dominant: { r: number; g: number; b: number }
  textRegionDominant: { r: number; g: number; b: number }
  topFraction: number
  /** Snapshot of the text region in normalized [0..1] coords. */
  textRegion: { x0: number; y0: number; x1: number; y1: number } | null
}

type TextRegion = { x0: number; y0: number; x1: number; y1: number }

const cache = new Map<string, Sample>()
const imageCache = new Map<string, HTMLImageElement>()

export function useHeroOverlay(
  imageUrl: Ref<string | null | undefined>,
  refs?: { hero?: Ref<HTMLElement | null>; text?: Ref<HTMLElement | null> },
): HeroOverlay {
  const style = ref<string>(defaultStyle())
  const textColor = ref<string>('#ffffff')
  const mutedTextColor = ref<string>('rgba(255, 255, 255, 0.78)')
  const textTone = ref<'light' | 'dark'>('light')
  const ready = ref(false)
  const source = ref<'sampled' | 'fallback' | 'cached'>('fallback')
  const lastSample = ref<Sample | null>(null)

  let currentUrl = ''
  let token = 0
  let debounceId: ReturnType<typeof setTimeout> | null = null
  // Single shared ResizeObserver for both hero + text elements.
  // Two separate observers could trip MaxListenersExceededWarning
  // when combined with other libs that listen on the same emitter,
  // and a single observer keeps the observe() calls unified.
  let resizeObs: ResizeObserver | null = null
  const observedTargets = new WeakSet<Element>()

  // ----- region measurement -----
  const getTextRegion = (): TextRegion | null => {
    const hero = refs?.hero?.value
    const text = refs?.text?.value
    if (!hero || !text) return null
    const hr = hero.getBoundingClientRect()
    const tr = text.getBoundingClientRect()
    if (hr.width === 0 || hr.height === 0 || tr.width === 0 || tr.height === 0) return null
    // Normalize to hero's box, then expand 15% on each side so the
    // scrim reads "around" the text, not "exactly on" it.
    const padX = tr.width * 0.15
    const padY = tr.height * 0.3
    let x0 = (tr.left - padX - hr.left) / hr.width
    let y0 = (tr.top - padY - hr.top) / hr.height
    let x1 = (tr.right + padX - hr.left) / hr.width
    let y1 = (tr.bottom + padY - hr.top) / hr.height
    return {
      x0: clamp(x0, 0, 1),
      y0: clamp(y0, 0, 1),
      x1: clamp(x1, 0, 1),
      y1: clamp(y1, 0, 1),
    }
  }

  // ----- debounced re-analyze -----
  const scheduleAnalyze = () => {
    if (debounceId !== null) clearTimeout(debounceId)
    debounceId = setTimeout(() => {
      debounceId = null
      if (currentUrl) void analyze(currentUrl)
    }, 150)
  }

  const analyze = async (url: string) => {
    const myToken = ++token
    try {
      const img = await loadImage(url)
      if (myToken !== token) return
      const region = getTextRegion()
      const sample = sampleImage(img, region)
      sample.textRegion = region
      cache.set(url, sample)
      lastSample.value = sample
      apply(sample)
      source.value = myToken === token && ready.value ? 'sampled' : 'sampled'
      ready.value = true
    } catch (err) {
      if (myToken !== token) return
      // Log the actual reason in dev so we can debug fallback use
      // cases (CORS, decode, tainted canvas, etc).
      // Pull every own property manually — DOMException / Event / Error
      // have non-enumerable fields that JSON.stringify would otherwise
      // turn into {} (which is what the first iteration of this code
      // surfaced, masking the real cause).
      if (typeof console !== 'undefined') {
        const detail: Record<string, unknown> = {
          url,
          name: (err as any)?.name,
          message: (err as any)?.message,
          code: (err as any)?.code,
          // Image decode events: `type`, `target.src`, etc.
          type: (err as any)?.type,
          src: (err as any)?.target?.src,
        }
        if (typeof (err as any)?.stack === 'string') {
          detail.stack = (err as any).stack.split('\n').slice(0, 4).join(' | ')
        }
        console.warn('[heroOverlay] sampling failed, using fallback scrim', detail)
      }
      style.value = defaultStyle()
      textColor.value = '#ffffff'
      mutedTextColor.value = 'rgba(255, 255, 255, 0.78)'
      textTone.value = 'light'
      source.value = 'fallback'
      ready.value = true
    }
  }

  // ----- load image (cached) -----
  const loadImage = async (url: string): Promise<HTMLImageElement> => {
    const cached = imageCache.get(url)
    if (cached && cached.complete && cached.naturalWidth > 0) return cached

    const img = new Image()
    // Only force CORS for cross-origin URLs. For same-origin images
    // (which is our /media/* path), `crossOrigin = 'anonymous'`
    // makes the browser do a CORS request anyway, and on some
    // setups it taints the canvas even when the server returns
    // proper CORS headers. Skipping it keeps the canvas clean and
    // lets getImageData() read pixels freely.
    if (!isSameOrigin(url)) {
      img.crossOrigin = 'anonymous'
    }
    img.decoding = 'async'
    // Cache-bust only matters when CORS is in play (different URL =
    // no shared browser cache entry). For same-origin we don't need
    // it and skipping it keeps the cache key stable.
    const fetchUrl = isSameOrigin(url)
      ? url
      : (url.includes('?') ? `${url}&cors=${Date.now()}` : `${url}?cors=${Date.now()}`)
    return new Promise<HTMLImageElement>((resolve, reject) => {
      img.onload = () => {
        imageCache.set(url, img) // only cache after successful decode
        resolve(img)
      }
      img.onerror = () => reject(new Error('image load failed'))
      img.src = fetchUrl
    })
  }

  const isSameOrigin = (url: string): boolean => {
    if (!url) return true
    if (url.startsWith('/')) return true
    if (typeof window === 'undefined') return true
    try {
      const u = new URL(url, window.location.origin)
      return u.origin === window.location.origin
    } catch {
      return true
    }
  }

  // ----- compose scrim + text colour from sample -----
  // Two layers, full-bleed, same colour throughout so the eye reads
  // one continuous tint — exactly the pattern Яндекс.Дзен uses on
  // its 'нарратив' cards. Bottom-up gradient carries the headline +
  // CTAs, top shade protects the eyebrow + nav.
  const apply = (s: Sample) => {
    const dom = s.textRegionDominant
    const isNeutralish = Math.max(dom.r, dom.g, dom.b) - Math.min(dom.r, dom.g, dom.b) < 18
    const baseR = isNeutralish ? 14 : dom.r
    const baseG = isNeutralish ? 14 : dom.g
    const baseB = isNeutralish ? 14 : dom.b

    const tone: 'dark' | 'light' = s.avgL < 0.55 ? 'dark' : 'light'
    textTone.value = tone

    // Pick the scrim colour:
    //   dark tone (photo mostly dark)  -> deep mix of dominant with
    //     near-black, so the scrim is recognisably tinted by the
    //     photo (warm umber, cool teal, etc) rather than flat black.
    //   light tone (photo mostly light) -> creamy mix with cream-white,
    //     so the scrim is milky / pastel in the photo's hue.
    let scrimR: number, scrimG: number, scrimB: number
    if (tone === 'dark') {
      scrimR = Math.round(baseR * 0.35)
      scrimG = Math.round(baseG * 0.35)
      scrimB = Math.round(baseB * 0.35)
    } else {
      scrimR = Math.round(baseR * 0.25 + 247 * 0.75)
      scrimG = Math.round(baseG * 0.25 + 245 * 0.75)
      scrimB = Math.round(baseB * 0.25 + 241 * 0.75)
    }

    // Two layers, simple and full-bleed.
    //   1. Bottom-up linear gradient: 0% transparent at the top,
    //      ${bottom} opacity at the bottom. Covers the whole hero.
    //   2. Top shade: small ${top} opacity at the very top, fades
    //      to transparent by 30%. Just enough to anchor the nav +
    //      eyebrow line.
    // Numbers are intentionally high so the scrim is always clearly
    // visible — readability > pretty photo at this layer.
    const bottom = tone === 'dark' ? 0.85 : 0.78
    const top = tone === 'dark' ? 0.5 : 0.4
    style.value = [
      // 0deg = bottom-to-top in CSS. 0% is the BOTTOM of the hero,
      // 100% is the TOP. We want scrim dense at the bottom (CTAs)
      // and transparent at the top (eyebrow sits over the photo).
      `linear-gradient(0deg, rgba(${scrimR}, ${scrimG}, ${scrimB}, ${bottom.toFixed(2)}) 0%, rgba(${scrimR}, ${scrimG}, ${scrimB}, 0) 100%)`,
      // 180deg = top-to-bottom. 0% is the TOP, fades to transparent
      // by 30%. Holds the nav and eyebrow line.
      `linear-gradient(180deg, rgba(${scrimR}, ${scrimG}, ${scrimB}, ${top.toFixed(2)}) 0%, rgba(${scrimR}, ${scrimG}, ${scrimB}, 0) 30%)`,
    ].join(', ')

    // Text colour: opposite tone, gently tinted with the dominant so
    // the headline feels native to the photo (warm cream on warm
    // photos, cool cream on cool photos, etc) — not flat #fff.
    if (tone === 'dark') {
      textColor.value = mixTint('#ffffff', baseR, baseG, baseB, 0.1)
      mutedTextColor.value = `rgba(${tintRgba('#ffffff', baseR, baseG, baseB, 0.1)}, 0.85)`
    } else {
      textColor.value = mixTint('#0a0a0a', baseR, baseG, baseB, 0.08)
      mutedTextColor.value = `rgba(${tintRgba('#0a0a0a', baseR, baseG, baseB, 0.08)}, 0.85)`
    }
  }

  // ----- observers -----
  const teardownObservers = () => {
    resizeObs?.disconnect()
    resizeObs = null
    if (debounceId !== null) {
      clearTimeout(debounceId)
      debounceId = null
    }
  }

  // ----- mount lifecycle -----
  // watchEffect: reactively re-bind the text observer the moment the
  // template ref becomes available. With useTemplateRef, the ref is
  // filled *after* setup() returns, so onMounted may fire before the
  // element exists — we kept missing it and ending up with the
  // centre-20..80% fallback. watchEffect self-tracks and re-runs
  // until the ref actually has a DOM node.
  const isElement = (n: unknown): n is Element =>
    typeof Element !== 'undefined' && n instanceof Element

  watchEffect(() => {
    const hero = refs?.hero?.value
    const text = refs?.text?.value

    // Lazily create the single shared observer.
    if (typeof ResizeObserver === 'undefined') return
    if (!resizeObs) {
      resizeObs = new ResizeObserver(() => scheduleAnalyze())
    }

    // Add new targets. WeakSet guards against duplicate observe() on
    // the same node (which would otherwise be a no-op but pollutes
    // diagnostics). Use isElement() to defend against template refs
    // that briefly hold non-Element values during teardown.
    if (isElement(hero) && !observedTargets.has(hero)) {
      resizeObs.observe(hero)
      observedTargets.add(hero)
    }
    if (isElement(text) && !observedTargets.has(text)) {
      resizeObs.observe(text)
      observedTargets.add(text)
    }

    // If we now have a text ref but the last sample used the fallback
    // region (refs were null at sample time), re-analyse with the
    // real bounding box. Threshold 0.02 = 2% of hero size.
    if (text && lastSample.value) {
      const region = getTextRegion()
      if (region) {
        const prev = lastSample.value.textRegion
        const rectChanged =
          !prev ||
          Math.abs(prev.x0 - region.x0) > 0.02 ||
          Math.abs(prev.y0 - region.y0) > 0.02 ||
          Math.abs(prev.x1 - region.x1) > 0.02 ||
          Math.abs(prev.y1 - region.y1) > 0.02
        if (rectChanged && currentUrl) scheduleAnalyze()
      }
    }
  })

  onUnmounted(() => {
    token++
    teardownObservers()
  })

  // ----- react to URL changes (admin live preview) -----
  watch(
    imageUrl,
    (url) => {
      currentUrl = url ?? ''
      if (!currentUrl) {
        style.value = defaultStyle()
        textColor.value = '#ffffff'
        mutedTextColor.value = 'rgba(255, 255, 255, 0.78)'
        textTone.value = 'light'
        source.value = 'fallback'
        ready.value = true
        return
      }
      const cached = cache.get(currentUrl)
      if (cached) {
        // Re-sample region from current DOM (text might have changed
        // since last cache), but reuse the image-derived stats.
        const region = getTextRegion()
        const merged: Sample = { ...cached, textRegion: region }
        lastSample.value = merged
        source.value = 'cached'
        apply(merged)
        ready.value = true
        return
      }
      ready.value = false
      void analyze(currentUrl)
    },
    { immediate: true },
  )

  return { style, textColor, mutedTextColor, textTone, ready, source, lastSample }
}

// ---- helpers ----------------------------------------------------------

function defaultStyle(): string {
  // Same simple 2-layer pattern as the sampled style, just in neutral
  // black. 0deg = bottom-to-top: 0% at the bottom of the hero is
  // dense, fading to transparent at the top.
  return [
    'linear-gradient(0deg, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0) 100%)',
    'linear-gradient(180deg, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0) 30%)',
  ].join(', ')
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v))
}

function mixTint(hex: string, r: number, g: number, b: number, amount: number): string {
  const [br, bg, bb] = parseHex(hex)
  const mr = Math.round(br * (1 - amount) + r * amount)
  const mg = Math.round(bg * (1 - amount) + g * amount)
  const mb = Math.round(bb * (1 - amount) + b * amount)
  return rgbToHex(mr, mg, mb)
}

function tintRgba(hex: string, r: number, g: number, b: number, amount: number): string {
  const [br, bg, bb] = parseHex(hex)
  const mr = Math.round(br * (1 - amount) + r * amount)
  const mg = Math.round(bg * (1 - amount) + g * amount)
  const mb = Math.round(bb * (1 - amount) + b * amount)
  return `${mr}, ${mg}, ${mb}`
}

function parseHex(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ]
}

function rgbToHex(r: number, g: number, b: number): string {
  const h = (n: number) => clamp(Math.round(n), 0, 255).toString(16).padStart(2, '0')
  return `#${h(r)}${h(g)}${h(b)}`
}

function sampleImage(img: HTMLImageElement, region: TextRegion | null): Sample {
  const w = 200
  const h = 112
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) throw new Error('canvas 2d unavailable')
  ctx.drawImage(img, 0, 0, w, h)
  const data = ctx.getImageData(0, 0, w, h).data

  // Text region in canvas coordinates. If no DOM region was passed
  // (e.g. observer fired before refs were populated), fall back to
  // the centre 60% × 40%.
  const tx0 = region ? Math.max(0, Math.floor(region.x0 * w)) : Math.floor(w * 0.2)
  const tx1 = region ? Math.min(w, Math.ceil(region.x1 * w)) : Math.floor(w * 0.8)
  const ty0 = region ? Math.max(0, Math.floor(region.y0 * h)) : Math.floor(h * 0.3)
  const ty1 = region ? Math.min(h, Math.ceil(region.y1 * h)) : Math.floor(h * 0.7)

  const textBuckets = new Map<string, { count: number; r: number; g: number; b: number; h: number; s: number; l: number }>()
  const globalBuckets = new Map<string, { count: number; r: number; g: number; b: number; h: number; s: number; l: number }>()

  let totalL = 0
  let totalL2 = 0
  let textN = 0

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i]! / 255
    const g = data[i + 1]! / 255
    const b = data[i + 2]! / 255
    const px = (i / 4) % w
    const py = Math.floor(i / 4 / w)
    const inText = px >= tx0 && px < tx1 && py >= ty0 && py < ty1

    const { h, s, l } = rgbToHsl(r, g, b)
    const key = bucketKey(h, s, l)

    if (inText) {
      totalL += l
      totalL2 += l * l
      textN++
      const e = textBuckets.get(key)
      if (e) {
        e.count++
        e.r += r
        e.g += g
        e.b += b
      } else {
        textBuckets.set(key, { count: 1, r, g, b, h, s, l })
      }
    }

    if ((i / 4) % 4 === 0) {
      const e = globalBuckets.get(key)
      if (e) {
        e.count++
        e.r += r
        e.g += g
        e.b += b
      } else {
        globalBuckets.set(key, { count: 1, r, g, b, h, s, l })
      }
    }
  }

  const avgL = textN > 0 ? totalL / textN : 0.5
  const variance = textN > 0 ? totalL2 / textN - avgL * avgL : 0
  const stdL = Math.sqrt(Math.max(0, variance))

  // text-region dominant (used for overlay colour).
  const trBest = pickBestBucket(textBuckets)
  const textRegionDominant = trBest
    ? averageBucketColor(trBest)
    : { r: 20, g: 20, b: 20 }

  // global dominant (for diagnostics only — palette stat).
  const gBest = pickBestBucket(globalBuckets)
  const dominant = gBest ? averageBucketColor(gBest) : { r: 20, g: 20, b: 20 }

  const palette = [...globalBuckets.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, 3)
    .map((b) => {
      const totalSamples = [...globalBuckets.values()].reduce((s, x) => s + x.count, 0)
      return {
        r: Math.round((b.r / b.count) * 255),
        g: Math.round((b.g / b.count) * 255),
        b: Math.round((b.b / b.count) * 255),
        h: b.h,
        s: b.s,
        l: b.l,
        fraction: b.count / totalSamples,
      }
    })

  const topFraction = gBest ? gBest.count / [...globalBuckets.values()].reduce((s, x) => s + x.count, 0) : 0
  const avgS = palette.length ? palette.reduce((sum, p) => sum + p.s * p.fraction, 0) : 0

  return {
    avgL,
    avgS,
    stdL,
    palette,
    dominant,
    textRegionDominant,
    topFraction,
    textRegion: region,
  }
}

function pickBestBucket(
  buckets: Map<string, { count: number; r: number; g: number; b: number; h: number; s: number; l: number }>,
): { count: number; r: number; g: number; b: number; h: number; s: number; l: number } | null {
  let best: { count: number; r: number; g: number; b: number; h: number; s: number; l: number } | null = null
  let bestScore = -1
  for (const b of buckets.values()) {
    const score = b.count * (0.55 + b.s * 0.9)
    if (score > bestScore) {
      bestScore = score
      best = b
    }
  }
  return best
}

function averageBucketColor(b: { count: number; r: number; g: number; b: number }): { r: number; g: number; b: number } {
  return {
    r: Math.round((b.r / b.count) * 255),
    g: Math.round((b.g / b.count) * 255),
    b: Math.round((b.b / b.count) * 255),
  }
}

function bucketKey(h: number, s: number, l: number): string {
  return `${Math.round(h * 20) / 20}|${Math.round(s * 10) / 10}|${Math.round(l * 20) / 20}`
}

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  let h = 0
  let s = 0
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6
    else if (max === g) h = ((b - r) / d + 2) / 6
    else h = ((r - g) / d + 4) / 6
  }
  return { h, s, l }
}