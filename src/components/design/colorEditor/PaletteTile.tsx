import './PaletteTile.scss'
import { h } from 'preact'
import Background, { BackgroundType } from '@/models/presentation/theme/Background'
import Color from '@/models/common/Color'
import assets from '@/assets'
import { useEffect, useState } from 'preact/hooks'

interface IPaletteTileProps {
  height: number
  width: number
  value: { type: BackgroundType; displayValue: string } | Color
  onClick?: () => void
  deleteable?: boolean
  onDelete?: () => void
}

const PaletteTile = (props: IPaletteTileProps) => {
  const getBackgroundCss = function (bg: { type: BackgroundType; displayValue: string } | Color) {
    if (bg instanceof Color) {
      return { backgroundColor: bg.toCssColor() }
    }
    const { displayValue } = bg

    switch (bg.type) {
      case 'color':
        return { backgroundColor: displayValue }
      case 'image':
        return { backgroundImage: `url("${displayValue}")`, backgroundSize: 'cover' }
      case 'pattern':
        return { backgroundImage: `url("${displayValue}")` }
      case 'gradient':
        return { background: `linear-gradient(${displayValue})` }
      default:
        throw new Error('gradient not implemented')
    }
  }

  return (
    <div
      class="palette-tile"
      onMouseEnter={(event) => (event.target as any).classList.add('palette-tile_animated')}
      onClick={() => props?.onClick?.()}
      style={{
        height: props.height + 'px',
        width: props.width + 'px',
        ...getBackgroundCss(props.value),
      }}
    >
      {props.deleteable ? (
        <div
          class="palette-tile__delete"
          onClick={(event) => {
            event.stopPropagation()
            props.onDelete?.()
          }}
        >
          <img src={assets.delete} alt="" />
        </div>
      ) : null}
    </div>
  )
}
export default PaletteTile
