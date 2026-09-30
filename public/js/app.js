// ============================================================
// JUAN & NATHY • HORARIO Y TODO - APPLICATION LOGIC (ENHANCED)
// ============================================================

let appState = null;
let timeDistChart = null;
let expCatChart = null;
let currentVaultFilter = 'ALL';
let activeUser = 'juan'; // 'juan' or 'nathy'
let selectedLoginUser = 'juan';

// Enhanced UI & Feature State
let matrixViewMode = 'timeline'; // 'timeline' or 'heatmap'
let selectedTimelineDay = 'TODAY'; // 'TODAY', 'Lunes', etc.
let activeBrushJuan = 'Libre';
let activeBrushNathy = 'Libre';
let currentCurrencyView = 'USD'; // 'USD' or 'PEN'
let currentExpenseCategoryFilter = 'ALL';
let currentExpenseStatusFilter = 'ALL';
let currentChecklistStatus = 'ALL';
let currentChecklistResp = 'ALL';
let currentDateViewMode = 'cards'; // 'cards' or 'table'
let autoSaveTimer = null;
let targetCopyPerson = 'juan';
let companionInterval = null;

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  // Theme initialization
  const savedTheme = localStorage.getItem('couple_active_theme');
  if (savedTheme) {
    document.documentElement.setAttribute('data-theme', savedTheme);
  }

  fetchAppData();
  startLiveCountdown();

  // Save button listener
  document.getElementById('btnSaveAll')?.addEventListener('click', () => saveAppData(false));

  // Start live clock & companion tracker (runs every second)
  startLiveCompanionTracker();
});

// ------------------------------------------------------------
// AUTHENTICATION & LOGIN SYSTEM (JUAN & NATHY)
// ------------------------------------------------------------

function checkSession() {
  const auth = localStorage.getItem('couple_auth');
  const overlay = document.getElementById('loginOverlay');

  if (auth) {
    try {
      const user = JSON.parse(auth);
      if (user && (user.id === 'juan' || user.id === 'nathy')) {
        activeUser = user.id;
        overlay.classList.add('d-none');
        renderAllModules();
        return;
      }
    } catch (e) {
      localStorage.removeItem('couple_auth');
    }
  }

  // Not logged in -> Show login overlay
  overlay.classList.remove('d-none');
  selectLoginProfile('juan');
}

function selectLoginProfile(userId) {
  selectedLoginUser = userId;

  const cardJuan = document.getElementById('loginCardJuan');
  const cardNathy = document.getElementById('loginCardNathy');

  if (userId === 'juan') {
    cardJuan.classList.add('selected');
    cardJuan.querySelector('.badge').classList.remove('d-none');
    cardNathy.classList.remove('selected');
    cardNathy.querySelector('.badge').classList.add('d-none');
  } else {
    cardNathy.classList.add('selected');
    cardNathy.querySelector('.badge').classList.remove('d-none');
    cardJuan.classList.remove('selected');
    cardJuan.querySelector('.badge').classList.add('d-none');
  }

  const pinInput = document.getElementById('loginPinInput');
  pinInput.value = '';
  document.getElementById('loginErrorMessage').classList.add('d-none');
  setTimeout(() => pinInput.focus(), 150);
}

async function performLogin() {
  const pinInput = document.getElementById('loginPinInput');
  const pin = pinInput.value.trim();
  const errorEl = document.getElementById('loginErrorMessage');

  if (!pin) {
    errorEl.textContent = 'Por favor ingresa tu PIN de acceso.';
    errorEl.classList.remove('d-none');
    pinInput.focus();
    return;
  }

  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: selectedLoginUser, pin })
    });
    const result = await res.json();

    if (result.success) {
      activeUser = selectedLoginUser;
      localStorage.setItem('couple_auth', JSON.stringify(result.user));
      document.getElementById('loginOverlay').classList.add('d-none');
      errorEl.classList.add('d-none');
      pinInput.value = '';

      triggerCelebration();
      renderAllModules();
      showToast(`¡Bienvenid@, ${result.user.name}! 💖`, 'success');
    } else {
      errorEl.textContent = result.message || 'PIN incorrecto.';
      errorEl.classList.remove('d-none');
      pinInput.value = '';
      pinInput.focus();
    }
  } catch (err) {
    errorEl.textContent = 'Error al verificar PIN con el servidor.';
    errorEl.classList.remove('d-none');
  }
}

function promptSwitchUser(targetUserId) {
  if (targetUserId === activeUser) return;
  selectLoginProfile(targetUserId);
  document.getElementById('loginOverlay').classList.remove('d-none');
}

function logoutUser() {
  localStorage.removeItem('couple_auth');
  document.getElementById('loginOverlay').classList.remove('d-none');
  selectLoginProfile(activeUser);
  showToast('Has cerrado sesión', 'info');
}

async function performChangePin() {
  const currPin = document.getElementById('currPinInput').value.trim();
  const newPin = document.getElementById('newPinInput').value.trim();
  const confirmPin = document.getElementById('confirmNewPinInput').value.trim();
  const feedback = document.getElementById('changePinFeedback');

  if (!currPin || !newPin || !confirmPin) {
    feedback.textContent = 'Completa todos los campos.';
    feedback.classList.remove('d-none');
    return;
  }

  if (newPin !== confirmPin) {
    feedback.textContent = 'El nuevo PIN y su confirmación no coinciden.';
    feedback.classList.remove('d-none');
    return;
  }

  if (newPin.length < 4) {
    feedback.textContent = 'El PIN debe tener al menos 4 dígitos.';
    feedback.classList.remove('d-none');
    return;
  }

  try {
    const res = await fetch('/api/change-pin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: activeUser, currentPin: currPin, newPin })
    });
    const result = await res.json();

    if (result.success) {
      feedback.classList.add('d-none');
      bootstrap.Modal.getInstance(document.getElementById('changePinModal')).hide();
      document.getElementById('currPinInput').value = '';
      document.getElementById('newPinInput').value = '';
      document.getElementById('confirmNewPinInput').value = '';
      showToast('🔒 ¡Tu PIN ha sido actualizado con éxito!', 'success');
    } else {
      feedback.textContent = result.message || 'Error al cambiar PIN.';
      feedback.classList.remove('d-none');
    }
  } catch (err) {
    feedback.textContent = 'Error de conexión con el servidor.';
    feedback.classList.remove('d-none');
  }
}

// ------------------------------------------------------------
// API COMMUNICATION & AUTO-SAVE ENGINE
// ------------------------------------------------------------

async function fetchAppData() {
  try {
    const res = await fetch('/api/data');
    const result = await res.json();
    if (result.success) {
      appState = result.data;

      // Apply theme from state if no local override
      if (appState.currentTheme && !localStorage.getItem('couple_active_theme')) {
        applyTheme(appState.currentTheme);
      } else if (localStorage.getItem('couple_active_theme')) {
        applyTheme(localStorage.getItem('couple_active_theme'));
      }

      checkSession();
    }
  } catch (err) {
    console.error('Error cargando datos de la API:', err);
    showToast('Error cargando datos del servidor', 'danger');
  }
}

function triggerAutoSave() {
  const badge = document.getElementById('navSyncBadge');
  const dot = document.getElementById('syncDot');
  const text = document.getElementById('syncText');

  if (badge) {
    badge.className = 'sync-status-badge saving d-none d-sm-inline-flex me-1 shadow-sm';
    if (dot) dot.className = 'sync-dot saving';
    if (text) text.textContent = 'Guardando...';
  }

  clearTimeout(autoSaveTimer);
  autoSaveTimer = setTimeout(() => {
    saveAppData(true);
  }, 1200);
}

