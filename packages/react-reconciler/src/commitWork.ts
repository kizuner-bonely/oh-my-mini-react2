import { appendChildToContainer, Container, Instance } from 'hostConfig'
import { HostComponent, HostRoot, HostText } from './workTags'
import { MutationMask, NoFlags, Placement } from './fiberFlags'
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
  // TODO Update
  // TODO ChildDeletion
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
