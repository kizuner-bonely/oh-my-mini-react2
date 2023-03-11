import { ChildDeletion, Placement } from './fiberFlags'
import { HostText } from './workTags'
import { REACT_ELEMENT_TYPE } from 'shared/ReactSymbols'
import type { Props, ReactElement } from 'shared/ReactTypes'
import {
  createFiberFromElement,
  createWorkInProgress,
  FiberNode,
} from './fiber'

function ChildReconciler(shouldTrackEffects: boolean) {
  function deleteChild(returnFiber: FiberNode, childToDelete: FiberNode) {
    if (!shouldTrackEffects) return
    const deletions = returnFiber.deletions
    if (!deletions) {
      returnFiber.deletions = [childToDelete]
      returnFiber.flags |= ChildDeletion
    } else {
      deletions.push(childToDelete)
    }
  }

  function deleteRemainingChildren(
    returnFiber: FiberNode,
    currentFirstChild: FiberNode | null,
  ) {
    if (!shouldTrackEffects) return
    let childToDelete = currentFirstChild
    while (childToDelete) {
      deleteChild(returnFiber, childToDelete)
      childToDelete = childToDelete.sibling
    }
  }

  function reconcileSingleElement(
    returnFiber: FiberNode,
    currentFiber: FiberNode | null,
    element: ReactElement,
  ) {
    const key = element.key
    while (currentFiber) {
      //* update
      if (currentFiber.key === key) {
        // key 相同
        if (element.$$typeof === REACT_ELEMENT_TYPE) {
          if (currentFiber.type === element.type) {
            // type 相同
            const existing = useFiber(currentFiber, element.props)
            existing.return = returnFiber
            //! 当前节点可复用, 剩下的节点标记删除
            deleteRemainingChildren(returnFiber, currentFiber.sibling)
            return existing
          }

          //! key 相同, type 不同, 就不存在任何复用的可能性, 因此删除所有剩余节点
          deleteRemainingChildren(returnFiber, currentFiber)
          break
        } else {
          if (__DEV__) {
            console.warn('未实现的react类型', element)
            break
          }
        }
      } else {
        // 删掉旧的
        //! key 不同, 删掉当前 child 并继续对比剩下的节点
        deleteChild(returnFiber, currentFiber)
        currentFiber = currentFiber.sibling
      }
    }

    // 根据 ReactElement 创建 Fiber 并返回
    const fiber = createFiberFromElement(element)
    fiber.return = returnFiber
    return fiber
  }

  function reconcileSingleTextNode(
    returnFiber: FiberNode,
    currentFiber: FiberNode | null,
    content: string | number,
  ) {
    while (currentFiber) {
      //* update
      if (currentFiber.tag === HostText) {
        const existing = useFiber(currentFiber, { content })
        existing.return = returnFiber
        deleteRemainingChildren(returnFiber, currentFiber.sibling)
        return existing
      }
      deleteChild(returnFiber, currentFiber)
      currentFiber = currentFiber.sibling
    }

    const fiber = new FiberNode(HostText, { content }, null)
    fiber.return = returnFiber
    return fiber
  }

  function placeSingleChild(fiber: FiberNode) {
    //* 在非首屏渲染并且新增节点时才标记副作用 Placement
    if (shouldTrackEffects && fiber.alternate === null) {
      fiber.flags |= Placement
    }
    return fiber
  }

  return function reconcileChildFibers(
    returnFiber: FiberNode,
    currentFiber: FiberNode | null,
    newChild?: ReactElement | null,
  ) {
    //* 判断当前 Fiber 类型
    if (typeof newChild === 'object' && newChild !== null) {
      switch (newChild.$$typeof) {
        case REACT_ELEMENT_TYPE:
          return placeSingleChild(
            reconcileSingleElement(returnFiber, currentFiber, newChild),
          )
        default:
          if (__DEV__) {
            console.warn('未实现的 reconcile 类型', newChild)
          }
          break
      }
    }

    // TODO 多节点

    // HostText
    if (typeof newChild === 'string' || typeof newChild === 'number') {
      return placeSingleChild(
        reconcileSingleTextNode(returnFiber, currentFiber, newChild),
      )
    }

    // 兜底删除
    if (currentFiber) {
      deleteChild(returnFiber, currentFiber)
    }

    if (__DEV__) {
      console.warn('未实现的reconcile类型', newChild)
    }

    return null
  }
}

function useFiber(fiber: FiberNode, pendingProps: Props) {
  const clone = createWorkInProgress(fiber, pendingProps)
  clone.index = 0
  clone.sibling = null
  return clone
}

export const reconcileChildFibers = ChildReconciler(true) // update
export const mountChildFibers = ChildReconciler(false) // mount
