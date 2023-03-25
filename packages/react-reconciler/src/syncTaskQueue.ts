type Callback = (...args: any[]) => void

let syncQueue: Callback[] | null = null
let isFlushingSyncQueue = false

export function scheduleSyncCallback(callback: Callback) {
  if (syncQueue === null) {
    syncQueue = [callback]
  } else {
    syncQueue.push(callback)
  }
}

export function flushSyncCallbacks() {
  if (!isFlushingSyncQueue && syncQueue) {
    isFlushingSyncQueue = true
    try {
      syncQueue.forEach(callback => callback())
    } catch (e) {
      if (__DEV__) {
        console.error('flushSyncCallbacks 报错', e)
      }
    } finally {
      isFlushingSyncQueue = false
      syncQueue = null
    }
  }
}
