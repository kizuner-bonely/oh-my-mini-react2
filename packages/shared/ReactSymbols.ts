//* 1. check whether Symbol is supported
const supportSymbol = typeof Symbol === 'function' && !!Symbol.for

//* 2. export react type
export const REACT_ELEMENT_TYPE = supportSymbol
  ? Symbol.for('react.element')
  : 0xeac7
