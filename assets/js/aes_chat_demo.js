// AES Chat Demo with 256-bit symmetric encryption
(function () {
    'use strict';

    // AES Chat Demo: uses Web Crypto API (AES-256-GCM) for encryption and decryption
    // Helper to get element by ID
    function $(id) { return document.getElementById(id); }

    // Storage for shared key
    let sharedKey = null;
    let sharedKeyHex = null;

    const messages = {
        alice: [],
        bob: [],
        eve: []
    };

    // Helper: bytes <-> hex/base64 conversions
    function bytesToHex(bytes) {
        return Array.from(new Uint8Array(bytes)).map(b => b.toString(16).padStart(2, '0')).join('');
    }

    function hexToBytes(hex) {
        if (!hex) return new Uint8Array();
        const bytes = new Uint8Array(hex.length / 2);
        for (let i = 0; i < hex.length; i += 2) {
            bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
        }
        return bytes;
    }

    function bytesToBase64(buffer) {
        const bytes = new Uint8Array(buffer);
        let binary = '';
        const chunkSize = 0x8000;
        for (let i = 0; i < bytes.length; i += chunkSize) {
            binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
        }
        return window.btoa(binary);
    }

    function base64ToBytes(base64) {
        const binary = window.atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes;
    }

    // Generate random 256-bit key for AES-256 using Web Crypto
    function generateSharedKey() {
        // Generate 32 bytes (256 bits) of random data
        const randomBytes = new Uint8Array(32);
        window.crypto.getRandomValues(randomBytes);
        sharedKey = randomBytes; // Uint8Array
        sharedKeyHex = bytesToHex(sharedKey);
        return randomBytes;
    }

    // Encrypt message with AES-256-GCM using Web Crypto
    async function encryptMessage(plaintext, keyUint8) {
        try {
            // IV: 12 bytes for GCM
            const iv = new Uint8Array(12);
            window.crypto.getRandomValues(iv);

            const importedKey = await crypto.subtle.importKey(
                'raw',
                keyUint8,
                { name: 'AES-GCM' },
                false,
                ['encrypt', 'decrypt']
            );

            const encoder = new TextEncoder();
            const encoded = encoder.encode(plaintext);

            const encryptedBuffer = await crypto.subtle.encrypt(
                { name: 'AES-GCM', iv: iv, tagLength: 128 },
                importedKey,
                encoded
            );

            // Combine IV + ciphertext into one Uint8Array and return as base64
            const cipherArray = new Uint8Array(encryptedBuffer);
            const combined = new Uint8Array(iv.length + cipherArray.length);
            combined.set(iv, 0);
            combined.set(cipherArray, iv.length);

            return bytesToBase64(combined.buffer);
        } catch (error) {
            console.error('Encryption error:', error);
            return null;
        }
    }

    // Decrypt message with AES-256-GCM using Web Crypto
    async function decryptMessage(combinedBase64, keyUint8) {
        try {
            const combined = base64ToBytes(combinedBase64);
            if (combined.length < 13) return '[Decryption Failed]';

            const iv = combined.slice(0, 12);
            const ciphertext = combined.slice(12);

            const importedKey = await crypto.subtle.importKey(
                'raw',
                keyUint8,
                { name: 'AES-GCM' },
                false,
                ['encrypt', 'decrypt']
            );

            const decryptedBuffer = await crypto.subtle.decrypt(
                { name: 'AES-GCM', iv: iv, tagLength: 128 },
                importedKey,
                ciphertext
            );

            const decoder = new TextDecoder();
            return decoder.decode(decryptedBuffer);
        } catch (error) {
            console.error('Decryption error:', error);
            return '[Decryption Failed]';
        }
    }

    // Generate shared key
    function generateKey() {
        const btn = $('gen-shared-key');
        btn.disabled = true;
        btn.textContent = 'Generating...';

        try {
            const key = generateSharedKey();

            // Display key
            $('shared-key').textContent = 'Key (Hex): ' + sharedKeyHex.substring(0, 100) + '...\n\nFull Key:\n' + sharedKeyHex;
            $('key-format').textContent = 'Base64: ' + bytesToBase64(sharedKey.buffer);
            $('algorithm').textContent = 'AES-256-GCM (Web Crypto API – Galois/Counter Mode)\nKey Size: 256 bits (32 bytes)\nIV Size: 96 bits (12 bytes)';

            // Eve does NOT know the key
            $('eve-key').textContent = '❌ NOT KNOWN (Eve cannot decrypt)';

            addTechnicalLog('System', 'Shared Key Generated', {
                'Key Size': '256-bit AES',
                'Key Type': 'Symmetric (same key for encryption and decryption)',
                'Algorithm': 'AES-256-GCM (Web Crypto API)',
                'IV Size': '96-bit (Galois/Counter Mode)',
                'Status': 'Ready for messaging'
            });

            btn.textContent = '✓ Key Generated';
            btn.disabled = false;

            // Enable send buttons
            $('alice-send').disabled = false;
            $('bob-send').disabled = false;

        } catch (error) {
            console.error('Error generating key:', error);
            btn.textContent = 'Error generating key';
            btn.disabled = false;
        }
    }

    // Send message from Alice to Bob
    async function sendFromAlice() {
        const messageText = $('alice-message').value.trim();

        if (!messageText) {
            alert('Please enter a message');
            return;
        }

        if (!sharedKey) {
            alert('Shared key must be generated first!');
            return;
        }

        // Encrypt message
        const encrypted = await encryptMessage(messageText, sharedKey);
        if (!encrypted) {
            alert('Encryption failed. Check the console for errors.');
            return;
        }
        const timestamp = new Date().toLocaleTimeString();

        // Add to Alice's chat (shows plaintext)
        addMessageToChat('alice-messages', {
            text: messageText,
            encrypted: encrypted,
            timestamp: timestamp,
            type: 'sent',
            size: messageText.length
        });

        // Eve intercepts (sees ciphertext only)
        addMessageToChat('eve-messages', {
            text: encrypted,
            timestamp: timestamp,
            type: 'encrypted',
            from: 'Alice → Bob',
            size: base64ByteSize(encrypted)
        });

        // Bob receives and decrypts
        const decrypted = await decryptMessage(encrypted, sharedKey);
        addMessageToChat('bob-messages', {
            text: decrypted || '[Decryption Failed]',
            encrypted: encrypted,
            decrypted: true,
            timestamp: timestamp,
            type: 'received',
            size: messageText.length
        });

        // Update Eve's message size knowledge
        $('eve-size').textContent = base64ByteSize(encrypted) + ' bytes (encrypted)';

        // Log operation
        addOperationLog('Alice', messageText, encrypted, 'Sent to Bob (encrypted with shared key)');

        $('alice-message').value = '';
    }

    // Send message from Bob to Alice
    async function sendFromBob() {
        const messageText = $('bob-message').value.trim();

        if (!messageText) {
            alert('Please enter a message');
            return;
        }

        if (!sharedKey) {
            alert('Shared key must be generated first!');
            return;
        }

        // Encrypt message
        const encrypted = await encryptMessage(messageText, sharedKey);
        if (!encrypted) {
            alert('Encryption failed. Check the console for errors.');
            return;
        }
        const timestamp = new Date().toLocaleTimeString();

        // Add to Bob's chat (shows plaintext)
        addMessageToChat('bob-messages', {
            text: messageText,
            encrypted: encrypted,
            timestamp: timestamp,
            type: 'sent',
            size: messageText.length
        });

        // Eve intercepts (sees ciphertext only)
        addMessageToChat('eve-messages', {
            text: encrypted,
            timestamp: timestamp,
            type: 'encrypted',
            from: 'Bob → Alice',
            size: base64ByteSize(encrypted)
        });

        // Alice receives and decrypts
        const decrypted = await decryptMessage(encrypted, sharedKey);
        addMessageToChat('alice-messages', {
            text: decrypted || '[Decryption Failed]',
            encrypted: encrypted,
            decrypted: true,
            timestamp: timestamp,
            type: 'received',
            size: messageText.length
        });

        // Update Eve's message size knowledge
        $('eve-size').textContent = base64ByteSize(encrypted) + ' bytes (encrypted)';

        // Log operation
        addOperationLog('Bob', messageText, encrypted, 'Sent to Alice (encrypted with shared key)');

        $('bob-message').value = '';
    }

    // Add message to chat display
    function addMessageToChat(chatId, messageData) {
        const chatDiv = $(chatId);
        const messageEl = document.createElement('div');
        messageEl.className = 'message ' + messageData.type;

        let content = '';

        if (messageData.type === 'encrypted') {
            content = `<div class="message-label">🔓 Encrypted (Intercepted ${messageData.from}):</div>
                      <code>${messageData.text}</code>
                      <div class="message-size">Size: ${messageData.size} bytes</div>
                      <div class="message-timestamp">${messageData.timestamp}</div>`;
        } else if (messageData.decrypted) {
            content = `<div class="message-label">✓ Decrypted & Read:</div>
                      <div>${escapeHtml(messageData.text)}</div>
                      <div class="decryption-label">(Shared key used to decrypt)</div>
                      <div class="message-timestamp">${messageData.timestamp}</div>`;
        } else {
            content = `<div>${escapeHtml(messageData.text)}</div>
                      <div class="message-timestamp">${messageData.timestamp}</div>`;
        }

        messageEl.innerHTML = content;

        // Remove info message if exists
        const infoMsg = chatDiv.querySelector('.info-message');
        if (infoMsg) {
            infoMsg.remove();
        }

        chatDiv.appendChild(messageEl);
        chatDiv.scrollTop = chatDiv.scrollHeight;
    }

    // Escape HTML to prevent injection
    function escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }

    // Add technical log entry
    function addTechnicalLog(user, action, details) {
        const log = $('technical-log');
        const timestamp = new Date().toLocaleTimeString();

        let entry = `[${timestamp}] ${user} - ${action}\n`;

        if (details) {
            for (const [key, value] of Object.entries(details)) {
                entry += `  ${key}: ${value}\n`;
            }
        }
        entry += '\n';

        log.textContent += entry;
        log.parentElement.scrollTop = log.parentElement.scrollHeight;
    }

    // Add operation log entry
    function addOperationLog(user, plaintext, ciphertext, action) {
        const log = $('operations-log');
        const timestamp = new Date().toLocaleTimeString();

        let entry = `[${timestamp}] ${user} - ${action}\n`;
        entry += `  Plaintext: "${plaintext}"\n`;
        const encoder = new TextEncoder();
        const plaintextBytes = encoder.encode(plaintext).length;
        const ciphertextBytes = base64ByteSize(ciphertext);

        entry += `  Plaintext Length: ${plaintext.length} characters\n`;
        entry += `  Plaintext Size: ${plaintextBytes} bytes (UTF-8)\n`;
        entry += `  Ciphertext (first 100 chars): ${ciphertext.substring(0, 100)}...\n`;
        entry += `  Ciphertext Length: ${ciphertext.length} characters (base64)\n`;
        entry += `  Ciphertext Size: ${ciphertextBytes} bytes\n`;
        entry += `  Encryption: AES-256-GCM (Web Crypto API)\n`;
        entry += `  Algorithm: Web Crypto API (AES-GCM)\n\n`;

        log.textContent += entry;
        log.parentElement.scrollTop = log.parentElement.scrollHeight;
    }

    function base64ByteSize(base64) {
        if (!base64) return 0;
        let padding = 0;
        if (base64.endsWith('==')) padding = 2;
        else if (base64.endsWith('=')) padding = 1;
        return (base64.length * 3) / 4 - padding;
    }

    // Tab switching
    function setupTabs() {
        const tabBtns = document.querySelectorAll('.tab-btn');
        const tabContents = document.querySelectorAll('.tab-content');

        tabBtns.forEach(btn => {
            btn.addEventListener('click', function () {
                const tabName = this.getAttribute('data-tab');

                // Deactivate all tabs
                tabBtns.forEach(b => b.classList.remove('active'));
                tabContents.forEach(c => c.classList.remove('active'));

                // Activate selected tab
                this.classList.add('active');
                $(tabName).classList.add('active');
            });
        });
    }

    // Initialize
    document.addEventListener('DOMContentLoaded', function () {
        // Set up event listeners
        $('gen-shared-key').addEventListener('click', generateKey);

        $('alice-send').addEventListener('click', sendFromAlice);
        $('bob-send').addEventListener('click', sendFromBob);

        // Disable send buttons initially
        $('alice-send').disabled = true;
        $('bob-send').disabled = true;

        // Allow Enter key for sending messages
        $('alice-message').addEventListener('keypress', function (e) {
            if (e.key === 'Enter' && e.ctrlKey) {
                sendFromAlice();
            }
        });

        $('bob-message').addEventListener('keypress', function (e) {
            if (e.key === 'Enter' && e.ctrlKey) {
                sendFromBob();
            }
        });

        // Setup tabs
        setupTabs();

        // Add initial log entry
        addTechnicalLog('System', 'AES Chat Demo Initialized', {
            'Encryption Algorithm': 'AES-256-GCM (Web Crypto API)',
            'Key Size': '256-bit',
            'Algorithm Type': 'Symmetric (same key for encryption and decryption)',
            'Status': 'Ready to generate shared key'
        });
    });

})();
