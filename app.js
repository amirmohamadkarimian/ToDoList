"use strict";

const CATS = [
  { id: "work", label: "Work", color: "#7c6ef5" },
  { id: "personal", label: "Personal", color: "#f472b6" },
  { id: "health", label: "Health", color: "#4ade80" },
  { id: "learning", label: "Learning", color: "#60a5fa" },
  { id: "finance", label: "Finance", color: "#fbbf24" },
];
const PRIOS = ["high", "medium", "low"];
const PRIO_LABELS = { high: "High", medium: "Medium", low: "Low" };

const initialTasks = [
  {
    id: 1,
    title: "Review Q3 performance report",
    cat: "work",
    prio: "high",
    done: false,
    due: "2025-06-02",
    notes: "Focus on revenue metrics",
    created: Date.now() - 86400000 * 3,
  },
  {
    id: 2,
    title: "Schedule dentist appointment",
    cat: "health",
    prio: "medium",
    done: false,
    due: "2025-06-10",
    notes: "",
    created: Date.now() - 86400000 * 2,
  },
  {
    id: 3,
    title: 'Finish reading "Deep Work"',
    cat: "learning",
    prio: "low",
    done: false,
    due: "2025-06-20",
    notes: "Chapter 5 onwards",
    created: Date.now() - 86400000,
  },
  {
    id: 4,
    title: "Prepare team standup notes",
    cat: "work",
    prio: "medium",
    done: true,
    due: "2025-05-29",
    notes: "",
    created: Date.now() - 86400000 * 5,
  },
  {
    id: 5,
    title: "Monthly budget review",
    cat: "finance",
    prio: "high",
    done: false,
    due: "2025-06-01",
    notes: "Check subscriptions",
    created: Date.now() - 86400000 * 4,
  },
  {
    id: 6,
    title: "Call mom & catch up",
    cat: "personal",
    prio: "low",
    done: false,
    due: "2025-06-05",
    notes: "",
    created: Date.now() - 3600000 * 2,
  },
  {
    id: 7,
    title: "Morning jog – 5km",
    cat: "health",
    prio: "medium",
    done: true,
    due: "2025-05-30",
    notes: "",
    created: Date.now() - 3600000,
  },
];

// State
let state = {
  tasks: JSON.parse(
    localStorage.getItem("tf_tasks") || JSON.stringify(initialTasks),
  ),
  view: "all", // all, today, upcoming, done, cat-*
  search: "",
  filterPrio: "",
  sortBy: "created", // created, due, prio, title
  modal: null, // null | {mode:'add'} | {mode:'edit',task}
  pomoState: { running: false, phase: "focus", elapsed: 0, session: 0 },
  sidebarOpen: false,
  dragId: null,
  toasts: [],
  nextId: 100,
};

function save() {
  localStorage.setItem("tf_tasks", JSON.stringify(state.tasks));
}

// Pomodoro
const POMO = { focus: 25 * 60, short: 5 * 60, long: 15 * 60 };
let pomoInterval = null;
function togglePomo() {
  if (state.pomoState.running) {
    clearInterval(pomoInterval);
    pomoInterval = null;
    state.pomoState.running = false;
  } else {
    state.pomoState.running = true;
    pomoInterval = setInterval(() => {
      state.pomoState.elapsed++;
      const dur =
        state.pomoState.phase === "focus"
          ? POMO.focus
          : state.pomoState.phase === "short"
            ? POMO.short
            : POMO.long;
      if (state.pomoState.elapsed >= dur) {
        state.pomoState.elapsed = 0;
        if (state.pomoState.phase === "focus") {
          state.pomoState.session++;
          state.pomoState.phase =
            state.pomoState.session % 4 === 0 ? "long" : "short";
          toast("🍅 Break time! Take a rest.", "success");
        } else {
          state.pomoState.phase = "focus";
          toast("⚡ Focus time! Back to work.", "success");
        }
      }
      render();
    }, 1000);
  }
  render();
}
function resetPomo() {
  clearInterval(pomoInterval);
  pomoInterval = null;
  state.pomoState = {
    running: false,
    phase: "focus",
    elapsed: 0,
    session: state.pomoState.session,
  };
  render();
}

