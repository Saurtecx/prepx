type ProgressMap = Record<string, true>;

const storageKey = () => {
  try {
    const session = JSON.parse(localStorage.getItem('prepx_session') || '{}');
    return `prepx_progress_${session?.user?.id ?? session?.user?.username ?? 'guest'}`;
  } catch {
    return 'prepx_progress_guest';
  }
};

const readProgress = (): ProgressMap => {
  try { return JSON.parse(localStorage.getItem(storageKey()) || '{}'); }
  catch { return {}; }
};

const writeProgress = (value: ProgressMap) => localStorage.setItem(storageKey(), JSON.stringify(value));

const lessonKey = (course: string, lesson: string) => `${course}::${lesson}`;

function getLearnRoot() {
  return document.querySelector<HTMLElement>('.learn');
}

function renderTracker() {
  const learn = getLearnRoot();
  if (!learn) return;

  const playlist = learn.querySelector<HTMLElement>('.playlist');
  const content = learn.querySelector<HTMLElement>('.learnGrid > section:first-child');
  if (!playlist || !content) return;

  const course = playlist.querySelector('h3')?.textContent?.trim() || 'Course';
  const lessonButtons = Array.from(playlist.querySelectorAll<HTMLButtonElement>('button'));
  if (!lessonButtons.length) return;

  const currentButton = playlist.querySelector<HTMLButtonElement>('button.now') || lessonButtons[0];
  const currentLesson = currentButton.textContent?.trim() || 'Lesson';
  const progress = readProgress();

  lessonButtons.forEach(button => {
    const key = lessonKey(course, button.textContent?.trim() || 'Lesson');
    button.classList.toggle('completed', !!progress[key]);
  });

  learn.querySelector('.progressTracker')?.remove();
  learn.querySelector('.courseProgressMini')?.remove();

  const completed = lessonButtons.filter(button => progress[lessonKey(course, button.textContent?.trim() || 'Lesson')]).length;
  const percent = Math.round((completed / lessonButtons.length) * 100);
  const currentKey = lessonKey(course, currentLesson);
  const done = !!progress[currentKey];

  const tracker = document.createElement('div');
  tracker.className = 'progressTracker';
  tracker.innerHTML = `
    <div class="progressHead"><span>YOUR PROGRESS</span><b>${completed} / ${lessonButtons.length} complete</b></div>
    <div class="progressBar"><i style="width:${percent}%"></i></div>
  `;

  const completeButton = document.createElement('button');
  completeButton.className = `completeLesson${done ? ' done' : ''}`;
  completeButton.textContent = done ? '✓ Lesson completed' : 'Mark lesson complete';
  completeButton.addEventListener('click', () => {
    const next = readProgress();
    if (next[currentKey]) delete next[currentKey];
    else next[currentKey] = true;
    writeProgress(next);
    renderTracker();
  });
  tracker.appendChild(completeButton);
  content.appendChild(tracker);

  const mini = document.createElement('div');
  mini.className = 'courseProgressMini';
  mini.innerHTML = `<div><span>Course progress</span><span>${percent}%</span></div><i><em style="width:${percent}%"></em></i>`;
  playlist.prepend(mini);
}

let scheduled = false;
function scheduleRender() {
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(() => {
    scheduled = false;
    renderTracker();
  });
}

const observer = new MutationObserver(scheduleRender);
observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
document.addEventListener('click', event => {
  if ((event.target as Element | null)?.closest('.playlist button')) scheduleRender();
});
scheduleRender();
