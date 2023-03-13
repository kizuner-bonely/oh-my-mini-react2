import {
  appendChildToContainer,
  commitUpdate,
  Container,
  insertChildIntoContainer,
  Instance,
  removeChild,
} from 'hostConfig'
import {
  FunctionComponent,
  HostComponent,
  HostRoot,
  HostText,
} from './workTags'
import {
  ChildDeletion,
  MutationMask,
  NoFlags,
  Placement,
  Update,
} from './fiberFlags'
import { FiberNode, FiberRootNode } from './fiber'

let nextEffects: FiberNode | null = null

export const commitMutationEffects = (finishedWork: FiberNode) => {
  nextEffects = finishedWork

  while (nextEffects) {
    const child: FiberNode | null = nextEffects.child
    if (child && (nextEffects.subtreeFlags & MutationMask) !== NoFlags) {
      nextEffects = child
    } else {
      // 找到底或者找到的节点不包含 subtreeFlags
      // 此时需要向上遍历
      up: while (nextEffects) {
        commitMutationEffectsOnFiber(nextEffects)
        const sibling: FiberNode | null = nextEffects.sibling
        if (sibling) {
          nextEffects = sibling
          break up
        }
        nextEffects = nextEffects.return
      }
    }
  }
}

function commitMutationEffectsOnFiber(finishedWork: FiberNode) {
  const flags = finishedWork.flags
  if ((flags & Placement) !== NoFlags) {
    commitPlacement(finishedWork)
    finishedWork.flags &= ~Placement
  }
  if ((flags & Update) !== NoFlags) {
    commitUpdate(finishedWork)
    finishedWork.flags &= ~Update
  }
  if ((flags & ChildDeletion) !== NoFlags) {
    const deletions = finishedWork.deletions
    if (deletions) {
      deletions.forEach(childToDelete => {
        commitDeletion(childToDelete)
      })
    }
  }
}

function commitDeletion(childToDelete: FiberNode) {
  const rootChildrenToDelete: FiberNode[] = []

  // 递归
  commitNestedComponent(childToDelete, unmountFiber => {
    switch (unmountFiber.tag) {
      case HostComponent:
        recordHostChildrenToDelete(rootChildrenToDelete, unmountFiber)
        // TODO 解绑 ref
        break
      case HostText:
        recordHostChildrenToDelete(rootChildrenToDelete, unmountFiber)
        break
      case FunctionComponent:
        // TODO useEffect unmount
        break
      default:
        if (__DEV__) {
          console.warn('未处理的unmount类型', unmountFiber)
        }
        break
    }
  })

  // 移除对应 DOM
  if (rootChildrenToDelete.length) {
    const hostParent = getHostParent(childToDelete)
    if (hostParent) {
      rootChildrenToDelete.forEach(node => {
        removeChild(node.stateNode as Element | Text, hostParent)
      })
    }
  }
  childToDelete.return = null
  childToDelete.child = null
}

function recordHostChildrenToDelete(
  childrenToDelete: FiberNode[],
  unmountFiber: FiberNode,
) {
  // 1.找到第一个 host 节点
  const lastOne = childrenToDelete[childrenToDelete.length - 1]

  if (!lastOne) {
    childrenToDelete.push(unmountFiber)
  } else {
    let node = lastOne.sibling
    while (node) {
      if (unmountFiber === node) {
        childrenToDelete.push(unmountFiber)
      }
      node = node.sibling
    }
  }
  // 2.每找到一个 host 节点，就判断该节点是不是第一步找到的节点的兄弟节点
}

function commitNestedComponent(
  root: FiberNode,
  onCommitUnmount: (fiber: FiberNode) => void,
) {
  let node = root
  while (true) {
    onCommitUnmount(node)
    if (node.child) {
      node.child.return = node
      node = node.child
      continue
    }

    if (node === root) return

    while (node.sibling === null) {
      if (node.return === null || node.return === root) return
      node = node.return
    }
    node.sibling.return = node.return
    node = node.sibling
  }
}

function commitPlacement(finishedWork: FiberNode) {
  if (__DEV__) {
    console.log('执行 Placement', finishedWork)
  }

  const hostParent = getHostParent(finishedWork)
  const sibling = getHostSibling(finishedWork)

  if (hostParent) {
    insertOrAppendPlacementNodeIntoContainer(
      finishedWork,
      hostParent,
      sibling as Instance,
    )
  }
}

function getHostSibling(fiber: FiberNode) {
  let node = fiber

  findSibling: while (true) {
    // 向上遍历找祖先 HostComponent 或 HostText
    // <A /><div />   function A() { return <div /> }
    while (node.sibling === null) {
      const parent = node.return
      if (
        parent === null ||
        parent.tag === HostComponent ||
        parent.tag === HostRoot
      ) {
        // 终止条件 ( 没找到 )
        return null
      }
      node = parent
    }

    node.sibling.return = node.return
    node = node.sibling

    // 向下遍历找子孙 HostComponent 或 HostText
    // <div /><A />   function A() { return <div /> }
    while (node.tag !== HostText && node.tag !== HostComponent) {
      // 不稳定的 Host 节点(标记为 Placement 的节点)不能作为目标兄弟 Host 节点
      if ((node.flags & Placement) !== NoFlags) continue findSibling
      if (node.child === null) {
        continue findSibling
      } else {
        node.child.return = node
        node = node.child
      }
    }

    if ((node.flags & Placement) === NoFlags) {
      return node.stateNode
    }
  }
}

function getHostParent(fiber: FiberNode): Container | null {
  let parent = fiber.return
  while (parent) {
    const parentTag = parent.tag
    // hostComponent HostRoot
    if (parentTag === HostComponent) {
      return parent.stateNode as Container
    }
    if (parentTag === HostRoot) {
      return (parent.stateNode as FiberRootNode).container
    }
    parent = parent.return
  }
  if (__DEV__) {
    console.warn('未找到hostParent', fiber)
  }
  return null
}

function insertOrAppendPlacementNodeIntoContainer(
  finishedWork: FiberNode,
  hostParent: Container,
  before?: Instance,
) {
  if (finishedWork.tag === HostComponent || finishedWork.tag === HostText) {
    if (before) {
      insertChildIntoContainer(
        finishedWork.stateNode as Instance,
        hostParent,
        before,
      )
    } else {
      appendChildToContainer(hostParent, finishedWork.stateNode as Instance)
    }

    return
  }

  const child = finishedWork.child
  if (child) {
    insertOrAppendPlacementNodeIntoContainer(child, hostParent)
    let sibling = child.sibling

    while (sibling) {
      insertOrAppendPlacementNodeIntoContainer(sibling, hostParent)
      sibling = sibling.sibling
    }
  }
}
