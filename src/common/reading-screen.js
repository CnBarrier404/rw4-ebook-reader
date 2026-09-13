import brightness from '@system.brightness'

// Serialize native requests so a late enable completes before the queued disable.
function createScreenControl(device) {
  let owner = null
  let desired = false
  let revision = 0
  let busy = false
  let failed = null

  function pump() {
    if (busy) return
    busy = true
    const requestRevision = revision
    const enabled = desired
    let finished = false
    const finish = (ok) => {
      if (finished) return
      finished = true
      busy = false
      if (requestRevision !== revision) { pump(); return }
      if (!ok && failed) failed()
    }
    try {
      device.setKeepScreenOn({ keepScreenOn: enabled,
        success: () => finish(true), fail: () => finish(false) })
    } catch (error) { finish(false) }
  }

  return {
    request(page, enabled, onFailure) {
      owner = page
      desired = enabled
      failed = onFailure
      revision++
      pump()
    },
    release(page) {
      if (owner !== page) return
      owner = null
      desired = false
      failed = () => console.error('Failed to cancel reading keep-screen-on')
      revision++
      pump()
    }
  }
}

export const readingScreen = createScreenControl(brightness)
