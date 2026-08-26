import React, { useEffect, useRef, useState } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, Settings } from 'lucide-react';

type Props = {
  src: string;
  title: string;
  className?: string;
  onProgress?: (position:number, percent:number, completed:boolean)=>void;
  startAt?: number;
};

const formatTime=(seconds:number)=>{
  if(!Number.isFinite(seconds)) return '0:00';
  const s=Math.max(0,Math.floor(seconds));
  return `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;
};

export default function CustomVideoPlayer({src,title,className='',onProgress,startAt=0}:Props){
  const videoRef=useRef<HTMLVideoElement|null>(null);
  const rootRef=useRef<HTMLDivElement|null>(null);
  const lastSent=useRef(0);
  const [playing,setPlaying]=useState(false);
  const [current,setCurrent]=useState(0);
  const [duration,setDuration]=useState(0);
  const [volume,setVolume]=useState(1);
  const [showControls,setShowControls]=useState(true);
  const [showSpeed,setShowSpeed]=useState(false);
  const [speed,setSpeed]=useState(1);
  const [error,setError]=useState('');
  const hideTimer=useRef<number|undefined>(undefined);

  const scheduleHide=()=>{
    window.clearTimeout(hideTimer.current);
    setShowControls(true);
    if(playing) hideTimer.current=window.setTimeout(()=>setShowControls(false),2800);
  };

  useEffect(()=>{
    const video=videoRef.current;
    if(!video) return;
    const onLoaded=()=>{
      if(startAt>0 && startAt<video.duration) video.currentTime=startAt;
      setDuration(video.duration||0);
    };
    video.addEventListener('loadedmetadata',onLoaded);
    return ()=>video.removeEventListener('loadedmetadata',onLoaded);
  },[src,startAt]);

  const toggle=async()=>{
    const video=videoRef.current; if(!video) return;
    if(video.paused){ try{await video.play();}catch{setError('Video could not start. Check that the Google Drive file is accessible.');} }
    else video.pause();
    scheduleHide();
  };

  const report=(force=false)=>{
    const video=videoRef.current; if(!video||!duration) return;
    const now=Date.now(); if(!force && now-lastSent.current<5000) return;
    lastSent.current=now;
    const percent=Math.min(100,Math.max(0,(video.currentTime/duration)*100));
    onProgress?.(video.currentTime,percent,percent>=98);
  };

  const onTime=()=>{ const v=videoRef.current; if(!v) return; setCurrent(v.currentTime); report(); };
  const onSeek=(value:number)=>{ const v=videoRef.current; if(!v) return; v.currentTime=value; setCurrent(value); scheduleHide(); };
  const setRate=(rate:number)=>{ const v=videoRef.current; if(v) v.playbackRate=rate; setSpeed(rate); setShowSpeed(false); scheduleHide(); };
  const toggleMute=()=>{ const v=videoRef.current; if(!v)return; const next=v.muted||v.volume===0?1:0; v.muted=next===0; v.volume=next; setVolume(next); scheduleHide(); };
  const changeVolume=(value:number)=>{ const v=videoRef.current; if(!v)return; v.volume=value; v.muted=value===0; setVolume(value); scheduleHide(); };
  const fullscreen=()=>{ rootRef.current?.requestFullscreen?.(); scheduleHide(); };

  return <div ref={rootRef} className={`customVideo ${className}`} onMouseMove={scheduleHide} onTouchStart={scheduleHide}>
    <video ref={videoRef} src={src} playsInline preload="metadata" onPlay={()=>setPlaying(true)} onPause={()=>setPlaying(false)} onTimeUpdate={onTime} onLoadedMetadata={()=>setDuration(videoRef.current?.duration||0)} onEnded={()=>{setPlaying(false);report(true);}} onError={()=>setError('This video could not be played directly. The Google Drive file may not allow streaming.')} />
    {error ? <div className="customVideoError">{error}</div> : null}
    <button className="customVideoCenter" onClick={toggle} aria-label={playing?'Pause':'Play'}>{playing?<Pause/>:<Play/>}</button>
    <div className={`customVideoControls ${showControls?'visible':'hidden'}`}>
      <input className="customVideoSeek" type="range" min="0" max={duration||0} step="0.1" value={Math.min(current,duration||current)} onChange={e=>onSeek(Number(e.target.value))} aria-label="Seek" />
      <div className="customVideoBar">
        <button onClick={toggle} aria-label={playing?'Pause':'Play'}>{playing?<Pause/>:<Play/>}</button>
        <span>{formatTime(current)} / {formatTime(duration)}</span>
        <button onClick={toggleMute} aria-label="Mute">{volume===0?<VolumeX/>:<Volume2/>}</button>
        <input className="customVideoVolume" type="range" min="0" max="1" step="0.05" value={volume} onChange={e=>changeVolume(Number(e.target.value))} aria-label="Volume" />
        <div className="customVideoMenuWrap"><button onClick={()=>{setShowSpeed(v=>!v);scheduleHide();}} aria-label="Playback speed"><Settings/><span>{speed}×</span></button>{showSpeed&&<div className="customVideoMenu">{[0.5,0.75,1,1.25,1.5,2].map(rate=><button key={rate} className={rate===speed?'selected':''} onClick={()=>setRate(rate)}>{rate}×</button>)}</div>}</div>
        <button onClick={fullscreen} aria-label="Fullscreen"><Maximize/></button>
      </div>
    </div>
  </div>;
}
