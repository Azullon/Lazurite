import './ResizeOverlay.scss'
import RendererResolution from '@/models/slideRenderer/RendererResolution'
import { raw as store } from '@/store'
import useForceUpdate from '@/util/hooks/useForceUpdate'
import { h, JSX } from 'preact'
import { useLayoutEffect, useState } from 'preact/hooks'

interface IResizeOverlayProps {
  children: JSX.Element
  width: number
  height: number
}

const ResizeOverlay = ({ children, width, height }: IResizeOverlayProps) => {
  const forceUpdate = useForceUpdate()
  const [draggingStick, setDraggingStick] = useState('')

  const presentation = store.getCurrentPresentation()
  const { width: pWidth, height: pHeight } = presentation.resolution
  const resolution = new RendererResolution(pWidth, pHeight)
  resolution.targetWidth = width
  let { top, bottom, left, right, isEmpty } = store.currentTab.selection
  ;[top, bottom, left, right] = [top, bottom, left, right].map((item) => item * resolution.scale)

  const middleX = (left + right) / 2
  const middleY = (top + bottom) / 2

  useLayoutEffect(() => {
    const listener = () => forceUpdate()
    const slide = store.getCurrentSlide()
    store.addSlideChangeListener(slide, listener)
    return () => store.removeSlideChangeListener(slide, listener)
  })

  const sticks = [
    { x: left, y: top, props: ['top', 'left'], cursor: 'nw' },
    { x: middleX, y: top, props: ['top'], cursor: 'n' },
    { x: right, y: top, props: ['top', 'right'], cursor: 'ne' },
    { x: left, y: middleY, props: ['left'], cursor: 'w' },
    { x: right, y: middleY, props: ['right'], cursor: 'e' },
    { x: left, y: bottom, props: ['left', 'bottom'], cursor: 'sw' },
    { x: middleX, y: bottom, props: ['bottom'], cursor: 's' },
    { x: right, y: bottom, props: ['right', 'bottom'], cursor: 'se' },
  ]

  const onMouseDown = function (index: number, mouseDownEvent: MouseEvent) {
    mouseDownEvent.preventDefault()
    setDraggingStick(sticks[index].cursor)
    const currentSelection = store.currentTab.selection
    let selection = {
      top: currentSelection.top,
      left: currentSelection.left,
      bottom: currentSelection.bottom,
      right: currentSelection.right,
    }
    const { clientX: startClientX, clientY: startClientY } = mouseDownEvent

    const onMouseMove = function (event: MouseEvent) {
      const deltaX = event.clientX - startClientX
      const deltaY = event.clientY - startClientY

      const newSelection = { ...selection }

      const props = sticks[index].props
      for (const prop of props) {
        if (prop == 'top' || prop == 'bottom') newSelection[prop] += deltaY / resolution.scale
        if (prop == 'left' || prop == 'right') newSelection[prop] += deltaX / resolution.scale
      }
      if (newSelection.top > newSelection.bottom)
        [newSelection.top, newSelection.bottom] = [newSelection.bottom, newSelection.top]
      if (newSelection.left > newSelection.right)
        [newSelection.left, newSelection.right] = [newSelection.right, newSelection.left]

      if (newSelection.left != newSelection.right && newSelection.top != newSelection.bottom)
        store.resizeSelection(newSelection.top, newSelection.left, newSelection.bottom, newSelection.right)
    }
    const onMouseUp = function (event: MouseEvent) {
      setDraggingStick('')
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }

    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }

  const overlayStyle = { width: width + 'px', height: height + 'px' }
  if (draggingStick) overlayStyle['cursor'] = draggingStick + '-resize'

  return (
    <div class="resize-overlay" style={overlayStyle}>
      {children}
      {!isEmpty
        ? sticks.map((stick, index) => (
            <div
              class="resize-stick"
              style={{
                cursor: stick.cursor + '-resize',
                top: stick.y - 4 + 'px',
                left: stick.x - 4 + 'px',
              }}
              onMouseDown={(event) => onMouseDown(index, event)}
            ></div>
          ))
        : null}
    </div>
  )
}
export default ResizeOverlay