// Toasts
function toast(msg, type = "success") {
  const id = Date.now();
  state.toasts.push({ id, msg, type });
  render();
  setTimeout(() => {
    state.toasts = state.toasts.filter((t) => t.id !== id);
    render();
  }, 2800);
}

// Derived
function getFilteredTasks() {
  const today = new Date().toISOString().slice(0, 10);
  let tasks = [...state.tasks];
  if (state.view === "today")
    tasks = tasks.filter((t) => t.due === today && !t.done);
  else if (state.view === "upcoming")
    tasks = tasks.filter((t) => t.due > today && !t.done);
  else if (state.view === "done") tasks = tasks.filter((t) => t.done);
  else if (state.view.startsWith("cat-")) {
    const c = state.view.slice(4);
    tasks = tasks.filter((t) => t.cat === c && !t.done);
  } else tasks = tasks.filter((t) => !t.done);

  if (state.search)
    tasks = tasks.filter(
      (t) =>
        t.title.toLowerCase().includes(state.search.toLowerCase()) ||
        t.notes.toLowerCase().includes(state.search.toLowerCase()),
    );
  if (state.filterPrio)
    tasks = tasks.filter((t) => t.prio === state.filterPrio);
  if (state.sortBy === "due")
    tasks.sort((a, b) => ((a.due || "z") > (b.due || "z") ? 1 : -1));
  else if (state.sortBy === "prio")
    tasks.sort((a, b) => PRIOS.indexOf(a.prio) - PRIOS.indexOf(b.prio));
  else if (state.sortBy === "title")
    tasks.sort((a, b) => a.title.localeCompare(b.title));
  else tasks.sort((a, b) => b.created - a.created);
  return tasks;
}

function getStats() {
  const all = state.tasks;
  const done = all.filter((t) => t.done).length;
  const total = all.length;
  const today = new Date().toISOString().slice(0, 10);
  const todayCount = all.filter((t) => t.due === today && !t.done).length;
  const overdue = all.filter((t) => t.due && t.due < today && !t.done).length;
  return {
    total,
    done,
    pending: total - done,
    today: todayCount,
    overdue,
    pct: total ? Math.round((done / total) * 100) : 0,
  };
}

// Task ops
function toggleDone(id) {
  const t = state.tasks.find((x) => x.id === id);
  if (!t) return;
  t.done = !t.done;
  save();
  render();
  toast(t.done ? "Task completed! ✓" : "Marked as pending");
}
function deleteTask(id) {
  state.tasks = state.tasks.filter((x) => x.id !== id);
  save();
  render();
  toast("Task deleted", "error");
}
function saveTask(data) {
  if (data.id) {
    const idx = state.tasks.findIndex((x) => x.id === data.id);
    if (idx >= 0) state.tasks[idx] = { ...state.tasks[idx], ...data };
  } else {
    state.tasks.push({
      ...data,
      id: ++state.nextId,
      done: false,
      created: Date.now(),
    });
  }
  save();
  state.modal = null;
  render();
  toast(data.id ? "Task updated" : "Task created! 🎉");
}

// Drag & drop
function handleDragStart(id) {
  state.dragId = id;
}
function handleDragOver(id) {
  if (!state.dragId || state.dragId === id) return;
  const fi = state.tasks.findIndex((x) => x.id === state.dragId);
  const ti = state.tasks.findIndex((x) => x.id === id);
  if (fi < 0 || ti < 0) return;
  const arr = [...state.tasks];
  const [item] = arr.splice(fi, 1);
  arr.splice(ti, 0, item);
  state.tasks = arr;
  render();
}
function handleDragEnd() {
  state.dragId = null;
  save();
  render();
}

// Format
function fmtDate(d) {
  if (!d) return "";
  const today = new Date().toISOString().slice(0, 10);
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  if (d === today) return "Today";
  if (d === tomorrow) return "Tomorrow";
  return new Date(d).toLocaleDateString("en", {
    month: "short",
    day: "numeric",
  });
}
function isOverdue(d) {
  if (!d) return false;
  return d < new Date().toISOString().slice(0, 10);
}

