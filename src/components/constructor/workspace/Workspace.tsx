import './Workspace.scss'

import { h } from 'preact'

import store, { raw as rawStore } from '@/store'

import Slide from '../Slide'
import ToolOverlay from './ToolOverlay'

interface IWorkspaceProps {
  width: number
}

const Workspace = (props: IWorkspaceProps) => {
  const watchable = store.currentTab.openedPresentation.slides.length
  const currentTab = rawStore.currentTab
  const presentation = currentTab.openedPresentation
  const slide = presentation.slides[currentTab.selectedSlideIndex]

  const slideWidth = props.width - 32
  const slideHeight = (slideWidth / 16) * 9

  const rootStyle = {
    marginTop: '16px',
    marginLeft: '16px',
    width: slideWidth + 'px',
  }
  return (
    <div style={rootStyle} class="workspace">
      {slide ? (
        <ToolOverlay width={slideWidth} height={slideHeight}>
          <Slide
            width={slideWidth}
            height={slideHeight}
            slide={slide}
            presentation={presentation}
            selection={currentTab.selection}
            showHovered={true}
          />
        </ToolOverlay>
      ) : (
        <div class="workspace__placeholder" style={{ height: slideHeight }}>
          There is no slides
        </div>
      )}
    </div>
  )
}

export default Workspace
