import { REACT_ELEMENT_TYPE } from 'shared/ReactSymbols'
import { Type, Key, Ref, Props, ReactElement } from 'shared/ReactTypes'

function ReactElement(
  type: Type,
  key: Key,
  ref: Ref,
  props: Props,
): ReactElement {
  return {
    $$typeof: REACT_ELEMENT_TYPE,
    type,
    key,
    ref,
    props,
    __mark: 'HH', // self ( doesn't show in official React )
  }
}

export function jsx(
  type: Type,
  config: Record<string, any>,
  ..._children: ReactElement[]
) {
  let key: Key = null
  const props: Props = {}
  let ref: Ref = null

  for (const prop in config) {
    const val = config[prop]

    if (prop === 'key') {
      if (val !== undefined) key = `${val}`
      continue
    }

    if (prop === 'ref') {
      if (val !== undefined) ref = val
      continue
    }

    if (Object.prototype.hasOwnProperty.call(config, prop)) {
      props[prop] = val
    }
  }

  const cLength = _children.length
  if (cLength) {
    if (cLength === 1) {
      props.children = _children[0] // child -> ReactElement
    } else {
      props.children = _children // children -> ReactElement[]
    }
  }

  return ReactElement(type, key, ref, props)
}

// In official React, jsxDEV will do extra examinations.
export const jsxDEV = jsx