async function saveAppData(isAutoSave = false) {
  if (!appState) return;
  const saveBtn = document.getElementById('btnSaveAll');
  const originalHtml = saveBtn ? saveBtn.innerHTML : '';
  if (saveBtn && !isAutoSave) {
    saveBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span> Guardando...`;
    saveBtn.disabled = true;
  }

  try {
    const res = await fetch('/api/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(appState)
    });
    const result = await res.json();

    const badge = document.getElementById('navSyncBadge');
    const dot = document.getElementById('syncDot');
    const text = document.getElementById('syncText');

    if (result.success) {
      if (badge) {
        badge.className = 'sync-status-badge saved d-none d-sm-inline-flex me-1 shadow-sm';
        if (dot) dot.className = 'sync-dot';
        if (text) text.textContent = 'Sincronizado';
      }
      if (!isAutoSave) {
        showToast('✨ ¡Todos los cambios han sido guardados con éxito!', 'success');
      }
    } else {
      if (badge && text) text.textContent = 'Error al guardar';
      showToast('Error guardando: ' + result.message, 'danger');
    }
  } catch (err) {
    showToast('Error de conexión al guardar', 'danger');
  } finally {
    if (saveBtn && !isAutoSave) {
      saveBtn.innerHTML = originalHtml;
      saveBtn.disabled = false;
    }
  }
}

function resetToDefaults() {
  showAppConfirm(
    'Restablecer a valores iniciales',
    '¿Estás seguro de restablecer todos los datos a los valores originales de fábrica? Se perderán las modificaciones no respaldadas.',
    async () => {
      try {
        const res = await fetch('/api/reset', { method: 'POST' });
        const result = await res.json();
        if (result.success) {
          appState = result.data;
          renderAllModules();
          bootstrap.Modal.getInstance(document.getElementById('configModal'))?.hide();
          showToast('Datos restablecidos a los valores por defecto', 'info');
        }
      } catch (err) {
        showToast('Error al restablecer datos', 'danger');
      }
    },
    '⚠️'
  );
}

// ------------------------------------------------------------
// RENDER ALL MODULES
// ------------------------------------------------------------

function renderAllModules() {
  if (!appState) return;
  renderUserInterface();
  renderRelationshipStrip();
  renderDynamicCategories();
  renderBrushToolbars();
  renderKPIs();
  render24hMatrix();
  renderIndividualSchedule('juan');
  renderIndividualSchedule('nathy');
  renderRulesLegend();
  renderFinances();
  renderChecklist();
  renderVisionBoardCards();
  renderDatesAgenda();
  renderVault();
  renderLoveNotes();
  renderConfigModal();
  updateMonthlySummaryModal();
  updateLiveCompanion();
}

// ------------------------------------------------------------
// LIVE COMPANION & REALTIME OVERLAP TRACKER
// ------------------------------------------------------------

function startLiveCompanionTracker() {
  if (companionInterval) clearInterval(companionInterval);
  updateLiveCompanion();
  companionInterval = setInterval(updateLiveCompanion, 1000);
}

function getTodaySpanishName() {
  const dayMap = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  return dayMap[new Date().getDay()];
}

// ============================================================
// DYNAMIC CATEGORY & COLOR UTILITIES
// ============================================================

function hexToRgb(hex) {
  if (!hex) return { r: 100, g: 116, b: 139 };
  let cleanHex = hex.replace('#', '').trim();
  if (cleanHex.length === 3) {
    cleanHex = cleanHex.split('').map(ch => ch + ch).join('');
  }
  const num = parseInt(cleanHex, 16);
  if (isNaN(num)) return { r: 100, g: 116, b: 139 };
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255
  };
}

function hexToRgba(hex, alpha = 0.2) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function getCategoryObj(actName) {
  if (!actName || !appState || !appState.config || !appState.config.categories) return null;
  const trimmed = actName.trim().toLowerCase();
  return appState.config.categories.find(c => {
    const cName = c.name.toLowerCase();
    return cName === trimmed ||
           c.id === trimmed ||
           trimmed.includes(cName) ||
           cName.includes(trimmed);
  }) || null;
}

function isCategoryCoupleTime(actName) {
  if (!actName) return false;
  const cat = getCategoryObj(actName);
  if (cat && typeof cat.isCoupleTime === 'boolean') {
    return cat.isCoupleTime;
  }
  const lower = actName.toLowerCase();
  return lower.includes('cita') || lower.includes('llamada');
}

function getCategoryColors(cat) {
  if (!cat || !cat.color) {
    return {
      bg: '#f1f5f9',
      border: '#cbd5e1',
      text: '#334155',
      accent: '#64748b'
    };
  }
  const { r, g, b } = hexToRgb(cat.color);
  const isDarkTheme = document.documentElement.getAttribute('data-theme') === 'dark';

  if (isDarkTheme) {
    return {
      bg: `rgba(${r}, ${g}, ${b}, 0.28)`,
      border: `rgba(${r}, ${g}, ${b}, 0.65)`,
      text: '#f8fafc',
      accent: cat.color
    };
  } else {
    // Richer, high-contrast dark text for light pastel background
    const darkR = Math.max(0, Math.floor(r * 0.45));
    const darkG = Math.max(0, Math.floor(g * 0.45));
    const darkB = Math.max(0, Math.floor(b * 0.45));
    return {
      bg: `rgba(${r}, ${g}, ${b}, 0.18)`,
      border: `rgba(${r}, ${g}, ${b}, 0.45)`,
      text: `rgb(${darkR}, ${darkG}, ${darkB})`,
      accent: cat.color
    };
  }
}

function getCategoryCellStyle(actName) {
  const cat = getCategoryObj(actName);
  if (!cat) return '';
  const colors = getCategoryColors(cat);
  const isCouple = isCategoryCoupleTime(actName);

  let style = `background-color: ${colors.bg} !important; border: 1px solid ${colors.border} !important; border-left: 4px solid ${colors.accent} !important; color: ${colors.text} !important;`;
  if (isCouple) {
    style += ` box-shadow: inset 0 0 0 1px ${colors.accent} !important; font-weight: 700 !important;`;
  }
  return style;
}

function updateLiveCompanion() {
  if (!appState || !appState.schedules) return;

  const now = new Date();
  const dayName = getTodaySpanishName();
  const curHour = now.getHours();
  const curHourStr = `${String(curHour).padStart(2, '0')}:00`;
  const timeFormatted = now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

  // Update clock display
  const clockEl = document.getElementById('liveClockDisplay');
  if (clockEl) {
    clockEl.textContent = `${dayName} • ${timeFormatted}`;
  }

  // Current activity for Juan & Nathy
  const juanNow = appState.schedules.juan?.[dayName]?.[curHourStr] || 'Libre';
  const nathyNow = appState.schedules.nathy?.[dayName]?.[curHourStr] || 'Libre';

  const juanActBadge = document.getElementById('liveJuanNowAct');
  const nathyActBadge = document.getElementById('liveNathyNowAct');

  if (juanActBadge) {
    juanActBadge.textContent = formatShortActivity(juanNow);
    const catJ = getCategoryObj(juanNow);
    if (catJ) {
      juanActBadge.style.cssText = getCategoryCellStyle(juanNow) + ' border-radius: 9999px !important; padding: 4px 12px;';
    }
  }
  if (nathyActBadge) {
    nathyActBadge.textContent = formatShortActivity(nathyNow);
    const catN = getCategoryObj(nathyNow);
    if (catN) {
      nathyActBadge.style.cssText = getCategoryCellStyle(nathyNow) + ' border-radius: 9999px !important; padding: 4px 12px;';
    }
  }

  // Compute live overlap status & next connection today
  const summaryEl = document.getElementById('liveOverlapSummary');
  if (!summaryEl) return;

  const jCouple = isCategoryCoupleTime(juanNow);
  const nCouple = isCategoryCoupleTime(nathyNow);

  if (jCouple && nCouple) {
    summaryEl.innerHTML = `<span class="text-danger fw-bold">💖 ¡Momento Sagrado! Están en Tiempo de Pareja / Cita juntos ahora mismo.</span>`;
    return;
  }
  if (jCouple && nathyNow === 'Libre') {
    summaryEl.innerHTML = `<span class="text-danger fw-bold">💖 ¡Tiempo de Pareja disponible! Nathy está libre ahora mismo.</span>`;
    return;
  }
  if (nCouple && juanNow === 'Libre') {
    summaryEl.innerHTML = `<span class="text-danger fw-bold">💖 ¡Tiempo de Pareja disponible! Juan está libre ahora mismo.</span>`;
    return;
  }
  if (juanNow === 'Libre' && nathyNow === 'Libre') {
    summaryEl.innerHTML = `<span class="text-success fw-bold">✨ ¡Ambos están libres en este momento! Buen instante para escribir o llamar.</span>`;
    return;
  }

  // Look ahead in today's remaining hours for next overlap
  let nextMomentText = '';
  for (let h = curHour + 1; h < 24; h++) {
    const hStr = `${String(h).padStart(2, '0')}:00`;
    const j = appState.schedules.juan?.[dayName]?.[hStr];
    const n = appState.schedules.nathy?.[dayName]?.[hStr];
    const jC = isCategoryCoupleTime(j);
    const nC = isCategoryCoupleTime(n);

    if ((jC && nC) || (jC && n === 'Libre') || (nC && j === 'Libre')) {
      const diffHours = h - curHour;
      nextMomentText = `💖 Próximo Tiempo en Pareja: Hoy a las ${hStr} (en ${diffHours}h)`;
      break;
    } else if (j === 'Libre' && n === 'Libre' && !nextMomentText) {
      const diffHours = h - curHour;
      nextMomentText = `✨ Próximo tiempo libre juntos: Hoy a las ${hStr} (en ${diffHours}h)`;
    }
  }

  if (nextMomentText) {
    summaryEl.textContent = nextMomentText;
  } else {
    summaryEl.textContent = `Hoy descansan o tienen rutinas individuales. ¡Mañana nueva oportunidad! 💕`;
  }
}

// ------------------------------------------------------------
// USER MANAGEMENT & PERMISSIONS (JUAN & NATHY)
// ------------------------------------------------------------

function renderUserInterface() {
  const u = appState.users[activeUser];
  const juan = appState.users.juan;
  const nathy = appState.users.nathy;

  // Navbar user button
  document.getElementById('navUserAvatar').textContent = u.avatarEmoji || (activeUser === 'juan' ? '👦' : '👧');
  document.getElementById('navUserName').textContent = u.name;
  document.getElementById('navUserRole').textContent = `Conectad@: ${u.nickname}`;

  // Dropdown items
  document.getElementById('dropJuanName').textContent = juan.name;
  document.getElementById('dropJuanNick').textContent = juan.nickname;
  document.getElementById('dropNathyName').textContent = nathy.name;
  document.getElementById('dropNathyNick').textContent = nathy.nickname;

  document.getElementById('badgeJuanActive').classList.toggle('d-none', activeUser !== 'juan');
  document.getElementById('badgeNathyActive').classList.toggle('d-none', activeUser !== 'nathy');

  // Love notes counter
  const notesCount = (appState.loveNotes || []).length;
  document.getElementById('dropNotesCount').textContent = notesCount;

  // Titles in individual schedules
  document.getElementById('headerTitleJuan').textContent = `Horario Semanal Individual • ${juan.name}`;
  document.getElementById('headerTitleNathy').textContent = `Horario Semanal Individual • ${nathy.name}`;
  document.getElementById('tabLabelJuan').textContent = `Horario ${juan.name}`;
  document.getElementById('tabLabelNathy').textContent = `Horario ${nathy.name}`;
  document.getElementById('incomeLabelJuan').textContent = juan.name;
  document.getElementById('incomeLabelNathy').textContent = nathy.name;

  // Timeline header labels
  const tlJuan = document.getElementById('tlJuanHeader');
  const tlNathy = document.getElementById('tlNathyHeader');
  if (tlJuan) tlJuan.textContent = `${juan.avatarEmoji || '👦'} ${juan.name}`;
  if (tlNathy) tlNathy.textContent = `${nathy.avatarEmoji || '👧'} ${nathy.name}`;

  // Customization tab fields
  document.getElementById('custJuanName').value = juan.name;
  document.getElementById('custJuanNick').value = juan.nickname;
  document.getElementById('custJuanEmojiInput').value = juan.avatarEmoji || '👦';
  document.getElementById('custJuanEmoji').textContent = juan.avatarEmoji || '👦';

  document.getElementById('custNathyName').value = nathy.name;
  document.getElementById('custNathyNick').value = nathy.nickname;
  document.getElementById('custNathyEmojiInput').value = nathy.avatarEmoji || '👧';
  document.getElementById('custNathyEmoji').textContent = nathy.avatarEmoji || '👧';

  // Note author display in modal
  document.getElementById('noteAuthorDisplay').textContent = `${u.name} (${u.nickname})`;
}

function renderRelationshipStrip() {
  const juan = appState.users.juan;
  const nathy = appState.users.nathy;
  const rel = appState.relationship || {
    anniversaryDate: "2024-05-15",
    motto: "La distancia separa cuerpos, nunca corazones ✨"
  };

  // Strip Juan
  document.getElementById('stripJuanAvatar').textContent = juan.avatarEmoji || '👦';
  document.getElementById('stripJuanName').textContent = juan.name;
  document.getElementById('stripJuanMood').textContent = juan.mood || '¡Pensando en ti! 🥰';

  // Strip Nathy
  document.getElementById('stripNathyAvatar').textContent = nathy.avatarEmoji || '👧';
  document.getElementById('stripNathyName').textContent = nathy.name;
  document.getElementById('stripNathyMood').textContent = nathy.mood || '¡Te extraño mucho! 💕';

  // Couple motto & anniversary calculation
  document.getElementById('stripCoupleMotto').textContent = `"${rel.motto}"`;

  if (rel.anniversaryDate) {
    const anniv = new Date(rel.anniversaryDate);
    const now = new Date();
    const diffDays = Math.max(0, Math.floor((now - anniv) / (1000 * 60 * 60 * 24)));
    document.getElementById('stripAnniversaryDays').textContent = `💖 ${diffDays} días juntos enamorados`;
    document.getElementById('custAnniversaryDate').value = rel.anniversaryDate;
  }
  document.getElementById('custMotto').value = rel.motto || '';
  document.getElementById('custSong').value = rel.customSong || '';
}

function openMoodModal(userId) {
  if (userId !== activeUser) {
    showToast(`🔒 Solo ${appState.users[userId].name} puede modificar su estado de ánimo`, 'warning');
    return;
  }

  const u = appState.users[userId];
  document.getElementById('moodModalAvatar').textContent = u.avatarEmoji || (userId === 'juan' ? '👦' : '👧');
  document.getElementById('moodModalUser').textContent = u.name;
  document.getElementById('inputUserMood').value = u.mood || '';
  document.getElementById('inputUserMood').dataset.targetUser = userId;
  const modal = new bootstrap.Modal(document.getElementById('moodModal'));
  modal.show();
}

function setQuickMood(moodText) {
  document.getElementById('inputUserMood').value = moodText;
}

function saveUserMood() {
  const targetUser = document.getElementById('inputUserMood').dataset.targetUser || activeUser;
  const newMood = document.getElementById('inputUserMood').value.trim();
  if (newMood) {
    appState.users[targetUser].mood = newMood;
    renderRelationshipStrip();
    bootstrap.Modal.getInstance(document.getElementById('moodModal')).hide();
    triggerAutoSave();
    showToast(`Estado de ${appState.users[targetUser].name} actualizado`);
  }
}

function saveRelationshipSettings() {
  const juanName = document.getElementById('custJuanName').value.trim() || 'Juan';
  const juanNick = document.getElementById('custJuanNick').value.trim() || 'Juancito';
  const juanEmoji = document.getElementById('custJuanEmojiInput').value.trim() || '👦';

  const nathyName = document.getElementById('custNathyName').value.trim() || 'Nathy';
  const nathyNick = document.getElementById('custNathyNick').value.trim() || 'Nath';
  const nathyEmoji = document.getElementById('custNathyEmojiInput').value.trim() || '👧';

  appState.users.juan.name = juanName;
  appState.users.juan.nickname = juanNick;
  appState.users.juan.avatarEmoji = juanEmoji;

  appState.users.nathy.name = nathyName;
  appState.users.nathy.nickname = nathyNick;
  appState.users.nathy.avatarEmoji = nathyEmoji;

  appState.config.couple.juan = juanName;
  appState.config.couple.nathy = nathyName;

  if (!appState.relationship) appState.relationship = {};
  appState.relationship.anniversaryDate = document.getElementById('custAnniversaryDate').value;
  appState.relationship.motto = document.getElementById('custMotto').value.trim();
  appState.relationship.customSong = document.getElementById('custSong').value.trim();

  renderAllModules();
  triggerAutoSave();
  showToast('¡Datos de pareja y perfiles actualizados!');
}

function saveActiveUserProfile() {
  const nick = document.getElementById('inputProfNick').value.trim();
  const emoji = document.getElementById('inputProfEmoji').value.trim();
  if (nick) appState.users[activeUser].nickname = nick;
  if (emoji) appState.users[activeUser].avatarEmoji = emoji;
  renderUserInterface();
  renderRelationshipStrip();
  bootstrap.Modal.getInstance(document.getElementById('userProfileModal')).hide();
  triggerAutoSave();
  showToast('Perfil actualizado con éxito');
}

// ------------------------------------------------------------
// THEMES ENGINE
// ------------------------------------------------------------

function applyTheme(themeName) {
  document.documentElement.setAttribute('data-theme', themeName);
  localStorage.setItem('couple_active_theme', themeName);
  if (appState) {
    appState.currentTheme = themeName;
    render24hMatrix();
    renderIndividualSchedule('juan');
    renderIndividualSchedule('nathy');
    renderBrushToolbars();
    updateLiveCompanion();
    triggerAutoSave();
  }
}

// ------------------------------------------------------------
// LOVE NOTES & SECRET MAILBOX
// ------------------------------------------------------------

function renderLoveNotes() {
  const container = document.getElementById('loveNotesFeed');
  if (!container) return;
  container.innerHTML = '';

  const notes = appState.loveNotes || [];
  if (notes.length === 0) {
    container.innerHTML = `
      <div class="text-center text-muted p-4">
        <i class="bi bi-chat-heart fs-1 text-danger-subtle d-block mb-2"></i>
        <span>No hay notitas aún. ¡Sé el primero en dejarle un mensaje dulce a tu pareja!</span>
      </div>
    `;
    return;
  }

  notes.slice().reverse().forEach((note) => {
    const authorEmoji = note.authorId === 'juan' ? (appState.users.juan.avatarEmoji || '👦') : (appState.users.nathy.avatarEmoji || '👧');

    const card = document.createElement('div');
    card.className = 'love-note-card p-3';
    card.innerHTML = `
      <div class="d-flex justify-content-between align-items-center mb-2">
        <div class="d-flex align-items-center gap-2">
          <span class="fs-4">${authorEmoji}</span>
          <div>
            <strong class="text-dark small">${note.authorName}</strong>
            <div class="text-muted" style="font-size: 0.7rem;">${formatTimeAgo(note.timestamp)}</div>
          </div>
        </div>
        <button class="btn btn-sm btn-light rounded-pill border px-2 py-1 text-danger small d-flex align-items-center gap-1 shadow-none" onclick="likeLoveNote(${note.id})">
          <i class="bi bi-heart-fill"></i> <span>${note.likes || 1}</span>
        </button>
      </div>
      <p class="mb-0 text-dark small" style="white-space: pre-wrap;">${note.text}</p>
    `;
    container.appendChild(card);
  });
}

function sendLoveNote() {
  const text = document.getElementById('newLoveNoteText').value.trim();
  if (!text) {
    showAppAlert('Mensaje vacío', 'Escribe unas palabras para tu pareja antes de enviar.');
    return;
  }

  if (!appState.loveNotes) appState.loveNotes = [];

  const u = appState.users[activeUser];
  const newNote = {
    id: Date.now(),
    authorId: activeUser,
    authorName: `${u.name} (${u.nickname})`,
    text,
    timestamp: new Date().toISOString(),
    likes: 1
  };

  appState.loveNotes.push(newNote);
  renderLoveNotes();
  triggerCelebration();
  triggerAutoSave();

  bootstrap.Modal.getInstance(document.getElementById('loveNotesModal')).hide();
  document.getElementById('newLoveNoteText').value = '';
  showToast('💌 ¡Notita enviada al buzón con mucho amor!');
}

function likeLoveNote(noteId) {
  const note = (appState.loveNotes || []).find(n => n.id === noteId);
  if (note) {
    note.likes = (note.likes || 0) + 1;
    renderLoveNotes();
    triggerAutoSave();
  }
}

function formatTimeAgo(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  return date.toLocaleDateString('es-ES', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// ------------------------------------------------------------
// DYNAMIC CATEGORIES & PALETTES
// ------------------------------------------------------------

function renderDynamicCategories() {
  const categories = appState.config.categories;

  // 1. Color key pills above 24h matrix
  const keyContainer = document.getElementById('dynamicColorKeys');
  if (keyContainer) {
    keyContainer.innerHTML = '';
    categories.forEach(cat => {
      const span = document.createElement('span');
      span.className = 'badge rounded-pill px-3 py-2 text-white shadow-sm d-inline-flex align-items-center gap-1';
      span.style.backgroundColor = cat.color;
      const coupleIcon = cat.isCoupleTime ? '💖 ' : '';
      span.innerHTML = `<i class="bi ${cat.icon}"></i> ${coupleIcon}${cat.name}`;
      keyContainer.appendChild(span);
    });
  }

  // 2. Categories Management Table in Customization Tab
  const catTableBody = document.getElementById('categoriesTableBody');
  if (catTableBody) {
    catTableBody.innerHTML = '';
    categories.forEach((cat, idx) => {
      const isCouple = Boolean(cat.isCoupleTime);
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>
          <input type="color" class="form-control form-control-color form-control-sm rounded-circle shadow-sm" value="${cat.color}" oninput="updateCategoryColor(${idx}, this.value)">
        </td>
        <td>
          <input type="text" class="form-control form-control-sm border-0 bg-transparent fw-bold" value="${cat.name}" onchange="updateCategoryName(${idx}, this.value)">
        </td>
        <td>
          <input type="text" class="form-control form-control-sm border-0 bg-transparent small text-muted" value="${cat.rule}" onchange="updateCategoryRule(${idx}, this.value)">
        </td>
        <td class="text-center">
          <div class="form-check form-switch d-inline-flex align-items-center gap-2 m-0 p-0">
            <input class="form-check-input couple-time-switch" type="checkbox" role="switch"
              id="switchCouple_${idx}"
              ${isCouple ? 'checked' : ''}
              onchange="toggleCategoryCoupleTime(${idx})"
              style="cursor: pointer; width: 2.5em; height: 1.3em;">
            <label class="form-check-label cursor-pointer small fw-bold ${isCouple ? 'text-danger' : 'text-muted'}" for="switchCouple_${idx}">
              ${isCouple ? '💖 Sí (Activado)' : '⚪ No (Desactivado)'}
            </label>
          </div>
        </td>
        <td class="text-end">
          ${idx >= 6 ? `<button class="btn btn-sm btn-outline-danger border-0 rounded-circle" onclick="deleteCategory(${idx})"><i class="bi bi-trash"></i></button>` : `<span class="badge bg-light text-muted small">Básica</span>`}
        </td>
      `;
      catTableBody.appendChild(tr);
    });
  }
}

