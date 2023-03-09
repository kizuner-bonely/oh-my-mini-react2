import { Container } from 'hostConfig'
import { Props } from 'shared/ReactTypes'
export const elementPropsKey = '__props'

const validEventTypeList = ['click']

type EventCallback = (e: Event) => void

interface SynthesisEvent extends Event {
  __stopPropagation: boolean
}

interface Paths {
  capture: EventCallback[]
  bubble: EventCallback[]
}

export interface DOMElement extends Element {
  [elementPropsKey]: Props
}

export function updateFiberProps(node: DOMElement, props: Props) {
  node[elementPropsKey] = props
}

export function initEvent(container: Container, eventType: string) {
  if (!validEventTypeList.includes(eventType)) {
    console.warn(`当前不支持事件类型 ${eventType}`)
  }

  if (__DEV__) {
    console.log(`初始化事件: ${eventType}`)
  }

  container.addEventListener(eventType, e => {
    dispatchEvent(container, eventType, e)
  })
}

function dispatchEvent(container: Container, eventType: string, e: Event) {
  const targetElement = e.target

  if (!targetElement) {
    console.warn(`事件不存在 target ${e}`)
    return
  }
  // 1.收集沿途的事件
  const { bubble, capture } = collectPaths(
    targetElement as DOMElement,
    container,
    eventType,
  )
  // 2.构造合成事件
  const se = createSynthesisEvent(e)
  // 3.遍历 capture
  triggerEventFlow(capture, se)

  // 4.遍历 bubble
  if (!se.__stopPropagation) {
    triggerEventFlow(bubble, se)
  }
}

function collectPaths(
  targetElement: DOMElement,
  container: Container,
  eventType: string,
) {
  const paths: Paths = {
    capture: [],
    bubble: [],
  }

  while (targetElement && targetElement !== container) {
    // 收集
    const elementProps = targetElement[elementPropsKey]
    if (elementProps) {
      // click -> onClickCapture onClick
      const callbackNameList = getEventCallbackNameFromEventType(eventType)
      if (callbackNameList) {
        callbackNameList.forEach((callbackName, i) => {
          const eventCallback = elementProps[callbackName]
          if (eventCallback) {
            if (i === 0) {
              paths.capture.unshift(eventCallback)
            } else {
              paths.bubble.push(eventCallback)
            }
          }
        })
      }
    }
    targetElement = targetElement.parentNode as DOMElement
  }

  return paths
}

function getEventCallbackNameFromEventType(eventType: string) {
  return {
    click: ['onClickCapture', 'onClick'],
  }[eventType]
}

function createSynthesisEvent(e: Event) {
  const synthesisEvent = e as SynthesisEvent
  synthesisEvent.__stopPropagation = false
  const originStopPropagation = e.stopPropagation

  synthesisEvent.stopPropagation = () => {
    synthesisEvent.__stopPropagation = true
    if (originStopPropagation) {
      originStopPropagation()
    }
  }

  return synthesisEvent
}

function triggerEventFlow(paths: EventCallback[], se: SynthesisEvent) {
  for (let i = 0; i < paths.length; i++) {
    const callback = paths[i]
    callback.call(null, se)

    if (se.__stopPropagation) {
      break
    }
  }
}
