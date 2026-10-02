const DB_NAME = 'GeoFishMS_DB';
const DB_VERSION = 1;
const STORE_NAME = 'layers_cache';

class GeoFishDB {
  static _dbPromise = null;

  static open() {
    if (!this._dbPromise) {
      this._dbPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
          const db = event.target.result;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME, { keyPath: 'layerKey' });
          }
        };

        request.onsuccess = (event) => resolve(event.target.result);
        request.onerror = (event) => {
          this._dbPromise = null;
          reject(event.target.error);
        };
      });
    }
    return this._dbPromise;
  }

  static async executar(modo, operacao) {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, modo);
      const store = tx.objectStore(STORE_NAME);
      const req = operacao(store);
      tx.oncomplete = () => resolve(req.result);
      tx.onabort = () => reject(tx.error || req.error);
    });
  }

  static async salvarCamada(layerKey, geojsonData) {
    return this.executar('readwrite', (store) => {
      return store.put({
        layerKey: layerKey,
        data: geojsonData,
        atualizado_em: new Date().toISOString()
      });
    });
  }

  static async obterCamada(layerKey) {
    const result = await this.executar('readonly', (store) => store.get(layerKey));
    return result ? result.data : null;
  }
}
// Como não usamos type="module" no HTML mais, GeoFishDB já estará disponível globalmente.
