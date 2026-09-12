// Serialize writes across page instances; a rapid reopen sees the queued value.
export function createProgressStore(storage) {
  const pending = {}
  let writing = false
  function pump() {
    if (writing) return
    const key = Object.keys(pending)[0]
    if (!key) return
    const entry = pending[key]
    writing = true
    storage.set({
      key, value: entry.value,
      success: () => finish(true),
      fail: () => finish(false)
    })
    function finish(ok) {
      writing = false
      if (pending[key] === entry) delete pending[key]
      entry.done(ok)
      pump()
    }
  }
  return {
    get(key, done) {
      if (pending[key]) { done(pending[key].value); return }
      storage.get({ key, success: done, fail: () => done('') })
    },
    set(key, value, done) {
      pending[key] = { value, done }
      pump()
    }
  }
}
