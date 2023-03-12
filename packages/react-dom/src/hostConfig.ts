import { DOMElement, updateFiberProps } from './SynthesisEvent'
/* eslint-disable no-case-declarations */
import { HostText } from 'react-reconciler/src/workTags'
import { FiberNode } from 'react-reconciler/src/fiber'

export type Container = Element
export type Instance = Element
export type TextInstance = Text

export const createInstance = (type: string, props: Record<string, any>) => {
  const element = document.createElement(type) as unknown as DOMElement
  updateFiberProps(element, props)
  return element
}

export const createTextInstance = (content: string) => {
  return document.createTextNode(content)
}

export const appendInitialChild = (
  parent: Instance | Container,
  child: Instance,
) => {
  parent.appendChild(child)
}

export const appendChildToContainer = appendInitialChild

export const commitUpdate = (fiber: FiberNode) => {
  switch (fiber.tag) {
    case HostText:
      const text = fiber.memoizedProps?.content
      return commitTextUpdate(fiber.stateNode as Text, text)
    default:
      if (__DEV__) {
        console.warn('未实现的Update类型', fiber)
      }
  }
}

export const commitTextUpdate = (
  textInstance: TextInstance,
  content: string,
) => {
  textInstance.textContent = content
}

export const removeChild = (
  child: Instance | TextInstance,
  container: Container,
) => {
  container.removeChild(child)
}

export function insertChildIntoContainer(
  child: Instance,
  container: Container,
  before: Instance,
) {
  container.insertBefore(child, before)
}
