import { marks } from './book-marks'

const KEEP_SCREEN_ON_KEY = 'settings.keepScreenOn.v1'
const LOCK_BRIGHTNESS_KEY = 'settings.lockBrightness.v1'

export function getKeepScreenOn(done) {
  marks.get(KEEP_SCREEN_ON_KEY, (value) => done(value === 'true'))
}

export function saveKeepScreenOn(enabled, done) {
  marks.set(KEEP_SCREEN_ON_KEY, enabled ? 'true' : 'false', done)
}

export function getLockBrightness(done) {
  marks.get(LOCK_BRIGHTNESS_KEY, (value) => done(value === 'true'))
}

export function saveLockBrightness(enabled, done) {
  marks.set(LOCK_BRIGHTNESS_KEY, enabled ? 'true' : 'false', done)
}
