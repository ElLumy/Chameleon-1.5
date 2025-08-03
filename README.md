# Chameleon-1.5
NOT WORKING
BUG FIXES:
1. Background Service Worker:

Eliminé el uso de browsingData.remove con hostnames que causaba el error
Implementé una limpieza de cookies más robusta iterando por dominio
Agregué manejo de errores más específico
Mejoré la inicialización de sesión

2. Content Injector:

Cambié la estrategia de inyección para cargar todos los scripts de una vez
Eliminé la inyección secuencial que podía causar problemas de timing
Mejoré la comunicación entre contextos
Agregué mejor manejo de errores

3. Chameleon Main:

Agregué eventos personalizados para notificar el estado
Mejoré la comunicación con el contexto aislado
Agregué mejor logging para debugging

4. Manifest:

Eliminé el permiso webRequest que no se estaba usando

5. Popup UI:

Agregué estados de carga visual
Aumenté los reintentos y tiempos de espera
Mejoré el manejo de errores

6. Página de Debug (nueva):

Creé una página de debug para verificar el estado de la extensión
Permite ver en tiempo real si los módulos están cargados
Muestra el fingerprint actual
Permite regenerar la identidad

-----------------------------------------------------------------------------------------------------------------------------------

ERRORES CONOCIDOS:
- No se crea un perfil, por lo que no se usan los modulos (la mitigacion del fingerprint es imposible) CONSOLA:
// Update advanced info
                updateAdvancedInfo();
            } else {
                console.warn('[Chameleon Popup] No profile found');
                showNoProfile();
            }
- La pagina del debug no esta aplicada correctamente (No esta integrada con la extension, por la que no puede hacer debug):
Extension Error: Extension context not available

ERRORES DE CONSOLA:
ERROR: Refused to execute inline script because it violates the following Content Security Policy directive: "script-src 'self' 'wasm-unsafe-eval' 'inline-speculation-rules' http://localhost:* http://127.0.0.1:* chrome-extension://7e79d8df-8f0b-4820-94e7-f9c142c6dabd/". Either the 'unsafe-inline' keyword, a hash ('sha256-3WFQoj306OsP78EkU+l3TkHw4R0PNDQu0bPCFeqJbTE='), or a nonce ('nonce-...') is required to enable inline execution. CONSOLA:  
// Inyectar lo antes posible
      (document.head || document.documentElement).appendChild(script);
