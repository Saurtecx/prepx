type ProgressMap = Record<string, true>;
type CourseMeta = Record<string, string[]>;
type CurrentLesson = { course: string; lesson: string } | null;

let lastSignature = '';

const storageKey = () => {
  try {
    const session = JSON.parse(localStorage.getItem('prepx_session') || '{}');
    return `prepx_progress_${session?.user?.id ?? session?.user?.username ?? 'guest'}`;
  } catch { return 'prepx_progress_guest'; }
};
const metaKey = () => `${storageKey()}_courses`;
const currentKey = () => `${storageKey()}_current`;
const lessonKey = (course: string, lesson: string) => `${course}::${lesson}`;

const readProgress = (): ProgressMap => { try { return JSON.parse(localStorage.getItem(storageKey()) || '{}'); } catch { return {}; } };
const writeProgress = (value: ProgressMap) => localStorage.setItem(storageKey(), JSON.stringify(value));
const readMeta = (): CourseMeta => { try { return JSON.parse(localStorage.getItem(metaKey()) || '{}'); } catch { return {}; } };
const writeMeta = (value: CourseMeta) => localStorage.setItem(metaKey(), JSON.stringify(value));
const readCurrent = (): CurrentLesson => { try { return JSON.parse(localStorage.getItem(currentKey()) || 'null'); } catch { return null; } };
const writeCurrent = (value: CurrentLesson) => localStorage.setItem(currentKey(), JSON.stringify(value));

function courseStats(course: string, lessons: string[], progress = readProgress()) {
  const completed = lessons.filter(lesson => progress[lessonKey(course, lesson)]).length;
  return { completed, total: lessons.length, percent: lessons.length ? Math.round((completed / lessons.length) * 100) : 0 };
}

function renderLearnTracker() {
  const learn = document.querySelector<HTMLElement>('.learn');
  if (!learn) return;
  const playlist = learn.querySelector<HTMLElement>('.playlist');
  const content = learn.querySelector<HTMLElement>('.learnGrid > section:first-child');
  if (!playlist || !content) return;

  const course = playlist.querySelector('h3')?.textContent?.trim() || 'Course';
  const lessonButtons = Array.from(playlist.querySelectorAll<HTMLButtonElement>('button'));
  if (!lessonButtons.length) return;
  const lessons = lessonButtons.map(button => button.textContent?.trim() || 'Lesson');
  const currentButton = playlist.querySelector<HTMLButtonElement>('button.now') || lessonButtons[0];
  const currentLesson = currentButton.textContent?.trim() || 'Lesson';
  const progress = readProgress();
  const meta = readMeta();
  if (JSON.stringify(meta[course]) !== JSON.stringify(lessons)) { meta[course] = lessons; writeMeta(meta); }
  writeCurrent({ course, lesson: currentLesson });

  lessonButtons.forEach(button => button.classList.toggle('completed', !!progress[lessonKey(course, button.textContent?.trim() || 'Lesson')]));
  learn.querySelector('.progressTracker')?.remove();
  learn.querySelector('.courseProgressMini')?.remove();

  const stats = courseStats(course, lessons, progress);
  const done = !!progress[lessonKey(course, currentLesson)];
  const tracker = document.createElement('div');
  tracker.className = 'progressTracker';
  tracker.innerHTML = `<div class="progressHead"><span>YOUR PROGRESS</span><b>${stats.completed} / ${stats.total} complete</b></div><div class="progressBar"><i style="width:${stats.percent}%"></i></div><div class="currentLessonLine"><span>Current lesson</span><b>${escapeHtml(currentLesson)}</b></div>`;
  const completeButton = document.createElement('button');
  completeButton.className = `completeLesson${done ? ' done' : ''}`;
  completeButton.textContent = done ? '✓ Lesson completed' : 'Mark lesson complete';
  completeButton.addEventListener('click', () => {
    const next = readProgress(); const key = lessonKey(course, currentLesson);
    if (next[key]) delete next[key]; else next[key] = true;
    writeProgress(next); lastSignature = ''; scheduleRender();
  });
  tracker.appendChild(completeButton); content.appendChild(tracker);

  const mini = document.createElement('div');
  mini.className = 'courseProgressMini';
  mini.innerHTML = `<div><span>Course progress</span><span>${stats.percent}%</span></div><i><em style="width:${stats.percent}%"></em></i>`;
  playlist.prepend(mini);
}

function escapeHtml(value: string) { const d = document.createElement('div'); d.textContent = value; return d.innerHTML; }

function renderDashboardTracker() {
  const main = document.querySelector<HTMLElement>('main');
  const hero = main?.querySelector<HTMLElement>('.hero');
  if (!main || !hero) return;
  const meta = readMeta(); const progress = readProgress(); const current = readCurrent();
  const courses = Object.entries(meta).filter(([, lessons]) => lessons.length);
  if (!courses.length) return;

  main.querySelector('.dashboardProgress')?.remove();
  main.querySelectorAll('.courseRing').forEach(node => node.remove());
  const total = courses.reduce((sum, [, lessons]) => sum + lessons.length, 0);
  const completed = courses.reduce((sum, [course, lessons]) => sum + courseStats(course, lessons, progress).completed, 0);
  const percent = total ? Math.round((completed / total) * 100) : 0;
  const dashboard = document.createElement('section');
  dashboard.className = 'dashboardProgress';
  dashboard.innerHTML = `<div class="dashboardProgressTop"><div><small>LEARNING PROGRESS</small><h2>${percent}% complete</h2></div><b>${completed} / ${total} lessons</b></div><div class="dashboardBar"><i style="width:${percent}%"></i></div>${current ? `<div class="dashboardCurrent"><span>Current lesson</span><b>${escapeHtml(current.lesson)}</b><small>${escapeHtml(current.course)}</small></div>` : ''}`;
  hero.insertAdjacentElement('afterend', dashboard);

  const cards = Array.from(main.querySelectorAll<HTMLElement>('.courseCard'));
  cards.forEach((card, index) => {
    const [course, lessons] = courses[index] || courses[0];
    if (!course || !lessons) return;
    const stats = courseStats(course, lessons, progress);
    const ring = document.createElement('div');
    ring.className = 'courseRing';
    ring.style.setProperty('--p', String(stats.percent));
    ring.innerHTML = `<span>${stats.percent}%</span>`;
    card.appendChild(ring);
  });
}

function renderTracker() {
  const learn = document.querySelector<HTMLElement>('.learn');
  const main = document.querySelector<HTMLElement>('main');
  const state = JSON.stringify({ page: !!learn ? 'learn' : !!main?.querySelector('.hero') ? 'home' : 'other', progress: readProgress(), meta: readMeta(), current: readCurrent(), learnText: learn?.querySelector('.playlist')?.textContent || '' });
  if (state === lastSignature) return;
  lastSignature = state;
  if (learn) renderLearnTracker(); else renderDashboardTracker();
}

let scheduled = false;
function scheduleRender() { if (scheduled) return; scheduled = true; requestAnimationFrame(() => { scheduled = false; renderTracker(); }); }
const observer = new MutationObserver(scheduleRender);
observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
document.addEventListener('click', event => { if ((event.target as Element | null)?.closest('.playlist button')) { lastSignature = ''; scheduleRender(); } });
scheduleRender();
