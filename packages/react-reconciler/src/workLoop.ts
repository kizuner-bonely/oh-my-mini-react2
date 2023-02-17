import { MutationMask, NoFlags } from './fiberFlags'
import { HostRoot } from './workTags'
import { beginWork } from './beginWork'
import { completeWork } from './completeWork'
import { commitMutationEffects } from './commitWork'
import { createWorkInProgress, FiberNode, FiberRootNode } from './fiber'

let workInProgress: FiberNode | null = null

function prepareFreshStack(root: FiberRootNode) {
  workInProgress = createWorkInProgress(root.current, {})
}

export function scheduleUpdateOnFiber(fiber: FiberNode) {
  // FiberRootNode
  const root = markUpdateFromFiberToRoot(fiber)
  renderRoot(root as FiberRootNode)
}

function markUpdateFromFiberToRoot(fiber: FiberNode) {
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

export function renderRoot(root: FiberRootNode) {
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

  const finishedWork = root.current.alternate
  root.finishedWork = finishedWork

  commitRoot(root)
}

// TODO
function commitRoot(root: FiberRootNode) {
  const finishedWork = root.finishedWork
  if (!finishedWork) return

  if (__DEV__) {
    console.log('commit 阶段开始', finishedWork)
  }

  root.finishedWork = null

  // 判断是否存在3个子阶段对应的操作
  const subtreeHasEffect =
    (finishedWork.subtreeFlags & MutationMask) !== NoFlags
  const rootHasEffect = (finishedWork.flags & MutationMask) !== NoFlags

  if (subtreeHasEffect || rootHasEffect) {
    // 1.beforeMutation
    // 2.mutation (Placement)
    commitMutationEffects(finishedWork)
    root.current = finishedWork
    // 3.layout
  } else {
    root.current = finishedWork
  }
}

function workLoop() {
  while (workInProgress) {
    performUnitOfWork(workInProgress)
  }
}

function performUnitOfWork(fiber: FiberNode) {
  const next = beginWork(fiber)
  fiber.memoizedProps = fiber.pendingProps

  if (next === null) {
    completeUnitOfWork(fiber)
  } else {
    workInProgress = next
  }
}

function completeUnitOfWork(fiber: FiberNode) {
  let node: FiberNode | null = fiber
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
