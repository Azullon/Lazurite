import ObjectSelection from 'common/models/editor/ObjectSelection'
import SlideObject from 'common/models/presentation/slideObjects/base/SlideObject'
import TextSlideObject from 'common/models/presentation/slideObjects/TextSlideObject'
import RendererResolution from 'common/models/slideRenderer/RendererResolution'

const dashAnimationSpeed = 8
const selectionColor = '#058CD8'
const guideLinesColor = '#F07427'
const shadowOutlineColor = '#00000020'

let prevSelectionComposite = document.createElement('canvas')
let prevSelectionIdentity = []

function createComposite(width: number, height: number) {
  const result = document.createElement('canvas')
  result.width = width
  result.height = height
  return result
}

export default function renderSelection(
  ctx: CanvasRenderingContext2D,
  resolution: RendererResolution,
  selection: ObjectSelection,
  slideObjects: SlideObject[],
  highlight: SlideObject | null,
  highlightAll = false,
  guideLines: { x?: number[]; y?: number[] } | null
) {
  const scale = function (...values: number[]) {
    return values.map((value) => {
      value *= resolution.scale
      value = Math.round(value * 1000)
      if (value % 1000 > 500) return Math.ceil(value / 1000)
      else return Math.floor(value / 1000)
    })
  }

  const [outerTop, outerBottom, outerLeft, outerRight] = scale(
    selection.top,
    selection.bottom,
    selection.left,
    selection.right
  )

  if (guideLines) {
    ctx.lineWidth = 1
    ctx.strokeStyle = guideLinesColor
    ctx.setLineDash([])
    for (const x of guideLines.x ?? []) {
      const scaledX = Math.floor(x * resolution.scale)
      ctx.beginPath()
      ctx.moveTo(scaledX + 0.5, 0)
      ctx.lineTo(scaledX + 0.5, resolution.targetHeight)
      ctx.stroke()
    }
    for (const y of guideLines.y ?? []) {
      const scaledY = Math.floor(y * resolution.scale)
      ctx.beginPath()
      ctx.moveTo(0, scaledY + 0.5)
      ctx.lineTo(resolution.targetWidth, scaledY + 0.5)
      ctx.stroke()
    }
  }

  const selectionWidth = outerRight - outerLeft
  const selectionHeight = outerBottom - outerTop

  const currentSelectionIdentity: any[] = [selectionWidth, selectionHeight]
  selection.items.forEach((item) => currentSelectionIdentity.push(item.id))
  const isSimilarIdentity = currentSelectionIdentity.length == prevSelectionIdentity.length

  let isSame = isSimilarIdentity
  for (let i = 0; isSame && i < currentSelectionIdentity.length; i++) {
    if (currentSelectionIdentity[i] !== prevSelectionIdentity[i]) isSame = false
  }

  if (isSame) {
    ctx.drawImage(prevSelectionComposite, outerLeft - 1, outerTop - 1)
  }

  let currentSelectionComposite = createComposite(selectionWidth + 2, selectionHeight + 2)
  let currentContext = currentSelectionComposite.getContext('2d')
  ctx.strokeStyle = selectionColor

  const renderOutline = function (
    ctx: CanvasRenderingContext2D,
    slideObject: SlideObject,
    offsetX = -outerLeft,
    offsetY = -outerTop,
    outlineWidth = 2
  ) {
    const [left, top, right, bottom] = scale(slideObject.left, slideObject.top, slideObject.right, slideObject.bottom)
    ctx.strokeRect(left + offsetX + outlineWidth / 2, top + offsetY + outlineWidth / 2, right - left, bottom - top)
  }

  ctx.setLineDash([4, 4])
  ctx.lineWidth = 2

  if (highlight && !selection.isInSelection(highlight)) {
    ctx.lineDashOffset = 0
    renderOutline(ctx, highlight, -1, -1)
  }

  if (selectionWidth == Number.NEGATIVE_INFINITY || selectionHeight == Number.NEGATIVE_INFINITY) return
  if (selectionWidth == 0 || selectionHeight == 0) return

  if (highlightAll) {
    ctx.strokeStyle = shadowOutlineColor
    ctx.setLineDash([])
    ctx.lineWidth = 1
    for (const item of slideObjects) {
      if (item instanceof TextSlideObject && !selection.isInSelection(item)) renderOutline(ctx, item, 0, 0, 1)
    }
  }

  if (!isSame) {
    currentContext.strokeStyle = selectionColor
    currentContext.setLineDash([4, 4])
    currentContext.lineWidth = 2
    for (const item of selection.items) renderOutline(currentContext, item)

    currentContext.strokeStyle = selectionColor
    currentContext.setLineDash([])
    currentContext.lineWidth = 2
    currentContext.strokeRect(1, 1, selectionWidth, selectionHeight)

    ctx.drawImage(currentSelectionComposite, outerLeft - 1, outerTop - 1)
    prevSelectionComposite = currentSelectionComposite
    prevSelectionIdentity = currentSelectionIdentity
  }
}
