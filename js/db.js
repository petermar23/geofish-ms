/**
 * GeoFish MS - Gerenciador de Armazenamento Local IndexedDB
 * Base de dados: GeoFishMS_DB
 * Tabela / Store: layers_cache (chave primária: layerKey)
 */
const DB_NAME = 'GeoFishMS_DB';
const DB_VERSION = 2;
const STORE_NAME = 'layers_cache';

class GeoFishDB {
  static _dbInstance = null;
  static _openPromise = null;

  /**
   * Abre e reaproveita uma conexão única com o IndexedDB (Singleton)
   */
  static open() {
    if (this._dbInstance) {
      return Promise.resolve(this._dbInstance);
    }
    if (this._openPromise) {
      return this._openPromise;
    }

    this._openPromise = new Promise((resolve, reject) => {
      if (!('indexedDB' in window)) {
        console.warn('IndexedDB não suportado neste navegador.');
        return resolve(null);
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'layerKey' });
        } else {
          // Atualiza dados na transação de migração
          try {
            const tx = event.currentTarget.transaction;
            const store = tx.objectStore(STORE_NAME);
            store.clear();
          } catch (e) {
            // Ignora se não for possível limpar
          }
        }
      };

      request.onsuccess = (event) => {
        this._dbInstance = event.target.result;
        this._dbInstance.onclose = () => {
          this._dbInstance = null;
          this._openPromise = null;
        };
        resolve(this._dbInstance);
      };

      request.onerror = (event) => {
        console.error('Erro ao abrir o IndexedDB:', event.target.error);
        this._openPromise = null;
        resolve(null); // Resolve como null para não travar a aplicação em modo estrito/privado
      };
    });

    return this._openPromise;
  }

  /**
   * Obtém uma camada armazenada localmente
   * @param {string} layerKey Identificador da camada (ex: 'trechos_pesca')
   * @returns {Promise<{data: any, versao: string, atualizado_em: string}|null>}
   */
  static async obterCamada(layerKey) {
    try {
      const db = await this.open();
      if (!db) return null;

      return new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(layerKey);

        req.onsuccess = () => {
          if (req.result && req.result.data) {
            resolve({
              data: req.result.data,
              versao: req.result.versao || '1.0',
              atualizado_em: req.result.atualizado_em || null
            });
          } else {
            resolve(null);
          }
        };

        req.onerror = () => {
          console.warn(`Erro ao ler camada ${layerKey} do IndexedDB.`);
          resolve(null);
        };
      });
    } catch (e) {
      console.warn(`Exceção ao obter camada ${layerKey}:`, e);
      return null;
    }
  }

  /**
   * Salva a camada apenas se o conteúdo tiver mudado ou se for nova gravação
   * @param {string} layerKey 
   * @param {any} geojsonData 
   * @param {string} versao 
   * @returns {Promise<boolean>}
   */
  static async salvarCamada(layerKey, geojsonData, versao = '1.0') {
    try {
      const db = await this.open();
      if (!db) return false;

      // Verifica se houve alteração real para evitar escritas desnecessárias
      const existente = await this.obterCamada(layerKey);
      if (existente && existente.data) {
        const novoJson = JSON.stringify(geojsonData);
        const antigoJson = JSON.stringify(existente.data);
        if (novoJson === antigoJson) {
          return true; // Dados inalterados, preserva data anterior
        }
      }

      return new Promise((resolve) => {
        try {
          const tx = db.transaction(STORE_NAME, 'readwrite');
          const store = tx.objectStore(STORE_NAME);
          const record = {
            layerKey: layerKey,
            data: geojsonData,
            versao: versao,
            atualizado_em: new Date().toISOString()
          };
          const req = store.put(record);

          req.onsuccess = () => resolve(true);
          req.onerror = (err) => {
            console.warn(`Erro de quota ou permissão ao gravar ${layerKey}:`, err);
            resolve(false);
          };
        } catch (innerErr) {
          console.warn(`Falha na transação do IndexedDB:`, innerErr);
          resolve(false);
        }
      });
    } catch (e) {
      console.warn(`Exceção ao salvar camada ${layerKey}:`, e);
      return false; // Não propaga erro: garante que o app continue funcionando na sessão
    }
  }

  /**
   * Retorna os metadados de todas as camadas gravadas (para o painel 'Sobre os dados')
   */
  static async obterTodasMeta() {
    try {
      const db = await this.open();
      if (!db) return {};

      return new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.getAll();

        req.onsuccess = () => {
          const map = {};
          if (Array.isArray(req.result)) {
            for (const item of req.result) {
              map[item.layerKey] = {
                versao: item.versao,
                atualizado_em: item.atualizado_em
              };
            }
          }
          resolve(map);
        };

        req.onerror = () => resolve({});
      });
    } catch (e) {
      return {};
    }
  }
}

// Disponibiliza globalmente
window.GeoFishDB = GeoFishDB;
