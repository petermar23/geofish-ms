/**
 * GeoFish MS - Serviço de Integração Firebase (v3.0 Architecture)
 * Suporte a Cloud Firestore com persistência offline nativa para áreas remotas do Pantanal.
 */

// 1. Configuração do Projeto Firebase
// Para conectar ao seu próprio projeto, substitua os valores abaixo pelas credenciais
// obtidas no Console do Firebase (https://console.firebase.google.com/) -> Configurações do Projeto
export const DEFAULT_FIREBASE_CONFIG = {
  apiKey: "SUA_API_KEY_AQUI",
  authDomain: "geofish-ms.firebaseapp.com",
  projectId: "geofish-ms",
  storageBucket: "geofish-ms.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef123456"
};

// Permite injetar via window ou localStorage para flexibilidade sem alterar código
function getActiveFirebaseConfig() {
  try {
    const salvo = localStorage.getItem('geofish_firebase_config');
    if (salvo) {
      const parsed = JSON.parse(salvo);
      if (parsed.apiKey && !parsed.apiKey.includes('SUA_API_KEY')) return parsed;
    }
  } catch (_) {}

  if (window.__FIREBASE_CONFIG__ && window.__FIREBASE_CONFIG__.apiKey) {
    return window.__FIREBASE_CONFIG__;
  }

  return DEFAULT_FIREBASE_CONFIG;
}

// Verifica se as credenciais configuradas são reais ou placeholder
export function isFirebaseConfigured(config = getActiveFirebaseConfig()) {
  return Boolean(
    config &&
    config.apiKey &&
    !config.apiKey.includes('SUA_API_KEY') &&
    config.projectId &&
    config.projectId !== 'geofish-ms-placeholder'
  );
}

class GeoFishFirebaseService {
  constructor() {
    this.app = null;
    this.db = null;
    this.isInitialized = false;
    this.config = getActiveFirebaseConfig();
    this.listeners = [];
  }

  /**
   * Inicializa o Firebase e o Firestore com Persistência Offline
   */
  async init() {
    if (this.isInitialized) return true;

    if (!isFirebaseConfigured(this.config)) {
      console.info(
        '%c[GeoFish MS - Firebase]%c Modo local ativo. Para ativar sincronização na nuvem em tempo real, insira suas credenciais do Firebase em js/firebase-service.js ou execute GeoFishFirebase.salvarConfig({ apiKey, ... })',
        'color: #0b4f6c; font-weight: bold; background: #e0f2fe; padding: 2px 6px; border-radius: 4px;',
        'color: #555;'
      );
      return false;
    }

    try {
      // Import dinâmico oficial do Firebase v10 via CDN gstatic com suporte a ES Modules
      const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.14.0/firebase-app.js');
      const {
        initializeFirestore,
        persistentLocalCache,
        persistentMultipleTabManager
      } = await import('https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js');

      this.app = initializeApp(this.config);

      // Ativação do cache offline multi-abas para o Pantanal (funciona sem sinal 4G)
      this.db = initializeFirestore(this.app, {
        localCache: persistentLocalCache({
          tabManager: persistentMultipleTabManager()
        })
      });

      this.isInitialized = true;
      console.log('✅ [GeoFish MS] Firebase Firestore inicializado com persistência offline ativa!');
      return true;
    } catch (err) {
      console.warn('⚠️ [GeoFish MS] Falha ao inicializar Firebase (possível falta de internet inicial):', err);
      return false;
    }
  }

  /**
   * Atualiza a configuração dinamicamente pelo console ou interface
   */
  salvarConfig(novaConfig) {
    if (!novaConfig || !novaConfig.apiKey) {
      throw new Error('Configuração inválida fornecida.');
    }
    localStorage.setItem('geofish_firebase_config', JSON.stringify(novaConfig));
    this.config = novaConfig;
    this.isInitialized = false;
    return this.init();
  }

