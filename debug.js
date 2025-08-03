"use strict";

// Logging
function log(message, type = 'info') {
    const logsContainer = document.getElementById('logs');
    const entry = document.createElement('div');
    entry.className = `log-entry ${type}`;
    entry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
    logsContainer.appendChild(entry);
            logsContainer.scrollTop = logsContainer.scrollHeight;
            console.log(`[Debug Page] ${message}`);
        }
        
        // Clear logs
        function clearLogs() {
            document.getElementById('logs').innerHTML = '';
            log('Logs cleared', 'info');
        }
        
        // Check extension status
        async function checkExtensionStatus() {
            try {
                // Check if chrome.runtime is available
                if (!chrome?.runtime?.id) {
                    throw new Error('Extension context not available');
                }
                
                const statusEl = document.getElementById('extensionStatus');
                statusEl.innerHTML = `
                    <span class="status success">Extension Active</span>
                    <span>ID: ${chrome.runtime.id}</span>
                `;
                
                log('Extension is active', 'success');
                
                // Get session info
                await getSessionInfo();
                
            } catch (error) {
                const statusEl = document.getElementById('extensionStatus');
                statusEl.innerHTML = `<span class="status error">Extension Error: ${error.message}</span>`;
                log(`Extension error: ${error.message}`, 'error');
            }
        }
        
        // Get session info
        async function getSessionInfo() {
            try {
                log('Requesting session info...', 'info');
                
                const response = await chrome.runtime.sendMessage({ action: 'getSessionInfo' });
                
                const sessionEl = document.getElementById('sessionInfo');
                sessionEl.textContent = JSON.stringify(response, null, 2);
                
                if (response.profile) {
                    document.getElementById('profileInfo').textContent = JSON.stringify(response.profile, null, 2);
                    log('Session info received successfully', 'success');
                } else {
                    document.getElementById('profileInfo').textContent = 'No profile found';
                    log('No profile found in session', 'warning');
                }
                
            } catch (error) {
                document.getElementById('sessionInfo').textContent = `Error: ${error.message}`;
                log(`Failed to get session info: ${error.message}`, 'error');
            }
        }
        
        // Check page context
        function checkPageContext() {
            const statusEl = document.getElementById('pageContextStatus');
            const status = {
                hasChameleonState: !!window.__ChameleonState,
                chameleonInitialized: window.__chameleonMainInitialized || false,
                hasProfile: !!(window.__ChameleonState?.profile),
                interceptorsApplied: !!(window.__ChameleonState?.initialized),
                modules: window.__ChameleonState ? Object.keys(window.__ChameleonState.modules || {}) : []
            };
            
            statusEl.textContent = JSON.stringify(status, null, 2);
            
            if (status.hasChameleonState && status.interceptorsApplied) {
                log('Page context is properly initialized', 'success');
            } else {
                log('Page context not fully initialized', 'warning');
            }
        }
        
        // Test fingerprint
        function testFingerprint() {
            log('Testing fingerprint...', 'info');
            
            const fingerprintEl = document.getElementById('fingerprintTest');
            const fingerprint = {
                userAgent: navigator.userAgent,
                platform: navigator.platform,
                language: navigator.language,
                languages: navigator.languages,
                hardwareConcurrency: navigator.hardwareConcurrency,
                deviceMemory: navigator.deviceMemory,
                screenResolution: `${screen.width}x${screen.height}`,
                availScreenSize: `${screen.availWidth}x${screen.availHeight}`,
                colorDepth: screen.colorDepth,
                pixelDepth: screen.pixelDepth,
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                timezoneOffset: new Date().getTimezoneOffset(),
                plugins: Array.from(navigator.plugins).map(p => p.name),
                canvas: testCanvasFingerprint(),
                webgl: testWebGLFingerprint()
            };
            
            fingerprintEl.textContent = JSON.stringify(fingerprint, null, 2);
            log('Fingerprint test completed', 'success');
        }
        
        // Test canvas fingerprint
        function testCanvasFingerprint() {
            try {
                const canvas = document.createElement('canvas');
                canvas.width = 200;
                canvas.height = 50;
                const ctx = canvas.getContext('2d');
                
                ctx.textBaseline = 'alphabetic';
                ctx.fillStyle = '#f60';
                ctx.fillRect(125, 1, 62, 20);
                ctx.fillStyle = '#069';
                ctx.font = '11pt no-real-font-123';
                ctx.fillText('Cwm fjordbank glyphs vext quiz, 😃', 2, 15);
                ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
                ctx.font = '18pt Arial';
                ctx.fillText('Cwm fjordbank glyphs vext quiz, 😃', 4, 45);
                
                const dataURL = canvas.toDataURL();
                return dataURL.substring(0, 50) + '...';
            } catch (e) {
                return 'Error: ' + e.message;
            }
        }
        
        // Test WebGL fingerprint
        function testWebGLFingerprint() {
            try {
                const canvas = document.createElement('canvas');
                const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
                
                if (!gl) return 'WebGL not supported';
                
                const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
                
                return {
                    vendor: gl.getParameter(debugInfo ? debugInfo.UNMASKED_VENDOR_WEBGL : gl.VENDOR),
                    renderer: gl.getParameter(debugInfo ? debugInfo.UNMASKED_RENDERER_WEBGL : gl.RENDERER),
                    version: gl.getParameter(gl.VERSION)
                };
            } catch (e) {
                return 'Error: ' + e.message;
            }
        }
        
        // Refresh all status
        async function refreshStatus() {
            log('Refreshing status...', 'info');
            await checkExtensionStatus();
            checkPageContext();
            testFingerprint();
        }
        
        // Regenerate identity
        async function regenerateIdentity() {
            if (confirm('This will regenerate your browser identity and reload all tabs. Continue?')) {
                try {
                    log('Regenerating identity...', 'info');
                    const response = await chrome.runtime.sendMessage({ action: 'regenerateIdentity' });
                    
                    if (response.success) {
                        log('Identity regenerated successfully. Page will reload...', 'success');
                        setTimeout(() => location.reload(), 1000);
                    } else {
                        log(`Failed to regenerate identity: ${response.error}`, 'error');
                    }
                } catch (error) {
                    log(`Error regenerating identity: ${error.message}`, 'error');
                }
            }
        }
        
        // Listen for Chameleon events
        window.addEventListener('chameleonReady', (event) => {
            log(`Chameleon ready: ${JSON.stringify(event.detail)}`, 'success');
            checkPageContext();
        });
        
        window.addEventListener('chameleonError', (event) => {
            log(`Chameleon error: ${event.detail.error}`, 'error');
        });
        
        // Initialize
        document.addEventListener('DOMContentLoaded', () => {
            log('Debug page loaded', 'info');
            refreshStatus();
            
            // Auto-refresh every 5 seconds
            setInterval(() => {
                checkPageContext();
            }, 5000);
        });

