import './TextEditorOverlay.scss'

import { h, Fragment, JSX, Ref } from 'preact'
import { useEffect, useLayoutEffect, useRef } from 'preact/hooks'

import store, { raw as rawStore } from '@/store'
import TextSlideObject from 'common/models/presentation/slideObjects/TextSlideObject'
import RendererResolution from 'common/models/slideRenderer/RendererResolution'
import { useReactiveState } from 'common/util/reactivity'
import useForceUpdate from 'common/util/hooks/useForceUpdate'
import getFontScale from 'common/util/text/getFontScale'
import getTextLines from 'common/util/text/getTextLines'
import getTextWidth from 'common/util/text/getTextWidth'
import useEventBus from '@/store/useEventBus'
import SlideObject from 'common/models/presentation/slideObjects/base/SlideObject'

interface ITextEditorOverlayProps {
  width: number
  height: number
  children: JSX.Element
}

interface IHistoryItem {
  selectionStart: number
  selectionEnd: number
  value: string
}

function border(value, min, max) {
  if (value < min) return min
  if (value > max) return max
  return value
}

function isLetter(char) {
  return char.toLowerCase() != char.toUpperCase()
}

function getLineOffsets(lines: string[]): number[] {
  const lineOffsets = Array(lines.length + 1)
  lineOffsets[0] = 0
  for (let i = 1; i < lineOffsets.length; i++) {
    lineOffsets[i] = lines[i - 1].length + lineOffsets[i - 1]
  }
  return lineOffsets
}

function createStateModel() {
  return {
    isRedacting: false,
    redactingObject: TextSlideObject.placeholder as TextSlideObject,
    selection: {
      start: 0,
      end: 0,
      startX: 0,
      startY: 0,
      endX: 0,
      endY: 0,
    },
    isSelectionDrawing: false,
    cursor: {
      x: -1,
      y: -1,
    },
    lastMove: new Date(),
    history: [] as IHistoryItem[],
    historyForward: [] as IHistoryItem[],
  }
}