// Render the interactive brush chips in Tab 2 and Tab 3
function renderBrushToolbars() {
  const categories = appState.config.categories;

  ['juan', 'nathy'].forEach(person => {
    const container = document.getElementById(person === 'juan' ? 'brushChipsJuan' : 'brushChipsNathy');
    const badge = document.getElementById(person === 'juan' ? 'activeBrushJuanBadge' : 'activeBrushNathyBadge');
    const switchEl = document.getElementById(person === 'juan' ? 'brushCoupleSwitch_juan' : 'brushCoupleSwitch_nathy');
    const labelEl = document.getElementById(person === 'juan' ? 'brushCoupleLabel_juan' : 'brushCoupleLabel_nathy');
    const activeBrush = (person === 'juan' ? activeBrushJuan : activeBrushNathy);

    const curCat = categories.find(c => c.name === activeBrush) || categories[0];

    if (badge && curCat) {
      const coupleIcon = curCat.isCoupleTime ? '💖 ' : '';
      badge.innerHTML = `<i class="bi ${curCat.icon} me-1" style="color: ${curCat.color};"></i> ${coupleIcon}${curCat.name}`;
      badge.style.borderLeft = `5px solid ${curCat.color}`;
      badge.style.backgroundColor = hexToRgba(curCat.color, 0.15);
      badge.style.color = getCategoryColors(curCat).text;
    }

    if (switchEl && curCat) {
      switchEl.checked = Boolean(curCat.isCoupleTime);
    }
    if (labelEl && curCat) {
      if (curCat.isCoupleTime) {
        labelEl.innerHTML = `<span class="text-danger">💖 Cuenta como tiempo en pareja: <strong>Sí (Activado)</strong></span>`;
      } else {
        labelEl.innerHTML = `<span class="text-muted">Cuenta como tiempo en pareja: <strong>No (Desactivado)</strong></span>`;
      }
    }

    if (!container) return;
    container.innerHTML = '';

    categories.forEach(cat => {
      const btn = document.createElement('button');
      btn.type = 'button';
      const isSelected = (cat.name === activeBrush);
      const isCouple = Boolean(cat.isCoupleTime);

      btn.className = `brush-chip-btn ${isSelected ? 'active text-white' : 'btn-light border text-dark'}`;
      btn.style.backgroundColor = isSelected ? cat.color : hexToRgba(cat.color, 0.1);
      btn.style.borderColor = isSelected ? cat.color : hexToRgba(cat.color, 0.45);
      btn.style.color = isSelected ? '#ffffff' : getCategoryColors(cat).text;

      const coupleTag = isCouple ? `<span title="Cuenta como tiempo en pareja (Activado)" style="font-size: 0.8rem;">💖</span>` : '';
      btn.innerHTML = `<span style="color: ${isSelected ? '#fff' : cat.color}; font-size: 0.9rem;"><i class="bi ${cat.icon}"></i></span> ${cat.name} ${coupleTag}`;
      btn.title = `${cat.name} — ${isCouple ? 'Cuenta como tiempo en pareja (Activado)' : 'No cuenta como tiempo en pareja (Desactivado)'}`;

      btn.onclick = () => {
        selectBrush(person, cat.name);
      };

      container.appendChild(btn);
    });
  });
}

function selectBrush(person, categoryName) {
  if (person === 'juan') {
    activeBrushJuan = categoryName;
  } else {
    activeBrushNathy = categoryName;
  }
  renderBrushToolbars();
}

function toggleCategoryCoupleTime(idx) {
  const cat = appState.config.categories[idx];
  if (!cat) return;
  cat.isCoupleTime = !cat.isCoupleTime;
  const isNowActive = cat.isCoupleTime;

  renderDynamicCategories();
  renderBrushToolbars();
  render24hMatrix();
  renderIndividualSchedule('juan');
  renderIndividualSchedule('nathy');
  renderKPIs();
  updateLiveCompanion();
  triggerAutoSave();

  showToast(`Categoría "${cat.name}": Tiempo en Pareja ${isNowActive ? 'ACTIVADO (Sí) 💖' : 'DESACTIVADO (No)'}`);
}

function toggleActiveBrushCoupleTime(person) {
  const activeName = (person === 'juan' ? activeBrushJuan : activeBrushNathy);
  const cat = getCategoryObj(activeName);
  if (!cat) return;
  const idx = appState.config.categories.findIndex(c => c.name === cat.name || c.id === cat.id);
  if (idx !== -1) {
    toggleCategoryCoupleTime(idx);
  }
}

function updateNewCatSwitchLabel(input) {
  const label = document.getElementById('newCatSwitchLabel');
  if (!label) return;
  if (input.checked) {
    label.className = 'badge bg-danger-subtle text-danger border border-danger-subtle fw-bold';
    label.textContent = '💖 Sí (Activado)';
  } else {
    label.className = 'badge bg-light border text-muted fw-bold';
    label.textContent = 'No (Desactivado)';
  }
}

function updateCategoryColor(idx, newColor) {
  appState.config.categories[idx].color = newColor;
  renderDynamicCategories();
  renderBrushToolbars();
  render24hMatrix();
  renderIndividualSchedule('juan');
  renderIndividualSchedule('nathy');
  renderRulesLegend();
  updateLiveCompanion();
  triggerAutoSave();
}

function updateCategoryName(idx, newName) {
  const oldName = appState.config.categories[idx].name;
  appState.config.categories[idx].name = newName;

  // Replace in schedules
  ['juan', 'nathy'].forEach(person => {
    appState.schedules.days.forEach(d => {
      appState.schedules.hours.forEach(h => {
        if (appState.schedules[person][d][h] === oldName) {
          appState.schedules[person][d][h] = newName;
        }
      });
    });
  });

  renderAllModules();
  triggerAutoSave();
}

function updateCategoryRule(idx, newRule) {
  appState.config.categories[idx].rule = newRule;
  renderRulesLegend();
  triggerAutoSave();
}

function addCustomCategory() {
  const name = document.getElementById('newCatName').value.trim();
  const color = document.getElementById('newCatColor').value;
  const icon = document.getElementById('newCatIcon').value.trim() || 'bi-tag-fill';
  const rule = document.getElementById('newCatRule').value.trim() || 'Actividad personalizada.';
  const isCoupleTime = Boolean(document.getElementById('newCatIsCoupleTime')?.checked);

  if (!name) {
    showAppAlert('Nombre requerido', 'Por favor ingresa un nombre para la categoría.');
    return;
  }

  appState.config.categories.push({
    id: `cat_${Date.now()}`,
    name,
    color,
    icon,
    rule,
    isCoupleTime
  });

  renderDynamicCategories();
  renderBrushToolbars();
  renderRulesLegend();
  render24hMatrix();
  renderIndividualSchedule('juan');
  renderIndividualSchedule('nathy');
  renderKPIs();
  triggerAutoSave();

  bootstrap.Modal.getInstance(document.getElementById('newCategoryModal')).hide();
  document.getElementById('newCatName').value = '';
  document.getElementById('newCatRule').value = '';
  if (document.getElementById('newCatIsCoupleTime')) {
    document.getElementById('newCatIsCoupleTime').checked = false;
    updateNewCatSwitchLabel(document.getElementById('newCatIsCoupleTime'));
  }
  showToast(`Categoría "${name}" creada con éxito ${isCoupleTime ? '💖 (Tiempo en Pareja: Sí)' : ''}`);
}

function deleteCategory(idx) {
  showAppConfirm(
    'Eliminar Categoría',
    `¿Deseas eliminar la categoría "${appState.config.categories[idx].name}"?`,
    () => {
      appState.config.categories.splice(idx, 1);
      renderDynamicCategories();
      renderBrushToolbars();
      renderRulesLegend();
      triggerAutoSave();
    }
  );
}

// ------------------------------------------------------------
// MODULE 1: KPIS & 24H COMPARISON MATRIX (TIMELINE & HEATMAP)
// ------------------------------------------------------------

