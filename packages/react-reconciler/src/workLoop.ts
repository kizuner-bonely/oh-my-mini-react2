import { MutationMask, NoFlags } from './fiberFlags'
import { HostRoot } from './workTags'
import { beginWork } from './beginWork'
import { completeWork } from './completeWork'
import { commitMutationEffects } from './commitWork'
import { createWorkInProgress, FiberNode, FiberRootNode } from './fiber'
import {
  getHighestPriorityLane,
  Lane,
  mergeLanes,
  NoLane,
  SyncLane,
} from './fiberLanes'
import { flushSyncCallbacks, scheduleSyncCallback } from './syncTaskQueue'
import { scheduleMicroTask } from 'hostConfig'

let workInProgress: FiberNode | null = null

function prepareFreshStack(root: FiberRootNode) {
  workInProgress = createWorkInProgress(root.current, {})
}

export function scheduleUpdateOnFiber(fiber: FiberNode, lane: Lane) {
  // FiberRootNode
  const root = markUpdateFromFiberToRoot(fiber) as FiberRootNode
  markRootUpdated(root, lane)
  ensureRootIsScheduled(root as FiberRootNode)
}

function ensureRootIsScheduled(root: FiberRootNode) {
  const updateLane = getHighestPriorityLane(root.pendingLanes)
  if (updateLane === NoLane) return
  if (updateLane === SyncLane) {
    // 同步优先级, 用微任务调度
    if (__DEV__) {
      console.log(`在微任务中调度, 优先级: ${updateLane}`)
    }
    scheduleSyncCallback(performSyncWorkOnRoot.bind(null, root, updateLane))
    scheduleMicroTask(flushSyncCallbacks)
  } else {
    // 其他优先级, 用宏任务调度
  }
}

function markRootUpdated(root: FiberRootNode, lane: Lane) {
  root.pendingLanes = mergeLanes(root.pendingLanes, lane)
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

function performSyncWorkOnRoot(root: FiberRootNode, lane: Lane) {
  const nextLane = getHighestPriorityLane(root.pendingLanes)
  if (nextLane !== SyncLane) {
    // 1.比 SyncLane 低的优先级
    // 2.NoLane
    return ensureRootIsScheduled(root)
  }

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
