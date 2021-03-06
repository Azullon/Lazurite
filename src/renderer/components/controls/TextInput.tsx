import './TextInput.scss'

import { h } from 'preact'
import { useEffect, useRef } from 'preact/hooks'

import getTextWidth from 'common/util/text/getTextWidth'
import TextStyle from 'common/models/presentation/slideObjects/base/TextStyle'

import Prepend from './Prepend'

interface ITextInputProps {
  value?: string
  prepend?: string
  maxLength?: number
  placeHolder?: string
  onChange?: (text: string) => void
}

const TextInput = ({ value = '', prepend, maxLength = 32, onChange, placeHolder = '' }: ITextInputProps) => {
  const box = useRef(null)

  const resizeInput = function (value: string) {
    const textStyle = new TextStyle()
    textStyle.fontFamily = 'Roboto'
    textStyle.fontSize = 12
    textStyle.fontWeight = 700

    const textWidth = getTextWidth(textStyle, value.toString()) + 4
    const placeHolderWidth = getTextWidth(textStyle, placeHolder.toString())

    box.current.style.width = Math.max(40, textWidth, placeHolderWidth) + 'px'
  }

  const onInput = function (event) {
    const value = event.target.value
    resizeInput(value)
    onChange?.(value)
  }

  useEffect(() => {
    resizeInput(value)
  })

  return (
    <div class="text-input">
      {prepend ? <Prepend>{prepend}</Prepend> : null}
      <div class="text-input__edit-box" onClick={() => box.current.focus()}>
        <input
          value={value}
          lang="en"
          type="text"
          ref={box}
          onClick={(event) => event.stopPropagation()}
          onInput={onInput}
          maxLength={maxLength}
          placeholder={placeHolder}
        ></input>
      </div>
    </div>
  )
}
export default TextInput
