export {};

const css = `
.prepxCustomPlayer{position:relative;width:100%;height:100%;min-height:0;background:#000;overflow:hidden}
.prepxCustomPlayer video{display:block;width:100%;height:100%;object-fit:contain;background:#000}
.prepxPlayerControls{position:absolute;left:0;right:0;bottom:0;z-index:3;display:flex;align-items:center;gap:10px;padding:14px 16px;background:linear-gradient(transparent,rgba(0,0,0,.88));opacity:1;transition:opacity .2s ease}
.prepxCustomPlayer.idle .prepxPlayerControls{opacity:0}
.prepxCustomPlayer:hover .prepxPlayerControls,.prepxCustomPlayer:focus-within .prepxPlayerControls{opacity:1}
.prepxPlayerControls button{appearance:none;border:0;background:rgba(25,28,34,.82);color:#fff;width:42px;height:42px;border-radius:50%;display:grid;place-items:center;padding:0;flex:0 0 auto;font-size:18px;line-height:1}
.prepxPlayerControls button:active{transform:scale(.95)}
.prepxPlayerTime{font-size:12px;color:#e6e8ec;white-space:nowrap;font-variant-numeric:tabular-nums}
.prepxPlayerSeek{appearance:none;min-width:0;flex:1;height:5px;border-radius:999px;accent-color:#e7ff6d;cursor:pointer}
.prepxPlayerError{position:absolute;inset:0;display:grid;place-items:center;padding:24px;text-align:center;color:#aeb5c0;background:#08090c}
.prepxPlayerError a{margin-top:12px;display:inline-block;color:#e7ff6d}
@media(max-width:800px){.prepxCustomPlayer{aspect-ratio:16/9;height:auto}.prepxPlayerControls{padding:9px 10px;gap:7px}.prepxPlayerControls button{width:36px;height:36px;font-size:16px}.prepxPlayerTime{font-size:10px}.prepxPlayerSeek{height:4px}.prepxCustomPlayer.idle .prepxPlayerControls{opacity:1}}
`;

const style = document.createElement('style');
style.textContent = css;
document.head.appendChild(style);

function icon(name:string){
  return name === 'pause' ? '❚❚' : name === 'play' ? '▶' : name === 'mute' ? '🔇' : name === 'sound' ? '🔊' : '⛶';
}

function formatTime(value:number){
  if(!Number.isFinite(value)) return '0:00';
  const total=Math.max(0,Math.floor(value));
  const h=Math.floor(total/3600), m=Math.floor((total%3600)/60), s=total%60;
  return h ? `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}` : `${m}:${String(s).padStart(2,'0')}`;
}

function fileId(src:string){
  const match=src.match(/\/d\/([^/?]+)/)||src.match(/[?&]id=([^&]+)/);
  return match?.[1]||'';
}

function upgrade(frame:HTMLIFrameElement){
  if(frame.dataset.prepxPlayer==='done') return;
  const id=fileId(frame.src);
  if(!id) return;
  frame.dataset.prepxPlayer='done';

  const host=document.createElement('div');
  host.className='prepxCustomPlayer';
  const video=document.createElement('video');
  video.playsInline=true;
  video.preload='metadata';
  video.src=`https://drive.usercontent.google.com/download?id=${encodeURIComponent(id)}&export=download&confirm=t`;

  const controls=document.createElement('div');
  controls.className='prepxPlayerControls';
  const play=document.createElement('button');
  const mute=document.createElement('button');
  const seek=document.createElement('input');
  const time=document.createElement('span');
  const fullscreen=document.createElement('button');
  play.type=mute.type=fullscreen.type='button';
  seek.type='range'; seek.min='0'; seek.max='100'; seek.value='0'; seek.step='0.1'; seek.className='prepxPlayerSeek';
  time.className='prepxPlayerTime';
  fullscreen.textContent=icon('full'); fullscreen.title='Fullscreen';
  controls.append(play,seek,time,mute,fullscreen);
  host.append(video,controls);
  frame.replaceWith(host);

  let interacted=false;
  const sync=()=>{
    play.textContent=video.paused?icon('play'):icon('pause');
    mute.textContent=video.muted||video.volume===0?icon('mute'):icon('sound');
    const duration=Number.isFinite(video.duration)?video.duration:0;
    seek.value=duration?String((video.currentTime/duration)*100):'0';
    time.textContent=`${formatTime(video.currentTime)} / ${formatTime(duration)}`;
  };
  const toggle=()=>{interacted=true; video.paused?video.play():video.pause();};
  play.addEventListener('click',toggle);
  video.addEventListener('click',toggle);
  video.addEventListener('play',sync); video.addEventListener('pause',sync); video.addEventListener('timeupdate',sync); video.addEventListener('loadedmetadata',sync);
  seek.addEventListener('input',()=>{const d=video.duration;if(Number.isFinite(d)&&d>0) video.currentTime=(Number(seek.value)/100)*d;});
  mute.addEventListener('click',()=>{video.muted=!video.muted;sync();});
  fullscreen.addEventListener('click',()=>{if(document.fullscreenElement) document.exitFullscreen?.(); else host.requestFullscreen?.();});
  host.addEventListener('mousemove',()=>{host.classList.remove('idle');window.clearTimeout(Number(host.dataset.hideTimer||0));host.dataset.hideTimer=String(window.setTimeout(()=>{if(!video.paused)host.classList.add('idle');},2200));});
  video.addEventListener('error',()=>{
    if(interacted) return;
    const error=document.createElement('div'); error.className='prepxPlayerError';
    error.innerHTML='Video stream could not be loaded.<br><a target="_blank" rel="noopener">Open video in Google Drive</a>';
    const link=error.querySelector('a') as HTMLAnchorElement; link.href=frame.src;
    host.replaceChildren(error);
  },{once:true});
  sync();
}

function scan(){document.querySelectorAll<HTMLIFrameElement>('.video iframe[src*="drive.google.com/file/"]').forEach(upgrade);}

scan();
new MutationObserver(scan).observe(document.documentElement,{childList:true,subtree:true});
