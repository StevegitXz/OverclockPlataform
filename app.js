const COLORS = ['#8B5CF6', '#EF4444', '#EAB308', '#FB923C', '#22D3EE', '#10B981', '#F472B6'];

const defaultState = {
  subjects: [],
  sessions: [],
  settings: {
    dailyGoalMinutes: 240
  }
};

let state = structuredClone(defaultState);
let weeklyChart = null;
let subjectToDeleteId = null;
let selectedSubjectColor = COLORS[0];
let currentUser = null;
let supabaseClient = null;
let authSubscription = null;

const timerState = {
  intervalId: null,
  startedAt: null,
  startedAtIso: null,
  subjectId: null,
  notes: '',
  elapsedSeconds: 0
};

const dom = {};

document.addEventListener('DOMContentLoaded', async () => {
  cacheDom();
  bindEvents();
  initSupabase();
  lucide.createIcons();
  renderAll();
  await bootstrapAuth();
});

function cacheDom() {
  dom.views = document.querySelectorAll('.view-content');
  dom.navLinks = document.querySelectorAll('.nav-link');

  dom.dashboardToday = document.getElementById('dashboard-today');
  dom.dashboardWeek = document.getElementById('dashboard-week');
  dom.dashboardMonth = document.getElementById('dashboard-month');
  dom.dashboardGoal = document.getElementById('dashboard-goal');
  dom.dashboardStreak = document.getElementById('dashboard-streak');
  dom.lastSessionText = document.getElementById('last-session-text');
  dom.topSubjectText = document.getElementById('top-subject-text');
  dom.goToTimerBtn = document.getElementById('go-to-timer-btn');

  dom.subjectSelect = document.getElementById('subject-select');
  dom.timerHeroSubject = document.getElementById('timer-hero-subject');
  dom.timerGoalPill = document.getElementById('timer-goal-pill');
  dom.timerNotes = document.getElementById('timer-notes');
  dom.timerFeedback = document.getElementById('timer-feedback');
  dom.startTimerBtn = document.getElementById('start-timer-btn');
  dom.cancelTimerBtn = document.getElementById('cancel-timer-btn');
  dom.finishTimerBtn = document.getElementById('finish-timer-btn');
  dom.timerDisplay = document.getElementById('timer-display');
  dom.activeSubjectLabel = document.getElementById('active-subject-label');
  dom.focusGoalText = document.getElementById('focus-goal-text');
  dom.focusNotesText = document.getElementById('focus-notes-text');
  dom.finishedTimeDisplay = document.getElementById('finished-time-display');
  dom.finishedSessionSummary = document.getElementById('finished-session-summary');
  dom.backToDashboardBtn = document.getElementById('back-to-dashboard-btn');
  dom.newSessionBtn = document.getElementById('new-session-btn');

  dom.timerSetupView = document.getElementById('view-timer-setup');
  dom.timerActiveView = document.getElementById('view-timer-active');
  dom.timerFinishedView = document.getElementById('view-timer-finished');
  dom.focusBlob = document.getElementById('focus-blob');
  dom.focusMeta = document.getElementById('focus-meta');

  dom.subjectEditId = document.getElementById('subject-edit-id');
  dom.subjectName = document.getElementById('subject-name');
  dom.colorSwatches = document.querySelectorAll('.color-swatch');
  dom.cancelSubjectBtn = document.getElementById('cancel-subject-btn');
  dom.saveSubjectBtn = document.getElementById('save-subject-btn');
  dom.subjectFormFeedback = document.getElementById('subject-form-feedback');
  dom.subjectsList = document.getElementById('subjects-list');
  dom.subjectCountPill = document.getElementById('subject-count-pill');
  dom.sessionsCountPill = document.getElementById('sessions-count-pill');
  dom.recentSessions = document.getElementById('recent-sessions');

  dom.goalHoursInput = document.getElementById('goal-hours');
  dom.saveGoalBtn = document.getElementById('save-goal-btn');
  dom.goalFeedback = document.getElementById('goal-feedback');
  dom.goalProgressFill = document.getElementById('goal-progress-fill');
  dom.goalProgressPercent = document.getElementById('goal-progress-percent');

  dom.deleteModal = document.getElementById('delete-modal');
  dom.deleteMateriaName = document.getElementById('delete-materia-name');
  dom.closeDeleteModalBtn = document.getElementById('close-delete-modal-btn');
  dom.confirmDeleteBtn = document.getElementById('confirm-delete-btn');

  dom.authGuard = document.getElementById('auth-guard');
  dom.authEmail = document.getElementById('auth-email');
  dom.authSendLinkBtn = document.getElementById('auth-send-link-btn');
  dom.authFeedback = document.getElementById('auth-feedback');
  dom.authStatusPill = document.getElementById('auth-status-pill');
  dom.authUserEmail = document.getElementById('auth-user-email');
  dom.signOutBtn = document.getElementById('sign-out-btn');
}

