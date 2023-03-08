import {
  appendChildToContainer,
  commitUpdate,
  Container,
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
        commitDelete(childToDelete)
      })
    }
  }
}

function commitDelete(childToDelete: FiberNode) {
  let rootHostNode: FiberNode | null = null

  // 递归
  commitNestedComponent(childToDelete, unmountFiber => {
    switch (unmountFiber.tag) {
      case HostComponent:
        if (rootHostNode === null) {
          rootHostNode = unmountFiber
        }
        // TODO 解绑 ref
        break
      case HostText:
        if (rootHostNode === null) {
          rootHostNode = unmountFiber
        }
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
  if (rootHostNode) {
    const hostParent = getHostParent(childToDelete)
    if (hostParent) {
      removeChild(
        (rootHostNode as FiberNode).stateNode as Element | Text,
        hostParent,
      )
    }
  }
  childToDelete.return = null
  childToDelete.child = null
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
  if (hostParent) {
    appendPlacementNodeIntoContainer(finishedWork, hostParent)
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

function appendPlacementNodeIntoContainer(
  finishedWork: FiberNode,
  hostParent: Container,
) {
  if (finishedWork.tag === HostComponent || finishedWork.tag === HostText) {
    appendChildToContainer(hostParent, finishedWork.stateNode as Instance)
    return
  }
  const child = finishedWork.child
  if (child) {
    appendPlacementNodeIntoContainer(child, hostParent)
    let sibling = child.sibling

    while (sibling) {
      appendPlacementNodeIntoContainer(sibling, hostParent)
      sibling = sibling.sibling
    }
  }
}
