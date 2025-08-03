// content/injector.js
// Este script se ejecuta en el contexto ISOLATED y actúa como puente
(async function() {
  'use strict';
  
  console.log('[Chameleon Injector] Starting initialization...');
  
  // Verificar que chrome.runtime esté disponible
  if (!chrome?.runtime?.id) {
    console.error('[Chameleon Injector] Extension context not available');
    return;
  }
  
  // Función para inyectar script en el contexto principal
  function injectScript(content, scriptId) {
    try {
      const script = document.createElement('script');
      script.id = scriptId || 'chameleon-injected-' + Date.now();
      script.textContent = content;
      
      // Inyectar lo antes posible
      (document.head || document.documentElement).appendChild(script);
      
      // Remover el script después de ejecutarlo
      script.remove();
      
      return true;
    } catch (error) {
      console.error(`[Chameleon Injector] Failed to inject script:`, error);
      return false;
    }
  }
  
  // Función para cargar archivo y obtener su contenido
  async function loadScriptContent(filename) {
    try {
      const url = chrome.runtime.getURL(filename);
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch ${filename}: ${response.status}`);
      }
      
      return await response.text();
    } catch (error) {
      console.error(`[Chameleon Injector] Failed to load ${filename}:`, error);
      return null;
    }
  }
  
  // Función principal de inyección
  async function injectChameleon() {
    try {
      console.log('[Chameleon Injector] Loading resources...');
      
      // 1. Obtener la semilla de sesión del background script
      let sessionSeed = null;
      try {
        const response = await chrome.runtime.sendMessage({ action: 'getSessionSeed' });
        if (response && response.seed) {
          sessionSeed = response.seed;
          console.log('[Chameleon Injector] Got session seed:', sessionSeed.substring(0, 8) + '...');
        }
      } catch (error) {
        console.error('[Chameleon Injector] Failed to get seed from background:', error);
      }
      
      // Si no hay seed, generar uno localmente
      if (!sessionSeed) {
        const array = new Uint8Array(32);
        crypto.getRandomValues(array);
        sessionSeed = Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
        console.warn('[Chameleon Injector] Using locally generated seed');
      }
      
      // 2. Cargar profiles.json
      const profilesData = await loadScriptContent('data/profiles.json');
      if (!profilesData) {
        throw new Error('Failed to load profiles data');
      }
      
      // 3. Cargar seedrandom
      const seedrandomContent = await loadScriptContent('lib/seedrandom.min.js');
      if (!seedrandomContent) {
        throw new Error('Failed to load seedrandom');
      }
      
      // 4. Cargar todos los módulos necesarios
      const modules = [
        'content/modules/utils/jitter.js',
        'content/modules/interceptors/meta-proxy.js',
        'content/modules/interceptors/navigator.js',
        'content/modules/interceptors/screen.js',
        'content/modules/interceptors/canvas.js',
        'content/modules/interceptors/webgl.js',
        'content/modules/interceptors/audio.js',
        'content/modules/interceptors/timezone.js',
        'content/chameleon-main.js'
      ];
      
      const moduleContents = {};
      for (const module of modules) {
        const content = await loadScriptContent(module);
        if (content) {
          moduleContents[module] = content;
        } else {
          console.warn(`[Chameleon Injector] Failed to load module: ${module}`);
        }
      }
      
      // 5. Crear script combinado que se inyectará
      const combinedScript = `
        (function() {
          'use strict';
          
          console.log('[Chameleon] Initializing in page context...');
          
          // 1. Inyectar seedrandom
          ${seedrandomContent}
          
          // 2. Establecer datos iniciales
          window.__chameleonInitData = {
            profilesData: ${profilesData},
            sessionSeed: ${JSON.stringify(sessionSeed)}
          };
          
          // 3. Inyectar módulos
          ${Object.values(moduleContents).join('\n\n')}
          
          console.log('[Chameleon] All modules loaded');
        })();
      `;
      
      // 6. Inyectar el script combinado
      console.log('[Chameleon Injector] Injecting combined script...');
      const injected = injectScript(combinedScript, 'chameleon-main-bundle');
      
      if (injected) {
        console.log('[Chameleon Injector] Successfully injected all scripts');
        
        // 7. Establecer comunicación con el contexto principal
        setupCommunicationBridge();
      } else {
        throw new Error('Failed to inject main script');
      }
      
    } catch (error) {
      console.error('[Chameleon Injector] Injection failed:', error);
    }
  }
  
  // Configurar puente de comunicación
  function setupCommunicationBridge() {
    console.log('[Chameleon Injector] Setting up communication bridge...');
    
    // Escuchar mensajes desde el contexto principal
    window.addEventListener('message', async (event) => {
      // Verificar que el mensaje sea de nuestra extensión
      if (event.source !== window || !event.data || event.data.source !== 'chameleon-main') {
        return;
      }
      
      console.log('[Chameleon Injector] Received message from page:', event.data.action);
      
      let response = null;
      
      try {
        switch (event.data.action) {
          case 'saveProfile':
            // Guardar el perfil en storage
            await chrome.storage.session.set({
              profile: event.data.data.profile,
              timestamp: Date.now()
            });
            response = { success: true };
            console.log('[Chameleon Injector] Profile saved to storage');
            break;
            
          case 'getSessionInfo':
            response = await chrome.runtime.sendMessage({ action: 'getSessionInfo' });
            break;
            
          case 'checkVPN':
            response = await chrome.runtime.sendMessage({ action: 'checkVPN' });
            break;
            
          default:
            response = { error: 'Unknown action' };
        }
      } catch (error) {
        console.error('[Chameleon Injector] Error handling message:', error);
        response = { error: error.message };
      }
      
      // Enviar respuesta de vuelta al contexto principal
      if (event.data.id) {
        window.postMessage({
          source: 'chameleon-isolated',
          id: event.data.id,
          action: event.data.action,
          data: response
        }, '*');
      }
    });
    
    console.log('[Chameleon Injector] Communication bridge established');
  }
  
  // Iniciar inyección cuando el documento esté listo
  if (document.readyState === 'loading') {
    // El documento aún se está cargando
    console.log('[Chameleon Injector] Waiting for document...');
    
    // Intentar inyectar lo antes posible
    injectChameleon();
    
    // También asegurar que se ejecute cuando el DOM esté listo
    document.addEventListener('DOMContentLoaded', () => {
      console.log('[Chameleon Injector] DOM ready, ensuring injection...');
    });
  } else {
    // El documento ya está cargado
    console.log('[Chameleon Injector] Document already loaded, injecting immediately...');
    injectChameleon();
  }
  
})();