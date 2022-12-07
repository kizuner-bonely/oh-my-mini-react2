import { Props, Key, Ref } from 'shared/ReactTypes'
import { WorkTag } from './workTags'
import { Flags, NoFlags } from './fiberFlags'
import type { ClassElement } from 'typescript'

export class FiberNode {
  tag: WorkTag
  key: Key
  stateNode: HTMLElement | null
  type: null | ((...args: any[]) => FiberNode | null) | ClassElement
  ref: Ref

  return: null | FiberNode
  sibling: null | FiberNode
  child: null | FiberNode
  index: number

  pendingProps: Props
  memoizedProps: null | Props
  alternate: null | FiberNode
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
    this.alternate = null
    this.flags = NoFlags // 副作用
  }
}
