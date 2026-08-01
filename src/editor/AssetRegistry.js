// HiValley — World Editor Asset Registry
//
// Tüm oyun assetlerini kategorilere ayırır, search/filter sistemi sunar.
// Editor palette panelinde kullanılır.

/**
 * Asset kategorileri ve içindeki tüm assetler
 */
export const ASSET_CATEGORIES = {
  tiles: {
    name: '🧱 Tiles',
    description: 'Zemin ve yol tileları',
    items: [
      {
        id: 'grass',
        name: 'Çim',
        type: 'tile',
        textureKey: 'farm:tileset',
        frame: 33,
        tags: ['çim', 'grass', 'green', 'ziel', 'zemin', 'ground', 'yosun'],
        color: '#79bb56',
        tilesetType: 'farm-rpg',
      },
      {
        id: 'grass-alt',
        name: 'Çim (Alternatif)',
        type: 'tile',
        textureKey: 'farm:tileset',
        frame: 225,
        tags: ['çim', 'grass', 'green', 'alt', 'farklı', 'variation'],
        color: '#79bb56',
        tilesetType: 'farm-rpg',
      },
      {
        id: 'dirt',
        name: 'Toprak',
        type: 'tile',
        textureKey: 'farm:tileset',
        frame: 116,
        tags: ['toprak', 'dirt', 'brown', 'kahverengi', 'zemin', 'ground'],
        color: '#c39b4f',
        tilesetType: 'farm-rpg',
      },
      {
        id: 'dirt-alt',
        name: 'Toprak (Alternatif)',
        type: 'tile',
        textureKey: 'farm:tileset',
        frame: 117,
        tags: ['toprak', 'dirt', 'brown', 'alt', 'farklı', 'variation'],
        color: '#dd9b50',
        tilesetType: 'farm-rpg',
      },
      {
        id: 'tilled-soil',
        name: 'Sürüş Toprağı',
        type: 'tile',
        textureKey: 'farm:tileset',
        frame: 106,
        tags: ['toprak', 'sürülmüş', 'tarla', 'soil', 'tilled', 'farm', 'ekim', 'plow'],
        color: '#c39b4f',
        tilesetType: 'farm-rpg',
      },
      {
        id: 'path',
        name: 'Yol',
        type: 'tile',
        textureKey: 'farm:tileset',
        frame: 129,
        tags: ['yol', 'path', 'road', 'pato', 'caddesi', 'sokak'],
        color: '#ed9c51',
        tilesetType: 'farm-rpg',
      },
      {
        id: 'path-dark',
        name: 'Koyu Yol',
        type: 'tile',
        textureKey: 'farm:tileset',
        frame: 130,
        tags: ['yol', 'path', 'road', 'koyu', 'dark'],
        color: '#dd9b50',
        tilesetType: 'farm-rpg',
      },
    ],
  },
  kenneyTiles: {
    name: '🌾 Kenney Tiles',
    description: 'Kenney Tiny Farm tileları',
    items: [
      // Kenney tilemap_packed 12x11 grid (frame 0..131)
      {
        id: 'kenney-grass-1',
        name: 'Kenney Çim 1',
        type: 'tile',
        textureKey: 'farm:kenney-tiles',
        frame: 0,
        tags: ['kenney', 'çim', 'grass', 'green', 'cc0'],
        tilesetType: 'kenney',
      },
      {
        id: 'kenney-grass-2',
        name: 'Kenney Çim 2',
        type: 'tile',
        textureKey: 'farm:kenney-tiles',
        frame: 1,
        tags: ['kenney', 'çim', 'grass', 'green', 'cc0'],
        tilesetType: 'kenney',
      },
      {
        id: 'kenney-grass-3',
        name: 'Kenney Çim 3',
        type: 'tile',
        textureKey: 'farm:kenney-tiles',
        frame: 2,
        tags: ['kenney', 'çim', 'grass', 'green', 'cc0'],
        tilesetType: 'kenney',
      },
      {
        id: 'kenney-dirt-path',
        name: 'Kenney Toprak Yol',
        type: 'tile',
        textureKey: 'farm:kenney-tiles',
        frame: 12,
        tags: ['kenney', 'yol', 'path', 'dirt', 'toprak'],
        tilesetType: 'kenney',
      },
      {
        id: 'kenney-dirt-path-2',
        name: 'Kenney Toprak Yol 2',
        type: 'tile',
        textureKey: 'farm:kenney-tiles',
        frame: 13,
        tags: ['kenney', 'yol', 'path', 'dirt', 'toprak'],
        tilesetType: 'kenney',
      },
      {
        id: 'kenney-water',
        name: 'Kenney Su',
        type: 'tile',
        textureKey: 'farm:kenney-tiles',
        frame: 48,
        tags: ['kenney', 'su', 'water', 'göl', 'lake', 'nehir', 'river'],
        tilesetType: 'kenney',
      },
      {
        id: 'kenney-sand',
        name: 'Kenney Kum',
        type: 'tile',
        textureKey: 'farm:kenney-tiles',
        frame: 24,
        tags: ['kenney', 'kum', 'sand', 'sahil', 'beach', 'çöl', 'desert'],
        tilesetType: 'kenney',
      },
      {
        id: 'kenney-stone',
        name: 'Kenney Taş',
        type: 'tile',
        textureKey: 'farm:kenney-tiles',
        frame: 36,
        tags: ['kenney', 'taş', 'stone', 'rock', 'kaya', 'duvar', 'wall'],
        tilesetType: 'kenney',
      },
      {
        id: 'kenney-tilled',
        name: 'Kenney Tarla',
        type: 'tile',
        textureKey: 'farm:kenney-tiles',
        frame: 60,
        tags: ['kenney', 'tarla', 'tarla', 'tilled', 'soil', 'toprak', 'farm'],
        tilesetType: 'kenney',
      },
      {
        id: 'kenney-watered',
        name: 'Kenney Sulanmış Tarla',
        type: 'tile',
        textureKey: 'farm:kenney-tiles',
        frame: 72,
        tags: ['kenney', 'sulanmış', 'watered', 'tarla', 'farm', 'ıslak', 'wet'],
        tilesetType: 'kenney',
      },
    ],
  },
  buildings: {
    name: '🏠 Buildings',
    description: 'Binalar ve yapılar',
    items: [
      {
        id: 'house',
        name: 'Ev',
        type: 'object',
        textureKey: 'farm:house',
        tags: ['ev', 'house', 'home', 'konut', 'bina', 'building', 'residence'],
        width: 64,
        height: 64,
        anchorX: 0.5,
        anchorY: 0.8,
      },
      {
        id: 'interior',
        name: 'İç Mekan',
        type: 'object',
        textureKey: 'farm:interior',
        tags: ['iç', 'interior', 'iç mekan', 'oda', 'room', 'house', 'ev'],
        width: 80,
        height: 80,
      },
    ],
  },
  nature: {
    name: '🌳 Nature',
    description: 'Ağaçlar ve doğal objeler',
    items: [
      {
        id: 'maple-tree',
        name: 'Akçaağacı',
        type: 'object',
        textureKey: 'farm:tree',
        tags: ['ağaç', 'tree', 'maple', 'akçaağaç', 'yaprak', 'leaf', 'doğa', 'nature'],
        width: 48,
        height: 64,
        anchorX: 0.5,
        anchorY: 0.8,
      },
    ],
  },
  fences: {
    name: '🏗️ Fences',
    description: 'Çit ve korkuluklar',
    items: [
      {
        id: 'fence',
        name: 'Çit',
        type: 'object',
        textureKey: 'farm:fence',
        tags: ['çit', 'fence', 'korkuluk', 'barrier', 'engel', 'sınır', 'border'],
        width: 48,
        height: 16,
      },
    ],
  },
  roads: {
    name: '🛤️ Roads',
    description: 'Yollar ve kaldırımlar',
    items: [
      {
        id: 'road',
        name: 'Yol',
        type: 'object',
        textureKey: 'farm:road',
        tags: ['yol', 'road', 'caddesi', 'sokak', 'pato', 'kaldırım', 'sidewalk'],
        width: 48,
        height: 16,
      },
    ],
  },
  items: {
    name: '📦 Items',
    description: 'Eşyalar ve kutular',
    items: [
      {
        id: 'chest',
        name: 'Sandık',
        type: 'spritesheet',
        textureKey: 'farm:chest',
        tags: ['sandık', 'chest', 'kutu', 'box', 'depo', 'storage', 'hazine', 'treasure'],
        width: 32,
        height: 32,
        frameWidth: 32,
        frameHeight: 16,
        anchorX: 0.5,
        anchorY: 0.8,
        animKey: 'farm:chest-closed',
      },
    ],
  },
  crops: {
    name: '🌱 Crops',
    description: 'Ekinler ve bitkiler',
    items: [
      {
        id: 'crops-spring',
        name: 'Bahar Ekinleri',
        type: 'spritesheet',
        textureKey: 'farm:crops',
        tags: ['ekin', 'crop', 'bitki', 'plant', 'bahar', 'spring', 'tarım', 'farming'],
        frameWidth: 16,
        frameHeight: 16,
      },
    ],
  },
  animals: {
    name: '🐔 Animals',
    description: 'Hayvanlar',
    items: [
      {
        id: 'chicken-yellow',
        name: 'Sarı Civciv',
        type: 'spritesheet',
        textureKey: 'farm:chick-yellow',
        tags: ['civciv', 'chicken', 'chick', 'tavuk', 'kuş', 'bird', 'sarı', 'yellow'],
        frameWidth: 16,
        frameHeight: 16,
        animKey: 'farm:chick-yellow-idle',
      },
      {
        id: 'chicken-green',
        name: 'Yeşil Tavuk',
        type: 'spritesheet',
        textureKey: 'farm:chick-green',
        tags: ['tavuk', 'chicken', 'hen', 'yeşil', 'green', 'kuş', 'bird'],
        frameWidth: 16,
        frameHeight: 16,
        animKey: 'farm:chick-green-idle',
      },
      {
        id: 'chicken-red',
        name: 'Kırmızı Tavuk',
        type: 'spritesheet',
        textureKey: 'farm:chick-red',
        tags: ['tavuk', 'chicken', 'hen', 'kırmızı', 'red', 'kuş', 'bird'],
        frameWidth: 16,
        frameHeight: 16,
        animKey: 'farm:chick-red-idle',
      },
      {
        id: 'cow-female',
        name: 'İnek (Dişi)',
        type: 'spritesheet',
        textureKey: 'farm:cow-female',
        tags: ['inek', 'cow', 'süt', 'milk', 'dişi', 'female', 'hayvan', 'animal'],
        frameWidth: 16,
        frameHeight: 16,
        animKey: 'farm:cow-female-idle',
      },
      {
        id: 'cow-male',
        name: 'Boğa',
        type: 'spritesheet',
        textureKey: 'farm:cow-male',
        tags: ['boğa', 'bull', 'inek', 'cow', 'erkek', 'male', 'hayvan', 'animal'],
        frameWidth: 16,
        frameHeight: 16,
        animKey: 'farm:cow-male-idle',
      },
    ],
  },
  character: {
    name: '🧑 Character',
    description: 'Karakter spriteları',
    items: [
      {
        id: 'player',
        name: 'Oyuncu',
        type: 'spritesheet',
        textureKey: 'farm:char-idle',
        tags: ['karakter', 'character', 'player', 'oyuncu', 'figür', 'kişi', 'person'],
        frameWidth: 32,
        frameHeight: 32,
      },
    ],
  },
};

