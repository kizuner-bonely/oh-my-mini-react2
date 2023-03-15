import { Container } from 'hostConfig'
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
import { scheduleUpdateOnFiber } from './workLoop'
import { requestUpdateLanes } from './fiberLanes'

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
  const lane = requestUpdateLanes()
  const update = createUpdate(element, lane) as Update<S | null>
  enqueueUpdate(hostRootFiber.updateQueue as UpdateQueue<S | null>, update)
  scheduleUpdateOnFiber(hostRootFiber, lane)
  return element
}
