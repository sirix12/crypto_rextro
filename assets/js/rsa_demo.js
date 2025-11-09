// RSA demo (small primes)
(function () {
    'use strict';

    function $(id) { return document.getElementById(id); }

    // Calculate GCD using Euclidean algorithm
    function gcd(a, b) {
        while (b !== 0) {
            const temp = b;
            b = a % b;
            a = temp;
        }
        return a;
    }

    // Calculate modular multiplicative inverse using Extended Euclidean Algorithm
    function modInverse(e, phi) {
        let m0 = phi;
        let y = 0;
        let x = 1;

        if (phi === 1) return 0;

        while (e > 1) {
            const quotient = Math.floor(e / phi);
            let temp = phi;
            phi = e % phi;
            e = temp;
            temp = y;
            y = x - quotient * y;
            x = temp;
        }

        if (x < 0) x += m0;
        return x;
    }

    // Calculate modular exponentiation (same as in Diffie-Hellman demo)
    function modPow(base, exp, mod) {
        let result = 1n;
        let b = BigInt(base) % BigInt(mod);
        let e = BigInt(exp);
        let m = BigInt(mod);
        while (e > 0n) {
            if (e & 1n) result = (result * b) % m;
            b = (b * b) % m;
            e >>= 1n;
        }
        return result;
    }

    // Find possible values for e (coprime with phi)
    function findPossibleEs(phi) {
        const result = [];
        for (let e = 2; e < phi; e++) {
            if (gcd(e, phi) === 1) {
                result.push(e);
            }
            if (result.length >= 5) break; // Limit to first 5 valid values
        }
        return result;
    }

    function updateEOptions() {
        const p = Number($('p-select').value);
        const q = Number($('q-select').value);
        const phi = (p - 1) * (q - 1);
        const eSelect = $('e-select');

        // Clear existing options
        eSelect.innerHTML = '';

        // Add new options
        const possibleEs = findPossibleEs(phi);
        possibleEs.forEach(e => {
            const option = document.createElement('option');
            option.value = e;
            option.textContent = e;
            eSelect.appendChild(option);
        });

        // Select the first value by default
        if (possibleEs.length > 0) {
            eSelect.value = possibleEs[0];
        }
    }

    function updateAll() {
        const p = Number($('p-select').value);
        const q = Number($('q-select').value);
        const n = p * q;
        const phi = (p - 1) * (q - 1);
        const e = Number($('e-select').value) || 0;
        const m = Number($('message').value) || 0;

        $('n-value').textContent = n;
        $('phi-value').textContent = phi;

        if (e > 0) {
            const d = modInverse(e, phi);
            $('d-value').textContent = d;

            // Calculate encryption and decryption
            const encrypted = Number(modPow(m, e, n));
            const decrypted = Number(modPow(encrypted, d, n));

            $('encrypted-value').textContent = encrypted;
            $('decrypted-value').textContent = decrypted;

            // Update Eve's view
            $('eve-sees-n').textContent = n;
            $('eve-sees-e').textContent = e;
            $('eve-sees-c').textContent = encrypted;

            // Update steps
            const steps = [];
            steps.push(`Key Generation:`);
            steps.push(`1. Choose primes: p=${p}, q=${q}`);
            steps.push(`2. Calculate n = p × q = ${p} × ${q} = ${n}`);
            steps.push(`3. Calculate φ(n) = (p-1)(q-1) = (${p}-1)(${q}-1) = ${phi}`);
            steps.push(`4. Choose e (coprime with φ(n)): ${e}`);
            steps.push(`5. Calculate d (e⁻¹ mod φ(n)): ${d}`);
            steps.push(`\nEncryption:`);
            steps.push(`1. Message (M) = ${m}`);
            steps.push(`2. C = M^e mod n = ${m}^${e} mod ${n} = ${encrypted}`);
            steps.push(`\nDecryption:`);
            steps.push(`1. M = C^d mod n = ${encrypted}^${d} mod ${n} = ${decrypted}`);

            $('steps').textContent = steps.join('\n');
        }
    }

    function randomChoice(arr) {
        return arr[Math.floor(Math.random() * arr.length)];
    }

    document.addEventListener('DOMContentLoaded', function () {
        // Set initial message value if not set
        if (!$('message').value) {
            $('message').value = '4';
        }

        // Initialize event listeners
        ['p-select', 'q-select'].forEach(id => {
            $(id).addEventListener('change', () => {
                updateEOptions();
                updateAll();
            });
        });

        ['e-select', 'message'].forEach(id => {
            $(id).addEventListener('input', updateAll);
            $(id).addEventListener('change', updateAll);
        });

        $('random-primes').addEventListener('click', function () {
            const pSelect = $('p-select');
            const qSelect = $('q-select');

            // Ensure p and q are different
            let pIdx, qIdx;
            do {
                pIdx = Math.floor(Math.random() * pSelect.options.length);
                qIdx = Math.floor(Math.random() * qSelect.options.length);
            } while (pSelect.options[pIdx].value === qSelect.options[qIdx].value);

            pSelect.selectedIndex = pIdx;
            qSelect.selectedIndex = qIdx;

            updateEOptions();
            updateAll();
        });

        // Initial update
        updateEOptions();
        updateAll();
    });
})();