function bindEvents() {
  dom.navLinks.forEach(link => {
    link.addEventListener('click', () => showView(link.dataset.viewTarget));
  });

  dom.goToTimerBtn.addEventListener('click', () => showView('timer'));
  dom.subjectSelect.addEventListener('change', updateTimerHeroSubject);
  dom.startTimerBtn.addEventListener('click', startTimer);
  dom.cancelTimerBtn.addEventListener('click', cancelTimer);
  dom.finishTimerBtn.addEventListener('click', finishTimer);
  dom.backToDashboardBtn.addEventListener('click', () => showView('dashboard'));
  dom.newSessionBtn.addEventListener('click', () => {
    resetTimerUi();
    showView('timer');
  });

  dom.colorSwatches.forEach(btn => {
    btn.addEventListener('click', () => selectColor(btn.dataset.color));
  });

  dom.cancelSubjectBtn.addEventListener('click', clearSubjectForm);
  dom.saveSubjectBtn.addEventListener('click', saveSubject);
  dom.saveGoalBtn.addEventListener('click', saveGoal);

  dom.closeDeleteModalBtn.addEventListener('click', closeDeleteModal);
  dom.confirmDeleteBtn.addEventListener('click', confirmDelete);
  dom.deleteModal.addEventListener('click', (event) => {
    if (event.target === dom.deleteModal) closeDeleteModal();
  });

  dom.authSendLinkBtn.addEventListener('click', requestMagicLink);
  dom.signOutBtn.addEventListener('click', signOut);
  dom.authEmail.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') requestMagicLink();
  });
}

function initSupabase() {
  const config = window.OVERCLOCK_SUPABASE_CONFIG;
  if (!config?.projectUrl || !config?.publishableKey) {
    showFeedback(dom.authFeedback, 'Preencha o arquivo supabase-config.js antes de iniciar.', false);
    setSyncStatus('Configurar Supabase', 'error');
    return;
  }

  supabaseClient = window.supabase.createClient(config.projectUrl, config.publishableKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    },
    global: {
      headers: {
        'x-application-name': 'overclock-web'
      }
    }
  });
}

async function bootstrapAuth() {
  if (!supabaseClient) return;

  setSyncStatus('Aguardando login', 'idle');

  const { data } = supabaseClient.auth.onAuthStateChange((event) => {
    setTimeout(() => {
      handleAuthEvent(event).catch((error) => {
        console.error('Falha ao processar evento de autenticação:', error);
      });
    }, 0);
  });
  authSubscription = data.subscription;

  await refreshCurrentUser();
}

async function handleAuthEvent(event) {
  if (event === 'SIGNED_OUT') {
    await applyUser(null);
    return;
  }

  if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'USER_UPDATED') {
    await refreshCurrentUser();
  }
}

async function refreshCurrentUser() {
  if (!supabaseClient) return;
  const { data, error } = await supabaseClient.auth.getUser();
  if (error) {
    console.error('Falha ao verificar usuário autenticado:', error);
    await applyUser(null);
    return;
  }

  await applyUser(data.user ?? null);
}

async function applyUser(user) {
  const previousUserId = currentUser?.id ?? null;
  currentUser = user;
  updateAuthUi();

  if (!currentUser) {
    stopTimerInterval();
    resetTimerUi();
    clearRemoteState();
    renderAll();
    return;
  }

  if (previousUserId !== currentUser.id || !state.subjects.length && !state.sessions.length) {
    await loadRemoteState();
  } else {
    renderAll();
    setSyncStatus('Sincronizado', 'success');
  }
}

function clearRemoteState() {
  state = structuredClone(defaultState);
  selectedSubjectColor = COLORS[0];
  currentUser = null;
}

async function requestMagicLink() {
  hideFeedback(dom.authFeedback);

  if (!supabaseClient) {
    showFeedback(dom.authFeedback, 'Supabase não configurado corretamente.', false);
    return;
  }

  if (window.location.protocol === 'file:') {
    showFeedback(dom.authFeedback, 'Abra o projeto com Live Server ou publique no GitHub Pages. Magic link não redireciona para file://.', false);
    return;
  }

  const email = dom.authEmail.value.trim().toLowerCase();
  if (!email || !email.includes('@')) {
    showFeedback(dom.authFeedback, 'Digite um e-mail válido.', false);
    return;
  }

  setButtonBusy(dom.authSendLinkBtn, true, 'Enviando...');
  setSyncStatus('Enviando link', 'busy');

  const redirectTo = `${window.location.origin}${window.location.pathname}`;
  const { error } = await supabaseClient.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: redirectTo
    }
  });

  setButtonBusy(dom.authSendLinkBtn, false, 'Enviar magic link');

  if (error) {
    console.error(error);
    showFeedback(dom.authFeedback, `Não foi possível enviar o link: ${error.message}`, false);
    setSyncStatus('Falha no login', 'error');
    return;
  }

  showFeedback(dom.authFeedback, 'Magic link enviado. Abra o e-mail no PC ou no celular e volte para o Overclock.', true);
  setSyncStatus('Link enviado', 'idle');
}

