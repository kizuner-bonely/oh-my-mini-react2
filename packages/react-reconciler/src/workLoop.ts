import { HostRoot } from './workTags'
import { createWorkInProgress, FiberNode, FiberRootNode } from './fiber'
import { beginWork } from './beginWork'
import { completeWork } from './completeWork'

let workInProgress: FiberNode<any> | null = null

function prepareFreshStack<S>(root: FiberRootNode<S>) {
  workInProgress = createWorkInProgress(root.current, {})
}

export function scheduleUpdateOnFiber<S>(fiber: FiberNode<S>) {
  // FiberRootNode
  const root = markUpdateFromFiberToRoot(fiber)
  renderRoot(root as FiberRootNode<S>)
}

function markUpdateFromFiberToRoot<S>(fiber: FiberNode<S>) {
  let node = fiber
  let parent = node.return

  //* 对于普通 Fiber 来说指向父节点的指针是 return
  //* 对于 hostRootFiber 来说指向项目根节点的指针是 stateNode
  while (parent) {
    node = parent
    parent = node.return
  }

  if (node.tag === HostRoot) return node.stateNode
  return null
}

export function renderRoot<S>(root: FiberRootNode<S>) {
  // 初始化 ( 让全局 workInProgress 指向第一个需要处理的 FiberNode )
  prepareFreshStack(root)

  do {
    try {
      workLoop()
      break
    } catch (e) {
      console.warn('workLoop 发生错误')
      workInProgress = null
    }
  } while (true)
}

function workLoop() {
  while (workInProgress) {
    performUnitOfWork(workInProgress)
  }
}

function performUnitOfWork<S>(fiber: FiberNode<S>) {
  const next = beginWork(fiber)
  fiber.memoizedProps = fiber.pendingProps

  if (next === null) {
    completeUnitOfWork(fiber)
  } else {
    workInProgress = next
  }
}

function completeUnitOfWork<S>(fiber: FiberNode<S>) {
  let node: FiberNode<S> | null = fiber
  do {
    completeWork(node)
    const sibling = node.sibling
    if (sibling) {
      workInProgress = sibling
      return
    }

    node = node.return
    workInProgress = node
  } while (node !== null)
}
