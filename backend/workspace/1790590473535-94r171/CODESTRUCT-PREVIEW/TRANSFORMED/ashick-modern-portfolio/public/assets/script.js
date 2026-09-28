import { codestructApiRequest1 } from "../../../src/api/api.js";
(() => {
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  window.addEventListener('load', () => {
    const loader = $('.preloader'),
      line = $('.loader-line i');
    if (window.anime) {
      anime({
        targets: line,
        width: '100%',
        duration: 900,
        easing: 'easeInOutQuad'
      });
      anime({
        targets: loader,
        opacity: 0,
        duration: 700,
        delay: 950,
        easing: 'easeInOutQuad',
        complete: () => loader.remove()
      });
    } else setTimeout(() => loader.remove(), 1300);
  });
  let scroll;
  if (window.LocomotiveScroll && window.innerWidth > 768) {
    scroll = new LocomotiveScroll({
      el: document.querySelector('[data-scroll-container]'),
      smooth: true,
      lerp: .14,
      multiplier: 1.05,
      tablet: {
        smooth: false
      },
      smartphone: {
        smooth: false
      },
      getDirection: true
    });
  }
  const navLinks = $$('.nav-link');
  const sections = $$('main section[id]');
  const setActive = id => navLinks.forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + id));
  let sectionOffsets = [];
  const cacheSectionOffsets = () => {
    sectionOffsets = sections.map(s => ({
      id: s.id,
      top: s.offsetTop
    }));
  };
  cacheSectionOffsets();
  let activeTick = false,
    lastScrollY = 0;
  const updateActive = y => {
    lastScrollY = y;
    if (activeTick) return;
    activeTick = true;
    requestAnimationFrame(() => {
      let current = 'home';
      for (const s of sectionOffsets) {
        if (y >= s.top - 180) current = s.id;else break;
      }
      setActive(current);
      activeTick = false;
    });
  };
  if (scroll) {
    scroll.on('scroll', args => updateActive(args.scroll.y));
  } else {
    window.addEventListener('scroll', () => updateActive(window.scrollY), {
      passive: true
    });
  }
  window.addEventListener('resize', cacheSectionOffsets, {
    passive: true
  });
  $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
    const target = $(a.getAttribute('href'));
    if (!target) return;
    e.preventDefault();
    if (scroll) scroll.scrollTo(target, {
      offset: -70,
      duration: 450,
      disableLerp: false
    });else target.scrollIntoView({
      behavior: 'smooth'
    });
    const nav = $('#mainNav');
    if (nav.classList.contains('show')) bootstrap.Collapse.getOrCreateInstance(nav).hide();
  }));
  if (window.anime) {
    anime({
      targets: '.hero-title',
      translateY: [40, 0],
      opacity: [0, 1],
      delay: 1100,
      duration: 1000,
      easing: 'easeOutExpo'
    });
    anime({
      targets: '.hero .reveal:not(.hero-title)',
      translateY: [25, 0],
      opacity: [0, 1],
      delay: anime.stagger(100, {
        start: 1250
      }),
      duration: 800,
      easing: 'easeOutQuad'
    });
  }
  const observer = new IntersectionObserver(entries => entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('is-visible');
      if (window.anime) anime({
        targets: entry.target,
        translateY: [35, 0],
        opacity: [0, 1],
        duration: 850,
        easing: 'easeOutExpo'
      });
      observer.unobserve(entry.target);
    }
  }), {
    threshold: .12
  });
  $$('.section-pad .reveal').forEach(el => observer.observe(el));
  const dot = $('.cursor-dot'),
    ring = $('.cursor-ring');
  let mx = innerWidth / 2,
    my = innerHeight / 2,
    rx = mx,
    ry = my,
    cursorFrame = 0;
  window.addEventListener('mousemove', e => {
    mx = e.clientX;
    my = e.clientY;
    if (dot) dot.style.transform = `translate3d(${mx}px,${my}px,0) translate(-50%,-50%)`;
  }, {
    passive: true
  });
  function cursorLoop() {
    rx += (mx - rx) * .18;
    ry += (my - ry) * .18;
    if (ring) ring.style.transform = `translate3d(${rx}px,${ry}px,0) translate(-50%,-50%)`;
    cursorFrame = requestAnimationFrame(cursorLoop);
  }
  if (dot && ring && !matchMedia('(pointer:coarse)').matches) cursorFrame = requestAnimationFrame(cursorLoop);
  $$('a,button,.tool,.project-card').forEach(el => {
    el.addEventListener('mouseenter', () => {
      if (ring) {
        ring.style.width = '52px';
        ring.style.height = '52px';
      }
    });
    el.addEventListener('mouseleave', () => {
      if (ring) {
        ring.style.width = '32px';
        ring.style.height = '32px';
      }
    });
  });
  $$('.magnetic').forEach(btn => {
    let raf = 0;
    btn.addEventListener('mousemove', e => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        const r = btn.getBoundingClientRect();
        btn.style.transform = `translate3d(${(e.clientX - r.left - r.width / 2) * .12}px,${(e.clientY - r.top - r.height / 2) * .12 - 3}px,0)`;
        raf = 0;
      });
    }, {
      passive: true
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.transform = '';
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    });
  });
  const form = $('#contactForm'),
    status = $('#formStatus');
  form?.addEventListener('submit', async e => {
    e.preventDefault();
    status.textContent = 'Sending...';
    status.className = '';
    const data = Object.fromEntries(new FormData(form));
    if (!data.name.trim() || !data.email.trim() || !data.message.trim()) {
      status.textContent = 'Please fill all fields.';
      status.className = 'error-msg';
      return;
    }
    try {
      const res = await codestructApiRequest1('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Request failed');
      status.textContent = json.message;
      status.className = 'success-msg';
      form.reset();
    } catch (err) {
      status.textContent = err.message || 'Could not send. If running static-only, start the Node server for MongoDB contact storage.';
      status.className = 'error-msg';
    }
  });
  const visual = $('.hero-visual');
  visual?.addEventListener('mousemove', e => {
    const r = visual.getBoundingClientRect(),
      x = (e.clientX - r.left) / r.width - .5,
      y = (e.clientY - r.top) / r.height - .5;
    const scene = $('.scene');
    if (scene) scene.style.transform = `translate(${x * 12}px,${y * 12}px)`;
  });
  visual?.addEventListener('mouseleave', () => {
    const scene = $('.scene');
    if (scene) scene.style.transform = '';
  });
})();