async function signOut() {
  if (!supabaseClient) return;
  setButtonBusy(dom.signOutBtn, true, 'Saindo...');
  const { error } = await supabaseClient.auth.signOut();
  setButtonBusy(dom.signOutBtn, false, 'Sair');
  if (error) {
    console.error(error);
    showFeedback(dom.authFeedback, `Não foi possível sair: ${error.message}`, false);
  }
}

function updateAuthUi() {
  if (currentUser) {
    dom.authGuard.classList.add('hidden');
    dom.authUserEmail.textContent = currentUser.email ?? 'Sessão autenticada';
    dom.signOutBtn.classList.remove('hidden');
    if (!dom.authStatusPill.textContent || dom.authStatusPill.textContent === 'Aguardando login') {
      setSyncStatus('Sincronizado', 'success');
    }
  } else {
    dom.authGuard.classList.remove('hidden');
    dom.authUserEmail.textContent = 'Entre para sincronizar seus dados';
    dom.signOutBtn.classList.add('hidden');
    setSyncStatus('Aguardando login', 'idle');
  }
}

function setSyncStatus(text, variant = 'idle') {
  dom.authStatusPill.textContent = text;
  dom.authStatusPill.className = 'inline-flex items-center rounded-full px-4 py-2 text-xs font-bold uppercase tracking-[0.22em]';

  if (variant === 'success') {
    dom.authStatusPill.classList.add('bg-emerald-400/20', 'text-emerald-100');
  } else if (variant === 'busy') {
    dom.authStatusPill.classList.add('bg-amber-300/20', 'text-amber-50');
  } else if (variant === 'error') {
    dom.authStatusPill.classList.add('bg-rose-400/20', 'text-rose-100');
  } else {
    dom.authStatusPill.classList.add('bg-white/15', 'text-white/90');
  }
}

function setButtonBusy(button, isBusy, busyText) {
  if (!button.dataset.defaultText) button.dataset.defaultText = button.textContent;
  button.disabled = isBusy;
  button.classList.toggle('opacity-60', isBusy);
  button.classList.toggle('cursor-not-allowed', isBusy);
  button.textContent = isBusy ? busyText : button.dataset.defaultText;
}

async function loadRemoteState() {
  if (!supabaseClient || !currentUser) return;

  setSyncStatus('Sincronizando', 'busy');
  hideFeedback(dom.authFeedback);

  const userId = currentUser.id;

  const [subjectsRes, sessionsRes, settingsRes] = await Promise.all([
    supabaseClient
      .from('subjects')
      .select('id, name, color, created_at, user_id')
      .eq('user_id', userId)
      .order('created_at', { ascending: true }),
    supabaseClient
      .from('study_sessions')
      .select('id, subject_id, duration_seconds, notes, created_at, started_at, ended_at, user_id')
      .eq('user_id', userId)
      .order('created_at', { ascending: false }),
    supabaseClient
      .from('app_settings')
      .select('daily_goal_minutes')
      .eq('user_id', userId)
      .limit(1)
  ]);

  const error = subjectsRes.error || sessionsRes.error || settingsRes.error;
  if (error) {
    console.error('Falha ao sincronizar dados:', error);
    showFeedback(dom.authFeedback, `Não consegui sincronizar com o Supabase: ${error.message}`, false);
    setSyncStatus('Erro de sincronização', 'error');
    return;
  }

  state = {
    subjects: (subjectsRes.data || []).map(subject => ({
      id: subject.id,
      name: subject.name,
      color: subject.color
    })),
    sessions: (sessionsRes.data || []).map(session => ({
      id: session.id,
      subjectId: session.subject_id,
      durationSeconds: session.duration_seconds,
      notes: session.notes || '',
      createdAt: session.created_at,
      startedAt: session.started_at,
      endedAt: session.ended_at
    })),
    settings: {
      dailyGoalMinutes: Number(settingsRes.data?.[0]?.daily_goal_minutes) >= 0
        ? Number(settingsRes.data[0].daily_goal_minutes)
        : defaultState.settings.dailyGoalMinutes
    }
  };

  selectedSubjectColor = state.subjects[0]?.color ?? COLORS[0];
  renderAll();
  setSyncStatus('Sincronizado', 'success');
}

