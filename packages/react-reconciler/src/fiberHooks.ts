import { ReactElement } from './../../shared/ReactTypes'
import { FiberNode, FunctionComponentType } from './fiber'

export function renderWithHooks(wip: FiberNode) {
  const Component = wip.type
  const props = wip.pendingProps
  const children = (Component as FunctionComponentType)(props)
  return children
}
