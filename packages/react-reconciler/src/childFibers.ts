import { Placement } from './fiberFlags'
import { HostText } from './workTags'
import { REACT_ELEMENT_TYPE } from 'shared/ReactSymbols'
import type { ReactElement } from 'shared/ReactTypes'
import { createFiberFromElement, FiberNode } from './fiber'

function ChildReconciler(shouldTrackEffects: boolean) {
  function reconcileSingleElement(
    returnFiber: FiberNode,
    currentFiber: FiberNode | null,
    element: ReactElement,
  ) {
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

    return null
  }
}

export const reconcileChildFibers = ChildReconciler(true) // update
export const mountChildFibers = ChildReconciler(false) // mount
