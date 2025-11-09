// Layout JavaScript for Rextro Exhibition
// Features:
// - Mobile navigation toggle
// - Active link highlighting based on scroll/section
// - Sticky header that shrinks on scroll
// - Smooth scrolling for internal anchor links
// - Back-to-top button

(function () {
    'use strict';

    // Helper to select elements
    const $ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
    const one = (sel, ctx = document) => ctx.querySelector(sel);

    // Create mobile nav toggle if nav exists
    function setupMobileNav() {
        const nav = one('nav');
        if (!nav) return;

        // Create toggle button
        let btn = one('.mobile-nav-toggle');
        if (!btn) {
            btn = document.createElement('button');
            btn.className = 'mobile-nav-toggle';
            btn.setAttribute('aria-expanded', 'false');
            btn.setAttribute('aria-label', 'Toggle navigation');
            btn.innerHTML = '\u2630'; // simple hamburger
            nav.parentNode.insertBefore(btn, nav);
        }

        btn.addEventListener('click', () => {
            const opened = nav.classList.toggle('open');
            btn.setAttribute('aria-expanded', opened ? 'true' : 'false');
        });

        // Close nav when clicking outside (touch-friendly)
        document.addEventListener('click', (e) => {
            if (!nav.classList.contains('open')) return;
            if (e.target === nav || nav.contains(e.target) || e.target === btn) return;
            nav.classList.remove('open');
            btn.setAttribute('aria-expanded', 'false');
        });
    }

    // Sticky header behaviour
    function setupStickyHeader() {
        const header = one('header');
        if (!header) return;

        const shrinkClass = 'header--shrink';
        const threshold = 60;

        function onScroll() {
            if (window.scrollY > threshold) header.classList.add(shrinkClass);
            else header.classList.remove(shrinkClass);
        }

        onScroll();
        window.addEventListener('scroll', onScroll, { passive: true });
    }

    // Smooth scrolling for internal links
    function setupSmoothScroll() {
        document.addEventListener('click', (e) => {
            const a = e.target.closest('a[href^="#"]');
            if (!a) return;
            const href = a.getAttribute('href');
            if (href === '#' || href === '#!') return;
            const target = one(href);
            if (!target) return; // allow normal behaviour for anchors without targets

            e.preventDefault();
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });

            // Update URL hash without jumping
            history.pushState(null, '', href);
        });
    }

    // Back-to-top button
    function setupBackToTop() {
        let btn = one('.back-to-top');
        if (!btn) {
            btn = document.createElement('button');
            btn.className = 'back-to-top';
            btn.type = 'button';
            btn.title = 'Back to top';
            btn.innerHTML = '\u2191';
            document.body.appendChild(btn);
        }

        const showAt = 200;
        function onScroll() {
            if (window.scrollY > showAt) btn.classList.add('visible');
            else btn.classList.remove('visible');
        }

        btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

        onScroll();
        window.addEventListener('scroll', onScroll, { passive: true });
    }

    // Active nav link highlighting based on scroll position
    function setupActiveLinkHighlight() {
        const navLinks = $('nav a');
        if (!navLinks.length) return;

        // Map links to targets
        const pairs = navLinks
            .map((a) => ({ a, href: a.getAttribute('href') }))
            .filter((p) => p.href && p.href.startsWith('#'))
            .map((p) => ({ a: p.a, target: one(p.href) }))
            .filter((p) => p.target);

        if (!pairs.length) return;

        // Throttled scroll handler
        let ticking = false;
        function onScroll() {
            if (ticking) return;
            ticking = true;
            requestAnimationFrame(() => {
                const fromTop = window.scrollY + 80; // offset to account for header height
                let current = null;
                for (const p of pairs) {
                    const rect = p.target.getBoundingClientRect();
                    const top = window.scrollY + rect.top;
                    if (top <= fromTop) current = p;
                }

                navLinks.forEach((l) => l.classList.remove('active'));
                if (current) current.a.classList.add('active');
                ticking = false;
            });
        }

        onScroll();
        window.addEventListener('scroll', onScroll, { passive: true });
    }

    // Initialize all
    function init() {
        setupMobileNav();
        setupStickyHeader();
        setupSmoothScroll();
        setupBackToTop();
        setupActiveLinkHighlight();
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