function computeWeeklyKPIs() {
  let coincidentFree = 0;
  let dateHours = 0;
  const totalWeeklyHours = 168; // 7 * 24

  appState.schedules.days.forEach(day => {
    appState.schedules.hours.forEach(hour => {
      const j = appState.schedules.juan[day][hour];
      const n = appState.schedules.nathy[day][hour];
      const jCouple = isCategoryCoupleTime(j);
      const nCouple = isCategoryCoupleTime(n);

      if (jCouple && nCouple) {
        dateHours++;
      } else if (j === 'Libre' && n === 'Libre') {
        coincidentFree++;
      }
    });
  });

  const totalConnection = coincidentFree + dateHours;
  const compatibilityPct = ((totalConnection / totalWeeklyHours) * 100).toFixed(1);
  const dailyAvg = (totalConnection / 7).toFixed(1);

  let diagnosis = "✨ Excelente Tiempo Juntos";
  let diagnosisHint = "Tienen un equilibrio ideal entre libertad y tiempo sagrado juntos.";
  if (totalConnection < 20) {
    diagnosis = "⚠️ Atención: Poca Conexión";
    diagnosisHint = "Aumenten las citas virtuales para mantener fuerte el vínculo.";
  } else if (totalConnection < 35) {
    diagnosis = "💛 Buen Ritmo de Pareja";
    diagnosisHint = "Buen tiempo compartido, podrían sumar una cita especial.";
  }

  return { coincidentFree, dateHours, totalConnection, compatibilityPct, dailyAvg, diagnosis, diagnosisHint };
}

function renderKPIs() {
  const kpis = computeWeeklyKPIs();
  document.getElementById('kpiCoincidentFree').textContent = `${kpis.coincidentFree}h`;
  document.getElementById('kpiDateHours').textContent = `${kpis.dateHours}h`;
  document.getElementById('kpiCompatibility').textContent = `${kpis.compatibilityPct}%`;
  document.getElementById('kpiTotalConnection').textContent = `${kpis.totalConnection}h`;
  document.getElementById('kpiDailyAvg').textContent = `Promedio ${kpis.dailyAvg} h/día`;
  document.getElementById('kpiDiagnosis').textContent = kpis.diagnosis;
  document.getElementById('kpiDiagnosisHint').textContent = kpis.diagnosisHint;
}

function setMatrixViewMode(mode) {
  matrixViewMode = mode;
  const btnTimeline = document.getElementById('btnViewTimeline');
  const btnHeatmap = document.getElementById('btnViewHeatmap');
  const timelineWrap = document.getElementById('dailyTimelineWrap');
  const heatmapWrap = document.getElementById('weeklyHeatmapWrap');
  const daySelectorWrap = document.getElementById('daySelectorWrap');

  if (mode === 'timeline') {
    btnTimeline.className = 'btn btn-sm rounded-pill active fw-semibold';
    btnHeatmap.className = 'btn btn-sm rounded-pill fw-semibold text-secondary';
    timelineWrap.classList.remove('d-none');
    heatmapWrap.classList.add('d-none');
    daySelectorWrap.classList.remove('d-none');
  } else {
    btnHeatmap.className = 'btn btn-sm rounded-pill active fw-semibold';
    btnTimeline.className = 'btn btn-sm rounded-pill fw-semibold text-secondary';
    timelineWrap.classList.add('d-none');
    heatmapWrap.classList.remove('d-none');
    daySelectorWrap.classList.add('d-none');
  }

  render24hMatrix();
}

function selectTimelineDay(day) {
  selectedTimelineDay = day;

  // Update pills UI
  const buttons = document.querySelectorAll('#dayButtonsContainer .day-btn-pill');
  buttons.forEach(btn => {
    btn.classList.remove('active');
    const text = btn.textContent.trim();
    if (day === 'TODAY' && text.includes('Hoy')) btn.classList.add('active');
    else if (text === day) btn.classList.add('active');
  });

  renderTimelineView();
}

function getEffectiveTimelineDay() {
  if (selectedTimelineDay === 'TODAY') {
    return getTodaySpanishName();
  }
  return selectedTimelineDay;
}

function render24hMatrix() {
  if (matrixViewMode === 'timeline') {
    renderTimelineView();
  } else {
    renderHeatmapView();
  }
}

// 1. TIMELINE COMPARISON MODE (Hour by hour with clear connection pills)
function renderTimelineView() {
  const container = document.getElementById('dailyTimelineList');
  if (!container) return;
  container.innerHTML = '';

  const day = getEffectiveTimelineDay();
  const juanName = appState.users.juan.name;
  const nathyName = appState.users.nathy.name;

  const now = new Date();
  const isActualToday = (day === getTodaySpanishName());
  const curHour = now.getHours();

  let dayFreeCount = 0;
  let dayDateCount = 0;
  let bestHours = [];

  appState.schedules.hours.forEach(hour => {
    const jAct = appState.schedules.juan?.[day]?.[hour] || 'Libre';
    const nAct = appState.schedules.nathy?.[day]?.[hour] || 'Libre';
    const jCouple = isCategoryCoupleTime(jAct);
    const nCouple = isCategoryCoupleTime(nAct);

    if (jCouple && nCouple) {
      dayDateCount++;
      bestHours.push(hour);
    } else if (jCouple && nAct === 'Libre') {
      dayDateCount++;
      bestHours.push(hour);
    } else if (nCouple && jAct === 'Libre') {
      dayDateCount++;
      bestHours.push(hour);
    } else if (jAct === 'Libre' && nAct === 'Libre') {
      dayFreeCount++;
      bestHours.push(hour);
    }
  });

  // Update Golden Hours & Day Summary Card
  const titleEl = document.getElementById('daySummaryTitle');
  const textEl = document.getElementById('daySummaryText');
  const freeBadge = document.getElementById('dayFreeBadge');
  const dateBadge = document.getElementById('dayDateBadge');

  if (titleEl) titleEl.textContent = `Horas de Oro de ${day}`;
  if (freeBadge) freeBadge.textContent = `${dayFreeCount}h Libres Juntos`;
  if (dateBadge) dateBadge.textContent = `${dayDateCount}h Tiempo en Pareja`;

  if (textEl) {
    if (dayFreeCount + dayDateCount > 0) {
      const bestWindow = bestHours.length > 3 ? `${bestHours[0]} - ${bestHours[bestHours.length - 1]}` : bestHours.join(', ');
      textEl.innerHTML = `Tienen <strong>${dayFreeCount + dayDateCount} horas de conexión</strong> en este día. Momentos clave: <strong>${bestWindow}</strong>.`;
    } else {
      textEl.textContent = `Día con horarios individuales y compromisos laborales. Recuerden dejarse un mensaje de amor.`;
    }
  }

  // Render 24 hour row cards
  appState.schedules.hours.forEach(hour => {
    const hNum = parseInt(hour.split(':')[0], 10);
    const isNow = (isActualToday && hNum === curHour);

    const jAct = appState.schedules.juan?.[day]?.[hour] || 'Libre';
    const nAct = appState.schedules.nathy?.[day]?.[hour] || 'Libre';
    const jCouple = isCategoryCoupleTime(jAct);
    const nCouple = isCategoryCoupleTime(nAct);
    const jCat = getCategoryObj(jAct);
    const nCat = getCategoryObj(nAct);

    let matchHtml = '';

    if (jCouple && nCouple) {
      matchHtml = `
        <span class="timeline-status-badge status-badge-match-date">
          <i class="bi bi-heart-fill"></i> Tiempo en Pareja
        </span>
      `;
    } else if (jCouple && nAct === 'Libre') {
      matchHtml = `
        <span class="timeline-status-badge status-badge-match-date" style="opacity: 0.95;">
          <i class="bi bi-heart"></i> Pareja Disponible
        </span>
      `;
    } else if (nCouple && jAct === 'Libre') {
      matchHtml = `
        <span class="timeline-status-badge status-badge-match-date" style="opacity: 0.95;">
          <i class="bi bi-heart"></i> Pareja Disponible
        </span>
      `;
    } else if (jAct === 'Libre' && nAct === 'Libre') {
      matchHtml = `
        <span class="timeline-status-badge status-badge-match-free">
          <i class="bi bi-stars"></i> Libres Juntos
        </span>
      `;
    } else if (jAct.includes('Dormir') && nAct.includes('Dormir')) {
      matchHtml = `
        <span class="timeline-status-badge status-badge-diff text-muted">
          <i class="bi bi-moon-stars"></i> Ambos descansando
        </span>
      `;
    } else if (jAct.includes('Trabajo') && nAct.includes('Trabajo')) {
      matchHtml = `
        <span class="timeline-status-badge status-badge-diff text-warning-emphasis">
          <i class="bi bi-briefcase"></i> Ambos trabajando
        </span>
      `;
    } else {
      matchHtml = `
        <span class="timeline-status-badge status-badge-diff">
          <i class="bi bi-arrow-left-right"></i> Rutinas distintas
        </span>
      `;
    }

    const jStyle = getCategoryCellStyle(jAct);
    const nStyle = getCategoryCellStyle(nAct);
    const jIcon = jCat?.icon ? `<i class="bi ${jCat.icon} me-1" style="color: ${jCat.color};"></i>` : '';
    const nIcon = nCat?.icon ? `<i class="bi ${nCat.icon} me-1" style="color: ${nCat.color};"></i>` : '';
    const jHeart = jCouple ? `<span style="font-size: 0.75rem;">💖</span> ` : '';
    const nHeart = nCouple ? `<span style="font-size: 0.75rem;">💖</span> ` : '';

    const card = document.createElement('div');
    card.className = `timeline-hour-card d-flex align-items-center justify-content-between gap-2 ${isNow ? 'is-current-hour' : ''}`;

    card.innerHTML = `
      <!-- Left: Juan Activity -->
      <div style="width: 32%;" class="d-flex align-items-center gap-2">
        <span class="timeline-hour-badge text-muted me-1">${hour}</span>
        <div class="schedule-cell rounded-3 px-2 py-1 small text-truncate w-100" style="${jStyle}" title="${juanName}: ${jAct}">
          ${jHeart}${jIcon}${formatShortActivity(jAct)}
        </div>
      </div>

      <!-- Center: Match Badge -->
      <div style="width: 36%;" class="text-center d-flex align-items-center justify-content-center gap-2">
        ${matchHtml}
        ${isNow ? `<span class="badge bg-danger rounded-pill px-2 py-1 small fw-bold"><i class="bi bi-clock-fill me-1"></i> AHORA</span>` : ''}
      </div>

      <!-- Right: Nathy Activity -->
      <div style="width: 32%;" class="d-flex align-items-center justify-content-end gap-2 text-end">
        <div class="schedule-cell rounded-3 px-2 py-1 small text-truncate w-100 text-end" style="${nStyle}" title="${nathyName}: ${nAct}">
          ${nHeart}${nIcon}${formatShortActivity(nAct)}
        </div>
      </div>
    `;

    container.appendChild(card);
  });
}

// 2. WEEKLY HEATMAP MODE (7x24 grid of all days)
function renderHeatmapView() {
  const headerRow = document.getElementById('matrixHeaderRow');
  const tbody = document.getElementById('matrixTableBody');

  if (!headerRow || !tbody) return;
  headerRow.innerHTML = '';
  tbody.innerHTML = '';

  const juanName = appState.users.juan.name;
  const nathyName = appState.users.nathy.name;

  // Header: 7 Days
  let headerHtml = `<th style="width: 80px;">Hora</th>`;
  appState.schedules.days.forEach(day => {
    headerHtml += `
      <th class="text-center">
        <span class="text-uppercase fw-bold">${day}</span>
        <div class="small fw-normal text-muted" style="font-size: 0.7rem;">Compatibilidad</div>
      </th>
    `;
  });
  headerRow.innerHTML = headerHtml;

  // Body: 24 hours
  appState.schedules.hours.forEach(hour => {
    const tr = document.createElement('tr');
    let rowHtml = `<td class="fw-bold text-muted bg-light">${hour}</td>`;

    appState.schedules.days.forEach(day => {
      const jAct = appState.schedules.juan?.[day]?.[hour] || 'Libre';
      const nAct = appState.schedules.nathy?.[day]?.[hour] || 'Libre';
      const jCouple = isCategoryCoupleTime(jAct);
      const nCouple = isCategoryCoupleTime(nAct);
      const jCat = getCategoryObj(jAct);
      const nCat = getCategoryObj(nAct);

      let cellBg = '#f1f5f9';
      let cellText = '—';
      let cellTextColor = '#475569';
      let cellBorder = 'transparent';
      let titleTooltip = `${day} ${hour}: ${juanName} (${jAct}) | ${nathyName} (${nAct})`;

      if (jCouple && nCouple) {
        const coupleCat = (jCat && jCat.isCoupleTime) ? jCat : nCat;
        const cColor = coupleCat?.color || '#ec4899';
        cellBg = hexToRgba(cColor, 0.25);
        cellTextColor = getCategoryColors({ color: cColor }).text;
        cellBorder = cColor;
        cellText = '💖 Cita';
      } else if (jAct === 'Libre' && nAct === 'Libre') {
        const libreCat = getCategoryObj('Libre');
        const cColor = libreCat?.color || '#10b981';
        cellBg = hexToRgba(cColor, 0.25);
        cellTextColor = getCategoryColors({ color: cColor }).text;
        cellBorder = cColor;
        cellText = '✨ Libre';
      } else if (jAct === nAct && jCat) {
        // Both doing the same activity
        cellBg = hexToRgba(jCat.color, 0.22);
        cellTextColor = getCategoryColors(jCat).text;
        cellBorder = jCat.color;
        const icon = jCat.icon ? `<i class="bi ${jCat.icon} me-1"></i>` : '';
        cellText = `${icon}${jCat.name.split(' ')[0]}`;
      } else if (jCouple || nCouple) {
        const coupleCat = jCouple ? jCat : nCat;
        const cColor = coupleCat?.color || '#ec4899';
        cellBg = hexToRgba(cColor, 0.15);
        cellTextColor = getCategoryColors({ color: cColor }).text;
        cellBorder = hexToRgba(cColor, 0.5);
        cellText = '💖 1 Libre';
      } else {
        cellBg = '#f8fafc';
        cellTextColor = '#94a3b8';
        cellText = '•';
      }

      rowHtml += `
        <td style="background-color: ${cellBg}; color: ${cellTextColor}; border: 1px solid ${cellBorder}; font-size: 0.75rem; font-weight: 700; cursor: pointer; text-align: center; vertical-align: middle; padding: 6px 4px;" title="${titleTooltip}" onclick="inspectHeatmapHour('${day}', '${hour}')">
          ${cellText}
        </td>
      `;
    });

    tr.innerHTML = rowHtml;
    tbody.appendChild(tr);
  });
}

