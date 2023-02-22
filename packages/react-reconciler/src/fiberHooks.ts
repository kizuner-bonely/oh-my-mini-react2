import { Dispatch, Dispatcher } from 'react/src/currentDispatcher'
import { Action } from 'shared/ReactTypes'
import internals from 'shared/internals'
import { FiberNode, FunctionComponentType } from './fiber'
import { scheduleUpdateOnFiber } from './workLoop'
import {
  createUpdate,
  createUpdateQueue,
  enqueueUpdate,
  UpdateQueue,
} from './updateQueue'

const { currentDispatcher } = internals

let currentlyRenderingFiber: FiberNode | null = null
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
    currentDispatcher.current = HooksDispatcherOnMount
  }

  const Component = wip.type
  const props = wip.pendingProps
  const children = (Component as FunctionComponentType)(props)

  currentlyRenderingFiber = null
  return children
}

const HooksDispatcherOnMount: Dispatcher = {
  useState: mountState,
}

function mountState<State>(
  initialState: (() => State) | State,
): [State, Dispatch<State>] {
  const hook = mountWorkInProgressHook()

  let memoizedState = initialState
  if (initialState instanceof Function) {
    memoizedState = initialState()
  }

  const queue = createUpdateQueue<State>()
  hook.updateQueue = queue

  const dispatch = dispatchSetState.bind(
    null,
    currentlyRenderingFiber as any,
    queue as any,
  ) as <State>(action: Action<State>) => void
  queue.dispatch = dispatch

  return [memoizedState as State, dispatch]
}

function dispatchSetState<State>(
  fiber: FiberNode,
  updateQueue: UpdateQueue<State>,
  action: Action<State>,
) {
  const update = createUpdate(action)
  enqueueUpdate(updateQueue, update)
  scheduleUpdateOnFiber(fiber)
}

function mountWorkInProgressHook(): Hook {
  const hook: Hook = {
    memoizedState: null,
    updateQueue: null,
    next: null,
  }

  if (workInProgressHook === null) {
    // mount 时的第一个hook
    if (currentlyRenderingFiber === null) {
      throw new Error('请在函数组件内调用hook')
    }
    workInProgressHook = hook
    currentlyRenderingFiber.memoizedState = workInProgressHook
  } else {
    // mount 时后续的hook
    workInProgressHook.next = hook
    workInProgressHook = hook
  }

  return workInProgressHook
}
