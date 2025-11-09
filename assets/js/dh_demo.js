// Diffie-Hellman demo (small primes)
(function () {
    'use strict';

    // safe modular exponentiation
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

    function $(id) { return document.getElementById(id); }

    function updateAll() {
        const p = Number($('p-select').value);
        const g = Number($('g-select').value);
        const a = Number($('a-priv').value) || 0;
        const b = Number($('b-priv').value) || 0;
        $('eve-sees-p').textContent = p;
        $('eve-sees-g').textContent = g;

        const A = Number(modPow(g, a, p));
        const B = Number(modPow(g, b, p));

        $('A-pub').textContent = A;
        $('B-pub').textContent = B;

        const sA = Number(modPow(B, a, p));
        const sB = Number(modPow(A, b, p));

        $('s-from-a').textContent = sA;
        $('s-from-b').textContent = sB;

        $('match-msg').textContent = sA === sB ? 'Shared secret matches ✓' : 'Mismatch ✗';

        // steps
        const steps = [];
        steps.push(`Given p=${p}, g=${g}`);
        steps.push(`Alice private a=${a}`);
        steps.push(`Compute A = g^a mod p = ${g}^${a} mod ${p} = ${A}`);
        steps.push(`Bob private b=${b}`);
        steps.push(`Compute B = g^b mod p = ${g}^${b} mod ${p} = ${B}`);
        steps.push(`Alice computes s = B^a mod p = ${B}^${a} mod ${p} = ${sA}`);
        steps.push(`Bob computes s = A^b mod p = ${A}^${b} mod ${p} = ${sB}`);

        $('steps').textContent = steps.join('\n');
    }

    function randomInt(max) {
        return Math.floor(Math.random() * (max - 2)) + 2;
    }

    document.addEventListener('DOMContentLoaded', function () {
        ['p-select', 'g-select', 'a-priv', 'b-priv'].forEach(id => $(id).addEventListener('change', updateAll));
        $('random-priv').addEventListener('click', function () {
            // choose small random private keys
            const p = Number($('p-select').value);
            $('a-priv').value = randomInt(p - 1);
            $('b-priv').value = randomInt(p - 1);
            updateAll();
        });

        updateAll();
    });
})();
