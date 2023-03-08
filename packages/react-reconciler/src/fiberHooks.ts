import { Dispatch, Dispatcher } from 'react/src/currentDispatcher'
import { Action } from 'shared/ReactTypes'
import internals from 'shared/internals'
import { FiberNode, FunctionComponentType } from './fiber'
import { scheduleUpdateOnFiber } from './workLoop'
import {
  createUpdate,
  createUpdateQueue,
  enqueueUpdate,
  processUpdateQueue,
  UpdateQueue,
} from './updateQueue'

const { currentDispatcher } = internals

let currentlyRenderingFiber: FiberNode | null = null
let workInProgressHook: Hook | null = null
let currentHook: Hook | null = null

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
    // update
    currentDispatcher.current = HooksDispatcherOnUpdate
  } else {
    // mount
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
  hook.memoizedState = memoizedState

  const dispatch = dispatchSetState.bind(
    null,
    currentlyRenderingFiber as any,
    queue as any,
  ) as <State>(action: Action<State>) => void
  queue.dispatch = dispatch

  return [memoizedState as State, dispatch]
}

const HooksDispatcherOnUpdate: Dispatcher = {
  useState: updateState,
}

function updateState<State>(): [State, Dispatch<State>] {
  const hook = updateWorkInProgressHook()

  // 计算新 state
  const queue = hook.updateQueue as UpdateQueue<State>
  const pending = queue.shared.pending

  if (pending) {
    const { memoizedState } = processUpdateQueue(hook.memoizedState, pending)
    hook.memoizedState = memoizedState
  }

  return [hook.memoizedState as State, queue.dispatch as Dispatch<State>]
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

function updateWorkInProgressHook(): Hook {
  // TODO 处理 render 阶段触发的更新
  let nextCurrentHook: Hook | null = null

  if (currentHook === null) {
    // FC update 时的第一个 Hook
    const current = currentlyRenderingFiber?.alternate
    // 如果没有 current 说明不是 update 时进入了本方法，此时应该为异常情况
    nextCurrentHook = current ? current.memoizedState : null
  } else {
    // FC update 时后续的 Hook
    nextCurrentHook = currentHook.next
  }

  if (nextCurrentHook === null) {
    // case  if (xxx) useState()
    // mount/update u1 u2 u3
    // update       u1 u2 u3 u4
    throw new Error(
      `组件${currentlyRenderingFiber?.type}在本次执行时的Hook数量比上次执行时多或在非Update阶段进入Update流程`,
    )
  }

  currentHook = nextCurrentHook
  const newHook = {
    memoizedState: currentHook.memoizedState,
    updateQueue: currentHook.updateQueue,
    next: null,
  }

  if (workInProgressHook === null) {
    // update 时的第一个hook
    if (currentlyRenderingFiber === null) {
      throw new Error('请在函数组件内调用hook')
    }
    workInProgressHook = newHook
    currentlyRenderingFiber.memoizedState = workInProgressHook
  } else {
    // update 时后续的hook
    workInProgressHook.next = newHook
    workInProgressHook = newHook
  }

  return workInProgressHook
}