// Keyboard
document.addEventListener("keydown", (e) => {
  if (
    e.target.tagName === "INPUT" ||
    e.target.tagName === "TEXTAREA" ||
    e.target.tagName === "SELECT"
  )
    return;
  if (e.key === "n" && !state.modal) {
    state.modal = { mode: "add" };
    render();
  }
  if (e.key === "Escape" && state.modal) {
    state.modal = null;
    render();
  }
  if (e.key === "/" && !state.modal) {
    e.preventDefault();
    const si = document.getElementById("search");
    if (si) si.focus();
  }
});

// RENDER
function render() {
  const root = document.getElementById("app");
  const tasks = getFilteredTasks();
  const stats = getStats();
  const today = new Date().toISOString().slice(0, 10);

  // pomodoro
  const { phase, elapsed, running, session } = state.pomoState;
  const dur =
    phase === "focus" ? POMO.focus : phase === "short" ? POMO.short : POMO.long;
  const rem = dur - elapsed;
  const mm = String(Math.floor(rem / 60)).padStart(2, "0");
  const ss = String(rem % 60).padStart(2, "0");
  const pct = elapsed / dur;
  const R = 34;
  const C = 2 * Math.PI * R;
  const dash = C * (1 - pct);
  const phaseLabel =
    phase === "focus"
      ? "Focus"
      : `${phase === "short" ? "Short" : "Long"} Break`;

  const catCounts = {};
  CATS.forEach((c) => {
    catCounts[c.id] = state.tasks.filter(
      (t) => t.cat === c.id && !t.done,
    ).length;
  });
  const allCount = state.tasks.filter((t) => !t.done).length;
  const doneCount = state.tasks.filter((t) => t.done).length;
  const todayCount = state.tasks.filter(
    (t) => t.due === today && !t.done,
  ).length;

  const navItems = [
    { id: "all", label: "All tasks", icon: "grid", count: allCount },
    { id: "today", label: "Today", icon: "sun", count: todayCount },
    {
      id: "upcoming",
      label: "Upcoming",
      icon: "calendar",
      count: state.tasks.filter((t) => t.due > today && !t.done).length,
    },
    {
      id: "done",
      label: "Completed",
      icon: "circle-check",
      count: doneCount,
    },
  ];

  const viewTitles = {
    all: "All Tasks",
    today: "Today's Tasks",
    upcoming: "Upcoming",
    done: "Completed",
  };
  const pageTitle = state.view.startsWith("cat-")
    ? CATS.find((c) => "cat-" + c.id === state.view)?.label || "Tasks"
    : viewTitles[state.view] || "Tasks";

  const doneTasks =
    state.view === "all" ? state.tasks.filter((t) => t.done) : [];

  root.innerHTML = `
<div class="sidebar ${state.sidebarOpen ? "open" : ""}" id="sidebar">
  <div class="logo">
    <div class="logo-mark">✦</div>
    <span class="logo-text">TaskFlow</span>
  </div>
  <div class="nav-section">
    <div class="nav-label">Overview</div>
    ${navItems
      .map(
        (n) => `
      <button class="nav-item ${state.view === n.id ? "active" : ""}" onclick="state.view='${n.id}';render()">
        <svg class="icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">${navIcon(n.icon)}</svg>
        ${n.label}
        ${n.count > 0 ? `<span class="nav-count">${n.count}</span>` : ""}
      </button>`,
      )
      .join("")}
  </div>
  <div class="nav-section">
    <div class="nav-label">Categories</div>
    ${CATS.map(
      (c) => `
      <button class="nav-item ${state.view === "cat-" + c.id ? "active" : ""}" onclick="state.view='cat-${c.id}';render()">
        <div class="cat-dot" style="background:${c.color}"></div>
        ${c.label}
        ${catCounts[c.id] > 0 ? `<span class="nav-count">${catCounts[c.id]}</span>` : ""}
      </button>`,
    ).join("")}
  </div>
  <div class="sidebar-footer">
    <button class="nav-item" onclick="showShortcuts()">
      <svg class="icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>
      Shortcuts
    </button>
  </div>
</div>

<div class="main">
  <div class="topbar">
    <button class="btn btn-icon btn-ghost" style="display:none" id="menu-btn" onclick="state.sidebarOpen=!state.sidebarOpen;render()">
      <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" d="M4 6h16M4 12h16M4 18h16"/></svg>
    </button>
    <div class="search-wrap">
      <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
      <input id="search" class="search-input" placeholder="Search tasks… (/)" value="${escH(state.search)}" oninput="state.search=this.value;render()" />
    </div>
    <select class="field" style="background:var(--bg3);border:1px solid var(--border);border-radius:var(--r2);padding:.45rem .75rem;color:var(--text);font-family:inherit;font-size:.8rem;cursor:pointer;outline:none" onchange="state.sortBy=this.value;render()">
      <option value="created" ${state.sortBy === "created" ? "selected" : ""}>Sort: Newest</option>
      <option value="due" ${state.sortBy === "due" ? "selected" : ""}>Sort: Due date</option>
      <option value="prio" ${state.sortBy === "prio" ? "selected" : ""}>Sort: Priority</option>
      <option value="title" ${state.sortBy === "title" ? "selected" : ""}>Sort: A–Z</option>
    </select>
    <button class="btn btn-primary" onclick="state.modal={mode:'add'};render()">
      <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" d="M12 5v14M5 12h14"/></svg>
      New task
    </button>
  </div>

  <div class="content">
    <div class="content-header">
      <div>
        <h1 class="page-title">${escH(pageTitle)}</h1>
        <div class="page-subtitle">${stats.pending} pending · ${stats.done} done · ${stats.overdue > 0 ? `<span style="color:var(--red)">${stats.overdue} overdue</span>` : "all on track"}</div>
      </div>
    </div>

    <!-- STATS -->
    ${
      state.view === "all"
        ? `
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-label">Total tasks</div>
        <div class="stat-val" style="color:var(--accent2)">${stats.total}</div>
        <div class="stat-sub">across all categories</div>
        <div class="stat-bar"><div class="stat-bar-fill" style="width:100%;background:var(--accent)"></div></div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Completed</div>
        <div class="stat-val" style="color:var(--green)">${stats.done}</div>
        <div class="stat-sub">${stats.pct}% completion rate</div>
        <div class="stat-bar"><div class="stat-bar-fill" style="width:${stats.pct}%;background:var(--green)"></div></div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Due today</div>
        <div class="stat-val" style="color:var(--amber)">${stats.today}</div>
        <div class="stat-sub">need your attention</div>
        <div class="stat-bar"><div class="stat-bar-fill" style="width:${stats.total ? Math.round((stats.today / stats.total) * 100) : 0}%;background:var(--amber)"></div></div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Overdue</div>
        <div class="stat-val" style="color:var(--red)">${stats.overdue}</div>
        <div class="stat-sub">${stats.overdue === 0 ? "Great job! 🎉" : "need attention"}</div>
        <div class="stat-bar"><div class="stat-bar-fill" style="width:${stats.total ? Math.round((stats.overdue / stats.total) * 100) : 0}%;background:var(--red)"></div></div>
      </div>
    </div>
    `
        : ""
    }

    <!-- POMODORO -->
    <div class="pomo-panel">
      <div class="flex-row">
        <div class="pomo-ring">
          <svg width="80" height="80" viewBox="0 0 80 80">
            <circle cx="40" cy="40" r="${R}" fill="none" stroke="var(--bg4)" stroke-width="5"/>
            <circle cx="40" cy="40" r="${R}" fill="none" stroke="${phase === "focus" ? "var(--accent)" : phase === "short" ? "var(--green)" : "var(--blue)"}" stroke-width="5" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${dash}" style="transition:stroke-dashoffset .9s linear"/>
          </svg>
          <div class="pomo-time">${mm}:${ss}</div>
        </div>
        <div style="flex:1">
          <div style="font-size:.78rem;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--text3);margin-bottom:4px">Pomodoro Timer</div>
          <div style="font-size:1rem;font-weight:500;margin-bottom:2px">${phaseLabel} · Session ${session + 1}</div>
          <div style="font-size:.8rem;color:var(--text3)">${running ? "Timer running…" : "Ready when you are"}</div>
        </div>
        <div style="display:flex;gap:8px">
          <button class="btn btn-ghost" style="font-size:.8rem;padding:.4rem .85rem" onclick="togglePomo()">
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">${running ? '<rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/>' : '<polygon points="5,3 19,12 5,21"/>'}</svg>
            ${running ? "Pause" : "Start"}
          </button>
          <button class="btn btn-ghost" style="font-size:.8rem;padding:.4rem .85rem" onclick="resetPomo()">Reset</button>
        </div>
      </div>
    </div>

    <!-- FILTER CHIPS -->
    <div class="filter-chips" style="margin-bottom:1rem;padding:0">
      <button class="chip ${!state.filterPrio ? "active" : ""}" onclick="state.filterPrio='';render()">All priorities</button>
      ${PRIOS.map((p) => `<button class="chip ${state.filterPrio === p ? "active" : ""}" onclick="state.filterPrio='${p}';render()">${PRIO_LABELS[p]}</button>`).join("")}
    </div>

    <!-- TASK LIST -->
    ${
      tasks.length === 0 && (doneTasks.length === 0 || state.view !== "all")
        ? emptyState()
        : `<div class="task-list" id="task-list">
        ${tasks.map((t) => taskCard(t)).join("")}
      </div>`
    }

    <!-- DONE SECTION in all view -->
    ${
      state.view === "all" && doneTasks.length > 0
        ? `
      <div class="section-header">
        <span class="section-title">Completed (${doneTasks.length})</span>
        <div class="section-line"></div>
      </div>
      <div class="task-list">
        ${doneTasks.map((t) => taskCard(t)).join("")}
      </div>
    `
        : ""
    }
  </div>
</div>

<!-- MODAL -->
${state.modal ? renderModal() : ""}

<!-- TOASTS -->
${state.toasts
  .map(
    (t) => `
  <div class="toast ${t.type}" style="bottom:${1.5 + state.toasts.indexOf(t) * 3.5}rem">
    ${t.type === "success" ? '<svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><polyline points="20,6 9,17 4,12"/></svg>' : '<svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>'}
    ${escH(t.msg)}
  </div>`,
  )
  .join("")}
`;

  // Bind drag events
  document.querySelectorAll(".task-card[draggable]").forEach((el) => {
    const id = parseInt(el.dataset.id);
    el.addEventListener("dragstart", () => handleDragStart(id));
    el.addEventListener("dragover", (e) => {
      e.preventDefault();
      handleDragOver(id);
    });
    el.addEventListener("dragend", handleDragEnd);
  });

  // Bind modal form
  const mf = document.getElementById("modal-form");
  if (mf)
    mf.addEventListener("submit", (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      saveTask({
        id: state.modal.task?.id,
        title: fd.get("title").trim(),
        cat: fd.get("cat"),
        prio: fd.get("prio"),
        due: fd.get("due"),
        notes: fd.get("notes"),
      });
    });

  // Mobile sidebar
  const mb = document.getElementById("menu-btn");
  if (mb) {
    if (window.innerWidth <= 700) mb.style.display = "flex";
    else {
      mb.style.display = "none";
      if (state.sidebarOpen) {
        state.sidebarOpen = false;
      }
    }
  }
}

