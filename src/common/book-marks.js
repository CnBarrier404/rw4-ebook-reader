import storage from '@system.storage'
import { createProgressStore } from './reader-progress'

export const marks = createProgressStore(storage)
