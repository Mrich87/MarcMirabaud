import { isFirebaseConfigured } from '../firebaseConfig';
import type { GameStore } from './GameStore';
import { createFirebaseStore } from './firebaseStore';
import { createLocalStore } from './localStore';

// ?demo=1 forces the local store even when Firebase is configured.
const forceDemo = new URLSearchParams(window.location.search).has('demo');

export const usingFirebase = isFirebaseConfigured && !forceDemo;

export const store: GameStore = usingFirebase ? createFirebaseStore() : createLocalStore();