function taskCard(t) {
  const cat = CATS.find((c) => c.id === t.cat);
  const over = isOverdue(t.due) && !t.done;
  return `<div class="task-card priority-${t.prio} ${t.done ? "done" : ""} ${state.dragId === t.id ? "dragging" : ""}"
    draggable="true" data-id="${t.id}" onclick="noop(event,'${t.id}')">
    <div class="check-wrap">
      <button class="check-btn ${t.done ? "checked" : ""}" onclick="event.stopPropagation();toggleDone(${t.id})" title="Toggle done">
        ${t.done ? `<svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="white" stroke-width="3"><polyline points="20,6 9,17 4,12"/></svg>` : ""}
      </button>
    </div>
    <div class="task-body">
      <div class="task-title">${escH(t.title)}</div>
      <div class="task-meta">
        ${cat ? `<span class="tag" style="background:${cat.color}22;color:${cat.color}">${cat.label}</span>` : ""}
        <span class="prio-badge prio-${t.prio}">${PRIO_LABELS[t.prio]}</span>
        ${
          t.due
            ? `<span class="due-text ${over ? "due-overdue" : ""}">
          <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          ${fmtDate(t.due)}${over ? " · Overdue" : ""}
        </span>`
            : ""
        }
      </div>
    </div>
    <div class="task-actions">
      <button class="icon-btn" onclick="event.stopPropagation();state.modal={mode:'edit',task:${JSON.stringify(t).replace(/"/g, "&quot;")}};render()" title="Edit">
        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
      </button>
      <button class="icon-btn del" onclick="event.stopPropagation();if(confirm('Delete this task?'))deleteTask(${t.id})" title="Delete">
        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><polyline points="3,6 5,6 21,6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>
      </button>
    </div>
  </div>`;
}

