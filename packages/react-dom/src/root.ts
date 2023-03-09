import { initEvent } from './SynthesisEvent'
import { Container } from 'hostConfig'
import { ReactElement } from 'shared/ReactTypes'
import {
  createContainer,
  updateContainer,
} from 'react-reconciler/src/fiberReconciler'

export function createRoot(container: Container) {
  const root = createContainer(container)

  return {
    render(element: ReactElement) {
      initEvent(container, 'click')
      return updateContainer(element, root)
    },
  }
}

// ReactDOM.createRoot(root).render(<App />)
