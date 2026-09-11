const CACHE_NAME = 'dc20-hub-v8';
const PRECACHE = [
  '/',
  '/manifest.webmanifest',
  '/favicon.svg',
  '/data/BetaSpells.json',
  '/data/BetaManeuvers.json',
  '/data/CharacterReference.json',
  '/data/EquipmentCatalog.json',
  '/data/MundaneObjects.json',
  '/data/MonsterSourceLibrary.json',
  '/data/BetaBestiaryVol3.json',
  '/data/BetaBestiaryVol4.json',
  '/data/StrongSimpleMonsters.json',
  '/data/AdventureRewardsMonsters.json',
  '/data/MagicalConsumablesMonsters.json',
  '/data/AdventureRewards.json',
  '/data/AdventureRewardBoons.json',
  '/data/MagicalConsumables.json',
  '/data/MagicalConsumablesRules.json',
  '/data/Poisons.json',
  '/data/PoisonsRules.json',
  '/data/RulesReference.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((names) => Promise.all(names.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;
  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request).then((response) => {
      const copy = response.clone();
      void caches.open(CACHE_NAME).then((cache) => cache.put('/', copy));
      return response;
    }).catch(() => caches.match('/')));
    return;
  }
  event.respondWith(caches.match(event.request).then((cached) => cached ?? fetch(event.request).then((response) => {
    if (response.ok) {
      const copy = response.clone();
      void caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
    }
    return response;
  })));
});
