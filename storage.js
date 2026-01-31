const DB_NAME = 'packing-db';
const DB_VERSION = 1;
const STORE = 'history';

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function saveHistory(data) {
  const db = await openDB();
  const tx = db.transaction(STORE, 'readwrite');
  const store = tx.objectStore(STORE);

  data.createdAt = new Date().toISOString();
  store.add(data);

  return tx.complete;
}

async function getHistory() {
  const db = await openDB();
  const tx = db.transaction(STORE, 'readonly');
  const store = tx.objectStore(STORE);

  return new Promise(resolve => {
    const req = store.getAll();
    req.onsuccess = () =>
      resolve(req.result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
  });
}

async function getHistoryById(id) {
  const db = await openDB();
  const tx = db.transaction(STORE, 'readonly');
  const store = tx.objectStore(STORE);

  return new Promise(resolve => {
    const req = store.get(Number(id));
    req.onsuccess = () => resolve(req.result);
  });
}

window.getHistoryById = getHistoryById;

window.saveHistory = saveHistory;
window.getHistory = getHistory;
