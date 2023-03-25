import { Action } from 'shared/ReactTypes'
export interface Dispatcher {
  useState: <T>(initialState: (() => T) | T) => [T, Dispatch<T>]
  useEffect: (
    callback: () => void | void,
    dependencies: any[] | undefined,
  ) => void | (() => void)
}

export type Dispatch<T> = (action: Action<T>) => void

const currentDispatcher: { current: Dispatcher | null } = {
  current: null,
}

export const resolveDispatcher = () => {
  const dispatcher = currentDispatcher.current

  if (dispatcher === null) {
    throw new Error('hook 只能在函数组件中执行')
  }

  return dispatcher
}

export default currentDispatcher
