import internals from 'shared/internals'
import { FiberNode, FunctionComponentType } from './fiber'

const { currentDispatcher } = internals

let currentlyRenderingFiber: FiberNode | null = null
// eslint-disable-next-line prefer-const
let workInProgressHook: Hook | null = null

interface Hook {
  memoizedState: any
  updateQueue: unknown
  next: Hook | null
}

export function renderWithHooks(wip: FiberNode) {
  currentlyRenderingFiber = wip
  wip.memoizedState = null

  const current = wip.alternate

  if (current) {
    // TODO update
  } else {
    // TODO mount
    // currentDispatcher.current
  }

  const Component = wip.type
  const props = wip.pendingProps
  const children = (Component as FunctionComponentType)(props)

  currentlyRenderingFiber = null
  return children
}
