import { Dispatch } from 'react/src/currentDispatcher'
import { Action } from 'shared/ReactTypes'
import { Lane } from './fiberLanes'

export interface Update<State> {
  action: Action<State>
  lane: Lane
  next: Update<State> | null
}

export interface UpdateQueue<State> {
  shared: {
    pending: Update<State> | null
  }
  dispatch: Dispatch<State> | null
}

export const createUpdate = <State>(
  action: Action<State>,
  lane: Lane,
): Update<State> => {
  return { action, lane, next: null }
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
  renderLane: Lane,
): MemoizedState<State> => {
  const res = { memoizedState: baseState }
  if (pendingUpdate) {
    const first = pendingUpdate.next
    let pending = pendingUpdate.next!

    do {
      const updateLane = pending.lane
      if (updateLane === renderLane) {
        const action = pending.action
        // setState(x)  setState(x => 2 * x)
        baseState = action instanceof Function ? action(baseState) : action
      } else {
        if (__DEV__) {
          console.error('never 当前 renderLane 不属于需要更新的 lane')
        }
      }
      pending = pending.next!
    } while (pending !== first)
  }

  res.memoizedState = baseState
  return res
}