function showView(viewId) {
  document.body.classList.remove('focus-mode', 'finished-mode');

  dom.views.forEach(view => view.classList.remove('active'));
  dom.navLinks.forEach(link => link.classList.remove('active'));

  document.getElementById(`view-${viewId}`).classList.add('active');
  document.getElementById(`nav-${viewId}`).classList.add('active');

  if (viewId !== 'timer' && timerState.intervalId) {
    stopTimerInterval();
    resetTimerUi();
  }

  if (viewId === 'timer') {
    dom.timerSetupView.classList.remove('hidden');
    dom.timerActiveView.classList.add('hidden');
    dom.timerFinishedView.classList.add('hidden');
    dom.focusBlob.classList.remove('blob-pop');
    dom.focusBlob.style.opacity = '1';
    dom.focusMeta.style.opacity = '1';
    updateTimerHeroSubject();
  }
}

function renderAll() {
  renderSubjectOptions();
  renderSubjectsList();
  renderGoalState();
  renderRecentSessions();
  renderDashboard();
  updateTimerHeroSubject();
  lucide.createIcons();
}

function renderSubjectOptions() {
  if (!state.subjects.length) {
    dom.subjectSelect.innerHTML = '<option value="">Cadastre uma matéria primeiro</option>';
    dom.subjectSelect.disabled = true;
    return;
  }

  dom.subjectSelect.disabled = false;
  const currentValue = dom.subjectSelect.value;
  dom.subjectSelect.innerHTML = state.subjects
    .map(subject => `<option value="${subject.id}">${subject.name}</option>`)
    .join('');

  const hasCurrent = state.subjects.some(subject => subject.id === currentValue);
  dom.subjectSelect.value = hasCurrent ? currentValue : state.subjects[0].id;
}

function renderSubjectsList() {
  dom.subjectCountPill.textContent = `${state.subjects.length} ${state.subjects.length === 1 ? 'matéria' : 'matérias'}`;

  if (!state.subjects.length) {
    dom.subjectsList.innerHTML = `
      <div class="empty-state rounded-[2rem] px-6 py-8 text-slate-500 w-full text-center">
        Nenhuma matéria cadastrada ainda.
      </div>
    `;
    return;
  }

  dom.subjectsList.innerHTML = state.subjects.map(subject => `
    <div class="subject-chip text-white pl-6 pr-3 py-3 rounded-full font-medium shadow-sm flex items-center gap-4 group" style="background:${subject.color}">
      <span>${escapeHtml(subject.name)}</span>
      <div class="flex items-center gap-2">
        <button class="subject-edit-btn text-white/70 group-hover:text-white transition-all" data-subject-id="${subject.id}" title="Editar">
          <i data-lucide="pencil" class="w-4 h-4"></i>
        </button>
        <button class="subject-delete-btn text-white/70 group-hover:text-red-100 transition-all" data-subject-id="${subject.id}" title="Excluir">
          <i data-lucide="trash-2" class="w-4 h-4"></i>
        </button>
      </div>
    </div>
  `).join('');

  dom.subjectsList.querySelectorAll('.subject-edit-btn').forEach(button => {
    button.addEventListener('click', () => startEditSubject(button.dataset.subjectId));
  });

  dom.subjectsList.querySelectorAll('.subject-delete-btn').forEach(button => {
    button.addEventListener('click', () => openDeleteModal(button.dataset.subjectId));
  });
}

function renderRecentSessions() {
  dom.sessionsCountPill.textContent = `${state.sessions.length} ${state.sessions.length === 1 ? 'sessão' : 'sessões'}`;

  const recent = [...state.sessions]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 5);

  if (!recent.length) {
    dom.recentSessions.innerHTML = `
      <div class="empty-state rounded-[2rem] px-6 py-8 text-slate-500 text-center">
        Nenhuma sessão salva ainda. Termine sua primeira sessão no timer.
      </div>
    `;
    return;
  }

  dom.recentSessions.innerHTML = recent.map(session => {
    const subject = getSubjectById(session.subjectId);
    const date = new Date(session.createdAt);
    return `
      <div class="session-card bg-slate-50 rounded-[2rem] p-5 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div class="flex items-center gap-3 mb-2">
            <span class="inline-block w-3 h-3 rounded-full" style="background:${subject?.color ?? '#8B5CF6'}"></span>
            <p class="font-bold text-slate-800">${escapeHtml(subject?.name ?? 'Matéria removida')}</p>
          </div>
          <p class="text-slate-500 text-sm">${formatDate(date)} às ${formatClock(date)}</p>
          <p class="text-slate-600 text-sm mt-2">${session.notes ? escapeHtml(session.notes) : 'Sem comentário.'}</p>
        </div>
        <div class="text-right min-w-[100px]">
          <p class="font-black text-lg text-slate-800">${formatDuration(session.durationSeconds)}</p>
          <p class="text-xs uppercase tracking-widest text-slate-400">duração</p>
        </div>
      </div>
    `;
  }).join('');
}