function noop(e, id) {
  // no-op click (just for non-button area)
}
window.noop = noop;

function renderModal() {
  const isEdit = state.modal?.mode === "edit";
  const t = state.modal?.task || {};
  return `<div class="overlay" onclick="if(event.target===this){state.modal=null;render()}">
    <div class="modal" onclick="event.stopPropagation()">
      <div class="modal-title">${isEdit ? "Edit task" : "New task"}</div>
      <form id="modal-form" onsubmit="return false">
        <div class="form-grid">
          <div class="field full">
            <label>Task title *</label>
            <input name="title" placeholder="What needs to be done?" required value="${escH(t.title || "")}" autocomplete="off"/>
          </div>
          <div class="field">
            <label>Category</label>
            <select name="cat">
              ${CATS.map((c) => `<option value="${c.id}" ${t.cat === c.id ? "selected" : ""}>${c.label}</option>`).join("")}
            </select>
          </div>
          <div class="field">
            <label>Priority</label>
            <select name="prio">
              ${PRIOS.map((p) => `<option value="${p}" ${(t.prio || "medium") === p ? "selected" : ""}>${PRIO_LABELS[p]}</option>`).join("")}
            </select>
          </div>
          <div class="field full">
            <label>Due date</label>
            <input type="date" name="due" value="${t.due || ""}" min="${new Date().toISOString().slice(0, 10)}"/>
          </div>
          <div class="field full">
            <label>Notes</label>
            <textarea name="notes" placeholder="Additional notes…">${escH(t.notes || "")}</textarea>
          </div>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn btn-ghost" onclick="state.modal=null;render()">Cancel</button>
          <button type="submit" class="btn btn-primary" onclick="document.getElementById('modal-form').requestSubmit()">${isEdit ? "Save changes" : "Add task"}</button>
        </div>
      </form>
    </div>
  </div>`;
}

