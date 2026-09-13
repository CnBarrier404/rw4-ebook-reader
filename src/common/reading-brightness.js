import brightness from '@system.brightness'

// Keep the brightness at its current value while reading: switch the system to
// manual mode on entry and restore the previous mode on exit. Native calls are
// serialized, so an exit during an in-flight lock still restores the mode.
function createBrightnessLock(device) {
  let owner = null
  let queued = ''
  let busy = false
  let switched = false
  let failed = null

  function runLock(done, fail) {
    device.getMode({
      success: (data) => {
        if (!data || data.mode !== 1) { done(); return }
        device.getValue({
          success: (data) => {
            device.setMode({
              mode: 0,
              success: () => {
                switched = true
                device.setValue({ value: data.value, success: () => done(), fail: () => fail() })
              },
              fail: () => fail()
            })
          },
          fail: () => fail()
        })
      },
      fail: () => fail()
    })
  }

  function runUnlock(done, fail) {
    if (!switched) { done(); return }
    device.setMode({ mode: 1, success: () => { switched = false; done() }, fail: () => fail() })
  }

  function pump() {
    if (busy || !queued) return
    busy = true
    const request = queued
    queued = ''
    const finish = (ok) => {
      busy = false
      if (!ok && failed) { const notify = failed; failed = null; notify() }
      pump()
    }
    if (request === 'lock') runLock(() => finish(true), () => finish(false))
    else runUnlock(() => finish(true), () => finish(false))
  }

  return {
    lock(page, onFailure) {
      owner = page
      failed = onFailure
      queued = 'lock'
      pump()
    },
    unlock(page) {
      if (owner !== page) return
      owner = null
      failed = null
      // A lock that is still queued never touched the device.
      if (!busy && queued === 'lock') { queued = ''; return }
      if (busy || switched) queued = 'unlock'
    }
  }
}

export const readingBrightness = createBrightnessLock(brightness)
