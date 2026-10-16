(function () {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fine = window.matchMedia("(pointer: fine)").matches;
  const nav = document.getElementById("nav");
  const progress = document.getElementById("progress");
  const menu = document.getElementById("menu");
  const menuBtn = document.querySelector(".menu-btn");
  const toast = document.getElementById("toast");
  const hero = document.querySelector(".hero");
  const orb = document.getElementById("orb");
  const year = document.getElementById("year");

  if (year) year.textContent = String(new Date().getFullYear());

  const sections = [...document.querySelectorAll("main section[id]:not([data-spy-skip])")];

  function spy(scrollY) {
    const mark = scrollY + 120;
    let current = sections[0] ? sections[0].id : "top";
    sections.forEach((section) => {
      if (section.offsetTop <= mark) current = section.id;
    });
    document.querySelectorAll("[data-nav]").forEach((link) => {
      link.classList.toggle("is-active", link.getAttribute("href") === `#${current}`);
    });
  }

  let ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const y = window.scrollY;
      nav.classList.toggle("scrolled", y > 8);
      const height = document.documentElement.scrollHeight - window.innerHeight;
      progress.style.transform = `scaleX(${height > 0 ? y / height : 0})`;
      spy(y);
      ticking = false;
    });
  }

  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  function setMenu(open) {
    menu.hidden = !open;
    menuBtn.setAttribute("aria-expanded", String(open));
    menuBtn.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    document.body.classList.toggle("lock", open);
    nav.classList.toggle("is-open", open);
    if (open) {
      const first = menu.querySelector("a, button");
      if (first) first.focus();
    }
  }

  menuBtn.addEventListener("click", () => setMenu(menu.hidden));
  menu.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => setMenu(false));
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !menu.hidden) {
      setMenu(false);
      menuBtn.focus();
    }
  });

  window.matchMedia("(min-width: 900px)").addEventListener("change", (event) => {
    if (event.matches) setMenu(false);
  });

  let toastTimer = 0;
  function showToast(message) {
    toast.textContent = message;
    toast.classList.add("show");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toast.classList.remove("show"), 1800);
  }

  async function copyText(text) {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch (error) {
      /* Fall through to the selection copy. */
    }
    try {
      const area = document.createElement("textarea");
      area.value = text;
      area.setAttribute("readonly", "");
      area.style.cssText = "position:fixed;top:0;left:0;width:1px;height:1px;padding:0;border:0;outline:none;opacity:0;";
      document.body.appendChild(area);
      area.focus();
      area.select();
      area.setSelectionRange(0, text.length);
      const ok = document.execCommand("copy");
      area.remove();
      return ok;
    } catch (fallbackError) {
      return false;
    }
  }

  let caResetTimer = 0;
  document.addEventListener("click", (event) => {
    const trigger = event.target.closest("[data-copy], [data-copy-target]");
    if (!trigger || trigger.disabled) return;

    if (trigger.hasAttribute("data-copy-target")) {
      const node = document.querySelector(trigger.getAttribute("data-copy-target"));
      const value = node ? node.dataset.contract || node.textContent.trim() : "";
      if (!node || !value || value === "Copied") return;
      copyText(value).then((ok) => {
        if (!ok) {
          showToast("Couldn't copy");
          return;
        }
        node.dataset.contract = value;
        node.textContent = "Copied";
        trigger.textContent = "Copied";
        trigger.disabled = true;
        window.clearTimeout(caResetTimer);
        caResetTimer = window.setTimeout(() => {
          node.textContent = node.dataset.contract;
          trigger.textContent = "Copy";
          trigger.disabled = false;
        }, 3000);
      });
      return;
    }

    const value = trigger.getAttribute("data-copy");
    if (!value) {
      showToast("Nothing to copy yet");
      return;
    }
    copyText(value).then((ok) => {
      showToast(ok ? trigger.getAttribute("data-toast") || "Copied" : "Couldn't copy");
    });
  });

  if (!reduce) {
    const revealables = document.querySelectorAll(".reveal");
    if ("IntersectionObserver" in window) {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add("is-in");
            observer.unobserve(entry.target);
          });
        },
        { threshold: 0.16, rootMargin: "0px 0px -8% 0px" }
      );
      revealables.forEach((el) => observer.observe(el));
    } else {
      revealables.forEach((el) => el.classList.add("is-in"));
    }
  } else {
    document.querySelectorAll(".reveal").forEach((el) => el.classList.add("is-in"));
  }

  if (hero && !reduce) {
    hero.addEventListener("pointermove", (event) => {
      const rect = hero.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * 100;
      const y = ((event.clientY - rect.top) / rect.height) * 100;
      hero.style.setProperty("--mx", `${x}%`);
      hero.style.setProperty("--my", `${y}%`);
      if (fine && orb) {
        const dx = (event.clientX - rect.left) / rect.width - 0.5;
        const dy = (event.clientY - rect.top) / rect.height - 0.5;
        orb.style.transform = `translate3d(${dx * 18}px, ${dy * 12}px, 0)`;
      }
    });
    hero.addEventListener("pointerleave", () => {
      hero.style.setProperty("--mx", "72%");
      hero.style.setProperty("--my", "38%");
      if (orb) orb.style.transform = "translate3d(0, 0, 0)";
    });
  }

  const canvas = document.getElementById("bubbles");
  if (canvas && !reduce) {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let running = true;
    let active = false;
    let frame = 0;

    const bubbles = Array.from({ length: Math.max(12, Math.min(26, Math.floor(window.innerWidth / 56))) }, () => spawn(true));

    function spawn(anywhere) {
      return {
        x: Math.random(),
        y: anywhere ? Math.random() : 1.08,
        r: 5 + Math.random() * 18,
        speed: 0.00018 + Math.random() * 0.00045,
        drift: (Math.random() - 0.5) * 0.00025,
        alpha: 0.12 + Math.random() * 0.28,
        rgb: Math.random() > 0.72 ? "232,121,249" : "103,232,255"
      };
    }

    function resize() {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
    }

    function draw() {
      if (!running) {
        active = false;
        return;
      }
      active = true;
      frame = requestAnimationFrame(draw);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      bubbles.forEach((bubble) => {
        bubble.y -= bubble.speed;
        bubble.x += bubble.drift;
        if (bubble.y < -0.08 || bubble.x < -0.05 || bubble.x > 1.05) {
          Object.assign(bubble, spawn(false));
        }
        const x = bubble.x * canvas.width;
        const y = bubble.y * canvas.height;
        const radius = bubble.r * dpr;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${bubble.rgb},${bubble.alpha})`;
        ctx.lineWidth = Math.max(1, dpr);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(x - radius * 0.32, y - radius * 0.34, Math.max(1.2, radius * 0.18), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${bubble.alpha * 0.85})`;
        ctx.fill();
      });
    }

    resize();
    window.addEventListener("resize", resize);
    function sync() {
      if (running && !active) draw();
      if (!running) cancelAnimationFrame(frame);
    }

    document.addEventListener("visibilitychange", () => {
      running = !document.hidden && heroInView;
      sync();
    });

    let heroInView = true;
    if ("IntersectionObserver" in window) {
      const watcher = new IntersectionObserver(([entry]) => {
        heroInView = entry.isIntersecting;
        running = heroInView && !document.hidden;
        sync();
      });
      watcher.observe(hero);
    }
    sync();
  }
})();