  /**
   * Salva solicitação de anúncio comercial de Pousada / Rancho
   */
  async salvarSolicitacaoPousada(dados) {
    const payload = {
      tipo: 'pousada_rancho',
      nome: dados.nome || 'Não informado',
      rio: dados.rio || 'Rio Miranda',
      whatsapp: dados.whatsapp || '',
      rampa: dados.rampa || '',
      comodidades: dados.comodidades || [],
      status: 'pendente',
      criadoEm: new Date().toISOString(),
      origem: 'webgis_pwa_v2'
    };

    if (this.isInitialized && this.db) {
      try {
        const { collection, addDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js');
        const docRef = await addDoc(collection(this.db, 'solicitacoes_pousadas'), {
          ...payload,
          timestampServidor: serverTimestamp()
        });
        return { success: true, id: docRef.id, modo: 'nuvem' };
      } catch (err) {
        console.error('Erro ao gravar no Firestore, salvando em fila local:', err);
      }
    }

    // Fallback offline / local (salva na fila local do navegador)
    this._salvarFilaLocal('fila_pousadas', payload);
    return { success: true, modo: 'fila_local' };
  }

  /**
   * Salva cadastro gratuito de Piloteiro / Guia das Colônias Z-1 e Z-7
   */
  async salvarCadastroPiloteiro(dados) {
    const payload = {
      tipo: 'piloteiro_comunitario',
      nome: dados.nome || 'Não informado',
      apelido: dados.apelido || '',
      colonia: dados.colonia || 'Z-1',
      rgp: dados.rgp || '',
      porto: dados.porto || '',
      whatsapp: dados.whatsapp || '',
      diferenciais: dados.diferenciais || [],
      status: 'pendente_homologacao',
      gratuito: true,
      criadoEm: new Date().toISOString(),
      origem: 'webgis_pwa_v2'
    };

    if (this.isInitialized && this.db) {
      try {
        const { collection, addDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js');
        const docRef = await addDoc(collection(this.db, 'piloteiros_comunitarios'), {
          ...payload,
          timestampServidor: serverTimestamp()
        });
        return { success: true, id: docRef.id, modo: 'nuvem' };
      } catch (err) {
        console.error('Erro ao gravar no Firestore, salvando em fila local:', err);
      }
    }

    // Fallback offline / local
    this._salvarFilaLocal('fila_piloteiros', payload);
    return { success: true, modo: 'fila_local' };
  }

  /**
   * Escuta avisos urgentes e alertas da PMA em tempo real
   */
  async escutarAvisosPantanal(callback) {
    if (!this.isInitialized || !this.db) return () => {};

    try {
      const { collection, query, where, onSnapshot } = await import('https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js');
      const q = query(collection(this.db, 'avisos_pantanal'), where('ativo', '==', true));

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const avisos = [];
        snapshot.forEach((doc) => {
          avisos.push({ id: doc.id, ...doc.data() });
        });
        if (typeof callback === 'function') callback(avisos);
      }, (err) => {
        console.warn('Erro ao escutar avisos no Firestore:', err);
      });

      this.listeners.push(unsubscribe);
      return unsubscribe;
    } catch (_) {
      return () => {};
    }
  }

  /**
   * Salva na fila local do IndexedDB / localStorage para sincronizar depois
   */
  _salvarFilaLocal(chave, item) {
    try {
      const fila = JSON.parse(localStorage.getItem(chave) || '[]');
      fila.push(item);
      localStorage.setItem(chave, JSON.stringify(fila));
    } catch (_) {}
  }
}

// Instância única (Singleton)
export const GeoFishFirebase = new GeoFishFirebaseService();

// Exporta para o escopo global (window) para acesso fácil pelos scripts tradicionais (app.js)
if (typeof window !== 'undefined') {
  window.GeoFishFirebase = GeoFishFirebase;
  // Inicialização assíncrona não-bloqueante
  GeoFishFirebase.init().catch(() => {});
}