function renderDashboard() {
  const todaySeconds = getTotalSecondsForDay(new Date());
  const weekData = getLast7DaysData();
  const weekSeconds = weekData.reduce((sum, item) => sum + item.totalSeconds, 0);
  const monthSeconds = getCurrentMonthSeconds();
  const streak = calculateStreak();
  const goalSeconds = state.settings.dailyGoalMinutes * 60;
  const topSubject = getTopSubject();
  const lastSession = getLastSession();

  dom.dashboardToday.textContent = formatDuration(todaySeconds);
  dom.dashboardWeek.textContent = formatDuration(weekSeconds);
  dom.dashboardMonth.textContent = formatDuration(monthSeconds);
  dom.dashboardGoal.textContent = formatMinutes(state.settings.dailyGoalMinutes);
  dom.dashboardStreak.textContent = String(streak);
  dom.lastSessionText.textContent = lastSession
    ? `${getSubjectById(lastSession.subjectId)?.name ?? 'Matéria removida'} — ${formatDuration(lastSession.durationSeconds)} em ${formatDate(new Date(lastSession.createdAt))}`
    : 'Nenhuma sessão registrada ainda.';
  dom.topSubjectText.textContent = topSubject
    ? `${topSubject.name} com ${formatDuration(topSubject.totalSeconds)} acumulados.`
    : 'Ainda sem dados suficientes.';

  updateGoalProgress(todaySeconds, goalSeconds);
  renderWeeklyChart(weekData);
}

function renderWeeklyChart(weekData) {
  const ctx = document.getElementById('weeklyChart');
  const labels = weekData.map(item => item.label);
  const values = weekData.map(item => Number((item.totalSeconds / 3600).toFixed(2)));

  if (weeklyChart) weeklyChart.destroy();

  weeklyChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Horas estudadas',
        data: values,
        backgroundColor: values.map(() => 'rgba(139, 92, 246, 0.86)'),
        borderRadius: 18,
        borderSkipped: false,
        maxBarThickness: 44
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label(context) {
              return `${context.raw}h`;
            }
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: '#64748b', font: { weight: 700 } }
        },
        y: {
          beginAtZero: true,
          grid: { color: 'rgba(148, 163, 184, 0.18)' },
          ticks: {
            color: '#94a3b8',
            callback(value) {
              return `${value}h`;
            }
          }
        }
      }
    }
  });
}

function renderGoalState() {
  dom.goalHoursInput.value = state.settings.dailyGoalMinutes ? Number((state.settings.dailyGoalMinutes / 60).toFixed(2)) : '';
  dom.timerGoalPill.textContent = formatMinutes(state.settings.dailyGoalMinutes);
}

function updateGoalProgress(todaySeconds, goalSeconds) {
  const percent = goalSeconds > 0 ? Math.min(100, Math.round((todaySeconds / goalSeconds) * 100)) : 0;
  dom.goalProgressFill.style.height = `${percent}%`;
  dom.goalProgressPercent.textContent = `${percent}%`;
  dom.focusGoalText.textContent = formatDuration(goalSeconds);
}

function updateTimerHeroSubject() {
  const subject = getSubjectById(dom.subjectSelect.value) || state.subjects[0];
  dom.timerHeroSubject.textContent = subject ? subject.name : 'Ready?';
  dom.activeSubjectLabel.textContent = subject ? subject.name.toUpperCase() : '';
}

