/**
 * GeoFish MS - Biblioteca e Catálogo Centralizado de Imagens Territoriais
 * Fonte: Acervos públicos com licenças abertas compatíveis (Wikimedia Commons / Creative Commons)
 *
 * Registro completo de atribuição, autoria, proveniência e regras de uso
 * conforme diretrizes editoriais do projeto GeoFish MS.
 */

export const geoFishImages = {
  hero: {
    rioMirandaPanorama: {
      src: 'images/hero/rio_miranda_panorama.jpg',
      alt: 'Paisagem panorâmica da calha do Rio Miranda no Pantanal sul-mato-grossense',
      title: 'Rio Miranda no Pantanal (MS)',
      localUso: 'Hero Principal da Home',
      autor: 'Katita Alves',
      fonte: 'Wikimedia Commons',
      urlOriginal: 'https://commons.wikimedia.org/wiki/File:MS_Pantanal_Rio_Miranda_-_MS.jpg',
      licenca: 'CC BY-SA 4.0'
    }
  },
  pesca: {
    barcoRioMiranda: {
      src: 'images/pesca/barco_rio_miranda.jpg',
      alt: 'Pescadores esportivos navegando em barco tradicional no Rio Miranda',
      title: 'Pesca Esportiva no Rio Miranda',
      localUso: 'Bloco Editorial: Onde Pescar',
      autor: 'Rezendevaleria',
      fonte: 'Wikimedia Commons',
      urlOriginal: 'https://commons.wikimedia.org/wiki/File:Barco_no_Rio_Miranda_-_Pantanal.jpg',
      licenca: 'CC BY-SA 4.0'
    }
  },
  navegacao: {
    passoLontraFoz: {
      src: 'images/navegacao/passo_lontra_foz.jpg',
      alt: 'Vista aérea da foz do Rio Vermelho no Rio Miranda no Passo do Lontra',
      title: 'Passo do Lontra & Confluência Náutica',
      localUso: 'Bloco Editorial: Náutica e Rampas',
      autor: 'Luiz Ricardo Bernhard',
      fonte: 'Wikimedia Commons',
      urlOriginal: 'https://commons.wikimedia.org/wiki/File:DJI_0170Barra_Rio_Vermelho.jpg',
      licenca: 'CC BY-SA 4.0'
    }
  },
  natureza: {
    rioSalobraCristalino: {
      src: 'images/natureza/rio_salobra_cristalino.jpg',
      alt: 'Águas cristalinas e cânions do Rio Salobra na Serra da Bodoquena',
      title: 'Santuário do Rio Salobra',
      localUso: 'Bloco Editorial: Santuários e Regras de Pesca',
      autor: 'Wilmar Carrilho',
      fonte: 'Wikimedia Commons',
      urlOriginal: 'https://commons.wikimedia.org/wiki/File:Cachoeira_no_Rio_Salobra_01.jpg',
      licenca: 'CC BY-SA 4.0'
    },
    araraAzulMiranda: {
      src: 'images/natureza/arara_azul_miranda.jpg',
      alt: 'Arara-azul nas matas ciliares do Rio Miranda',
      title: 'Fauna Ciliar: Arara-Azul',
      localUso: 'Seção: Conheça a Bacia do Rio Miranda',
      autor: 'Alessandra Marques da Silva Thompson',
      fonte: 'Wikimedia Commons',
      urlOriginal: 'https://commons.wikimedia.org/wiki/File:Arara_Azul_Rio_Miranda_01.jpg',
      licenca: 'CC BY-SA 4.0'
    }
  },
  rio: {
    estradaParqueMiranda: {
      src: 'images/rio/estrada_parque_miranda.jpg',
      alt: 'Rio Miranda cruzando a Estrada Parque Pantanal MS-184',
      title: 'Estrada Parque Pantanal',
      localUso: 'Bloco Editorial: Rotas e Apoio Náutico',
      autor: 'Kaliewhite',
      fonte: 'Wikimedia Commons',
      urlOriginal: 'https://commons.wikimedia.org/wiki/File:Rio_Miranda_Estrada-Parque.jpg',
      licenca: 'CC BY-SA 4.0'
    }
  },
  pantanal: {
    tuiuiuPantanal: {
      src: 'images/pantanal/tuiuiu_pantanal.jpg',
      alt: 'Tuiuiú, ave-símbolo do Pantanal em área alagada da bacia',
      title: 'Tuiuiú Pantaneiro',
      localUso: 'Seção: O Território e Histórias da Bacia',
      autor: 'Chuheng Xi',
      fonte: 'Wikimedia Commons',
      urlOriginal: 'https://commons.wikimedia.org/wiki/File:Tuiuiu_Pantanal.jpg',
      licenca: 'CC BY-SA 4.0'
    },
    pantanalCrepusculo: {
      src: 'images/pantanal/pantanal_crepusculo.jpg',
      alt: 'Pôr do sol espelhado sobre as águas pantaneiras da bacia',
      title: 'Crepúsculo Pantaneiro',
      localUso: 'Seção: Conheça a Bacia do Rio Miranda',
      autor: 'Alice Pache',
      fonte: 'Wikimedia Commons',
      urlOriginal: 'https://commons.wikimedia.org/wiki/File:Pantanal_Sunset.JPG',
      licenca: 'CC BY-SA 4.0'
    }
  },
  comunidade: {
    rioMirandaFloresta: {
      src: 'images/comunidade/rio_miranda_floresta.jpg',
      alt: 'Matas de galeria e margem habitada do Rio Miranda',
      title: 'Comunidades Ribeirinhas e Piloteiros',
      localUso: 'Seção: Histórias da Bacia & Comunidades Z-1 e Z-7',
      autor: 'Geoff Gallice',
      fonte: 'Wikimedia Commons / Flickr',
      urlOriginal: 'https://commons.wikimedia.org/wiki/File:Flickr_-_ggallice_-_Rio_Miranda.jpg',
      licenca: 'CC BY 2.0'
    }
  }
};

if (typeof window !== 'undefined') {
  window.geoFishImages = geoFishImages;
}
