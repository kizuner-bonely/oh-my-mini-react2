import { Dispatch } from 'react/src/currentDispatcher'
import { Action } from 'shared/ReactTypes'

export interface Update<State> {
  action: Action<State>
  next: Update<State> | null
}

export interface UpdateQueue<State> {
  shared: {
    pending: Update<State> | null
  }
  dispatch: Dispatch<State> | null
}

export const createUpdate = <State>(action: Action<State>) => {
  return { action, next: null }
}

export const createUpdateQueue = <State>(): UpdateQueue<State> => {
  return {
    shared: { pending: null },
    dispatch: null,
  }
}

export const enqueueUpdate = <State>(
  updateQueue: UpdateQueue<State>,
  update: Update<State>,
) => {
  const pending = updateQueue.shared.pending
  if (pending === null) {
    update.next = update
  } else {
    update.next = pending.next
    pending.next = update
  }

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
