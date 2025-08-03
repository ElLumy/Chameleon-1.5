// content/injector.js
// Puente entre el contexto aislado y el de la página.
(async function () {
  'use strict';

  console.log('[Chameleon Injector] Starting initialization...');

  // Verificar que el contexto de la extensión esté disponible
  if (!chrome?.runtime?.id) {
    console.error('[Chameleon Injector] Extension context not available');
    return;
  }

  // Configurar el puente de comunicación inmediatamente
  setupCommunicationBridge();

  // Inyecta un archivo de script externo en el contexto principal
  function injectScriptFile(path) {
    return new Promise((resolve) => {
      try {
        const script = document.createElement('script');
        script.src = chrome.runtime.getURL(path);
        script.onload = () => {
          script.remove();
          resolve(true);
        };
        script.onerror = (e) => {
          console.error(`[Chameleon Injector] Failed to inject ${path}:`, e);
          script.remove();
          resolve(false);
        };
        (document.head || document.documentElement).appendChild(script);
      } catch (err) {
        console.error(`[Chameleon Injector] Error injecting ${path}:`, err);
        resolve(false);
      }
    });
  }

  // Inyecta todos los scripts necesarios de forma secuencial
  async function injectChameleon() {
    try {
      const resources = [
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

      for (const file of resources) {
        await injectScriptFile(file);
      }

      console.log('[Chameleon Injector] All scripts injected');
    } catch (error) {
      console.error('[Chameleon Injector] Injection failed:', error);
    }
  }

  // Iniciar la inyección lo antes posible
  if (document.readyState === 'loading') {
    injectChameleon();
  } else {
    injectChameleon();
  }

  // Puente de comunicación entre página y extensión
  function setupCommunicationBridge() {
    console.log('[Chameleon Injector] Setting up communication bridge...');

    window.addEventListener('message', async (event) => {
      if (event.source !== window || !event.data || event.data.source !== 'chameleon-main') {
        return;
      }

      console.log('[Chameleon Injector] Received message from page:', event.data.action);

      let response = null;
      try {
        switch (event.data.action) {
          case 'saveProfile':
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
})();