function startTimer() {
  hideFeedback(dom.timerFeedback);

  if (!currentUser) {
    showFeedback(dom.timerFeedback, 'Entre com seu e-mail para começar a registrar.', false);
    return;
  }

  if (!state.subjects.length) {
    showFeedback(dom.timerFeedback, 'Cadastre uma matéria antes de iniciar.', false);
    showView('materias');
    return;
  }

  const subjectId = dom.subjectSelect.value;
  const subject = getSubjectById(subjectId);
  if (!subject) {
    showFeedback(dom.timerFeedback, 'Selecione uma matéria válida.', false);
    return;
  }

  document.body.classList.remove('finished-mode');
  document.body.classList.add('focus-mode');
  dom.timerSetupView.classList.add('hidden');
  dom.timerActiveView.classList.remove('hidden');
  dom.timerFinishedView.classList.add('hidden');

  timerState.startedAt = Date.now();
  timerState.startedAtIso = new Date().toISOString();
  timerState.subjectId = subjectId;
  timerState.notes = dom.timerNotes.value.trim();
  timerState.elapsedSeconds = 0;

  dom.focusBlob.classList.remove('blob-pop');
  dom.focusBlob.style.opacity = '1';
  dom.focusMeta.style.opacity = '1';
  dom.focusNotesText.textContent = timerState.notes || 'Sem comentário para esta sessão.';
  dom.activeSubjectLabel.textContent = subject.name.toUpperCase();
  dom.focusGoalText.textContent = formatDuration(state.settings.dailyGoalMinutes * 60);
  updateTimerDisplay(0);

  stopTimerInterval();
  timerState.intervalId = setInterval(() => {
    timerState.elapsedSeconds = Math.floor((Date.now() - timerState.startedAt) / 1000);
    updateTimerDisplay(timerState.elapsedSeconds);
  }, 250);
}

function cancelTimer() {
  stopTimerInterval();
  resetTimerUi();
  showView('timer');
}

async function finishTimer() {
  stopTimerInterval();

  if (timerState.elapsedSeconds <= 0 || !timerState.subjectId || !currentUser) {
    resetTimerUi();
    return;
  }

  setButtonBusy(dom.finishTimerBtn, true, 'Salvando...');
  setButtonBusy(dom.cancelTimerBtn, true, '...');
  setSyncStatus('Salvando sessão', 'busy');

  const finishedSession = {
    user_id: currentUser.id,
    subject_id: timerState.subjectId,
    duration_seconds: timerState.elapsedSeconds,
    notes: timerState.notes,
    created_at: new Date().toISOString(),
    started_at: timerState.startedAtIso,
    ended_at: new Date().toISOString()
  };

  const { error } = await supabaseClient.from('study_sessions').insert(finishedSession);

  setButtonBusy(dom.finishTimerBtn, false, 'Parar');
  setButtonBusy(dom.cancelTimerBtn, false, 'Cancelar');

  if (error) {
    console.error(error);
    document.body.classList.remove('focus-mode');
    resetTimerUi();
    showView('timer');
    showFeedback(dom.timerFeedback, `Não foi possível salvar a sessão: ${error.message}`, false);
    setSyncStatus('Erro ao salvar', 'error');
    return;
  }

  createExplosionParticles();
  dom.focusBlob.classList.add('blob-pop');
  dom.focusMeta.style.transition = 'opacity 0.4s ease';
  dom.focusMeta.style.opacity = '0';

  const subjectName = getSubjectById(timerState.subjectId)?.name ?? 'Matéria';
  dom.finishedTimeDisplay.textContent = humanReadableDuration(timerState.elapsedSeconds);
  dom.finishedSessionSummary.textContent = `${subjectName} • ${formatDuration(timerState.elapsedSeconds)}${timerState.notes ? ` • ${timerState.notes}` : ''}`;

  await loadRemoteState();

  setTimeout(() => {
    document.body.classList.remove('focus-mode');
    document.body.classList.add('finished-mode');
    dom.timerActiveView.classList.add('hidden');
    dom.timerFinishedView.classList.remove('hidden');
    resetTimerStateOnly();
  }, 800);
}

function resetTimerStateOnly() {
  timerState.startedAt = null;
  timerState.startedAtIso = null;
  timerState.subjectId = null;
  timerState.notes = '';
  timerState.elapsedSeconds = 0;
  dom.timerNotes.value = '';
  updateTimerDisplay(0);
}

function resetTimerUi() {
  resetTimerStateOnly();
  dom.focusBlob.classList.remove('blob-pop');
  dom.focusBlob.style.opacity = '1';
  dom.focusMeta.style.opacity = '1';

  dom.timerSetupView.classList.remove('hidden');
  dom.timerActiveView.classList.add('hidden');
  dom.timerFinishedView.classList.add('hidden');
}

function stopTimerInterval() {
  if (timerState.intervalId) {
    clearInterval(timerState.intervalId);
    timerState.intervalId = null;
  }
}

function updateTimerDisplay(seconds) {
  dom.timerDisplay.textContent = formatClockFromSeconds(seconds);
}

