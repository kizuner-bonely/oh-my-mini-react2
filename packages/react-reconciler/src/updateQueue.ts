import { Action } from 'shared/ReactTypes'

export interface Update<State> {
  action: Action<State>
}

export interface UpdateQueue<State> {
  shared: {
    pending: Update<State> | null
  }
}

export const createUpdate = <State>(action: Action<State>) => {
  return { action }
}

export const createUpdateQueue = <Action>(): UpdateQueue<Action> => {
  return {
    shared: { pending: null },
  }
}

export const enqueueUpdate = <Action>(
  updateQueue: UpdateQueue<Action>,
  update: Update<Action>,
) => {
  updateQueue.shared.pending = update
}

type MemoizedState<S> = { memoizedState: S }

export const processUpdateQueue = <State>(
  baseState: State,
  pendingUpdate: Update<State> | null,
): MemoizedState<State> => {
  const res = { memoizedState: baseState }
  if (pendingUpdate) {
    const action = pendingUpdate.action
    // setState(x)  setState(x => 2 * x)
    res.memoizedState = action instanceof Function ? action(baseState) : action
  }
  return res
}
