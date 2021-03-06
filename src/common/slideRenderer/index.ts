import Presentation from 'common/models/presentation/Presentation'
import Slide from 'common/models/presentation/Slide'
import ImageSlideObject from 'common/models/presentation/slideObjects/ImageSlideObject'
import TextSlideObject from 'common/models/presentation/slideObjects/TextSlideObject'
import RendererResolution from 'common/models/slideRenderer/RendererResolution'
import renderImage, { getRenderImageDeps } from './objectRenderers/renderImage'
import renderText, { getRenderTextDeps } from './objectRenderers/renderText'
import renderBackground from './renderBackground'

const composites = new Map<Slide, [number, HTMLCanvasElement[]]>()
const identities = new Map<Slide, [number, any[][]]>()

export function createComposite(ctx: CanvasRenderingContext2D) {
  const result = document.createElement('canvas')
  result.width = ctx.canvas.width
  result.height = ctx.canvas.height
  return result
}

const slideRenderEventListeners = new Map<Slide, Set<(canvas: HTMLCanvasElement) => void>>()

export function addSlideRenderEventListener(slide: Slide, listener: (canvas: HTMLCanvasElement) => void) {
  if (!slideRenderEventListeners.has(slide)) slideRenderEventListeners.set(slide, new Set())
  slideRenderEventListeners.get(slide).add(listener)
}
export function removeSlideRenderEventListener(slide: Slide, listener: (canvas: HTMLCanvasElement) => void) {
  if (!slideRenderEventListeners.has(slide)) return
  slideRenderEventListeners.get(slide).delete(listener)
  if (slideRenderEventListeners.get(slide).size == 0) slideRenderEventListeners.delete(slide)
}

function renderObjects(
  ctx: CanvasRenderingContext2D,
  resolution: RendererResolution,
  presentation: Presentation,
  slide: Slide
) {
  const resId = ctx.canvas.width * 8192 + ctx.canvas.height
  const [prevResId, prevRenderComposites] = composites.get(slide) ?? [0, []]
  const [, prevRenderIdentity] = identities.get(slide) ?? [0, []]
  let currentRenderComposites = [] as HTMLCanvasElement[]
  let currentRenderIdentity = [] as any[][]

  const objectsPerComposite = Math.round(Math.sqrt(slide.length))
  let currentComposite = createComposite(ctx)
  let currentContext = currentComposite.getContext('2d')

  for (const object of slide) {
    switch (object.type) {
      case TextSlideObject.name:
        currentRenderIdentity.push(getRenderTextDeps(object as TextSlideObject))
        break
      case ImageSlideObject.name:
        currentRenderIdentity.push(getRenderImageDeps(object as ImageSlideObject))
        break
      default:
        currentRenderIdentity.push([])
    }
  }

  let isSimilarIdentity = prevRenderIdentity.length == currentRenderIdentity.length && prevResId == resId
  let error = null
  for (let i = 0; i < slide.length; i++) {
    if (isSimilarIdentity && i % objectsPerComposite == 0) {
      let isSame = true
      for (let j = i; isSame && j < i + objectsPerComposite && j < prevRenderIdentity.length; j++) {
        if (prevRenderIdentity[j].length != currentRenderIdentity[j].length) {
          isSame = false
        } else {
          const objectIdentity = currentRenderIdentity[j]
          const prevObjectIdentity = prevRenderIdentity[j]
          const length = objectIdentity.length

          for (let l = 0; l < length; l++) {
            if (objectIdentity[l] !== prevObjectIdentity[l]) {
              isSame = false
              break
            }
          }
        }
      }
      if (isSame) {
        const composite = prevRenderComposites[i / objectsPerComposite]
        currentRenderComposites.push(composite)
        ctx.drawImage(composite, 0, 0)
        i += objectsPerComposite - 1
        continue
      }
    }

    const object = slide[i]
    try {
      switch (object.type) {
        case TextSlideObject.name:
          renderText(currentContext, resolution, object as TextSlideObject)
          break
        case ImageSlideObject.name:
          renderImage(currentContext, resolution, object as ImageSlideObject)
          break
        default:
          console.error('Missing renderer for ' + object.type)
      }
    } catch (e) {
      error = e
    }

    if (i % objectsPerComposite == objectsPerComposite - 1 || i == slide.length - 1) {
      ctx.drawImage(currentComposite, 0, 0)
      currentRenderComposites.push(currentComposite)
      currentComposite = createComposite(ctx)
      currentContext = currentComposite.getContext('2d')
    }
  }

  return [currentRenderComposites, currentRenderIdentity, error]
}

export default function render(
  ctx: CanvasRenderingContext2D,
  presentation: Presentation,
  slide: Slide,
  requestRerender = () => {}
) {
  let targetWidth = ctx.canvas.width
  let resolution = new RendererResolution(presentation.resolution.width, presentation.resolution.height)

  let currentRenderComposites = []
  let currentRenderIdentity = []
  let error = null

  try {
    resolution.targetWidth = targetWidth

    if (targetWidth < 4) return

    renderBackground(ctx, resolution, presentation.theme.background)
    ;[currentRenderComposites, currentRenderIdentity, error] = renderObjects(ctx, resolution, presentation, slide)

    const listeners = slideRenderEventListeners.get(slide) ?? new Set()
    listeners.forEach((value) => value(ctx.canvas))

    if (error) throw error
  } catch (err) {
    requestRerender()
    currentRenderIdentity = []
    console.warn(err)
  } finally {
    const resId = ctx.canvas.width * 8192 + ctx.canvas.height
    composites.set(slide, [resId, currentRenderComposites])
    identities.set(slide, [resId, currentRenderIdentity])
  }
}