function createExplosionParticles() {
  const rect = dom.focusBlob.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;

  for (let i = 0; i < 30; i += 1) {
    const particle = document.createElement('div');
    particle.className = 'fragment';
    const size = Math.random() * 15 + 5;
    particle.style.width = `${size}px`;
    particle.style.height = `${size}px`;
    particle.style.left = `${centerX}px`;
    particle.style.top = `${centerY}px`;

    const angle = Math.random() * Math.PI * 2;
    const distance = Math.random() * 400 + 100;
    particle.style.setProperty('--tw-translate-x', `${Math.cos(angle) * distance}px`);
    particle.style.setProperty('--tw-translate-y', `${Math.sin(angle) * distance}px`);
    particle.style.animation = `particle-fly ${Math.random() * 0.5 + 0.5}s forwards cubic-bezier(0, .9, .5, 1)`;

    document.body.appendChild(particle);
    setTimeout(() => particle.remove(), 1000);
  }
}

async function saveSubject() {
  hideFeedback(dom.subjectFormFeedback);

  if (!currentUser) {
    showFeedback(dom.subjectFormFeedback, 'Faça login antes de editar suas matérias.', false);
    return;
  }

  const name = dom.subjectName.value.trim();
  const editId = dom.subjectEditId.value;

  if (!name) {
    showFeedback(dom.subjectFormFeedback, 'Digite um nome para a matéria.', false);
    return;
  }

  const duplicate = state.subjects.find(subject => subject.name.toLowerCase() === name.toLowerCase() && subject.id !== editId);
  if (duplicate) {
    showFeedback(dom.subjectFormFeedback, 'Já existe uma matéria com esse nome.', false);
    return;
  }

  setButtonBusy(dom.saveSubjectBtn, true, 'Salvando...');
  setSyncStatus('Salvando matéria', 'busy');

  let error = null;

  if (editId) {
    ({ error } = await supabaseClient
      .from('subjects')
      .update({
        name,
        color: selectedSubjectColor,
        updated_at: new Date().toISOString()
      })
      .eq('id', editId)
      .eq('user_id', currentUser.id));
  } else {
    ({ error } = await supabaseClient
      .from('subjects')
      .insert({
        user_id: currentUser.id,
        name,
        color: selectedSubjectColor
      }));
  }

  setButtonBusy(dom.saveSubjectBtn, false, 'Salvar');

  if (error) {
    console.error(error);
    showFeedback(dom.subjectFormFeedback, `Não foi possível salvar a matéria: ${error.message}`, false);
    setSyncStatus('Erro ao salvar', 'error');
    return;
  }

  clearSubjectForm(false);
  await loadRemoteState();
  showFeedback(dom.subjectFormFeedback, editId ? 'Matéria atualizada com sucesso.' : 'Matéria criada com sucesso.', true);
}

function startEditSubject(subjectId) {
  const subject = getSubjectById(subjectId);
  if (!subject) return;
  dom.subjectEditId.value = subject.id;
  dom.subjectName.value = subject.name;
  selectColor(subject.color);
  showView('materias');
  showFeedback(dom.subjectFormFeedback, 'Modo edição ativo. Altere e clique em salvar.', true);
}

function clearSubjectForm(clearFeedback = true) {
  dom.subjectEditId.value = '';
  dom.subjectName.value = '';
  selectColor(COLORS[0]);
  if (clearFeedback) hideFeedback(dom.subjectFormFeedback);
}

function selectColor(color) {
  selectedSubjectColor = color;
  dom.colorSwatches.forEach(button => {
    button.classList.toggle('selected', button.dataset.color === color);
  });
}

async function saveGoal() {
  hideFeedback(dom.goalFeedback);

  if (!currentUser) {
    showFeedback(dom.goalFeedback, 'Faça login antes de salvar sua meta.', false);
    return;
  }

  const value = Number(dom.goalHoursInput.value);

  if (Number.isNaN(value) || value < 0 || value > 24) {
    showFeedback(dom.goalFeedback, 'Informe uma meta entre 0 e 24 horas.', false);
    return;
  }

  const dailyGoalMinutes = Math.round(value * 60);
  setButtonBusy(dom.saveGoalBtn, true, 'Salvando...');
  setSyncStatus('Salvando meta', 'busy');

  const { error } = await supabaseClient
    .from('app_settings')
    .upsert({
      user_id: currentUser.id,
      daily_goal_minutes: dailyGoalMinutes,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'user_id'
    });

  setButtonBusy(dom.saveGoalBtn, false, 'Salvar');

  if (error) {
    console.error(error);
    showFeedback(dom.goalFeedback, `Não foi possível salvar a meta: ${error.message}`, false);
    setSyncStatus('Erro ao salvar', 'error');
    return;
  }

  await loadRemoteState();
  showFeedback(dom.goalFeedback, 'Meta diária salva com sucesso.', true);
}

function openDeleteModal(subjectId) {
  const subject = getSubjectById(subjectId);
  if (!subject) return;
  subjectToDeleteId = subjectId;
  dom.deleteMateriaName.textContent = `(${subject.name})`;
  dom.deleteModal.classList.remove('hidden');
}

