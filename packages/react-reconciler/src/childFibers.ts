import { ChildDeletion, Placement } from './fiberFlags'
import { Fragment, HostText } from './workTags'
import { REACT_ELEMENT_TYPE, REACT_FRAGMENT_TYPE } from 'shared/ReactSymbols'
import type { Key, Props, ReactElement } from 'shared/ReactTypes'
import {
  createFiberFromElement,
  createFiberFromFragment,
  createWorkInProgress,
  FiberNode,
} from './fiber'

type ExistingChildren = Map<string | number, FiberNode>

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
            let props = element.props
            if (element.type === REACT_FRAGMENT_TYPE) {
              props = element.props.children
            }
            // type 相同
            const existing = useFiber(currentFiber, props)
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
    let fiber = createFiberFromElement(element)

    if (element.type === REACT_FRAGMENT_TYPE) {
      fiber = createFiberFromFragment(element.props.children, key)
    } else {
      fiber = createFiberFromElement(element)
    }

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

  function reconcileChildrenArray(
    returnFiber: FiberNode,
    currentFirstChild: FiberNode | null,
    newChild: any[],
  ) {
    // 最新的可复用 Fiber 在 current 中的位置
    let lastPlacedIndex = 0
    // 最新操作的 Fiber
    let lastNewFiber: FiberNode | null = null
    let firstNewFiber: FiberNode | null = null

    // 1.将 current 保存在 map 中
    const existingChildren: ExistingChildren = new Map()
    let current = currentFirstChild
    while (current) {
      const keyToUse = current.key ?? current.index
      existingChildren.set(keyToUse, current)
      current = current.sibling
    }

    for (let i = 0; i < newChild.length; i++) {
      // 2.遍历 newChild, 寻找是否可服用
      const after = newChild[i]
      // 复用的Fiber、新创建的Fiber、null (false、null、undefined  xx && (<div />))
      const newFiber = updateFromMap(returnFiber, existingChildren, i, after)

      if (newFiber === null) continue

      // 3.标记移动还是插入
      newFiber.index = i
      newFiber.return = returnFiber

      if (lastNewFiber === null) {
        lastNewFiber = newFiber
        firstNewFiber = newFiber
      } else {
        lastNewFiber.sibling = newFiber
        lastNewFiber = lastNewFiber.sibling
      }

      if (!shouldTrackEffects) continue

      const current = newFiber.alternate
      if (current) {
        const oldIndex = current.index
        if (oldIndex < lastPlacedIndex) {
          // 复用元素需右移
          newFiber.flags |= Placement
          continue
        } else {
          // 复用元素不需右移
          lastPlacedIndex = oldIndex
        }
      } else {
        // mount
        newFiber.flags |= Placement
      }
    }

    // 4.将 map 中剩下的源于标记为删除
    existingChildren.forEach(fiber => {
      deleteChild(returnFiber, fiber)
    })

    return firstNewFiber
  }

  function updateFromMap(
    returnFiber: FiberNode,
    existingChildren: ExistingChildren,
    index: number,
    element: any,
  ) {
    const keyToUse = element.key ?? index
    const before = existingChildren.get(keyToUse)

    // HostText
    if (typeof element === 'string' || typeof element === 'number') {
      if (before) {
        if (before.tag === HostText) {
          existingChildren.delete(keyToUse)
          return useFiber(before, { content: `${element}` })
        }
      }

      return new FiberNode(HostText, { content: `${element}` }, null)
    }

    // ReactElement
    if (typeof element === 'object' && element !== null) {
      switch (element.$$typeof) {
        case REACT_ELEMENT_TYPE:
          if (element.type === REACT_FRAGMENT_TYPE) {
            return updateFragment(
              returnFiber,
              before,
              element,
              keyToUse,
              existingChildren,
            )
          }
          if (before) {
            if (before.type === element.type) {
              existingChildren.delete(keyToUse)
              return useFiber(before, element.props)
            }
          }
          return createFiberFromElement(element)
      }
    }

    if (Array.isArray(element)) {
      return updateFragment(
        returnFiber,
        before,
        element,
        keyToUse,
        existingChildren,
      )
    }

    return null
  }

  return function reconcileChildFibers(
    returnFiber: FiberNode,
    currentFiber: FiberNode | null,
    newChild?: any,
  ) {
    //* 判断是否为 Fragment
    const isUnkeyedTopLevelFragment =
      typeof newChild === 'object' &&
      newChild !== null &&
      newChild.type === REACT_FRAGMENT_TYPE &&
      newChild.key === null

    // <><div /></>
    if (isUnkeyedTopLevelFragment) {
      newChild = newChild.props.children
    }

    //* 判断当前 Fiber 类型
    if (typeof newChild === 'object' && newChild !== null) {
      // 多节点
      if (Array.isArray(newChild)) {
        return reconcileChildrenArray(returnFiber, currentFiber, newChild)
      }
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

    // HostText
    if (typeof newChild === 'string' || typeof newChild === 'number') {
      return placeSingleChild(
        reconcileSingleTextNode(returnFiber, currentFiber, newChild),
      )
    }

    // 兜底删除
    if (currentFiber) {
      deleteRemainingChildren(returnFiber, currentFiber)
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

function updateFragment(
  returnFiber: FiberNode,
  current: FiberNode | undefined,
  elements: any[],
  key: Key,
  existingChildren: ExistingChildren,
) {
  let fiber
  if (!current || current.tag !== Fragment) {
    fiber = createFiberFromFragment(elements, key)
  } else {
    existingChildren.delete(key)
    fiber = useFiber(current, elements)
  }

  fiber.return = returnFiber
  return fiber
}

export const reconcileChildFibers = ChildReconciler(true) // update
export const mountChildFibers = ChildReconciler(false) // mount
