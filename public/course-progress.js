(() => {
  const session = () => { try { return JSON.parse(localStorage.getItem('prepx_session') || '{}'); } catch { return {}; } };
  const keyFor = course => `prepx_progress_${session()?.user?.id || 'anon'}_${course}`;
  const get = course => { try { return JSON.parse(localStorage.getItem(keyFor(course)) || '[]'); } catch { return []; } };
  const set = (course, value) => localStorage.setItem(keyFor(course), JSON.stringify(value));

  function courseTitle(){ return document.querySelector('.learn .playlist h3')?.textContent?.trim() || document.querySelector('.learn>header button')?.textContent?.replace('←','').trim() || 'course'; }
  function lessonButtons(){ return [...document.querySelectorAll('.learn .playlist button')]; }
  function currentTitle(){ return document.querySelector('.learnGrid>section:first-child>h1')?.textContent?.trim() || ''; }

  function renderLearn(){
    const learn = document.querySelector('.learn');
    if(!learn) return;
    const course = courseTitle();
    const buttons = lessonButtons();
    if(!buttons.length) return;
    const completed = get(course);
    buttons.forEach(btn => {
      const title = btn.textContent?.trim() || '';
      btn.classList.toggle('completed', completed.includes(title));
      btn.dataset.lessonTitle = title;
    });

    let tracker = learn.querySelector('.progressTracker');
    if(!tracker){
      tracker = document.createElement('div');
      tracker.className = 'progressTracker';
      const main = document.querySelector('.learnGrid>section:first-child');
      main?.appendChild(tracker);
    }
    const current = currentTitle();
    const count = completed.filter(x => buttons.some(b => b.dataset.lessonTitle === x)).length;
    const pct = Math.round((count / buttons.length) * 100);
    tracker.innerHTML = `<div class="progressHead"><span>COURSE PROGRESS</span><b>${count} / ${buttons.length} · ${pct}%</b></div><div class="progressBar"><i style="width:${pct}%"></i></div><button class="completeLesson ${completed.includes(current) ? 'done' : ''}">${completed.includes(current) ? '✓ Completed' : 'Mark lesson complete'}</button>`;
    tracker.querySelector('button')?.addEventListener('click', () => {
      const now = currentTitle();
      let next = get(course);
      next = next.includes(now) ? next.filter(x => x !== now) : [...next, now];
      set(course, next);
      renderLearn();
    });
  }

  function renderCourseCards(){
    document.querySelectorAll('.courseCard').forEach(card => {
      if(card.querySelector('.courseProgressMini')) return;
      const course = card.querySelector('h3')?.textContent?.trim();
      if(!course) return;
      const all = Number((card.querySelector('span')?.textContent || '').match(/(\d+)/)?.[1] || 0);
      if(!all) return;
      const completed = get(course).length;
      const pct = Math.min(100, Math.round(completed / all * 100));
      const mini = document.createElement('div');
      mini.className = 'courseProgressMini';
      mini.innerHTML = `<div><span>Progress</span><b>${completed}/${all}</b></div><i><em style="width:${pct}%"></em></i>`;
      card.appendChild(mini);
    });
  }

  let queued = false;
  function refresh(){ if(queued) return; queued = true; requestAnimationFrame(() => { queued = false; renderLearn(); renderCourseCards(); }); }
  new MutationObserver(refresh).observe(document.documentElement, {childList:true, subtree:true, characterData:true});
  document.addEventListener('click', e => { if((e.target instanceof Element) && e.target.closest('.learn .playlist button')) setTimeout(refresh, 0); });
  refresh();
})();