function closeDeleteModal() {
  subjectToDeleteId = null;
  dom.deleteModal.classList.add('hidden');
}

async function confirmDelete() {
  if (!subjectToDeleteId || !currentUser) return;

  setButtonBusy(dom.confirmDeleteBtn, true, 'Apagando...');
  setSyncStatus('Apagando matéria', 'busy');

  const { error } = await supabaseClient
    .from('subjects')
    .delete()
    .eq('id', subjectToDeleteId)
    .eq('user_id', currentUser.id);

  setButtonBusy(dom.confirmDeleteBtn, false, 'Apagar');

  if (error) {
    console.error(error);
    showFeedback(dom.subjectFormFeedback, `Não foi possível excluir a matéria: ${error.message}`, false);
    setSyncStatus('Erro ao excluir', 'error');
    return;
  }

  clearSubjectForm();
  closeDeleteModal();
  await loadRemoteState();
}

function getSubjectById(subjectId) {
  return state.subjects.find(subject => subject.id === subjectId) ?? null;
}

function getLastSession() {
  return [...state.sessions].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0] ?? null;
}

function getTopSubject() {
  const totals = new Map();
  state.sessions.forEach(session => {
    totals.set(session.subjectId, (totals.get(session.subjectId) || 0) + session.durationSeconds);
  });

  let winner = null;
  totals.forEach((totalSeconds, subjectId) => {
    const subject = getSubjectById(subjectId);
    if (!subject) return;
    if (!winner || totalSeconds > winner.totalSeconds) {
      winner = { ...subject, totalSeconds };
    }
  });
  return winner;
}

function getCurrentMonthSeconds() {
  const now = new Date();
  return state.sessions.reduce((sum, session) => {
    const date = new Date(session.createdAt);
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()
      ? sum + session.durationSeconds
      : sum;
  }, 0);
}

function getTotalSecondsForDay(targetDate) {
  const targetKey = getDateKey(targetDate);
  return state.sessions.reduce((sum, session) => {
    return getDateKey(new Date(session.createdAt)) === targetKey ? sum + session.durationSeconds : sum;
  }, 0);
}

function getLast7DaysData() {
  const days = [];
  for (let i = 6; i >= 0; i -= 1) {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - i);
    days.push({
      label: ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][date.getDay()],
      key: getDateKey(date),
      totalSeconds: 0
    });
  }

  state.sessions.forEach(session => {
    const key = getDateKey(new Date(session.createdAt));
    const day = days.find(item => item.key === key);
    if (day) day.totalSeconds += session.durationSeconds;
  });

  return days;
}

function calculateStreak() {
  if (!state.sessions.length) return 0;

  const uniqueDays = [...new Set(state.sessions.map(session => getDateKey(new Date(session.createdAt))))].sort();
  let streak = 0;
  let cursor = new Date();
  cursor.setHours(0, 0, 0, 0);

  const todayKey = getDateKey(cursor);
  const yesterday = new Date(cursor);
  yesterday.setDate(yesterday.getDate() - 1);

  const hasToday = uniqueDays.includes(todayKey);
  const hasYesterday = uniqueDays.includes(getDateKey(yesterday));
  if (!hasToday && !hasYesterday) return 0;
  if (!hasToday) cursor = yesterday;

  while (uniqueDays.includes(getDateKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

function showFeedback(element, message, success) {
  element.textContent = message;
  element.classList.remove('hidden', 'text-green-100', 'text-red-100', 'text-green-700', 'text-red-700');
  if (element === dom.subjectFormFeedback || element === dom.goalFeedback) {
    element.classList.add(success ? 'text-green-100' : 'text-red-100');
  } else {
    element.classList.add(success ? 'text-green-700' : 'text-red-700');
  }
}

function hideFeedback(element) {
  element.classList.add('hidden');
  element.textContent = '';
}

function formatDuration(seconds) {
  const totalMinutes = Math.floor(seconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${String(minutes).padStart(2, '0')}min`;
}

function humanReadableDuration(seconds) {
  const totalMinutes = Math.floor(seconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}h e ${String(minutes).padStart(2, '0')}m`;
}

function formatMinutes(minutes) {
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return `${hours}h ${String(remainder).padStart(2, '0')}min`;
}

function formatClockFromSeconds(seconds) {
  const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
  const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
  const s = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${h}:${m}:${s}`;
}

function formatDate(date) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(date);
}

function formatClock(date) {
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

function getDateKey(date) {
  const cloned = new Date(date);
  cloned.setHours(0, 0, 0, 0);
  return cloned.toISOString().slice(0, 10);
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

window.addEventListener('beforeunload', () => {
  authSubscription?.unsubscribe?.();
});
