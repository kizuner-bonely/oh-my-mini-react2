import { ReactElement } from 'shared/ReactTypes'
import { FiberNode } from './fiber'
import { processUpdateQueue, UpdateQueue } from './updateQueue'
import {
  HostRoot,
  HostComponent,
  HostText,
  FunctionComponent,
  Fragment,
} from './workTags'
import { mountChildFibers, reconcileChildFibers } from './childFibers'
import { renderWithHooks } from './fiberHooks'

export const beginWork = (wip: FiberNode): FiberNode | null => {
  switch (wip.tag) {
    case HostRoot:
      return updateHostRoot(wip)
    case HostComponent:
      return updateHostComponent(wip)
    case HostText:
      // 文本节点没有子节点
      return null
    case FunctionComponent:
      return updateFunctionComponent(wip)
    case Fragment:
      return updateFragment(wip)
  }

  if (__DEV__) {
    console.warn('beginWork 未实现的类型')
  }

  return null
}

function updateFragment(wip: FiberNode) {
  const nextChildren = wip.pendingProps
  reconcileChildren(wip, nextChildren as ReactElement)
  return wip.child
}

function updateFunctionComponent(wip: FiberNode) {
  const nextChildren = renderWithHooks(wip)
  reconcileChildren(wip, nextChildren!)
  return wip.child
}

function updateHostRoot(wip: FiberNode) {
  const baseState = wip.memoizedState
  const updateQueue = wip.updateQueue as UpdateQueue<Element>
  const pending = updateQueue.shared.pending
  updateQueue.shared.pending = null
  const { memoizedState } = processUpdateQueue(baseState, pending)
  wip.memoizedState = memoizedState

  const nextChildren = wip.memoizedState
  reconcileChildren(wip, nextChildren)
  return wip.child
}

function updateHostComponent(wip: FiberNode) {
  //* 创建子 FiberNode
  const nextProps = wip.pendingProps
  const nextChildren = nextProps.children
  reconcileChildren(wip, nextChildren)
  return wip.child
}

function reconcileChildren(wip: FiberNode, children?: ReactElement | null) {
  const current = wip.alternate

  if (current) {
    // update
    wip.child = reconcileChildFibers(wip, current.child, children)
  } else {
    // mount
    wip.child = mountChildFibers(wip, null, children)
  }
}
