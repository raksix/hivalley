// HiValley — SaveManager (in-browser save "slots" for the new-game flow).
//
// Saves live in localStorage as JSON under well-known keys. We provide
// 3 named slots + an "Autosave" slot. The Main Menu lists them and
// lets the user start a new game in an empty slot or continue from
// a filled one.

const SLOT_KEY_PREFIX = 'hivalley.save.';
const SLOT_NAMES = ['slot1', 'slot2', 'slot3'];
const AUTOSAVE_KEY = 'hivalley.save.autosave';
const PLAYER_KEY = 'hivalley.player';

function slotKey(name) {
  return SLOT_KEY_PREFIX + name;
}

function newSaveObject(player, sceneName = 'Farm', day = 1, money = 500, energy = 100) {
  return {
    version: 1,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    player,
    world: {
      sceneName,
      day,
      money,
      energy,
      season: 'spring',
      weather: 'sunny',
      time: '08:00',
    },
    inventory: [],
    relationships: {},
    flags: {},
  };
}

export const SaveManager = {
  list() {
    const items = [];
    for (const name of SLOT_NAMES) {
      items.push({
        name,
        label: name === 'slot1' ? 'Slot 1' : name === 'slot2' ? 'Slot 2' : 'Slot 3',
        save: this.read(name),
      });
    }
    items.push({
      name: 'autosave',
      label: 'Autosave',
      save: this.read('autosave'),
    });
    return items;
  },

  read(slotName) {
    try {
      const raw = localStorage.getItem(slotKey(slotName));
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return null;
      return parsed;
    } catch (_) {
      return null;
    }
  },

  write(slotName, save) {
    const out = { ...save, updatedAt: Date.now() };
    try {
      localStorage.setItem(slotKey(slotName), JSON.stringify(out));
      return true;
    } catch (_) {
      return false;
    }
  },

  delete(slotName) {
    try {
      localStorage.removeItem(slotKey(slotName));
      return true;
    } catch (_) {
      return false;
    }
  },

  /** Find the first empty slot, or null if all are taken. */
  firstEmptySlot() {
    for (const name of SLOT_NAMES) {
      if (!this.read(name)) return name;
    }
    return null;
  },

  /** Create a new save using the current PlayerState and write to the given slot. */
  createNew(slotName) {
    const playerRaw = localStorage.getItem(PLAYER_KEY);
    let player = null;
    if (playerRaw) {
      try {
        player = JSON.parse(playerRaw);
      } catch (_) {}
    }
    player = player || {
      name: 'Wanderer',
      gender: 'male',
      skinTone: 0,
      hairStyle: 0,
      hairColor: 0,
      shirtStyle: 0,
      shirtColor: 0,
      pantsColor: 0,
    };
    const save = newSaveObject(player);
    this.write(slotName, save);
    return save;
  },

  /** Write to autosave on transition to gameplay. */
  autosave(save) {
    return this.write('autosave', save);
  },

  get AUTOSAVE_KEY() {
    return AUTOSAVE_KEY;
  },
};