import './EditTab.scss'
import { h, JSX } from 'preact'
import { raw as store } from '@/store'
import PositionEditor from './editors/PositionEditor'
import useEventBus from '@/store/useEventBus'
import TextSlideObject from 'common/models/presentation/slideObjects/TextSlideObject'
import TextEditor from './editors/TextEditor'

const EditTab = () => {
  useEventBus(store, 'slideChange', store.getCurrentSlide())
  const editors: JSX.Element[] = []
  editors.push(<PositionEditor />)

  let text = 'nothing'
  const selection = store.currentTab.selection
  if (!selection.isEmpty) {
    if (selection.size == 1) text = selection.items[0].type
    else text = `${selection.size} objects`
  }
  if (selection.size == 1) {
    switch (selection.items[0].type) {
      case TextSlideObject.name:
        editors.push(<TextEditor />)
        break
    }
  }

  return (
    <div class="edit-tab">
      <h2>Selected: {text}</h2>
      {editors}
    </div>
  )
}
export default EditTab
