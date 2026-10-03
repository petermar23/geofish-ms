/**
 * GeoFish MS - Gerenciador de Armazenamento Local IndexedDB
 * Base de dados: GeoFishMS_DB
 */
const DB_NAME = 'GeoFishMS_DB';
const DB_VERSION = 3; // Upgrade para v3 (Diário e Denúncias)
const STORE_LAYERS = 'layers_cache';
const STORE_DIARIO = 'diario_pesca';
const STORE_DENUNCIAS = 'denuncias_pma';

class GeoFishDB {
  static _dbInstance = null;
  static _openPromise = null;

  static open() {
    if (this._dbInstance) return Promise.resolve(this._dbInstance);
    if (this._openPromise) return this._openPromise;

    this._openPromise = new Promise((resolve) => {
      if (!('indexedDB' in window)) return resolve(null);

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // Camadas GeoJSON
        if (!db.objectStoreNames.contains(STORE_LAYERS)) {
          db.createObjectStore(STORE_LAYERS, { keyPath: 'layerKey' });
        } else if (event.oldVersion < 3) {
          // Mantemos a tabela layers_cache existente, mas se precisarmos apagar algo:
          // db.deleteObjectStore('layers_cache'); e recria se quiser, mas é melhor manter.
        }
        
        // Diário de Bordo (Gamificação)
        if (!db.objectStoreNames.contains(STORE_DIARIO)) {
          const storeDiario = db.createObjectStore(STORE_DIARIO, { keyPath: 'id' });
          storeDiario.createIndex('synced', 'synced', { unique: false });
        }
        
        // Denúncias Offline
        if (!db.objectStoreNames.contains(STORE_DENUNCIAS)) {
          const storeDenuncias = db.createObjectStore(STORE_DENUNCIAS, { keyPath: 'id' });
          storeDenuncias.createIndex('synced', 'synced', { unique: false });
        }
      };

      request.onsuccess = (event) => {
        this._dbInstance = event.target.result;
        resolve(this._dbInstance);
      };

      request.onerror = () => resolve(null);
    });

    return this._openPromise;
  }

  // ================= CAMADAS GEOJSON =================

  static async obterCamada(layerKey) {
    const db = await this.open();
    if (!db) return null;
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_LAYERS, 'readonly');
      const req = tx.objectStore(STORE_LAYERS).get(layerKey);
      req.onsuccess = () => resolve(req.result ? req.result : null);
      req.onerror = () => resolve(null);
    });
  }

  static async salvarCamada(layerKey, dataJson, versaoStr = '1.0') {
    const db = await this.open();
    if (!db) return false;
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_LAYERS, 'readwrite');
      const req = tx.objectStore(STORE_LAYERS).put({
        layerKey: layerKey,
        data: dataJson,
        versao: versaoStr,
        atualizado_em: new Date().toISOString()
      });
      req.onsuccess = () => resolve(true);
      req.onerror = () => resolve(false);
    });
  }

  // ================= DIÁRIO DE PESCA =================

  static async salvarTrofeu(trofeuData) {
    const db = await this.open();
    if (!db) return false;
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_DIARIO, 'readwrite');
      const req = tx.objectStore(STORE_DIARIO).put(trofeuData);
      req.onsuccess = () => resolve(true);
      req.onerror = () => resolve(false);
    });
  }

  static async obterTodosTrofeus() {
    const db = await this.open();
    if (!db) return [];
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_DIARIO, 'readonly');
      const req = tx.objectStore(STORE_DIARIO).getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });
  }

  // ================= DENÚNCIAS OFFLINE =================

  static async salvarDenuncia(denunciaData) {
    const db = await this.open();
    if (!db) return false;
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_DENUNCIAS, 'readwrite');
      const req = tx.objectStore(STORE_DENUNCIAS).put(denunciaData);
      req.onsuccess = () => resolve(true);
      req.onerror = () => resolve(false);
    });
  }

  static async obterRegistrosPendentesDeSincronizacao(storeName) {
    const db = await this.open();
    if (!db) return [];
    return new Promise((resolve) => {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const index = store.index('synced');
      const req = index.getAll(IDBKeyRange.only(0)); // 0 = false (não sincronizado)
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });
  }

  static async marcarComoSincronizado(storeName, id) {
    const db = await this.open();
    if (!db) return false;
    return new Promise((resolve) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const req = store.get(id);
      req.onsuccess = () => {
        if (req.result) {
          req.result.synced = 1; // 1 = true
          store.put(req.result);
        }
        resolve(true);
      };
      req.onerror = () => resolve(false);
    });
  }
}

// Expõe globalmente
window.GeoFishDB = GeoFishDB;
