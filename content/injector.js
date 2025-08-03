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
  
  // Load an external script, bypassing page CSP restrictions
  function loadExternalScript(url) {
    return new Promise((resolve, reject) => {
      try {
        const script = document.createElement('script');
        script.src = url;
        script.onload = () => resolve(true);
        script.onerror = () => reject(new Error(`Failed to load script: ${url}`));
        (document.head || document.documentElement).appendChild(script);
      } catch (error) {
        reject(error);
      }
    });
  }

  // Load a text resource from the extension package
  async function loadTextResource(filename) {
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
      const profilesData = await loadTextResource('data/profiles.json');
      if (!profilesData) {
        throw new Error('Failed to load profiles data');
      }

      // 3. Insertar datos iniciales en el DOM para el contexto principal
      const initMeta = document.createElement('meta');
      initMeta.name = 'chameleon-init';
      initMeta.content = btoa(profilesData);
      initMeta.setAttribute('data-seed', sessionSeed);
      (document.head || document.documentElement).appendChild(initMeta);

      // 4. Cargar scripts necesarios en orden
      const scripts = [
        'lib/seedrandom.min.js',
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

      for (const file of scripts) {
        await loadExternalScript(chrome.runtime.getURL(file));
      }

      console.log('[Chameleon Injector] All scripts injected');

      // 5. Establecer comunicación con el contexto principal
      setupCommunicationBridge();
      
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