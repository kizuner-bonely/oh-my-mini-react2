import { Container } from 'hostConfig'
import { Props, Key, Ref } from 'shared/ReactTypes'
import { DOMElement } from 'react-dom/src/SynthesisEvent'
import { Fragment, FunctionComponent, HostComponent, WorkTag } from './workTags'
import { UpdateQueue } from './updateQueue'
import { Flags, NoFlags } from './fiberFlags'
import { ReactElement } from './../../shared/ReactTypes'
import type { ClassElement } from 'typescript'

export type FunctionComponentType = (...args: any[]) => ReactElement | null

export class FiberNode {
  tag: WorkTag
  key: Key
  stateNode: FiberRootNode | HTMLElement | Text | DOMElement | null
  type: null | FunctionComponentType | ClassElement | string
  // type: string
  ref: Ref

  return: null | FiberNode
  sibling: null | FiberNode
  child: null | FiberNode
  index: number

  pendingProps: Props
  memoizedProps: null | Props
  memoizedState: any
  updateQueue: null | UpdateQueue<any>
  deletions: FiberNode[] | null
  alternate: null | FiberNode
  flags: Flags
  subtreeFlags: Flags

  constructor(tag: WorkTag, pendingProps: Props, key: Key) {
    //* 实例属性 ( ReactElement )
    this.tag = tag
    this.key = key ?? null
    this.stateNode = null // <div></div>
    this.type = null // FunctionComponent -> function() {}
    this.ref = null

    //* 节点关系
    this.return = null
    this.sibling = null
    this.child = null
    this.index = 0

    //* 工作单元
    this.pendingProps = pendingProps
    this.memoizedProps = null
    this.updateQueue = null
    this.memoizedState = null
    this.alternate = null

    //* 副作用
    this.flags = NoFlags
    this.subtreeFlags = NoFlags
    this.deletions = null
  }
}

export class FiberRootNode {
  container: Container
  current: FiberNode
  finishedWork: FiberNode | null // 调度完成的 HostRootFiber
  constructor(container: Container, hostRootFiber: FiberNode) {
    this.container = container
    this.current = hostRootFiber
    hostRootFiber.stateNode = this
    this.finishedWork = null
  }
}

export function createWorkInProgress(
  current: FiberNode,
  pendingProps: Props,
): FiberNode {
  let wip = current.alternate

  if (wip === null) {
    // mount
    wip = new FiberNode(current.tag, pendingProps, current.key)
    wip.stateNode = current.stateNode

    wip.alternate = current
    current.alternate = wip
  } else {
    // update
    wip.pendingProps = pendingProps
    wip.flags = NoFlags
    wip.subtreeFlags = NoFlags
    wip.deletions = null
  }
  wip.type = current.type
  wip.child = current.child
  wip.updateQueue = current.updateQueue
  wip.memoizedProps = current.memoizedProps
  wip.memoizedState = current.memoizedState

  return wip
}

export function createFiberFromElement(element: ReactElement) {
  const { type, key, props } = element
  let fiberTag: WorkTag = FunctionComponent

  if (typeof type === 'string') {
    fiberTag = HostComponent
  } else if (typeof type !== 'function' && __DEV__) {
    console.warn('未定义的type类型', element)
  }

  const fiber = new FiberNode(fiberTag, props, key)
  fiber.type = type
  return fiber
}

export function createFiberFromFragment(elements: any[], key: Key) {
  return new FiberNode(Fragment, elements, key)
}
