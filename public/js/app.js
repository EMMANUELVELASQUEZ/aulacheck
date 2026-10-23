/**
 * AulaCheck — Frontend JavaScript
 * Universidad Veracruzana
 */

document.addEventListener('DOMContentLoaded', function () {

  // ─── Sidebar Toggle (Mobile) ──────────────────────────────
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  const toggleBtn = document.getElementById('sidebarToggleMobile');

  if (toggleBtn && sidebar) {
    toggleBtn.addEventListener('click', () => {
      sidebar.classList.toggle('show');
      overlay.classList.toggle('active');
    });
  }

  if (overlay) {
    overlay.addEventListener('click', () => {
      sidebar.classList.remove('show');
      overlay.classList.remove('active');
    });
  }

  // ─── Auto-hide Flash Messages ─────────────────────────────
  const alerts = document.querySelectorAll('.alert:not(.alert-permanent)');
  alerts.forEach(alert => {
    setTimeout(() => {
      const bsAlert = bootstrap.Alert.getOrCreateInstance(alert);
      if (bsAlert) {
        try { bsAlert.close(); } catch(e) {}
      }
    }, 5000);
  });

  // ─── Confirmation Dialogs ─────────────────────────────────
  document.querySelectorAll('[data-confirm]').forEach(el => {
    el.addEventListener('click', function (e) {
      if (!confirm(this.dataset.confirm)) {
        e.preventDefault();
      }
    });
  });

  // ─── Dynamic Equipment Loading (Incidencia form) ──────────
  const aulaSelect = document.getElementById('aula_id');
  const equipoSelect = document.getElementById('equipo_id');

  if (aulaSelect && equipoSelect) {
    aulaSelect.addEventListener('change', async function () {
      const aulaId = this.value;

      if (!aulaId) {
        equipoSelect.innerHTML = '<option value="">Selecciona primero el aula...</option>';
        equipoSelect.disabled = true;
        return;
      }

      try {
        equipoSelect.disabled = true;
        equipoSelect.innerHTML = '<option value="">Cargando equipos...</option>';

        const response = await fetch(`/api/equipos/${aulaId}`);
        if (!response.ok) throw new Error('Error de red');
        const equipos = await response.json();

        equipoSelect.innerHTML = '<option value="">— Sin equipo específico —</option>';
        equipos.forEach(eq => {
          const opt = document.createElement('option');
          opt.value = eq.id;
          const statusIcon = eq.estado === 'falla' ? ' ⚠️' : eq.estado === 'mantenimiento' ? ' 🔧' : '';
          opt.textContent = `${eq.nombre || eq.tipo} (${eq.tipo})${statusIcon}`;
          equipoSelect.appendChild(opt);
        });
        equipoSelect.disabled = false;
      } catch (err) {
        console.error('Error cargando equipos:', err);
        equipoSelect.innerHTML = '<option value="">Error al cargar equipos</option>';
        equipoSelect.disabled = false;
      }
    });

    // Auto-load if aula pre-selected
    if (aulaSelect.value) {
      aulaSelect.dispatchEvent(new Event('change'));
    }
  }

  // ─── Character Counters ───────────────────────────────────
  document.querySelectorAll('[data-char-count]').forEach(textarea => {
    const maxLen = parseInt(textarea.dataset.charCount) || 500;
    const counterId = textarea.dataset.counterTarget;
    const counter = counterId ? document.getElementById(counterId) : null;

    if (counter) {
      textarea.addEventListener('input', function () {
        const len = this.value.length;
        counter.textContent = len;
        counter.classList.toggle('text-danger', len > maxLen * 0.9);
      });
    }
  });

  // ─── Form Validation (Bootstrap) ─────────────────────────
  document.querySelectorAll('form.needs-validation').forEach(form => {
    form.addEventListener('submit', function (e) {
      if (!form.checkValidity()) {
        e.preventDefault();
        e.stopPropagation();
      }
      form.classList.add('was-validated');
    });
  });

  // ─── Password Visibility Toggle ───────────────────────────
  document.querySelectorAll('[data-toggle-password]').forEach(btn => {
    btn.addEventListener('click', function () {
      const targetId = this.dataset.togglePassword;
      const input = document.getElementById(targetId);
      const icon = this.querySelector('i');
      if (!input) return;

      if (input.type === 'password') {
        input.type = 'text';
        if (icon) icon.className = 'bi bi-eye-slash';
      } else {
        input.type = 'password';
        if (icon) icon.className = 'bi bi-eye';
      }
    });
  });

  // ─── Active Sidebar Link Highlighting ─────────────────────
  const currentPath = window.location.pathname;
  document.querySelectorAll('.sidebar-link').forEach(link => {
    const href = link.getAttribute('href');
    if (href && href !== '#' && currentPath.startsWith(href) && href !== '/') {
      link.classList.add('active');
    }
  });

  // ─── Tooltip Init ─────────────────────────────────────────
  const tooltipEls = document.querySelectorAll('[data-bs-toggle="tooltip"]');
  tooltipEls.forEach(el => new bootstrap.Tooltip(el));

  // ─── Stats Charts (if on stats page) ─────────────────────
  // Charts are initialized inline in estadisticas/index.ejs
  // because they need server-side data injected via EJS

});
