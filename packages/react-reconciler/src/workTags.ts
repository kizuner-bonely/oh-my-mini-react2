export type WorkTag =
  | typeof FunctionComponent
  | typeof HostRoot
  | typeof HostComponent
  | typeof HostText
  | typeof Fragment

export const FunctionComponent = 0
export const HostRoot = 3 // ReactDOM.render()
export const HostComponent = 5 // <div></div>
export const HostText = 6 // <div>123</div> => 123
export const Fragment = 7
