import { marks } from './book-marks'

const KEY = 'settings.keepScreenOn.v1'

export function getKeepScreenOn(done) {
  marks.get(KEY, (value) => done(value === 'true'))
}

export function saveKeepScreenOn(enabled, done) {
  marks.set(KEY, enabled ? 'true' : 'false', done)
}
