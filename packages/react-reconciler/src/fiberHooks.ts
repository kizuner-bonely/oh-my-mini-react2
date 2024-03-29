import { HookHasEffect } from './hookEffectTags'
import { Flags, PassiveEffect } from './fiberFlags'
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
import { Lane, NoLane, requestUpdateLanes } from './fiberLanes'

const { currentDispatcher } = internals

let currentlyRenderingFiber: FiberNode | null = null
let workInProgressHook: Hook | null = null
let currentHook: Hook | null = null
let renderLane: Lane = NoLane

interface Hook {
  memoizedState: any
  updateQueue: unknown
  next: Hook | null
}

export interface Effect {
  tag: Flags
  create: EffectCallback | void
  destroy: EffectCallback | void
  deps: EffectDeps
  next: Effect | null
}

export interface FCUpdateQueue<State> extends UpdateQueue<State> {
  lastEffect: Effect | null
}

type EffectCallback = () => void
type EffectDeps = any[] | null

export function renderWithHooks(wip: FiberNode, lane: Lane) {
  currentlyRenderingFiber = wip
  wip.memoizedState = null
  renderLane = lane

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
  workInProgressHook = null
  currentHook = null
  renderLane = NoLane

  return children
}

const HooksDispatcherOnMount: Dispatcher = {
  useState: mountState,
  useEffect: mountEffect,
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

function mountEffect(create: EffectCallback | void, deps: EffectDeps | void) {
  const hook = mountWorkInProgressHook()
  const nextDeps = deps === undefined ? null : deps
  currentlyRenderingFiber!.flags |= PassiveEffect
  hook.memoizedState = pushEffect(
    (PassiveEffect | HookHasEffect) as Flags,
    create,
    undefined,
    nextDeps,
  )
}

function pushEffect<State>(
  hookFlags: Flags,
  create: EffectCallback | void,
  destroy: EffectCallback | void,
  deps: EffectDeps,
) {
  const effect: Effect = {
    tag: hookFlags,
    create,
    destroy,
    deps,
    next: null,
  }

  const fiber = currentlyRenderingFiber as FiberNode
  const updateQueue = fiber.updateQueue as FCUpdateQueue<State>
  if (updateQueue === null) {
    const updateQueue = createFCUpdateQueue()
    fiber.updateQueue = updateQueue
    effect.next = effect
    updateQueue.lastEffect = effect
  } else {
    const lastEffect = updateQueue.lastEffect
    if (lastEffect === null) {
      effect.next = effect
      updateQueue.lastEffect = effect
    } else {
      const firstEffect = lastEffect.next
      lastEffect.next = effect
      effect.next = firstEffect
      updateQueue.lastEffect = effect
    }
  }
  return effect
}

function createFCUpdateQueue<State>() {
  const updateQueue = createUpdateQueue() as FCUpdateQueue<State>
  updateQueue.lastEffect = null
  return updateQueue
}

const HooksDispatcherOnUpdate: Dispatcher = {
  useState: updateState,
  useEffect: updateEffect,
}

function updateState<State>(): [State, Dispatch<State>] {
  const hook = updateWorkInProgressHook()

  // 计算新 state
  const queue = hook.updateQueue as UpdateQueue<State>
  const pending = queue.shared.pending
  queue.shared.pending = null

  if (pending) {
    const { memoizedState } = processUpdateQueue(
      hook.memoizedState,
      pending,
      renderLane,
    )
    hook.memoizedState = memoizedState
  }

  return [hook.memoizedState as State, queue.dispatch as Dispatch<State>]
}

function updateEffect() {}

function dispatchSetState<State>(
  fiber: FiberNode,
  updateQueue: UpdateQueue<State>,
  action: Action<State>,
) {
  const lane = requestUpdateLanes()
  const update = createUpdate(action, lane)
  enqueueUpdate(updateQueue, update)
  scheduleUpdateOnFiber(fiber, lane)
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