const TextEditorOverlay = ({ children, width, height }: ITextEditorOverlayProps) => {
  useEventBus(rawStore, 'slideChange', rawStore.getCurrentSlide())
  const { width: presentationWidth, height: presentationHeight } = store.getCurrentPresentation().resolution
  const resolution = new RendererResolution(presentationWidth, presentationHeight)
  resolution.targetWidth = width

  const state = useReactiveState(createStateModel)
  const overlay = useRef(null)
  const input = useRef(null)

  const obj = state.redactingObject
  const lines = getTextLines(state.redactingObject, true)
  const lineHeight = obj.style.fontSize * getFontScale(obj.style.fontFamily, obj.style.fontWeight)
  const totalLinesHeight = lines.length * lineHeight * resolution.scale

  const selectionX = obj.left * resolution.scale
  const selectionY = obj.top * resolution.scale
  const selectionW = obj.width * resolution.scale
  const selectionH = obj.height * resolution.scale

  const selection = {
    start: state.selection.start,
    end: state.selection.end,
    startX: 0,
    startY: 0,
    endX: 0,
    endY: 0,
  }

  const pushToHistory = function (value: string) {
    state.history.push({ selectionStart: state.selection.start, selectionEnd: state.selection.end, value })
    state.historyForward = []
    if (state.history.length > 384) state.history.splice(0, 128)
  }

  const undo = function () {
    if (state.history.length > 0) {
      const item = state.history.pop()
      state.selection.start = item.selectionStart
      state.selection.end = item.selectionEnd
      rawStore.changeSelectedObjectProperty<TextSlideObject>('content', item.value)
      state.historyForward.push(item)
    }
  }

  const redo = function () {
    if (state.historyForward.length > 0) {
      const item = state.historyForward.pop()
      state.selection.start = item.selectionStart
      state.selection.end = item.selectionEnd
      rawStore.changeSelectedObjectProperty<TextSlideObject>('content', item.value)
    }
  }

  const tryResize = function (obj: TextSlideObject) {
    const newLines = getTextLines(obj)
    if (newLines.length * lineHeight > obj.height)
      rawStore.changeSelectedObjectProperty<TextSlideObject>('height', newLines.length * lineHeight + 1)
  }
  if (!obj.isPlaceholder) {
    tryResize(obj)
  }

  const getOffsetY = function () {
    switch (obj.verticalAlign) {
      case 'center':
        return (selectionH - totalLinesHeight) / 2

      case 'bottom':
        return selectionH - totalLinesHeight
    }
    return 0
  }

  const getOffsetX = function (line: string) {
    if (line.endsWith('\n')) line = line.substring(0, line.length - 1)
    const lineWidth = getTextWidth(obj.style, line) * resolution.scale
    switch (obj.horizontalAlign) {
      case 'left':
        return 0
      case 'center':
        return (selectionW - lineWidth) / 2
      case 'right':
        return selectionW - lineWidth
    }
  }

  const onDoubleClick = function () {
    const currentSelection = store.getSelectedObjects()
    if (currentSelection.length != 1) return
    if (currentSelection[0].type != TextSlideObject.name) return
    const currentElement = currentSelection[0] as TextSlideObject
    if (state.redactingObject.id == currentElement.id) return

    state.isRedacting = true
    state.redactingObject = currentElement
    state.selection.start = 0
    state.selection.end = currentElement.content.length
  }

  const getSymbolPosition = function (x: number, y: number) {
    let lineIndex = Math.floor((y - getOffsetY()) / lineHeight / resolution.scale)
    lineIndex = Math.min(lines.length - 1, lineIndex)
    lineIndex = Math.max(0, lineIndex)

    const currentLine = lines[lineIndex]
    const lineOffsets = getLineOffsets(lines)
    const lineOffsetX = getOffsetX(currentLine)
    for (let i = 0; i < currentLine.length; i++) {
      const symbolStart = getTextWidth(obj.style, currentLine.substring(0, i)) * resolution.scale + lineOffsetX
      const symbolEnd = getTextWidth(obj.style, currentLine.substring(0, i + 1)) * resolution.scale + lineOffsetX

      if (symbolStart <= x && x <= symbolEnd) {
        return lineOffsets[lineIndex] + i
      }
    }
    return lineOffsets[lineIndex + 1]
  }

  const exitEditor = function () {
    const newModel = createStateModel()
    for (const key in newModel) {
      state[key] = newModel[key]
    }
  }

  const onClick = function (event: MouseEvent) {
    const x = event.offsetX / resolution.scale,
      y = event.offsetY / resolution.scale
    const objectsAtPosition = store.getObjectsByCoords(x, y)
    const currentObjectId = state.redactingObject.id
    const inCurrentObject = !!~objectsAtPosition.findIndex((value) => value.id == currentObjectId)

    if (!inCurrentObject) {
      exitEditor()
    }
  }

  const drawSelection = function () {
    const canvas = overlay.current as HTMLCanvasElement
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, selectionW, selectionH)

    let { start, end } = state.selection
    if (start > end) [start, end] = [end, start]
    let currentPosition = 0
    ctx.fillStyle = '#058cd866'

    let blockOffsetY = getOffsetY()

    let isStart = true
    for (let i = 0; i < lines.length; i++) {
      if (
        (start >= currentPosition && start <= currentPosition + lines[i].length) ||
        (end >= currentPosition && end <= currentPosition + lines[i].length) ||
        (currentPosition >= start && currentPosition <= end)
      ) {
        let relativeOffset = start - currentPosition
        if (!isStart) relativeOffset = 0
        const length = Math.min(end - start, end - currentPosition)

        const highlightedText = lines[i].substring(0, relativeOffset + length)
        const offsetText = lines[i].substring(0, relativeOffset)

        const x = Math.floor(getTextWidth(obj.style, offsetText) * resolution.scale + getOffsetX(lines[i]))
        const y = Math.floor(lineHeight * i * resolution.scale + blockOffsetY)
        const width = Math.floor(getTextWidth(obj.style, highlightedText) * resolution.scale + getOffsetX(lines[i])) - x
        const height = Math.floor(lineHeight * (i + 1) * resolution.scale + blockOffsetY) - y

        if (isStart) {
          selection.startX = x
          selection.startY = y
        }
        selection.endX = x + width
        selection.endY = y

        ctx.fillRect(x, y, width, height)
        isStart = false
      }

      currentPosition += lines[i].length
    }

    if (state.selection.start > state.selection.end) {
      ;[selection.startX, selection.startY, selection.endX, selection.endY] = [
        selection.endX,
        selection.endY,
        selection.startX,
        selection.startY,
      ]
    }
    for (const key in selection) {
      if (state.selection[key] != selection[key]) state.selection[key] = selection[key]
    }
  }

  useLayoutEffect(() => {
    drawSelection()
  })

  const inputStyle = {
    fontSize: obj.style.fontSize * resolution.scale,
    height: lineHeight * resolution.scale,
    left: selectionX + state.selection.endX + 'px',
    top: selectionY + state.selection.endY + 'px',
    fontFamily: obj.style.fontFamily,
    borderLeft: '1px solid black',
    opacity: state.isRedacting ? 1 : 0,
  }

  const clearCurrentSelection = function (replacement = '') {
    let { start, end } = state.selection
    if (start > end) [start, end] = [end, start]
    pushToHistory(obj.content)
    state.selection.end = state.selection.start = start + replacement.length
    const newValue = obj.content.substring(0, start) + replacement + obj.content.substring(end)
    store.changeSelectedObjectProperty<TextSlideObject>('content', newValue)

    if (replacement.length > 0) {
      obj.content = newValue
      tryResize(obj)
    }
  }

  const onKeyDown = function (event: KeyboardEvent) {
    if (!state.isRedacting) return
    event.stopPropagation()
    let { start, end } = state.selection
    if (event.key == 'ArrowRight' || event.key == 'ArrowLeft') {
      const delta = event.key == 'ArrowRight' ? 1 : -1

      if (start - end != 0 && !event.shiftKey) {
        start = end = delta > 0 ? Math.max(start, end) : Math.min(start, end)
      } else {
        end += delta
        if (!event.shiftKey) start += delta
      }
    }
    if (event.key == 'ArrowUp' || event.key == 'ArrowDown') {
      const lines = getTextLines(obj, true)

      const lineOffsets = getLineOffsets(lines)

      let currentLine = lineOffsets.findIndex((value) => value > end) - 1
      if (currentLine < 0) currentLine = lines.length - 1
      const relativePosition = end - lineOffsets[currentLine]

      if (event.key == 'ArrowUp') {
        if (currentLine == 0) {
          end = 0
        } else {
          const newOffset = Math.min(lines[currentLine - 1].length - 1, relativePosition)
          end = lineOffsets[currentLine - 1] + newOffset
        }
      }
      if (event.key == 'ArrowDown') {
        if (currentLine == lines.length - 1) {
          end = obj.content.length
        } else {
          const newOffset = Math.min(lines[currentLine + 1].length - 1, relativePosition)
          end = lineOffsets[currentLine + 1] + newOffset
        }
      }

      if (!event.shiftKey) start = end
    }

    state.selection.start = border(start, 0, obj.content.length)
    state.selection.end = border(end, 0, obj.content.length)

    if (event.key == 'Delete') {
      if (end - start != 0) {
        clearCurrentSelection()
        return
      }
      if (obj.content.length == start) return
      pushToHistory(obj.content)
      const newValue = obj.content.substring(0, start) + obj.content.substring(start + 1)
      store.changeSelectedObjectProperty<TextSlideObject>('content', newValue)
    }

    if (event.key == 'Backspace') {
      if (end - start != 0) {
        clearCurrentSelection()
        return
      }
      if (start == 0) return
      pushToHistory(obj.content)
      const newValue = obj.content.substring(0, start - 1) + obj.content.substring(start)
      state.selection.start = --state.selection.end
      store.changeSelectedObjectProperty<TextSlideObject>('content', newValue)
    }

    if (event.code == 'KeyA' && event.ctrlKey) {
      selectField(0, 'all')
    }

    if (event.code == 'KeyC' && event.ctrlKey) {
      event.preventDefault()
      if (start > end) [start, end] = [end, start]
      navigator.clipboard.writeText(obj.content.substring(start, end))
    }

    if (event.code == 'KeyX' && event.ctrlKey) {
      event.preventDefault()
      if (start > end) [start, end] = [end, start]
      navigator.clipboard.writeText(obj.content.substring(start, end))
      clearCurrentSelection()
    }

    if (event.code == 'KeyV' && event.ctrlKey) {
      event.preventDefault()
      navigator.clipboard.readText().then((value) => {
        clearCurrentSelection(value)
      })
    }

    if (event.code == 'KeyZ' && event.ctrlKey) {
      event.preventDefault()
      undo()
    }

    if (event.code == 'KeyY' && event.ctrlKey) {
      event.preventDefault()
      redo()
    }

    if (event.key == 'Enter') {
      event.preventDefault()
      if (event.ctrlKey) {
        exitEditor()
        return
      }
      clearCurrentSelection('\n')
    }
  }

  const onInput = function (event: Event) {
    if (!state.isRedacting) return true
    let { start, end } = state.selection
    if (start > end) [start, end] = [end, start]

    const data = event['data'] as string
    if (!data) return true

    clearCurrentSelection(data)

    input.current.value = ''
  }

  const selectField = function (position: { x: number; y: number } | number, type: 'word' | 'all') {
    if (type == 'word') {
      const symbolPos = typeof position == 'number' ? position : getSymbolPosition(position.x, position.y)
      const content = obj.content
      let wordStart = symbolPos
      let wordEnd = symbolPos
      while (wordStart > 0 && isLetter(content[wordStart - 1])) wordStart--
      while (wordEnd < content.length && isLetter(content[wordEnd])) wordEnd++

      state.selection.start = wordStart
      state.selection.end = wordEnd
    }
    if (type == 'all') {
      state.selection.start = 0
      state.selection.end = obj.content.length
    }
  }

  const onInputClick = function (event: MouseEvent) {
    const pos = state.selection.end
    event.stopPropagation()

    if (state.selection.end - state.selection.start != 0) return
    if (event.detail == 2) selectField(pos, 'word')
    if (event.detail >= 3) selectField(pos, 'all')
  }

  const onInputMouseDown = function (event: MouseEvent) {
    event.stopPropagation()
    state.isSelectionDrawing = true
    state.selection.start = state.selection.end
  }

  const onInputMouseUp = function (event: MouseEvent) {
    event.stopPropagation()
    state.isSelectionDrawing = false
  }

  const onCanvasClick = function (event: MouseEvent) {
    event.stopPropagation()
    const pos = {
      x: event.offsetX,
      y: event.offsetY,
    }

    if (state.selection.end - state.selection.start != 0) return
    if (event.detail == 2) selectField(pos, 'word')
    if (event.detail >= 3) selectField(pos, 'all')
  }

  const onCanvasMouseDown = function (event: MouseEvent) {
    event.stopPropagation()
    state.isSelectionDrawing = true
    state.selection.start = state.selection.end = getSymbolPosition(event.offsetX, event.offsetY)
  }

  const onCanvasMouseMove = function (event: MouseEvent) {
    if (!state.isSelectionDrawing) return
    event.stopPropagation()
    state.selection.end = getSymbolPosition(event.offsetX, event.offsetY)
  }

  const onCanvasMouseUp = function (event: MouseEvent) {
    state.isSelectionDrawing = false
  }

  const canvasClasses = []
  if (state.isRedacting) canvasClasses.push('redacting')

  useEffect(() => {
    if (state.isRedacting) input.current?.focus?.()
  })

  return (
    <div
      class="text-editor-overlay"
      onDblClick={onDoubleClick}
      onClick={onClick}
      style={{ width: width + 'px', height: height + 'px' }}
    >
      {children}
      {state.isRedacting ? (
        <canvas
          class={canvasClasses.join(' ')}
          ref={overlay}
          width={selectionW}
          height={selectionH}
          style={{ top: selectionY + 'px', left: selectionX + 'px' }}
          onMouseDown={onCanvasMouseDown}
          onMouseMove={onCanvasMouseMove}
          onMouseUp={onCanvasMouseUp}
          onClick={onCanvasClick}
        ></canvas>
      ) : null}

      <input
        type="textarea"
        style={inputStyle}
        ref={input}
        onKeyDown={onKeyDown}
        onClick={onInputClick}
        onMouseDown={onInputMouseDown}
        onMouseUp={onInputMouseUp}
        onInput={onInput}
      />
    </div>
  )
}
export default TextEditorOverlay
