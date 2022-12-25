import { ReactElement } from 'shared/ReactTypes'
import {
  createUpdate,
  createUpdateQueue,
  enqueueUpdate,
  Update,
  UpdateQueue,
} from './updateQueue'
import { HostRoot } from './workTags'
import { FiberNode, FiberRootNode } from './fiber'
import { Container } from './hostConfig'
import { scheduleUpdateOnFiber } from './workLoop'

export function createContainer(container: Container) {
  const hostRootFiber = new FiberNode(HostRoot, {}, null)
  const root = new FiberRootNode(container, hostRootFiber)
  hostRootFiber.updateQueue = createUpdateQueue()
  return root
}

export function updateContainer<S>(
  element: ReactElement | null,
  root: FiberRootNode,
) {
  const hostRootFiber = root.current
  const update = createUpdate(element) as Update<S | null>
  enqueueUpdate(hostRootFiber.updateQueue as UpdateQueue<S | null>, update)
  scheduleUpdateOnFiber(hostRootFiber)
  return element
}