function inspectHeatmapHour(day, hour) {
  const jAct = appState.schedules.juan?.[day]?.[hour] || 'Libre';
  const nAct = appState.schedules.nathy?.[day]?.[hour] || 'Libre';
  const juanName = appState.users.juan.name;
  const nathyName = appState.users.nathy.name;

  showAppAlert(
    `${day} a las ${hour}`,
    `👦 ${juanName}: ${jAct}\n👧 ${nathyName}: ${nAct}`,
    '🗓️'
  );
}

function formatShortActivity(act) {
  if (!act) return '✨ Libre';
  const cat = getCategoryObj(act);
  const isCouple = isCategoryCoupleTime(act);
  if (isCouple) {
    return `💖 ${cat ? cat.name : act}`;
  }
  if (act === 'Dormir (Noche)') return '🌙 Dormir';
  if (act === 'Trabajo / Estudio') return '💼 Trabajo';
  if (act === 'En Tránsito') return '🚗 Tránsito';
  if (act === 'Ocupado / Personal') return '👤 Personal';
  if (act === 'Libre') return '✨ Libre';
  return act;
}

// ------------------------------------------------------------
// MODULE 2 & 3: INDIVIDUAL SCHEDULES (PERMISSIONS APPLIED)
// ------------------------------------------------------------

function renderIndividualSchedule(person) {
  const tbody = document.getElementById(person === 'juan' ? 'tbodyJuan' : 'tbodyNathy');
  if (!tbody) return;
  tbody.innerHTML = '';
  const scheduleData = appState.schedules[person];
  const isOwner = (person === activeUser);

  // Apply permission notice
  const controlsEl = document.getElementById(person === 'juan' ? 'juanScheduleControls' : 'nathyScheduleControls');
  const noticeEl = document.getElementById(person === 'juan' ? 'juanReadOnlyNotice' : 'nathyReadOnlyNotice');
  if (controlsEl) controlsEl.classList.toggle('d-none', !isOwner);
  if (noticeEl) noticeEl.classList.toggle('d-none', isOwner);

  appState.schedules.hours.forEach(hour => {
    const tr = document.createElement('tr');
    let rowHtml = `<td class="fw-bold text-muted bg-light">${hour}</td>`;

    appState.schedules.days.forEach(day => {
      const act = scheduleData[day][hour] || 'Libre';
      const cat = getCategoryObj(act);
      const isCouple = isCategoryCoupleTime(act);
      const cellStyle = getCategoryCellStyle(act);
      const iconHtml = cat?.icon ? `<i class="bi ${cat.icon} me-1" style="color: ${cat.color};"></i>` : '';
      const coupleBadge = isCouple ? `<span title="Cuenta como tiempo en pareja (Activado)" style="font-size: 0.8rem;">💖</span> ` : '';

      if (isOwner) {
        rowHtml += `
          <td class="schedule-cell cursor-pointer" style="${cellStyle}" title="Haz clic para pintar con el pincel activo (${act})" onclick="handleCellClick('${person}', '${day}', '${hour}')">
            ${coupleBadge}${iconHtml}${act}
          </td>
        `;
      } else {
        rowHtml += `
          <td class="schedule-cell schedule-cell-readonly" style="${cellStyle}" title="Solo ${appState.users[person].name} puede modificar este horario" onclick="showReadOnlyScheduleAlert('${person}')">
            ${coupleBadge}${iconHtml}${act}
          </td>
        `;
      }
    });

    tr.innerHTML = rowHtml;
    tbody.appendChild(tr);
  });
}

function showReadOnlyScheduleAlert(person) {
  showToast(`🔒 Modo Solo Lectura: Solo ${appState.users[person].name} puede editar su propio horario semanal.`, 'warning');
}

function handleCellClick(person, day, hour) {
  if (person !== activeUser) {
    showReadOnlyScheduleAlert(person);
    return;
  }

  const chosenActivity = (person === 'juan' ? activeBrushJuan : activeBrushNathy);
  appState.schedules[person][day][hour] = chosenActivity;

  // Re-render only necessary parts & trigger auto-save
  renderIndividualSchedule(person);
  renderKPIs();
  render24hMatrix();
  updateMonthlySummaryModal();
  updateLiveCompanion();
  triggerAutoSave();
}

function fillWorkHours(person) {
  if (person !== activeUser) {
    showReadOnlyScheduleAlert(person);
    return;
  }

  const workDays = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"];
  workDays.forEach(day => {
    for (let h = 9; h <= 17; h++) {
      const hourStr = `${String(h).padStart(2, '0')}:00`;
      appState.schedules[person][day][hourStr] = "Trabajo / Estudio";
    }
  });

  renderIndividualSchedule(person);
  renderKPIs();
  render24hMatrix();
  updateLiveCompanion();
  triggerAutoSave();
  showToast(`Trabajo asignado para ${appState.users[person].name} de 09:00 a 17:00 (Lun-Vie)`);
}

function fillSleepHours(person) {
  if (person !== activeUser) {
    showReadOnlyScheduleAlert(person);
    return;
  }

  appState.schedules.days.forEach(day => {
    for (let h = 0; h <= 6; h++) {
      const hourStr = `${String(h).padStart(2, '0')}:00`;
      appState.schedules[person][day][hourStr] = "Dormir (Noche)";
    }
    appState.schedules[person][day]["23:00"] = "Dormir (Noche)";
  });

  renderIndividualSchedule(person);
  renderKPIs();
  render24hMatrix();
  updateLiveCompanion();
  triggerAutoSave();
  showToast(`Horas de descanso nocturno asignadas para ${appState.users[person].name}`);
}

// ------------------------------------------------------------
// COPY DAY MASS TOOL (PRODUCTIVITY FEATURE)
// ------------------------------------------------------------

function openCopyDayModal(person) {
  if (person !== activeUser) {
    showReadOnlyScheduleAlert(person);
    return;
  }
  targetCopyPerson = person;
  const modal = new bootstrap.Modal(document.getElementById('copyDayModal'));
  modal.show();
}

function selectAllWorkdaysForCopy() {
  ['Mar', 'Mie', 'Jue', 'Vie'].forEach(id => {
    const el = document.getElementById(`chkCopy${id}`);
    if (el) el.checked = true;
  });
  const sab = document.getElementById('chkCopySab');
  const dom = document.getElementById('chkCopyDom');
  if (sab) sab.checked = false;
  if (dom) dom.checked = false;
}

function selectAllWeekendForCopy() {
  ['Lun', 'Mar', 'Mie', 'Jue', 'Vie'].forEach(id => {
    const el = document.getElementById(`chkCopy${id}`);
    if (el) el.checked = false;
  });
  const sab = document.getElementById('chkCopySab');
  const dom = document.getElementById('chkCopyDom');
  if (sab) sab.checked = true;
  if (dom) dom.checked = true;
}

function executeCopyDay() {
  const sourceDay = document.getElementById('copySourceDay').value;
  const targetDays = [];

  ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'].forEach(id => {
    const chk = document.getElementById(`chkCopy${id}`);
    if (chk && chk.checked) {
      targetDays.push(chk.value);
    }
  });

  if (targetDays.length === 0) {
    showAppAlert('Ningún día seleccionado', 'Por favor selecciona al menos un día de destino para pegar.');
    return;
  }

  // Copy hour-by-hour
  const sourceSchedule = appState.schedules[targetCopyPerson][sourceDay];
  targetDays.forEach(tgt => {
    if (tgt !== sourceDay) {
      appState.schedules[targetCopyPerson][tgt] = { ...sourceSchedule };
    }
  });

  renderIndividualSchedule(targetCopyPerson);
  renderKPIs();
  render24hMatrix();
  updateLiveCompanion();
  triggerAutoSave();

  bootstrap.Modal.getInstance(document.getElementById('copyDayModal')).hide();
  showToast(`¡Horario de ${sourceDay} copiado exitosamente hacia ${targetDays.join(', ')}!`);
}

function renderRulesLegend() {
  const container = document.getElementById('rulesLegendContainer');
  if (!container) return;
  container.innerHTML = '';
  appState.config.categories.forEach(cat => {
    const col = document.createElement('div');
    col.className = 'col-sm-6 col-lg-4';
    const isCouple = Boolean(cat.isCoupleTime);
    col.innerHTML = `
      <div class="p-3 bg-white rounded-4 border h-100 shadow-sm" style="border-left: 5px solid ${cat.color} !important;">
        <div class="d-flex align-items-center justify-content-between mb-1">
          <div class="d-flex align-items-center gap-2">
            <i class="bi ${cat.icon}" style="color: ${cat.color}; font-size: 1.1rem;"></i>
            <span class="fw-bold" style="color: ${cat.color};">${cat.name}</span>
          </div>
          ${isCouple ? '<span class="badge bg-danger-subtle text-danger border border-danger-subtle small fw-bold">💖 Pareja</span>' : ''}
        </div>
        <div class="text-muted small">${cat.rule}</div>
      </div>
    `;
    container.appendChild(col);
  });
}

// ------------------------------------------------------------
// MODULE 4: FINANCES & FLIGHTS (PROPORTIONAL MODEL & CURRENCIES)
// ------------------------------------------------------------

function setCurrencyView(currency) {
  currentCurrencyView = currency;
  const btnUSD = document.getElementById('btnCurrUSD');
  const btnPEN = document.getElementById('btnCurrPEN');

  if (currency === 'USD') {
    btnUSD.classList.add('active');
    btnPEN.classList.remove('active');
  } else {
    btnPEN.classList.add('active');
    btnUSD.classList.remove('active');
  }

  renderFinances();
}

function runQuickConverter() {
  const val = parseFloat(document.getElementById('quickConvVal').value) || 0;
  const dir = document.getElementById('quickConvDir').value;
  const rate = appState.config.exchangeRate || 3.75;
  const resEl = document.getElementById('quickConvResult');

  if (dir === 'USD2PEN') {
    const pen = (val * rate).toFixed(2);
    resEl.textContent = `≈ S/. ${pen} PEN`;
  } else {
    const usd = (val / rate).toFixed(2);
    resEl.textContent = `≈ $${usd} USD`;
  }
}

