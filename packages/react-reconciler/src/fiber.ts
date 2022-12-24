import { UpdateQueue } from './updateQueue'
import { Props, Key, Ref } from 'shared/ReactTypes'
import { WorkTag } from './workTags'
import { Flags, NoFlags } from './fiberFlags'
import { Container } from 'hostConfig'
import type { ClassElement } from 'typescript'

export class FiberNode<S> {
  tag: WorkTag
  key: Key
  stateNode: FiberRootNode<S> | HTMLElement | null
  type: null | ((...args: any[]) => FiberNode<S> | null) | ClassElement
  ref: Ref

  return: null | FiberNode<S>
  sibling: null | FiberNode<S>
  child: null | FiberNode<S>
  index: number

  pendingProps: Props
  memoizedProps: null | Props
  memoizedState: null | S
  updateQueue: null | UpdateQueue<S>
  alternate: null | FiberNode<S>
  flags: Flags

  constructor(tag: WorkTag, pendingProps: Props, key: Key) {
    //* 实例属性 ( ReactElement )
    this.tag = tag
    this.key = key
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
    this.flags = NoFlags // 副作用
  }
}

export class FiberRootNode<S> {
  container: Container
  current: FiberNode<S>
  finishedWork: FiberNode<S> | null // 调度完成的 HostRootFiber
  constructor(container: FiberNode<S>, hostRootFiber: FiberNode<S>) {
    this.container = container
    this.current = hostRootFiber
    hostRootFiber.stateNode = this
    this.finishedWork = null
  }
}

export function createWorkInProgress<S>(
  current: FiberNode<S>,
  pendingProps: Props,
): FiberNode<S> {
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
  }
  wip.type = current.type
  wip.child = current.child
  wip.updateQueue = current.updateQueue
  wip.memoizedProps = current.memoizedProps
  wip.memoizedState = current.memoizedState

  return wip
}
