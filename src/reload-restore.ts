const RESTORE_FLAG = 'prepx_restore_learn';
const LESSON_KEY = 'prepx_restore_lesson';

function rememberLesson(title?: string) {
  sessionStorage.setItem(RESTORE_FLAG, '1');
  if (title) sessionStorage.setItem(LESSON_KEY, title.trim());
}

function clearRestore() {
  sessionStorage.removeItem(RESTORE_FLAG);
  sessionStorage.removeItem(LESSON_KEY);
}

// Remember where the learner is. This is deliberately done outside the React
// tree so a browser refresh can restore the view without changing the existing UI.
document.addEventListener('click', (event) => {
  const target = (event.target as Element | null)?.closest('button');
  if (!target) return;

  if (target.closest('.learn')) {
    const learnHeader = target.closest('.learn > header');
    if (learnHeader && target.textContent?.includes('Back')) clearRestore();
    else if (target.closest('.playlist')) rememberLesson(target.textContent || undefined);
    return;
  }

  if (target.classList.contains('lesson')) {
    rememberLesson(target.querySelector('b')?.textContent || target.textContent || undefined);
  } else if (target.classList.contains('primary') && /continue learning/i.test(target.textContent || '')) {
    rememberLesson();
  }
}, true);

// After a refresh the app normally starts at the dashboard because its page
// state lives in React memory. Re-enter learning and then select the last lesson.
if (sessionStorage.getItem(RESTORE_FLAG) === '1') {
  let restoring = false;
  const restore = () => {
    if (restoring) return;

    const learn = document.querySelector('.learn');
    if (!learn) {
      const continueButton = [...document.querySelectorAll<HTMLButtonElement>('button.primary')]
        .find(button => /continue learning/i.test(button.textContent || ''));
      if (continueButton) {
        restoring = true;
        continueButton.click();
        restoring = false;
      }
      return;
    }

    const lesson = sessionStorage.getItem(LESSON_KEY)?.trim();
    if (lesson) {
      const lessonButton = [...learn.querySelectorAll<HTMLButtonElement>('.playlist button')]
        .find(button => button.textContent?.trim() === lesson);
      if (lessonButton && !lessonButton.classList.contains('now')) lessonButton.click();
    }
    observer.disconnect();
  };

  const observer = new MutationObserver(restore);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  restore();
}