function filterExpenses(category, btn) {
  currentExpenseCategoryFilter = category;
  document.querySelectorAll('#expenseCategoryFilterButtons .btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderFinances();
}

function filterExpenseStatus(status, btn) {
  currentExpenseStatusFilter = status;
  btn.parentElement.querySelectorAll('.btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderFinances();
}

function renderFinances() {
  const fin = appState.finances;
  const rate = appState.config.exchangeRate || 3.75;
  const juanName = appState.users.juan.name;
  const nathyName = appState.users.nathy.name;

  const isJuan = (activeUser === 'juan');
  const isNathy = (activeUser === 'nathy');

  // Input values
  const inputJuan = document.getElementById('inputJuanPEN');
  const inputNathy = document.getElementById('inputNathyPEN');

  if (inputJuan) {
    inputJuan.value = fin.income.juanPEN;
    inputJuan.disabled = !isJuan;
    inputJuan.title = isJuan ? 'Puedes editar tu ingreso' : `Solo ${juanName} puede modificar su ingreso`;
  }

  if (inputNathy) {
    inputNathy.value = fin.income.nathyPEN;
    inputNathy.disabled = !isNathy;
    inputNathy.title = isNathy ? 'Puedes editar tu ingreso' : `Solo ${nathyName} puede modificar su ingreso`;
  }

  document.getElementById('exchangeRateBadge').textContent = `1 USD = ${rate.toFixed(2)} PEN`;

  const totalPEN = fin.income.juanPEN + fin.income.nathyPEN;
  const juanPct = totalPEN > 0 ? ((fin.income.juanPEN / totalPEN) * 100).toFixed(1) : '50.0';
  const nathyPct = totalPEN > 0 ? ((fin.income.nathyPEN / totalPEN) * 100).toFixed(1) : '50.0';

  // Badges in input cards
  document.getElementById('badgeJuanPct').textContent = `${juanPct}%`;
  document.getElementById('badgeNathyPct').textContent = `${nathyPct}%`;

  const juanUSD = (fin.income.juanPEN / rate).toFixed(2);
  const nathyUSD = (fin.income.nathyPEN / rate).toFixed(2);
  const totalUSD = (totalPEN / rate).toFixed(2);

  document.getElementById('textJuanUSD').textContent = `$${juanUSD} USD`;
  document.getElementById('textNathyUSD').textContent = `$${nathyUSD} USD`;
  document.getElementById('totalIncomeText').textContent = `S/. ${totalPEN.toLocaleString('es-PE', { minimumFractionDigits: 2 })} PEN ($${totalUSD} USD)`;

  // Update Visual Split Meter Bar
  const meterJuan = document.getElementById('meterBarJuan');
  const meterNathy = document.getElementById('meterBarNathy');
  if (meterJuan) {
    meterJuan.style.width = `${juanPct}%`;
    meterJuan.textContent = `${juanPct}% ${juanName}`;
  }
  if (meterNathy) {
    meterNathy.style.width = `${nathyPct}%`;
    meterNathy.textContent = `${nathyPct}% ${nathyName}`;
  }

  const lblSplitJuanName = document.getElementById('lblSplitJuanName');
  const lblSplitJuanPEN = document.getElementById('lblSplitJuanPEN');
  const lblSplitJuanPct = document.getElementById('lblSplitJuanPct');
  const lblSplitNathyName = document.getElementById('lblSplitNathyName');
  const lblSplitNathyPEN = document.getElementById('lblSplitNathyPEN');
  const lblSplitNathyPct = document.getElementById('lblSplitNathyPct');

  if (lblSplitJuanName) lblSplitJuanName.textContent = juanName;
  if (lblSplitJuanPEN) lblSplitJuanPEN.textContent = fin.income.juanPEN.toLocaleString('es-PE');
  if (lblSplitJuanPct) lblSplitJuanPct.textContent = `${juanPct}%`;

  if (lblSplitNathyName) lblSplitNathyName.textContent = nathyName;
  if (lblSplitNathyPEN) lblSplitNathyPEN.textContent = fin.income.nathyPEN.toLocaleString('es-PE');
  if (lblSplitNathyPct) lblSplitNathyPct.textContent = `${nathyPct}%`;

  const exJuan = document.getElementById('lblShareExampleJuan');
  const exNathy = document.getElementById('lblShareExampleNathy');
  if (exJuan) exJuan.textContent = `$${(100 * parseFloat(juanPct) / 100).toFixed(2)} USD (S/. ${(100 * parseFloat(juanPct) / 100 * rate).toFixed(2)})`;
  if (exNathy) exNathy.textContent = `$${(100 * parseFloat(nathyPct) / 100).toFixed(2)} USD (S/. ${(100 * parseFloat(nathyPct) / 100 * rate).toFixed(2)})`;

  // Goal & Savings (Shared between both)
  const targetUSD = fin.goal.targetUSD;
  const savedUSD = fin.goal.savedUSD;
  const goalPct = Math.min(100, ((savedUSD / targetUSD) * 100).toFixed(1));
  const remainingUSD = Math.max(0, targetUSD - savedUSD).toFixed(2);
  const savedPEN = (savedUSD * rate).toFixed(2);

  document.getElementById('goalPercentBadge').textContent = `${goalPct}%`;
  document.getElementById('savedAmountText').textContent = `$${savedUSD.toLocaleString('en-US', { minimumFractionDigits: 2 })} USD`;
  document.getElementById('savedAmountPEN').textContent = `≈ S/. ${parseFloat(savedPEN).toLocaleString('es-PE', { minimumFractionDigits: 2 })} PEN`;
  document.getElementById('targetAmountText').textContent = `$${targetUSD.toLocaleString('en-US', { minimumFractionDigits: 2 })} USD`;
  document.getElementById('remainingAmountText').textContent = `Faltan $${remainingUSD} USD`;
  document.getElementById('goalProgressBar').style.width = `${goalPct}%`;
  document.getElementById('inputSavedUSD').value = savedUSD;

  // Table header labels with currency
  const thTotal = document.getElementById('thExpTotal');
  if (thTotal) thTotal.textContent = currentCurrencyView === 'USD' ? 'Total (USD)' : 'Total (PEN)';

  document.getElementById('thExpenseJuan').textContent = `${juanName} (${juanPct}%)`;
  document.getElementById('thExpenseNathy').textContent = `${nathyName} (${nathyPct}%)`;

  // Filtered Expenses
  const tbody = document.getElementById('expensesTableBody');
  tbody.innerHTML = '';

  let sumUSD = 0;
  let sumPEN = 0;
  let sumJuanShareUSD = 0;
  let sumNathyShareUSD = 0;

  const filtered = fin.expenses.filter(exp => {
    const matchCat = (currentExpenseCategoryFilter === 'ALL' || exp.category === currentExpenseCategoryFilter);
    const matchStatus = (currentExpenseStatusFilter === 'ALL' || exp.status === currentExpenseStatusFilter);
    return matchCat && matchStatus;
  });

  filtered.forEach((exp, idx) => {
    const amountUSD = exp.amountUSD;
    const amountPEN = amountUSD * rate;
    const juanShareUSD = (amountUSD * fin.income.juanPEN) / totalPEN;
    const nathyShareUSD = (amountUSD * fin.income.nathyPEN) / totalPEN;

    sumUSD += amountUSD;
    sumPEN += amountPEN;
    sumJuanShareUSD += juanShareUSD;
    sumNathyShareUSD += nathyShareUSD;

    const displayTotal = currentCurrencyView === 'USD' ? `$${amountUSD.toFixed(2)}` : `S/. ${amountPEN.toFixed(2)}`;
    const displayJuan = currentCurrencyView === 'USD' ? `$${juanShareUSD.toFixed(2)}` : `S/. ${(juanShareUSD * rate).toFixed(2)}`;
    const displayNathy = currentCurrencyView === 'USD' ? `$${nathyShareUSD.toFixed(2)}` : `S/. ${(nathyShareUSD * rate).toFixed(2)}`;

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <div class="fw-bold text-dark">${exp.concept}</div>
        <div class="small text-muted">${exp.notes || ''}</div>
      </td>
      <td><span class="badge bg-light text-secondary border rounded-pill px-2">${exp.category}</span></td>
      <td class="fw-bold">${displayTotal}</td>
      <td class="text-primary fw-bold">${displayJuan}</td>
      <td class="text-pink fw-bold">${displayNathy}</td>
      <td>
        <span class="badge rounded-pill ${exp.status === 'Pagado' ? 'bg-success' : 'bg-warning text-dark'} cursor-pointer" title="Haz clic para cambiar estado" onclick="toggleExpenseStatus(${idx})">
          ${exp.status === 'Pagado' ? '✓ Pagado' : '⏳ Pendiente'}
        </span>
      </td>
      <td class="text-end">
        <button class="btn btn-sm btn-outline-danger border-0 rounded-circle" onclick="deleteExpense(${idx})" title="Eliminar partida">
          <i class="bi bi-trash"></i>
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  // Table footers
  const displayTotalFoot = currentCurrencyView === 'USD' ? `$${sumUSD.toFixed(2)}` : `S/. ${sumPEN.toFixed(2)}`;
  const displayJuanFoot = currentCurrencyView === 'USD' ? `$${sumJuanShareUSD.toFixed(2)}` : `S/. ${(sumJuanShareUSD * rate).toFixed(2)}`;
  const displayNathyFoot = currentCurrencyView === 'USD' ? `$${sumNathyShareUSD.toFixed(2)}` : `S/. ${(sumNathyShareUSD * rate).toFixed(2)}`;

  document.getElementById('totalExpensesDisplay').textContent = displayTotalFoot;
  document.getElementById('totalJuanShare').textContent = displayJuanFoot;
  document.getElementById('totalNathyShare').textContent = displayNathyFoot;
}

function updateFinances() {
  if (activeUser === 'juan') {
    const val = parseFloat(document.getElementById('inputJuanPEN').value) || 0;
    appState.finances.income.juanPEN = val;
  } else if (activeUser === 'nathy') {
    const val = parseFloat(document.getElementById('inputNathyPEN').value) || 0;
    appState.finances.income.nathyPEN = val;
  }
  renderFinances();
  updateMonthlySummaryModal();
  triggerAutoSave();
}

function updateGoalSavings() {
  const saved = parseFloat(document.getElementById('inputSavedUSD').value) || 0;
  appState.finances.goal.savedUSD = saved;
  renderFinances();
  updateMonthlySummaryModal();
  triggerAutoSave();

  if (saved >= appState.finances.goal.targetUSD) {
    triggerCelebration();
    showToast('🎉 ¡Felicidades! ¡Han alcanzado el 100% de la meta de ahorro!');
  }
}

function toggleExpenseStatus(idx) {
  const exp = appState.finances.expenses[idx];
  exp.status = exp.status === 'Pagado' ? 'Pendiente' : 'Pagado';
  renderFinances();
  triggerAutoSave();
}

function deleteExpense(idx) {
  showAppConfirm(
    'Eliminar partida',
    '¿Eliminar este concepto del presupuesto de viaje?',
    () => {
      appState.finances.expenses.splice(idx, 1);
      renderFinances();
      updateMonthlySummaryModal();
      triggerAutoSave();
    }
  );
}

function addExpense() {
  const concept = document.getElementById('expConcept').value.trim();
  const category = document.getElementById('expCategory').value;
  const amountUSD = parseFloat(document.getElementById('expAmountUSD').value) || 0;
  const notes = document.getElementById('expNotes').value.trim();

  if (!concept || amountUSD <= 0) {
    showAppAlert('Datos incompletos', 'Ingresa un concepto y un monto válido en USD');
    return;
  }

  appState.finances.expenses.push({
    id: Date.now(),
    concept,
    category,
    amountUSD,
    status: 'Pendiente',
    notes
  });

  renderFinances();
  updateMonthlySummaryModal();
  triggerAutoSave();

  bootstrap.Modal.getInstance(document.getElementById('newExpenseModal')).hide();
  document.getElementById('expConcept').value = '';
  document.getElementById('expAmountUSD').value = '';
  document.getElementById('expNotes').value = '';
  showToast('Gasto añadido al presupuesto');
}

// ------------------------------------------------------------
// MODULE 5: VISION BOARD & CUENTA REGRESIVA
// ------------------------------------------------------------

function startLiveCountdown() {
  function updateCountdown() {
    if (!appState || !appState.config) return;
    const targetDate = new Date(appState.config.reunionDate);
    const now = new Date();
    const diffMs = targetDate - now;

    if (diffMs <= 0) {
      document.getElementById('cdDays').textContent = '00';
      document.getElementById('cdHours').textContent = '00';
      document.getElementById('cdMinutes').textContent = '00';
      document.getElementById('cdSeconds').textContent = '00';
      document.getElementById('cdWeeks').textContent = '0.0';
      document.getElementById('navCountdownText').textContent = '¡LLEGÓ EL DÍA! 💖';
      return;
    }

    const totalSeconds = Math.floor(diffMs / 1000);
    const days = Math.floor(totalSeconds / (3600 * 24));
    const hours = Math.floor((totalSeconds % (3600 * 24)) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const weeks = (days / 7).toFixed(1);

    document.getElementById('cdDays').textContent = String(days).padStart(2, '0');
    document.getElementById('cdHours').textContent = String(hours).padStart(2, '0');
    document.getElementById('cdMinutes').textContent = String(minutes).padStart(2, '0');
    document.getElementById('cdSeconds').textContent = String(seconds).padStart(2, '0');
    document.getElementById('cdWeeks').textContent = weeks;

    document.getElementById('navCountdownText').textContent = `${days}d ${hours}h ${minutes}m`;
  }

  updateCountdown();
  setInterval(updateCountdown, 1000);
}

function filterChecklist(status, btn) {
  currentChecklistStatus = status;
  btn.parentElement.querySelectorAll('.btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderChecklist();
}

function filterChecklistResp(resp, btn) {
  currentChecklistResp = resp;
  btn.parentElement.querySelectorAll('.btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderChecklist();
}

function renderChecklist() {
  const container = document.getElementById('checklistContainer');
  if (!container) return;
  container.innerHTML = '';
  const list = appState.visionBoard.checklist;

  const total = list.length;
  const completed = list.filter(item => item.completed).length;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  document.getElementById('checklistProgressBadge').textContent = `${pct}% Completado`;
  document.getElementById('checklistProgressBar').style.width = `${pct}%`;
  document.getElementById('checklistCount').textContent = `${completed} de ${total} hitos listos`;

  const filtered = list.filter(item => {
    const matchStatus = (currentChecklistStatus === 'ALL' || (currentChecklistStatus === 'DONE' && item.completed) || (currentChecklistStatus === 'PENDING' && !item.completed));
    const matchResp = (currentChecklistResp === 'ALL' || item.responsible === currentChecklistResp || item.responsible === 'Ambos');
    return matchStatus && matchResp;
  });

  if (filtered.length === 0) {
    container.innerHTML = `<div class="text-center text-muted p-3">No hay tareas que coincidan con los filtros seleccionados.</div>`;
    return;
  }

  filtered.forEach(item => {
    const realIdx = list.indexOf(item);
    const itemEl = document.createElement('div');
    itemEl.className = 'list-group-item border-0 p-3 rounded-4 mb-1 d-flex align-items-center justify-content-between gap-3 bg-light';

    let statusBadge = item.completed
      ? `<span class="badge bg-success rounded-pill px-3 py-1"><i class="bi bi-check2-circle me-1"></i> ${item.status}</span>`
      : `<span class="badge bg-warning-subtle text-dark rounded-pill px-3 py-1">${item.status}</span>`;

    itemEl.innerHTML = `
      <div class="d-flex align-items-center gap-3">
        <input class="form-check-input fs-5 cursor-pointer m-0" type="checkbox" ${item.completed ? 'checked' : ''} onchange="toggleChecklistItem(${realIdx})">
        <div>
          <div class="fw-bold ${item.completed ? 'text-decoration-line-through text-muted' : 'text-dark'}">${item.task}</div>
          <div class="small text-muted">
            <i class="bi bi-person me-1"></i>${item.responsible} • Límite: ${item.deadline || 'Sin fecha'}
          </div>
        </div>
      </div>
      <div class="d-flex align-items-center gap-2">
        ${statusBadge}
        <button class="btn btn-sm text-danger border-0 rounded-circle" onclick="deleteChecklistItem(${realIdx})">
          <i class="bi bi-x-lg"></i>
        </button>
      </div>
    `;
    container.appendChild(itemEl);
  });
}

function toggleChecklistItem(idx) {
  const item = appState.visionBoard.checklist[idx];
  item.completed = !item.completed;
  item.status = item.completed ? '¡Listo! Confirmado' : 'En proceso';
  renderChecklist();
  updateMonthlySummaryModal();
  triggerAutoSave();
}

function deleteChecklistItem(idx) {
  showAppConfirm(
    'Eliminar hito',
    '¿Eliminar este hito del checklist de preparativos?',
    () => {
      appState.visionBoard.checklist.splice(idx, 1);
      renderChecklist();
      updateMonthlySummaryModal();
      triggerAutoSave();
    }
  );
}

function addChecklistItem() {
  const task = document.getElementById('checkTask').value.trim();
  const responsible = document.getElementById('checkResponsible').value;
  const deadline = document.getElementById('checkDeadline').value;

  if (!task) {
    showAppAlert('Descripción requerida', 'Ingresa una descripción para el hito.');
    return;
  }

  appState.visionBoard.checklist.push({
    id: Date.now(),
    task,
    completed: false,
    status: 'Pendiente',
    responsible,
    deadline
  });

  renderChecklist();
  updateMonthlySummaryModal();
  triggerAutoSave();

  bootstrap.Modal.getInstance(document.getElementById('newChecklistItemModal')).hide();
  document.getElementById('checkTask').value = '';
  document.getElementById('checkDeadline').value = '';
  showToast('Nuevo hito agregado al checklist');
}

function renderVisionBoardCards() {
  const container = document.getElementById('visionBoardCardsContainer');
  if (!container) return;
  container.innerHTML = '';
  appState.visionBoard.cards.forEach((card, idx) => {
    const col = document.createElement('div');
    col.className = 'col-sm-6';
    col.innerHTML = `
      <div class="vb-polaroid h-100 position-relative">
        <button class="btn btn-sm btn-outline-danger border-0 rounded-circle position-absolute top-0 end-0 m-2" onclick="deleteVisionCard(${idx})">
          <i class="bi bi-x-lg"></i>
        </button>
        <div class="vb-photo-placeholder" style="background: ${card.gradient || 'linear-gradient(135deg, #f43f5e 0%, #ec4899 100%)'};">
          <i class="bi ${card.icon || 'bi-heart-fill'}"></i>
        </div>
        <span class="badge bg-dark-subtle text-dark rounded-pill px-2 py-1 small mb-1">${card.badge || 'Recuerdo'}</span>
        <h6 class="fw-bold text-dark mb-1">${card.title}</h6>
        <p class="small text-muted mb-0">${card.description}</p>
      </div>
    `;
    container.appendChild(col);
  });
}

function addVisionBoardCard() {
  const title = document.getElementById('vbTitle').value.trim();
  const badge = document.getElementById('vbBadge').value.trim() || 'Hito';
  const desc = document.getElementById('vbDesc').value.trim();

  if (!title) {
    showAppAlert('Título requerido', 'Por favor ingresa un título para el momento.');
    return;
  }

  const gradients = [
    'linear-gradient(135deg, #ff758c 0%, #ff7eb3 100%)',
    'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
    'linear-gradient(135deg, #f6d365 0%, #fda085 100%)',
    'linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%)',
    'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
  ];

  appState.visionBoard.cards.push({
    id: Date.now(),
    title,
    badge,
    description: desc || 'Visualizando este instante juntos.',
    gradient: gradients[Math.floor(Math.random() * gradients.length)],
    icon: 'bi-stars'
  });

  renderVisionBoardCards();
  triggerAutoSave();

  bootstrap.Modal.getInstance(document.getElementById('newVisionCardModal')).hide();
  document.getElementById('vbTitle').value = '';
  document.getElementById('vbDesc').value = '';
  showToast('Nuevo momento agregado al Vision Board');
}

function deleteVisionCard(idx) {
  showAppConfirm(
    'Eliminar Momento',
    '¿Deseas retirar esta tarjeta del Vision Board?',
    () => {
      appState.visionBoard.cards.splice(idx, 1);
      renderVisionBoardCards();
      triggerAutoSave();
    }
  );
}

function triggerCelebration() {
  if (typeof confetti === 'function') {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });
  }
}

// ------------------------------------------------------------
// MODULE 6: AGENDA DE CITAS (CARDS & TABLE MODES + .ICS EXPORT)
// ------------------------------------------------------------

function setDateViewMode(mode) {
  currentDateViewMode = mode;
  const btnCards = document.getElementById('btnDateViewCards');
  const btnTable = document.getElementById('btnDateViewTable');
  const cardsWrap = document.getElementById('datesCardsWrap');
  const tableWrap = document.getElementById('datesTableWrap');

  if (mode === 'cards') {
    btnCards.className = 'btn btn-sm rounded-pill active fw-semibold';
    btnTable.className = 'btn btn-sm rounded-pill fw-semibold text-secondary';
    cardsWrap.classList.remove('d-none');
    tableWrap.classList.add('d-none');
  } else {
    btnTable.className = 'btn btn-sm rounded-pill active fw-semibold';
    btnCards.className = 'btn btn-sm rounded-pill fw-semibold text-secondary';
    tableWrap.classList.remove('d-none');
    cardsWrap.classList.add('d-none');
  }

  renderDatesAgenda();
}

function renderDatesAgenda() {
  const cardsContainer = document.getElementById('datesCardsContainer');
  const tbody = document.getElementById('datesAgendaTableBody');

  if (cardsContainer) cardsContainer.innerHTML = '';
  if (tbody) tbody.innerHTML = '';

  const dates = appState.datesAgenda || [];

  if (dates.length === 0) {
    if (cardsContainer) cardsContainer.innerHTML = `<div class="col-12 text-center text-muted p-4">No hay citas programadas aún. ¡Usa el botón para crear una o elige de la Bóveda!</div>`;
    return;
  }

  dates.forEach((d, idx) => {
    // 1. Render Cards Mode
    if (cardsContainer) {
      const col = document.createElement('div');
      col.className = 'col-12 col-md-6 col-xl-4';

      let statusColor = d.status === 'Confirmada' ? 'bg-success text-white' : (d.status === 'Realizada' ? 'bg-info text-dark' : 'bg-warning text-dark');

      col.innerHTML = `
        <div class="date-ticket-card h-100 d-flex flex-column justify-content-between">
          <div>
            <div class="d-flex justify-content-between align-items-center mb-2">
              <span class="badge ${statusColor} rounded-pill px-3 py-1 cursor-pointer" onclick="cycleAgendaDateStatus(${idx})" title="Clic para cambiar estado">
                ${d.status}
              </span>
              <span class="badge bg-light text-secondary border rounded-pill px-2 py-1 small">
                ${d.modality}
              </span>
            </div>

            <h5 class="fw-bold text-dark mb-1">${d.activity}</h5>
            <div class="text-primary fw-semibold small mb-2">
              <i class="bi bi-clock me-1"></i>${d.day} a las ${d.time} hrs
            </div>

            <div class="small text-muted mb-2">
              <i class="bi bi-display me-1"></i>Plataforma: <strong>${d.platform}</strong>
            </div>

            ${d.notes ? `<div class="p-2 bg-light rounded-3 small text-muted fst-italic mb-3"><i class="bi bi-chat-quote me-1"></i>${d.notes}</div>` : ''}
          </div>

          <div class="pt-2 border-top d-flex justify-content-between align-items-center gap-2">
            <button class="btn btn-sm btn-outline-primary rounded-pill px-3 d-flex align-items-center gap-1" onclick="downloadDateIcs(${idx})" title="Descargar recordatorio para Google Calendar o Apple Calendar">
              <i class="bi bi-calendar-plus"></i> Google Cal
            </button>
            <button class="btn btn-sm btn-outline-danger border-0 rounded-circle" onclick="deleteAgendaDate(${idx})" title="Eliminar cita">
              <i class="bi bi-trash"></i>
            </button>
          </div>
        </div>
      `;
      cardsContainer.appendChild(col);
    }

    // 2. Render Table Mode
    if (tbody) {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>
          <span class="fw-bold text-dark">${d.day}</span>
          <div class="small text-muted">${d.date || ''}</div>
        </td>
        <td class="fw-semibold text-primary">${d.time}</td>
        <td>
          <div class="fw-bold text-dark">${d.activity}</div>
        </td>
        <td><span class="badge bg-light text-secondary border rounded-pill px-2">${d.modality}</span></td>
        <td><span class="small text-muted"><i class="bi bi-display me-1"></i>${d.platform}</span></td>
        <td>
          <span class="badge rounded-pill ${d.status === 'Confirmada' ? 'bg-success' : (d.status === 'Realizada' ? 'bg-info text-dark' : 'bg-warning text-dark')} cursor-pointer" onclick="cycleAgendaDateStatus(${idx})">
            ${d.status}
          </span>
        </td>
        <td class="small text-muted">${d.notes || '—'}</td>
        <td class="text-end">
          <button class="btn btn-sm btn-outline-primary border-0 rounded-circle me-1" onclick="downloadDateIcs(${idx})" title="Descargar recordatorio para calendario">
            <i class="bi bi-calendar-plus"></i>
          </button>
          <button class="btn btn-sm btn-outline-danger border-0 rounded-circle" onclick="deleteAgendaDate(${idx})" title="Eliminar cita">
            <i class="bi bi-trash"></i>
          </button>
        </td>
      `;
      tbody.appendChild(tr);
    }
  });
}

function cycleAgendaDateStatus(idx) {
  const item = appState.datesAgenda[idx];
  const states = ['Confirmada', 'Tentativa', 'Realizada'];
  const curIdx = states.indexOf(item.status);
  item.status = states[(curIdx + 1) % states.length];
  renderDatesAgenda();
  triggerAutoSave();
}

function deleteAgendaDate(idx) {
  showAppConfirm(
    'Eliminar Cita',
    '¿Deseas eliminar esta cita de la agenda semanal?',
    () => {
      appState.datesAgenda.splice(idx, 1);
      renderDatesAgenda();
      updateMonthlySummaryModal();
      triggerAutoSave();
    }
  );
}

// Download calendar event file (.ics)
function downloadDateIcs(idx) {
  const d = appState.datesAgenda[idx];
  if (!d) return;

  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');

  const timeClean = (d.time || '20:00').replace(':', '') + '00';
  const startDt = `${year}${month}${day}T${timeClean}`;
  const endDt = `${year}${month}${day}T${String(parseInt(timeClean.slice(0, 2), 10) + 1).padStart(2, '0')}${timeClean.slice(2)}`;

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Juan & Nathy//Horario y Todo//ES',
    'BEGIN:VEVENT',
    `SUMMARY:💖 Cita: ${d.activity}`,
    `DESCRIPTION:${d.notes || 'Cita de pareja a distancia'} (${d.platform})`,
    `LOCATION:${d.platform || 'Videollamada'}`,
    `DTSTART:${startDt}`,
    `DTEND:${endDt}`,
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `cita_${d.activity.toLowerCase().replace(/[^a-z0-9]/g, '_')}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  showToast('📅 Archivo de calendario (.ics) descargado. Ábrelo para añadirlo a Google Calendar o Apple Calendar.');
}

function addAgendaDate() {
  const activity = document.getElementById('dateActivity').value.trim();
  const day = document.getElementById('dateDay').value;
  const time = document.getElementById('dateTime').value;
  const modality = document.getElementById('dateModality').value;
  const platform = document.getElementById('datePlatform').value.trim();
  const notes = document.getElementById('dateNotes').value.trim();

  if (!activity) {
    showAppAlert('Título requerido', 'Por favor ingresa el título de la cita.');
    return;
  }

  appState.datesAgenda.push({
    id: Date.now(),
    day,
    date: new Date().toISOString().slice(0, 10),
    time,
    activity,
    modality,
    platform: platform || 'Videollamada',
    status: 'Confirmada',
    notes
  });

  renderDatesAgenda();
  updateMonthlySummaryModal();
  triggerAutoSave();

  bootstrap.Modal.getInstance(document.getElementById('newDateModal')).hide();
  document.getElementById('dateActivity').value = '';
  document.getElementById('dateNotes').value = '';
  showToast('Cita programada con éxito');
}

// ------------------------------------------------------------
// MODULE 7: BÓVEDA DE CITAS A DISTANCIA
// ------------------------------------------------------------

function filterVaultModalities(mod, btn) {
  currentVaultFilter = mod;
  document.querySelectorAll('#tab-boveda .btn-outline-secondary, #tab-boveda .btn-outline-primary, #tab-boveda .btn-outline-info, #tab-boveda .btn-outline-success, #tab-boveda .btn-outline-warning').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderVault();
}

function renderVault() {
  const container = document.getElementById('vaultIdeasContainer');
  if (!container) return;
  container.innerHTML = '';
  document.getElementById('weeklyMissionText').textContent = appState.datesVault.weeklyMission;

  const ideas = appState.datesVault.ideas.filter(idea => currentVaultFilter === 'ALL' || idea.modality === currentVaultFilter);

  ideas.forEach(idea => {
    const col = document.createElement('div');
    col.className = 'col-sm-6 col-lg-4 col-xl-3';
    col.innerHTML = `
      <div class="card border-0 shadow-sm rounded-4 p-3 h-100 d-flex flex-column justify-content-between">
        <div>
          <div class="d-flex justify-content-between align-items-center mb-2">
            <span class="badge ${idea.badgeColor || 'bg-primary'} rounded-pill px-3 py-1">${idea.modality}</span>
            <span class="small text-muted"><i class="bi bi-clock me-1"></i>${idea.duration}</span>
          </div>
          <h6 class="fw-bold text-dark mb-2">${idea.title}</h6>
          <p class="small text-muted mb-2">${idea.description}</p>
          <div class="p-2 bg-light rounded-3 small text-secondary fst-italic mb-3">
            <i class="bi bi-lightbulb-fill text-warning me-1"></i>${idea.tip}
          </div>
        </div>
        <button class="btn btn-sm btn-outline-danger w-100 rounded-pill d-flex align-items-center justify-content-center gap-1 shadow-none" onclick="scheduleIdeaFromVault('${idea.title}', '${idea.modality}', '${idea.tip}')">
          <i class="bi bi-calendar-plus"></i> Agendar esta semana
        </button>
      </div>
    `;
    container.appendChild(col);
  });
}

function scheduleIdeaFromVault(title, modality, tip) {
  appState.datesAgenda.push({
    id: Date.now(),
    day: "Viernes",
    date: new Date().toISOString().slice(0, 10),
    time: "21:00",
    activity: title,
    modality,
    platform: modality === 'Online' ? 'Steam / Discord' : (modality === 'Delivery' ? 'UberEats' : 'Google Meet'),
    status: "Confirmada",
    notes: tip
  });

  renderDatesAgenda();
  updateMonthlySummaryModal();
  triggerAutoSave();

  switchToTab('tab-agenda');
  showToast(`¡"${title}" ha sido agregada a la Agenda de Citas!`);
}

function spinDateRoulette() {
  const ideas = appState.datesVault.ideas;
  if (!ideas || ideas.length === 0) return;

  const randomIdea = ideas[Math.floor(Math.random() * ideas.length)];
  triggerCelebration();

  showAppConfirm(
    '🎲 ¡La Ruleta eligió una cita!',
    `"${randomIdea.title}" (${randomIdea.modality})\n\n${randomIdea.description}\n\n¿Deseas agendarla ahora mismo para este fin de semana?`,
    () => {
      scheduleIdeaFromVault(randomIdea.title, randomIdea.modality, randomIdea.tip);
    },
    '🎲'
  );
}

function editWeeklyMission() {
  const current = appState.datesVault.weeklyMission;
  showAppPrompt(
    'Misión Semanal de la Pareja',
    'Escribe el nuevo objetivo para la Misión Semanal de Juan y Nathy:',
    current,
    (nuevo) => {
      if (nuevo && nuevo.trim()) {
        appState.datesVault.weeklyMission = nuevo.trim();
        document.getElementById('weeklyMissionText').textContent = nuevo.trim();
        triggerAutoSave();
        showToast('Misión semanal actualizada');
      }
    },
    '⭐'
  );
}

function addVaultIdea() {
  const title = document.getElementById('vaultTitle').value.trim();
  const modality = document.getElementById('vaultModality').value;
  const duration = document.getElementById('vaultDuration').value.trim() || '1.5 horas';
  const description = document.getElementById('vaultDescription').value.trim();
  const tip = document.getElementById('vaultTip').value.trim();

  if (!title || !description) {
    showAppAlert('Datos incompletos', 'Ingresa un título y descripción para la idea.');
    return;
  }

  appState.datesVault.ideas.push({
    id: Date.now(),
    title,
    modality,
    duration,
    description,
    tip: tip || 'Disfrutar al máximo juntos.',
    badgeColor: 'bg-primary'
  });

  renderVault();
  triggerAutoSave();

  bootstrap.Modal.getInstance(document.getElementById('newVaultIdeaModal')).hide();
  document.getElementById('vaultTitle').value = '';
  document.getElementById('vaultDescription').value = '';
  document.getElementById('vaultTip').value = '';
  showToast('Nueva idea agregada a la Bóveda');
}

// ------------------------------------------------------------
// MODULE 8: MONTHLY SUMMARY & CHARTS
// ------------------------------------------------------------

function updateMonthlySummaryModal() {
  if (!appState) return;

  const kpis = computeWeeklyKPIs();
  const monthlyProjectedHours = (kpis.totalConnection * 4.33).toFixed(1);
  const totalDates = appState.datesAgenda.length;
  const fin = appState.finances;

  document.getElementById('mSumHours').textContent = `${monthlyProjectedHours} h`;
  document.getElementById('mSumDates').textContent = `${totalDates} citas`;
  document.getElementById('mSumSaved').textContent = `$${fin.goal.savedUSD.toLocaleString()} USD`;

  const checklistTotal = appState.visionBoard.checklist.length;
  const checklistDone = appState.visionBoard.checklist.filter(c => c.completed).length;
  const checklistPct = checklistTotal > 0 ? Math.round((checklistDone / checklistTotal) * 100) : 0;
  document.getElementById('mSumChecklist').textContent = `${checklistPct}%`;

  renderCharts(kpis);
}

function renderCharts(kpis) {
  // Chart 1: Time distribution
  let dormir = 0, trabajo = 0, transito = 0, ocupado = 0, libre = 0, cita = 0;
  appState.schedules.days.forEach(day => {
    appState.schedules.hours.forEach(hour => {
      const act = appState.schedules.juan[day][hour];
      if (act.includes('Dormir')) dormir++;
      else if (act.includes('Trabajo')) trabajo++;
      else if (act.includes('Tránsito')) transito++;
      else if (act.includes('Ocupado')) ocupado++;
      else if (act.includes('Cita')) cita++;
      else libre++;
    });
  });

  const ctxTime = document.getElementById('timeDistributionChart')?.getContext('2d');
  if (ctxTime) {
    if (timeDistChart) timeDistChart.destroy();
    timeDistChart = new Chart(ctxTime, {
      type: 'doughnut',
      data: {
        labels: ['Dormir', 'Trabajo/Estudio', 'En Tránsito', 'Ocupado', 'Libre', 'Citas de Pareja'],
        datasets: [{
          data: [dormir, trabajo, transito, ocupado, libre, cita],
          backgroundColor: ['#475569', '#f59e0b', '#3b82f6', '#8b5cf6', '#10b981', '#ec4899']
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { boxWidth: 12 } }
        }
      }
    });
  }

  // Chart 2: Expenses by category
  const catMap = {};
  appState.finances.expenses.forEach(e => {
    catMap[e.category] = (catMap[e.category] || 0) + e.amountUSD;
  });

  const ctxExp = document.getElementById('expensesCategoryChart')?.getContext('2d');
  if (ctxExp) {
    if (expCatChart) expCatChart.destroy();
    expCatChart = new Chart(ctxExp, {
      type: 'bar',
      data: {
        labels: Object.keys(catMap),
        datasets: [{
          label: 'USD ($)',
          data: Object.values(catMap),
          backgroundColor: ['#6366f1', '#ec4899', '#10b981', '#f59e0b', '#3b82f6', '#8b5cf6', '#64748b'],
          borderRadius: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: { beginAtZero: true }
        }
      }
    });
  }
}

// ------------------------------------------------------------
// CONFIGURATION & BACKUP IMPORT
// ------------------------------------------------------------

function renderConfigModal() {
  document.getElementById('configReunionDate').value = appState.config.reunionDate.slice(0, 16);
  document.getElementById('configReunionLocation').value = appState.config.reunionLocation;
  document.getElementById('configExchangeRate').value = appState.config.exchangeRate;
}

function saveConfiguration() {
  const newDate = document.getElementById('configReunionDate').value;
  const newLoc = document.getElementById('configReunionLocation').value.trim();
  const newRate = parseFloat(document.getElementById('configExchangeRate').value) || 3.75;

  if (newDate) appState.config.reunionDate = newDate;
  if (newLoc) appState.config.reunionLocation = newLoc;
  appState.config.exchangeRate = newRate;

  renderAllModules();
  triggerAutoSave();

  bootstrap.Modal.getInstance(document.getElementById('configModal')).hide();
  showToast('Parámetros de configuración actualizados');
}

async function handleImportFile() {
  const fileInput = document.getElementById('jsonFileInput');
  if (!fileInput.files.length) {
    showAppAlert('Archivo no seleccionado', 'Por favor selecciona un archivo .json');
    return;
  }

  const file = fileInput.files[0];
  const reader = new FileReader();

  reader.onload = async (e) => {
    try {
      const parsed = JSON.parse(e.target.result);
      const res = await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed)
      });
      const result = await res.json();
      if (result.success) {
        appState = result.data;
        renderAllModules();
        bootstrap.Modal.getInstance(document.getElementById('importModal')).hide();
        showToast('¡Copia de seguridad restaurada exitosamente!');
      } else {
        showAppAlert('Error al importar', result.message);
      }
    } catch (err) {
      showAppAlert('Formato inválido', 'El archivo seleccionado no es un JSON válido.');
    }
  };

  reader.readAsText(file);
}

// ------------------------------------------------------------
// CUSTOM APP DIALOG MODAL (REPLACES NATIVE ALERT/CONFIRM/PROMPT)
// ------------------------------------------------------------

function showAppAlert(title, message, icon = '💖') {
  document.getElementById('customModalIcon').textContent = icon;
  document.getElementById('customModalTitle').textContent = title;
  document.getElementById('customModalMessage').textContent = message;
  document.getElementById('customModalInputWrap').classList.add('d-none');
  document.getElementById('customModalCancelBtn').classList.add('d-none');

  const confirmBtn = document.getElementById('customModalConfirmBtn');
  confirmBtn.textContent = 'Entendido';
  confirmBtn.onclick = () => {
    bootstrap.Modal.getInstance(document.getElementById('customAppModal')).hide();
  };

  const modal = new bootstrap.Modal(document.getElementById('customAppModal'));
  modal.show();
}

function showAppConfirm(title, message, onConfirm, icon = '❓') {
  document.getElementById('customModalIcon').textContent = icon;
  document.getElementById('customModalTitle').textContent = title;
  document.getElementById('customModalMessage').textContent = message;
  document.getElementById('customModalInputWrap').classList.add('d-none');
  document.getElementById('customModalCancelBtn').classList.remove('d-none');

  const confirmBtn = document.getElementById('customModalConfirmBtn');
  confirmBtn.textContent = 'Confirmar';
  confirmBtn.onclick = () => {
    bootstrap.Modal.getInstance(document.getElementById('customAppModal')).hide();
    if (typeof onConfirm === 'function') onConfirm();
  };

  const modal = new bootstrap.Modal(document.getElementById('customAppModal'));
  modal.show();
}

function showAppPrompt(title, message, defaultValue = '', onConfirm, icon = '✏️') {
  document.getElementById('customModalIcon').textContent = icon;
  document.getElementById('customModalTitle').textContent = title;
  document.getElementById('customModalMessage').textContent = message;

  const inputWrap = document.getElementById('customModalInputWrap');
  const inputEl = document.getElementById('customModalInput');
  inputWrap.classList.remove('d-none');
  inputEl.value = defaultValue;

  document.getElementById('customModalCancelBtn').classList.remove('d-none');

  const confirmBtn = document.getElementById('customModalConfirmBtn');
  confirmBtn.textContent = 'Aceptar';
  confirmBtn.onclick = () => {
    const val = inputEl.value;
    bootstrap.Modal.getInstance(document.getElementById('customAppModal')).hide();
    if (typeof onConfirm === 'function') onConfirm(val);
  };

  const modal = new bootstrap.Modal(document.getElementById('customAppModal'));
  modal.show();
  setTimeout(() => inputEl.focus(), 250);
}

// Helper: Toast Notifications
function showToast(msg, type = 'success') {
  const toastEl = document.getElementById('liveToast');
  const toastMsg = document.getElementById('toastMessage');
  const iconClass = type === 'success' ? 'bi-check-circle-fill text-success' : (type === 'danger' ? 'bi-exclamation-triangle-fill text-danger' : 'bi-info-circle-fill text-info');
  toastMsg.innerHTML = `<i class="bi ${iconClass} fs-5"></i> ${msg}`;
  const toast = new bootstrap.Toast(toastEl, { delay: 3500 });
  toast.show();
}

// Helper: Tab Switching
function switchToTab(tabId) {
  const triggerEl = document.querySelector(`[data-bs-target="#${tabId}"]`);
  if (triggerEl) {
    const tab = new bootstrap.Tab(triggerEl);
    tab.show();
  }
}
