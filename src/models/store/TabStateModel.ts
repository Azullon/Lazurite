import Presentation from '../presentation/Presentation'
import Slide from '../presentation/Slide'

export type EditorWindowName = 'constructor' | 'design' | 'start'
export type DesignTab = 'color' | 'typography'
export type ConstructorTab = 'add' | 'edit'

export default class TabStateModel {
  presentationPath: string
  openedPresentation: Presentation
  selectedSlideIndex = 0
  openededDesignTab = 'color' as DesignTab
  openedConstructorTab = 'add' as ConstructorTab
  openedEditorWindow = 'constructor' as EditorWindowName
  isStartScreen = false

  get currentSlide(): Slide | undefined {
    return this.openedPresentation.slides[this.selectedSlideIndex]
  }

  get name() {
    if (this.isStartScreen) return 'Start'
    else return this.openedPresentation.name
  }

  constructor(presentation = new Presentation(), path = null) {
    this.openedPresentation = presentation
    this.presentationPath = path
  }

  static get startScreen() {
    const result = new TabStateModel()
    result.isStartScreen = true
    result.openedEditorWindow = 'start'
    return result
  }
}