/**
 * Tüm assetlerin düz listesi
 */
export function getAllAssets() {
  const all = [];
  for (const cat of Object.values(ASSET_CATEGORIES)) {
    for (const item of cat.items) {
      all.push({ ...item, categoryName: cat.name });
    }
  }
  return all;
}

/**
 * Asset search fonksiyonu
 * @param {string} query - Arama terimi
 * @returns {Array} Eşleşen assetler
 */
export function searchAssets(query) {
  if (!query || query.trim() === '') return getAllAssets();

  const q = query.toLowerCase().trim();
  const terms = q.split(/\s+/); // Boşlukla ayrılmış terimler

  return getAllAssets().filter(asset => {
    const searchable = [
      asset.name.toLowerCase(),
      asset.id.toLowerCase(),
      ...(asset.tags || []),
    ].join(' ');

    // Tüm terimler eşleşmeli (AND search)
    return terms.every(term => searchable.includes(term));
  });
}

/**
 * Kategoriye göre filtrele
 */
export function getAssetsByCategory(categoryKey) {
  const cat = ASSET_CATEGORIES[categoryKey];
  if (!cat) return [];
  return cat.items.map(item => ({ ...item, categoryName: cat.name }));
}

/**
 * Tag'e göre filtrele
 */
export function getAssetsByTag(tag) {
  return getAllAssets().filter(asset =>
    asset.tags && asset.tags.some(t => t.includes(tag.toLowerCase()))
  );
}

/**
 * Tüm benzersiz tagleri getir
 */
export function getAllTags() {
  const tags = new Set();
  for (const asset of getAllAssets()) {
    if (asset.tags) {
      asset.tags.forEach(t => tags.add(t));
    }
  }
  return [...tags].sort();
}

/**
 * Asset'i texture key'e göre bul
 */
export function findAssetByTexture(textureKey, frame = null) {
  const assets = getAllAssets();
  if (frame !== null) {
    return assets.find(a => a.textureKey === textureKey && a.frame === frame);
  }
  return assets.find(a => a.textureKey === textureKey);
}