function emptyState() {
  const msgs = {
    all: {
      icon: "✦",
      t: "All clear!",
      s: "Add your first task with the button above or press N",
    },
    today: {
      icon: "☀️",
      t: "Nothing due today",
      s: "Enjoy your free day or add a task for today",
    },
    upcoming: {
      icon: "📅",
      t: "No upcoming tasks",
      s: "Your schedule is clear ahead",
    },
    done: {
      icon: "🎉",
      t: "Nothing completed yet",
      s: "Complete tasks and they'll appear here",
    },
  };
  const m = msgs[state.view] || {
    icon: "✦",
    t: "No tasks found",
    s: "Try adjusting your filters",
  };
  return `<div class="empty">
    <div class="empty-icon">${m.icon}</div>
    <div class="empty-title">${m.t}</div>
    <div class="empty-sub">${m.s}</div>
    ${
      state.view === "all"
        ? `<button class="btn btn-primary" style="margin-top:1.25rem" onclick="state.modal={mode:'add'};render()">
      <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" d="M12 5v14M5 12h14"/></svg>
      Create first task
    </button>`
        : ""
    }
  </div>`;
}

function showShortcuts() {
  const keys = [
    ["N", "New task"],
    ["/ ", "Focus search"],
    ["Esc", "Close modal / deselect"],
    ["Drag", "Reorder tasks"],
  ];
  alert(
    "Keyboard Shortcuts:\n\n" +
      keys.map(([k, d]) => `${k.padEnd(8)}→  ${d}`).join("\n"),
  );
}
window.showShortcuts = showShortcuts;
window.togglePomo = togglePomo;
window.resetPomo = resetPomo;
window.toggleDone = toggleDone;
window.deleteTask = deleteTask;

function navIcon(name) {
  const icons = {
    grid: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>',
    sun: '<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>',
    calendar:
      '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
    "circle-check":
      '<path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22,4 12,14.01 9,11.01"/>',
  };
  return icons[name] || '<circle cx="12" cy="12" r="10"/>';
}

function escH(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

render();
window.addEventListener("resize", render);
