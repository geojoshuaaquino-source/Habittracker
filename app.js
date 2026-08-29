const STORAGE_KEY = 'questlog-rpg-v1';
const defaultQuests = [
  { id: crypto.randomUUID(), name: 'Drink 8 glasses of water', xp: 10, completed: false },
  { id: crypto.randomUUID(), name: 'Study for 30 minutes', xp: 20, completed: false },
  { id: crypto.randomUUID(), name: 'Exercise', xp: 35, completed: false }
];

let state = loadState();
const $ = (id) => document.getElementById(id);

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved && Array.isArray(saved.quests)) return saved;
  } catch (_) {}
  return { quests: defaultQuests, totalXp: 0, streak: 0, lastCompletedDate: null };
}
function saveState() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function todayKey() { return new Date().toISOString().slice(0, 10); }
function xpForLevel(level) { return 100 + (level - 1) * 50; }
function getLevel() { let level = 1, xp = state.totalXp; while (xp >= xpForLevel(level)) { xp -= xpForLevel(level); level++; } return { level, xp, next: xpForLevel(level) }; }
function updateStreak() {
  const today = todayKey();
  if (state.lastCompletedDate === today) return;
  if (!state.lastCompletedDate) state.streak = 0;
  const previous = new Date(); previous.setDate(previous.getDate() - 1);
  if (state.lastCompletedDate !== previous.toISOString().slice(0, 10)) state.streak = 0;
}
function render() {
  updateStreak();
  const { level, xp, next } = getLevel();
  const completed = state.quests.filter(q => q.completed).length;
  const percent = state.quests.length ? Math.round(completed / state.quests.length * 100) : 0;
  $('levelValue').textContent = level;
  $('xpText').textContent = `${xp} / ${next} XP`;
  $('xpFill').style.width = `${Math.min(100, xp / next * 100)}%`;
  $('streakValue').textContent = state.streak;
  $('completedValue').textContent = completed;
  $('totalXpValue').textContent = state.totalXp;
  $('dailySummary').textContent = `${completed} of ${state.quests.length} completed`;
  $('dailyPercent').textContent = `${percent}%`;
  $('dailyProgressFill').style.width = `${percent}%`;
  $('dateLabel').textContent = new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  $('rankText').textContent = level < 3 ? 'Novice' : level < 6 ? 'Apprentice' : level < 10 ? 'Adventurer' : 'Veteran';

  const discipline = Math.min(100, 10 + state.totalXp / 4);
  const consistency = Math.min(100, 10 + state.streak * 8);
  const momentum = Math.min(100, 10 + completed * 25);
  setStat('discipline', discipline); setStat('consistency', consistency); setStat('momentum', momentum);

  const list = $('questList'); list.innerHTML = '';
  $('emptyState').classList.toggle('hidden', state.quests.length > 0);
  state.quests.forEach(q => {
    const item = document.createElement('article');
    item.className = `quest${q.completed ? ' completed' : ''}`;
    item.innerHTML = `<button class="check" aria-label="${q.completed ? 'Mark incomplete' : 'Complete quest'}">${q.completed ? '✓' : ''}</button><div><div class="quest-name"></div><div class="quest-meta">Daily quest</div></div><div class="quest-actions"><span class="quest-xp">+${q.xp} XP</span><button class="delete-btn" aria-label="Delete quest">×</button></div>`;
    item.querySelector('.quest-name').textContent = q.name;
    item.querySelector('.check').addEventListener('click', () => toggleQuest(q.id));
    item.querySelector('.delete-btn').addEventListener('click', () => deleteQuest(q.id));
    list.appendChild(item);
  });
  saveState();
}
function setStat(name, value) { $(`${name}Stat`).textContent = Math.round(value / 10); $(`${name}Bar`).style.width = `${value}%`; }
function toggleQuest(id) {
  const q = state.quests.find(x => x.id === id); if (!q) return;
  if (!q.completed) {
    q.completed = true; state.totalXp += q.xp;
    const today = todayKey();
    if (state.lastCompletedDate !== today) {
      const previous = new Date(); previous.setDate(previous.getDate() - 1);
      const prevKey = previous.toISOString().slice(0, 10);
      state.streak = state.lastCompletedDate === prevKey ? state.streak + 1 : 1;
      state.lastCompletedDate = today;
    }
    showToast(`Quest complete! +${q.xp} XP`);
  } else {
    q.completed = false; state.totalXp = Math.max(0, state.totalXp - q.xp); showToast('Quest reopened');
  }
  render();
}
function deleteQuest(id) { state.quests = state.quests.filter(q => q.id !== id); render(); showToast('Quest removed'); }
function openDialog() { $('questName').value = ''; $('questDialog').showModal(); $('questName').focus(); }
function addQuest(event) {
  event.preventDefault();
  const name = $('questName').value.trim(); if (!name) return;
  state.quests.push({ id: crypto.randomUUID(), name, xp: Number($('questXp').value), completed: false });
  $('questDialog').close(); render(); showToast('New quest added');
}
function showToast(message) { const t = $('toast'); t.textContent = message; t.classList.add('show'); clearTimeout(showToast.timer); showToast.timer = setTimeout(() => t.classList.remove('show'), 1800); }
$('addQuestBtn').addEventListener('click', openDialog); $('emptyAddBtn').addEventListener('click', openDialog); $('questForm').addEventListener('submit', addQuest);
$('resetDayBtn').addEventListener('click', () => { state.quests.forEach(q => q.completed = false); render(); showToast('Today\'s quests reset'); });
$('questDialog').addEventListener('click', e => { if (e.target === $('questDialog')) $('questDialog').close(); });
render();
