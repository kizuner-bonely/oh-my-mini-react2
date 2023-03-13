import { DOMElement, updateFiberProps } from 'react-dom/src/SynthesisEvent'
import {
  appendInitialChild,
  Container,
  createInstance,
  createTextInstance,
  Instance,
} from 'hostConfig'
import {
  HostComponent,
  HostText,
  HostRoot,
  FunctionComponent,
  Fragment,
} from './workTags'
import { NoFlags, Update } from './fiberFlags'
import { FiberNode } from './fiber'

function markUpdate(fiber: FiberNode) {
  fiber.flags |= Update
}

export const completeWork = (wip: FiberNode) => {
  const newProps = wip.pendingProps
  const current = wip.alternate

  switch (wip.tag) {
    case HostComponent:
      if (current !== null && wip.stateNode) {
        // 1.判断 props 是否变化
        // 2.如果发生变化，打上 Update 标记
        updateFiberProps(wip.stateNode as DOMElement, newProps)
      } else {
        // mount
        // 1.构建 DOM
        const instance = createInstance(wip.type as string, newProps)
        // 2.将 DOM 插入到 DOM 树中
        appendAllChildren(instance, wip)
        wip.stateNode = instance
      }
      bubbleProperties(wip)
      return null
    case HostText:
      if (current !== null && wip.stateNode) {
        // update
        const oldText = current.memoizedProps?.content
        const newText = newProps.content
        if (oldText !== newText) {
          markUpdate(wip)
        }
      } else {
        // mount
        // 1.构建 DOM
        const instance = createTextInstance(newProps.content)
        // 2.将 DOM 插入到 DOM 树中
        //! 由于 Text 节点不存在 child, 因此不需要执行 appendAllChildren()
        wip.stateNode = instance
      }
      bubbleProperties(wip)
      return null
    case HostRoot:
    case FunctionComponent:
    case Fragment:
      bubbleProperties(wip)
      return null
    default:
      if (__DEV__) {
        console.warn(`未处理的completeWork情况 ${wip}`)
      }
      return null
  }
}

function appendAllChildren(parent: Container, wip: FiberNode) {
  let node = wip.child

  while (node !== null) {
    if (node.tag === HostComponent || node.tag === HostText) {
      appendInitialChild(parent, node.stateNode as Instance)
    } else if (node.child !== null) {
      node.child.return = node
      node = node.child
      continue
    }

    if (node === wip) return

    while (node.sibling === null) {
      if (node.return === null || node.return === wip) return
      node = node?.return
    }
    node.sibling.return = node.return
    node = node.sibling
  }
}

function bubbleProperties(wip: FiberNode) {
  let subtreeFlags = NoFlags
  let child = wip.child

  while (child !== null) {
    subtreeFlags |= child.subtreeFlags
    subtreeFlags |= child.flags

    child.return = wip
    child = child.sibling
  }
  wip.subtreeFlags |= subtreeFlags
}
