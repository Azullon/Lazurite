import './FilePicker.scss'

import { h } from 'preact'
import { useState } from 'preact/hooks'

import AnimatedDialogBox from './AnimatedDialogBox'
import Button from '../controls/Button'
import handleFiles from '@/util/handleFiles'

interface IFilePickerProps {
  isHiding: boolean
  accept?: string[]
  onSelected?: (files: ArrayBuffer[]) => void
}

const FilePicker = ({ isHiding, accept, onSelected }: IFilePickerProps) => {
  const width = 168
  const height = 282
  const [isHovered, setIsHovered] = useState(false)

  const onDragEnter = function (event: DragEvent) {
    console.log('drag enter')
    setIsHovered(true)
  }

  const onDragLeave = function (event: DragEvent) {
    console.log('drag leave')
    setIsHovered(false)
  }

  const onDragOver = function (event: DragEvent) {
    event.preventDefault()
  }

  const onDrop = async function (event: DragEvent) {
    setIsHovered(false)
    const filesToAdd = await handleFiles(event.dataTransfer, accept ?? [])
    onSelected?.(filesToAdd)
  }

  return (
    <AnimatedDialogBox width={width} height={height} isHiding={isHiding}>
      <div class="file-picker">
        <div
          class={'file-picker__dropzone' + (isHovered ? ' file-picker__dropzone_hovered' : '')}
          onDragEnter={onDragEnter}
          onDragLeave={onDragLeave}
          onDragOver={onDragOver}
          onDrop={onDrop}
        >
          Drop files here
        </div>
        <div class="file-picker__buttons">
          <Button text="Cancel" />
          <Button text="Browse" />
        </div>
      </div>
    </AnimatedDialogBox>
  )
}
export default FilePicker
