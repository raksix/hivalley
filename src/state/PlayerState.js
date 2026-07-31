// Tiny in-memory store for character creation choices.
// Keyed by simple API; scene reads/writes via getter/setter.

const KEY = 'hivalley.player';

const defaults = () => ({
  name: '',
  gender: 'male',
  skinTone: 0,
  hairStyle: 0,
  hairColor: 0,
  shirtStyle: 0,
  shirtColor: 0,
  pantsColor: 0,
});

let state = defaults();

export const PlayerState = {
  get() {
    return { ...state };
  },
  set(patch) {
    state = { ...state, ...patch };
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (_) {
      /* ignore quota / private mode */
    }
  },
  reset() {
    state = defaults();
    try {
      localStorage.removeItem(KEY);
    } catch (_) {}
  },
  load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) state = { ...defaults(), ...JSON.parse(raw) };
    } catch (_) {}
  },
};