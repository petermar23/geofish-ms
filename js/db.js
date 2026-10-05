/**
 * GeoFish MS - Gerenciador de Armazenamento Local IndexedDB
 * Base de dados: GeoFishMS_DB
 * Resolução de transações em oncomplete, reconexão resiliente e persistência de dados.
 */
const DB_NAME = 'GeoFishMS_DB';
const DB_VERSION = 3;
const STORE_LAYERS = 'layers_cache';
const STORE_DIARIO = 'diario_pesca';
const STORE_DENUNCIAS = 'denuncias_pma';

class GeoFishDB {
  static _dbInstance = null;
  static _openPromise = null;

  /**
   * Abre a conexão com o IndexedDB de forma resiliente
   * @returns {Promise<IDBDatabase|null>}
   */
  static open() {
    if (this._dbInstance) return Promise.resolve(this._dbInstance);
    if (this._openPromise) return this._openPromise;

    this._openPromise = new Promise((resolve) => {
      if (typeof window === 'undefined' || !('indexedDB' in window)) {
        this._openPromise = null;
        return resolve(null);
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // 1. Camadas GeoJSON
        if (!db.objectStoreNames.contains(STORE_LAYERS)) {
          db.createObjectStore(STORE_LAYERS, { keyPath: 'layerKey' });
        }

        // 2. Diário de Bordo (Gamificação Cidadã)
        if (!db.objectStoreNames.contains(STORE_DIARIO)) {
          const storeDiario = db.createObjectStore(STORE_DIARIO, { keyPath: 'id' });
          storeDiario.createIndex('synced', 'synced', { unique: false });
        }

        // 3. Denúncias Offline
        if (!db.objectStoreNames.contains(STORE_DENUNCIAS)) {
          const storeDenuncias = db.createObjectStore(STORE_DENUNCIAS, { keyPath: 'id' });
          storeDenuncias.createIndex('synced', 'synced', { unique: false });
        }
      };

      request.onsuccess = (event) => {
        this._dbInstance = event.target.result;

        // Limpeza de ponteiros caso o banco seja fechado pelo navegador ou por versão externa
        this._dbInstance.onversionchange = () => {
          if (this._dbInstance) {
            this._dbInstance.close();
            this._dbInstance = null;
          }
          this._openPromise = null;
        };

        this._dbInstance.onclose = () => {
          this._dbInstance = null;
          this._openPromise = null;
        };

        // Solicita armazenamento persistente de forma não intrusiva
        this.solicitarPersistencia();

        resolve(this._dbInstance);
      };

      request.onerror = (err) => {
        console.warn('[GeoFishDB] Erro ao abrir IndexedDB:', err);
        // Libera para que chamadas futuras possam tentar reabrir
        this._dbInstance = null;
        this._openPromise = null;
        resolve(null);
      };

      request.onblocked = () => {
        console.warn('[GeoFishDB] Conexão bloqueada por outra aba aberta.');
      };
    });

    return this._openPromise;
  }

  /**
   * Solicita persistência de armazenamento para evitar limpeza automática pelo navegador
   */
  static async solicitarPersistencia() {
    if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persist) {
      try {
        const isPersisted = await navigator.storage.persisted();
        if (!isPersisted) {
          const granted = await navigator.storage.persist();
          if (granted) {
            console.log('[Storage] Armazenamento persistente concedido pelo navegador.');
          }
        }
      } catch (_) {}
    }
  }

  // ================= CAMADAS GEOJSON =================

  static async obterCamada(layerKey) {
    const db = await this.open();
    if (!db) return null;
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_LAYERS, 'readonly');
        const req = tx.objectStore(STORE_LAYERS).get(layerKey);
        req.onsuccess = () => resolve(req.result ? req.result : null);
        req.onerror = () => resolve(null);
      } catch (err) {
        console.warn('[GeoFishDB] Erro ao obter camada:', err);
        resolve(null);
      }
    });
  }

  static async salvarCamada(layerKey, dataJson, versaoStr = '1.0') {
    const db = await this.open();
    if (!db) return false;
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_LAYERS, 'readwrite');
        tx.objectStore(STORE_LAYERS).put({
          layerKey: layerKey,
          data: dataJson,
          versao: versaoStr,
          atualizado_em: new Date().toISOString()
        });

        // Resolve estritamente no commit final da transação
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
        tx.onabort = () => resolve(false);
      } catch (err) {
        console.warn('[GeoFishDB] Erro ao salvar camada:', err);
        resolve(false);
      }
    });
  }

  // ================= DIÁRIO DE PESCA =================

  static async salvarTrofeu(trofeuData) {
    const db = await this.open();
    if (!db) return false;
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_DIARIO, 'readwrite');
        tx.objectStore(STORE_DIARIO).put(trofeuData);

        // Resolve estritamente no commit final da transação
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
        tx.onabort = () => resolve(false);
      } catch (err) {
        console.warn('[GeoFishDB] Erro ao salvar troféu:', err);
        resolve(false);
      }
    });
  }

  static async obterTodosTrofeus() {
    const db = await this.open();
    if (!db) return [];
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_DIARIO, 'readonly');
        const req = tx.objectStore(STORE_DIARIO).getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => resolve([]);
      } catch (err) {
        console.warn('[GeoFishDB] Erro ao obter troféus:', err);
        resolve([]);
      }
    });
  }

  // ================= DENÚNCIAS OFFLINE =================

  static async salvarDenuncia(denunciaData) {
    const db = await this.open();
    if (!db) return false;
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_DENUNCIAS, 'readwrite');
        tx.objectStore(STORE_DENUNCIAS).put(denunciaData);

        // Resolve estritamente no commit final da transação
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
        tx.onabort = () => resolve(false);
      } catch (err) {
        console.warn('[GeoFishDB] Erro ao salvar denúncia:', err);
        resolve(false);
      }
    });
  }

  static async obterRegistrosPendentesDeSincronizacao(storeName) {
    const db = await this.open();
    if (!db) return [];
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const index = store.index('synced');
        const req = index.getAll(IDBKeyRange.only(0)); // 0 = false (pendente)
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => resolve([]);
      } catch (err) {
        console.warn('[GeoFishDB] Erro ao obter registros pendentes:', err);
        resolve([]);
      }
    });
  }

  static async marcarComoSincronizado(storeName, id) {
    const db = await this.open();
    if (!db) return false;
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const req = store.get(id);
        req.onsuccess = () => {
          if (req.result) {
            req.result.synced = 1; // 1 = sincronizado
            store.put(req.result);
          }
        };

        // Resolve no término da transação
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
        tx.onabort = () => resolve(false);
      } catch (err) {
        console.warn('[GeoFishDB] Erro ao marcar sincronizado:', err);
        resolve(false);
      }
    });
  }
}

// Expõe globalmente
if (typeof window !== 'undefined') {
  window.GeoFishDB = GeoFishDB;
}

export default GeoFishDB;
