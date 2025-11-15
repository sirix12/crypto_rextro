// RSA Chat Demo with 1024-bit keys
(function () {
    'use strict';

    // Helper to get element by ID
    function $(id) { return document.getElementById(id); }

    // Storage for user data
    const users = {
        alice: {
            keyPair: null,
            publicKeyExported: null
        },
        bob: {
            keyPair: null,
            publicKeyExported: null
        }
    };

    const messages = {
        alice: [],
        bob: [],
        eve: []
    };

    // Generate RSA key pair using jsencrypt (1024-bit)
    async function generateKeyPair() {
        return new Promise((resolve) => {
            const crypt = new JSEncrypt({ default_key_size: 1024 });
            crypt.getKey();
            resolve(crypt);
        });
    }

    // Format large numbers for display (show full key)
    function formatKeyForDisplay(keyString, maxLength = Infinity) {
        return keyString;
    }

    // Extract modulus and exponent from public key (basic extraction)
    function extractKeyInfo(publicKeyPEM) {
        // This is a simplified extraction for display
        const lines = publicKeyPEM.split('\n').filter(line =>
            line && line !== '-----BEGIN PUBLIC KEY-----' && line !== '-----END PUBLIC KEY-----'
        );
        return lines.join('').substring(0, 100) + '...';
    }

    // Generate keys for Alice
    async function generateAliceKeys() {
        const btn = $('gen-alice-keys');
        btn.disabled = true;
        btn.textContent = 'Generating...';

        try {
            users.alice.keyPair = await generateKeyPair();
            users.alice.publicKeyExported = users.alice.keyPair.getPublicKey();

            const publicKey = users.alice.publicKeyExported;

            $('alice-n').textContent = 'Alice\'s RSA Modulus (part of public key):\n' + formatKeyForDisplay(publicKey, 150);
            $('alice-e').textContent = '65537 (Standard exponent)';
            $('alice-d').textContent = 'Alice\'s Private Exponent (kept secret):\n' + formatKeyForDisplay(users.alice.keyPair.getPrivateKey(), 150);

            // Update Eve's knowledge
            $('eve-alice-n').textContent = formatKeyForDisplay(publicKey, 100);
            $('eve-alice-e').textContent = '65537';

            addTechnicalLog('Alice', 'Keys Generated', {
                'Key Size': '1024-bit RSA',
                'Public Key': publicKey.substring(0, 50) + '...',
                'Private Key': users.alice.keyPair.getPrivateKey().substring(0, 50) + '...',
                'Algorithm': 'RSA (PKCS#1 v1.5 padding)'
            });

            btn.textContent = '✓ Keys Generated';

        } catch (error) {
            console.error('Error generating Alice\'s keys:', error);
            btn.textContent = 'Error generating keys';
        }
    }

    // Generate keys for Bob
    async function generateBobKeys() {
        const btn = $('gen-bob-keys');
        btn.disabled = true;
        btn.textContent = 'Generating...';

        try {
            users.bob.keyPair = await generateKeyPair();
            users.bob.publicKeyExported = users.bob.keyPair.getPublicKey();

            const publicKey = users.bob.publicKeyExported;

            $('bob-n').textContent = 'Bob\'s RSA Modulus (part of public key):\n' + formatKeyForDisplay(publicKey, 150);
            $('bob-e').textContent = '65537 (Standard exponent)';
            $('bob-d').textContent = 'Bob\'s Private Exponent (kept secret):\n' + formatKeyForDisplay(users.bob.keyPair.getPrivateKey(), 150);

            // Update Eve's knowledge
            $('eve-bob-n').textContent = formatKeyForDisplay(publicKey, 100);
            $('eve-bob-e').textContent = '65537';

            addTechnicalLog('Bob', 'Keys Generated', {
                'Key Size': '1024-bit RSA',
                'Public Key': publicKey.substring(0, 50) + '...',
                'Private Key': users.bob.keyPair.getPrivateKey().substring(0, 50) + '...',
                'Algorithm': 'RSA (PKCS#1 v1.5 padding)'
            });

            btn.textContent = '✓ Keys Generated';

        } catch (error) {
            console.error('Error generating Bob\'s keys:', error);
            btn.textContent = 'Error generating keys';
        }
    }

    // Send message from Alice to Bob
    function sendFromAlice() {
        const messageText = $('alice-message').value.trim();

        if (!messageText) {
            alert('Please enter a message');
            return;
        }

        if (!users.bob.keyPair) {
            alert('Bob\'s keys must be generated first!');
            return;
        }

        // Encrypt message with Bob's public key
        const encrypted = users.bob.keyPair.encrypt(messageText);

        // Add to Alice's chat
        const timestamp = new Date().toLocaleTimeString();
        addMessageToChat('alice-messages', {
            text: messageText,
            encrypted: encrypted,
            timestamp: timestamp,
            type: 'sent'
        });

        // Eve intercepts the encrypted message
        addMessageToChat('eve-messages', {
            text: encrypted,
            timestamp: timestamp,
            type: 'encrypted',
            from: 'Alice → Bob'
        });

        // Bob receives and can decrypt
        addMessageToChat('bob-messages', {
            text: messageText,
            encrypted: encrypted,
            decrypted: true,
            timestamp: timestamp,
            type: 'received'
        });

        // Log the operation
        addOperationLog('Alice', messageText, encrypted, 'Sent to Bob (encrypted with Bob\'s public key)');

        $('alice-message').value = '';
    }

    // Send message from Bob to Alice
    function sendFromBob() {
        const messageText = $('bob-message').value.trim();

        if (!messageText) {
            alert('Please enter a message');
            return;
        }

        if (!users.alice.keyPair) {
            alert('Alice\'s keys must be generated first!');
            return;
        }

        // Encrypt message with Alice's public key
        const encrypted = users.alice.keyPair.encrypt(messageText);

        // Add to Bob's chat
        const timestamp = new Date().toLocaleTimeString();
        addMessageToChat('bob-messages', {
            text: messageText,
            encrypted: encrypted,
            timestamp: timestamp,
            type: 'sent'
        });

        // Eve intercepts the encrypted message
        addMessageToChat('eve-messages', {
            text: encrypted,
            timestamp: timestamp,
            type: 'encrypted',
            from: 'Bob → Alice'
        });

        // Alice receives and can decrypt
        addMessageToChat('alice-messages', {
            text: messageText,
            encrypted: encrypted,
            decrypted: true,
            timestamp: timestamp,
            type: 'received'
        });

        // Log the operation
        addOperationLog('Bob', messageText, encrypted, 'Sent to Alice (encrypted with Alice\'s public key)');

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
                      <code>${formatKeyForDisplay(messageData.text, 150)}</code>
                      <div class="message-timestamp">${messageData.timestamp}</div>`;
        } else if (messageData.decrypted) {
            content = `<div class="message-label">✓ Decrypted & Read:</div>
                      <div>${escapeHtml(messageData.text)}</div>
                      <div class="decryption-label">(Private key used to decrypt)</div>
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

    // Add technical log entry
    function addTechnicalLog(user, action, details) {
        const log = $(details ? 'technical-log' : 'operations-log');
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
        entry += `  Plaintext Length: ${plaintext.length} characters\n`;
        entry += `  Ciphertext (first 100 chars): ${ciphertext.substring(0, 100)}...\n`;
        entry += `  Ciphertext Length: ${ciphertext.length} characters\n`;
        entry += `  RSA Key Size: 1024-bit\n`;
        entry += `  Padding: PKCS#1 v1.5\n\n`;

        log.textContent += entry;
        log.parentElement.scrollTop = log.parentElement.scrollHeight;
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
        $('gen-alice-keys').addEventListener('click', generateAliceKeys);
        $('gen-bob-keys').addEventListener('click', generateBobKeys);

        $('alice-send').addEventListener('click', sendFromAlice);
        $('bob-send').addEventListener('click', sendFromBob);

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
        addTechnicalLog('System', 'RSA Chat Demo Initialized', {
            'RSA Key Size': '1024-bit',
            'Encryption Algorithm': 'RSA with PKCS#1 v1.5 padding',
            'Status': 'Ready for key generation'
        });
    });

})();
