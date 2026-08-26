import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BookOpen, Play, LayoutDashboard, Library, Settings, ChevronRight, ArrowLeft, Lock, User, LogOut, LoaderCircle, FileText, Image as ImageIcon, Plus, Pencil, Trash2, FolderPlus, Layers, ChevronDown } from 'lucide-react';
import './styles.css';

const API = 'https://prepx-api.saurtecx.workers.dev';

type Item = { id:number; title:string; type:string; moduleId:number; moduleName:string; courseId:number; courseName:string; categoryId:number; categoryName:string; sourceUrl?:string|null; driveFileId?:string|null; position:number };
type Module = { id:number; title:string; courseId:number; courseName:string; categoryId:number; categoryName:string; position:number; items:Item[] };
type AuthUser = { id:number; username:string; role:string };
type Session = { user:AuthUser; token:string };

const iconFor = (type:string) => type === 'video' ? <Play size={18}/> : type === 'image' ? <ImageIcon size={18}/> : <FileText size={18}/>;
const drivePreview = (id:string) => `https://drive.google.com/file/d/${id}/preview`;
const driveId = (value:string) => {
  const match = value.match(/\/d\/([^/?]+)/) || value.match(/id=([^&]+)/);
  return match ? match[1] : value.trim();
};
const authHeaders = (token:string, extra:Record<string,string> = {}) => ({ ...extra, Authorization:`Bearer ${token}` });
function clearSession(){ ['prepx_session','prepx_user','prepx_token'].forEach(k => localStorage.removeItem(k)); }

function Login({ onLogin }:{ onLogin:(s:Session)=>void }) {
  const [username,setUsername] = useState('');
  const [password,setPassword] = useState('');
  const [error,setError] = useState('');
  const [loading,setLoading] = useState(false);
  async function submit(e:React.FormEvent){
    e.preventDefault(); setLoading(true); setError('');
    try {
      const r = await fetch(`${API}/login`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({username,password}) });
      const d = await r.json();
      if(!r.ok || !d.success) throw Error(d.message || 'Login failed');
      const token = d.token || d.access_token;
      if(!token) throw Error('Login succeeded but no authentication token was returned');
      const s = { user:d.user as AuthUser, token };
      localStorage.setItem('prepx_session', JSON.stringify(s));
      onLogin(s);
    } catch(e) { setError(e instanceof Error ? e.message : 'Login failed'); }
    finally { setLoading(false); }
  }
  return <div className="loginPage"><div className="loginCard">
    <div className="brand"><div className="brandMark">△</div><div><b>PREPX</b><small>STUDY PORTAL</small></div></div>
    <div className="loginIntro"><small>WELCOME BACK</small><h1>Continue your preparation.</h1></div>
    <form onSubmit={submit}>
      <label><User size={17}/><input value={username} onChange={e=>setUsername(e.target.value)} placeholder="Username"/></label>
      <label><Lock size={17}/><input value={password} onChange={e=>setPassword(e.target.value)} placeholder="Password" type="password"/></label>
      {error && <div className="loginError">{error}</div>}
      <button className="loginButton" disabled={loading}>{loading && <LoaderCircle className="spin" size={18}/>} {loading ? 'Signing in…' : 'Enter Prepx'}</button>
    </form>
  </div></div>;
}

function App(){
  const saved = localStorage.getItem('prepx_session');
  let initial:Session|null = null;
  try { initial = saved ? JSON.parse(saved) : null; } catch { clearSession(); }
  const [session,setSession] = useState<Session|null>(initial);
  const [p,setP] = useState<'home'|'course'|'learn'|'admin'>('home');
  const [modules,setModules] = useState<Module[]>([]);
  const [active,setActive] = useState<number|null>(null);
  const [loading,setLoading] = useState(false);
  const [contentError,setContentError] = useState('');
  const user = session?.user ?? null;
  const isAdmin = user?.role === 'admin';

  const loadContent = async () => {
    if(!session) return;
    setLoading(true); setContentError('');
    try {
      const r = await fetch(`${API}/content`, { headers:authHeaders(session.token) });
      const d = await r.json();
      if(r.status === 401 || r.status === 403){ clearSession(); setSession(null); return; }
      if(!r.ok || !d.success) throw Error(d.message || 'Could not load content');
      const grouped = new Map<number,Module>();
      for(const x of d.content || []){
        const mid = Number(x.module_id);
        if(!grouped.has(mid)) grouped.set(mid, { id:mid, title:x.module_name || 'Untitled module', courseId:Number(x.course_id), courseName:x.course_name || 'Untitled course', categoryId:Number(x.category_id), categoryName:x.category_name || 'CAT', position:Number(x.module_position)||0, items:[] });
        grouped.get(mid)!.items.push({ id:Number(x.id), title:x.name || 'Untitled lesson', type:x.content_type || 'document', moduleId:mid, moduleName:x.module_name, courseId:Number(x.course_id), courseName:x.course_name, categoryId:Number(x.category_id), categoryName:x.category_name, sourceUrl:x.source_url, driveFileId:x.drive_file_id, position:Number(x.position)||0 });
      }
      const next = [...grouped.values()].sort((a,b)=>a.position-b.position || a.id-b.id);
      next.forEach(m=>m.items.sort((a,b)=>a.position-b.position || a.id-b.id));
      setModules(next);
      setActive(v=>v ?? next[0]?.items[0]?.id ?? null);
    } catch(e) { setContentError(e instanceof Error ? e.message : 'Could not connect'); }
    finally { setLoading(false); }
  };

  useEffect(()=>{ if(session) loadContent(); },[session]);
  useEffect(()=>{ if(p==='admin' && !isAdmin) setP('home'); },[p,isAdmin]);
  const logout = () => { clearSession(); setSession(null); setP('home'); };
  if(!session || !user) return <Login onLogin={s=>{setSession(s);setP('home');}}/>;

  if(p==='learn'){
    const cur = modules.flatMap(m=>m.items).find(i=>i.id===active) || modules.flatMap(m=>m.items)[0];
    return <Learn cur={cur} modules={modules} courseTitle={cur?.courseName || modules[0]?.courseName || 'Your course'} setActive={setActive} back={()=>setP('course')} logout={logout}/>;
  }
  const all = modules.flatMap(m=>m.items);
  const cur = all.find(i=>i.id===active) || all[0];
  const courseTitle = cur?.courseName || modules[0]?.courseName || 'Your course';
  const categoryTitle = cur?.categoryName || modules[0]?.categoryName || 'CAT';
  const page = p==='admin' && isAdmin ? 'Content management' : p==='course' ? courseTitle : `Welcome back, ${user.username}`;

  return <>
    <aside><strong>△ PREPX</strong><nav>
      <button onClick={()=>setP('home')}><LayoutDashboard/>Dashboard</button>
      <button onClick={()=>setP('course')}><Library/>My Library</button>
      {isAdmin && <button onClick={()=>setP('admin')}><Settings/>Content management</button>}
    </nav><div className="user"><div className="avatar">{user.username.slice(0,2).toUpperCase()}</div><div><b>{user.username}</b><small>{user.role}</small></div><button className="logout" onClick={logout}><LogOut size={16}/></button></div></aside>
    <main><header><b>{page}</b></header>
      {loading ? <p>Loading course content…</p> : contentError ? <div className="loginError">{contentError}</div> : p==='admin' && isAdmin ? <Admin modules={modules} refresh={loadContent} token={session.token}/> : p==='course' ? <Course modules={modules} open={id=>{setActive(id);setP('learn');}}/> : <Home open={()=>cur&&setP('learn')} openCourse={()=>setP('course')} hasContent={!!cur} courseTitle={courseTitle} categoryTitle={categoryTitle} lessonCount={all.length}/>} 
    </main>
  </>;
}

function Home({open,openCourse,hasContent,courseTitle,categoryTitle,lessonCount}:any){ return <>
  <section className="hero"><small>CONTINUE LEARNING</small><h1>{courseTitle}</h1><p>{hasContent ? 'Your course content is loaded from Prepx.' : 'Content will appear here as it is added.'}</p><button className="primary" onClick={open} disabled={!hasContent}><Play size={16}/>Continue learning</button></section>
  <h2>Courses</h2><button className="card courseCard" onClick={openCourse} disabled={!hasContent}><div className="art"><BookOpen size={48}/></div><small>{categoryTitle} · {courseTitle}</small><h3>{courseTitle}</h3><span>{hasContent ? `${lessonCount} lesson${lessonCount===1?'':'s'} available` : 'Waiting for content'}</span></button>
</>; }

function Course({modules,open}:{modules:Module[];open:(id:number)=>void}){ if(!modules.length) return <p>No course content has been added yet.</p>; return <section>{modules.map((m,i)=><div className="module" key={m.id}><small>MODULE {String(i+1).padStart(2,'0')}</small><h2>{m.title}</h2>{m.items.map(x=><button className="lesson" key={x.id} onClick={()=>open(x.id)}>{iconFor(x.type)}<div><b>{x.title}</b><small>{x.type}</small></div><ChevronRight/></button>)}</div>)}</section>; }

function Admin({modules,refresh,token}:{modules:Module[];refresh:()=>Promise<void>;token:string}){
  const [msg,setMsg]=useState(''); const [err,setErr]=useState(''); const [busy,setBusy]=useState(false);
  const [category,setCategory]=useState(''); const [selectedCategory,setSelectedCategory]=useState('');
  const [course,setCourse]=useState(''); const [module,setModule]=useState(''); const [moduleCourse,setModuleCourse]=useState('');
  const [lessonModule,setLessonModule]=useState(''); const [title,setTitle]=useState(''); const [file,setFile]=useState(''); const [type,setType]=useState('video'); const [position,setPosition]=useState('');
  const [openCats,setOpenCats]=useState<Set<number>>(new Set()); const [openCourses,setOpenCourses]=useState<Set<number>>(new Set()); const [openModules,setOpenModules]=useState<Set<number>>(new Set());
  const categories=useMemo(()=>[...new Map(modules.map(m=>[m.categoryId,{id:m.categoryId,name:m.categoryName}])).values()],[modules]);
  const courses=useMemo(()=>[...new Map(modules.map(m=>[m.courseId,{id:m.courseId,name:m.courseName,categoryId:m.categoryId}])).values()],[modules]);
  useEffect(()=>{ if(!selectedCategory&&categories[0])setSelectedCategory(String(categories[0].id)); if(!moduleCourse&&courses[0])setModuleCourse(String(courses[0].id)); if(!lessonModule&&modules[0])setLessonModule(String(modules[0].id)); },[categories,courses,modules,selectedCategory,moduleCourse,lessonModule]);
  const toggle=(setter:React.Dispatch<React.SetStateAction<Set<number>>>,id:number)=>setter(old=>{const next=new Set(old);next.has(id)?next.delete(id):next.add(id);return next;});
  async function call(path:string,method:string,body?:any){ setBusy(true);setErr('');setMsg('');try{const r=await fetch(API+path,{method,headers:authHeaders(token,{'Content-Type':'application/json'}),body:body?JSON.stringify(body):undefined});const d=await r.json();if(!r.ok||!d.success)throw Error(d.message||d.error||'Request failed');await refresh();setMsg(d.message||'Saved successfully');return d;}catch(e){setErr(e instanceof Error?e.message:'Request failed');return null;}finally{setBusy(false);} }
  const rename=async(kind:string,id:number,name:string)=>{const n=prompt(`Rename ${kind}`,name);if(n&&n.trim()!==name)await call(`/admin/${kind}s/${id}`,'PUT',{name:n.trim()});};
  const del=async(kind:string,id:number,name:string)=>{if(confirm(`Delete ${kind} “${name}”?`))await call(`/admin/${kind}s/${id}`,'DELETE');};
  const actions=(kind:string,id:number,name:string)=><div className="treeActions"><button type="button" onClick={e=>{e.stopPropagation();rename(kind,id,name);}}><Pencil size={15}/></button><button type="button" onClick={e=>{e.stopPropagation();del(kind,id,name);}}><Trash2 size={15}/></button></div>;

  return <section className="adminPage">
    <div className="adminIntro"><small>ADMIN</small><h1>Manage learning structure</h1><p>Create and manage categories, courses, modules and lessons from one place.</p></div>
    {err&&<div className="loginError">{err}</div>}{msg&&<div className="adminMessage">{msg}</div>}
    <div className="adminTabs">
      <div className="coursePanel">
        <h2><FolderPlus size={18}/> Add structure</h2>
        <form onSubmit={async e=>{e.preventDefault();if(category.trim()&&await call('/admin/categories','POST',{name:category.trim()}))setCategory('');}}><label>New category<input value={category} onChange={e=>setCategory(e.target.value)} placeholder="e.g. VARC"/></label><button className="primary" disabled={busy}><Plus size={16}/>Add category</button></form>
        <form onSubmit={async e=>{e.preventDefault();if(course.trim()&&selectedCategory&&await call('/admin/courses','POST',{category_id:Number(selectedCategory),name:course.trim()}))setCourse('');}}><label>Category<select value={selectedCategory} onChange={e=>setSelectedCategory(e.target.value)}>{categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label><label>New course<input value={course} onChange={e=>setCourse(e.target.value)} placeholder="e.g. VARC1000"/></label><button className="primary" disabled={busy||!categories.length}><Plus size={16}/>Add course</button></form>
        <form onSubmit={async e=>{e.preventDefault();if(module.trim()&&moduleCourse&&await call('/admin/modules','POST',{course_id:Number(moduleCourse),name:module.trim(),position:0}))setModule('');}}><label>Course<select value={moduleCourse} onChange={e=>setModuleCourse(e.target.value)}>{courses.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label><label>New module<input value={module} onChange={e=>setModule(e.target.value)} placeholder="Module name"/></label><button className="primary" disabled={busy||!courses.length}><Layers size={16}/>Add module</button></form>
        <form onSubmit={async e=>{e.preventDefault();if(lessonModule&&title.trim()&&file.trim()&&await call('/admin/content','POST',{module_id:Number(lessonModule),name:title.trim(),content_type:type,drive_file_id:driveId(file),position:position===''?0:Number(position)})){setTitle('');setFile('');setPosition('');}}}><h2>Add lesson</h2><label>Module<select value={lessonModule} onChange={e=>setLessonModule(e.target.value)}>{modules.map(m=><option key={m.id} value={m.id}>{m.categoryName} · {m.courseName} · {m.title}</option>)}</select></label><label>Lesson title<input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Lesson title"/></label><label>Type<select value={type} onChange={e=>setType(e.target.value)}><option value="video">Video</option><option value="pdf">PDF</option><option value="image">Image</option><option value="document">Document</option></select></label><label>Google Drive link or file ID<input value={file} onChange={e=>setFile(e.target.value)} placeholder="Drive link or ID"/></label><label>Position<input type="number" value={position} onChange={e=>setPosition(e.target.value)} placeholder="0"/></label><button className="primary" disabled={busy||!modules.length}><Plus size={16}/>Add lesson</button></form>
      </div>
      <div className="userPanel structurePanel">
        <div className="panelTitle"><div><Settings size={18}/><h3>Existing structure</h3></div><button type="button" onClick={()=>refresh()}>Refresh</button></div>
        <div className="structureTree">
          {categories.map(categoryNode=>{
            const catOpen=openCats.has(categoryNode.id);
            return <div className="treeNode categoryNode" key={categoryNode.id}>
              <div className="treeRow" onClick={()=>toggle(setOpenCats,categoryNode.id)}><ChevronDown className={catOpen?'chevron open':'chevron'}/><b>{categoryNode.name}</b>{actions('category',categoryNode.id,categoryNode.name)}</div>
              {catOpen && courses.filter(courseNode=>courseNode.categoryId===categoryNode.id).map(courseNode=>{
                const courseOpen=openCourses.has(courseNode.id);
                return <div className="treeChildren" key={courseNode.id}>
                  <div className="treeRow" onClick={()=>toggle(setOpenCourses,courseNode.id)}><ChevronDown className={courseOpen?'chevron open':'chevron'}/><b>{courseNode.name}</b>{actions('course',courseNode.id,courseNode.name)}</div>
                  {courseOpen && modules.filter(moduleNode=>moduleNode.courseId===courseNode.id).map(moduleNode=>{
                    const moduleOpen=openModules.has(moduleNode.id);
                    return <div className="treeChildren" key={moduleNode.id}>
                      <div className="treeRow" onClick={()=>toggle(setOpenModules,moduleNode.id)}><ChevronDown className={moduleOpen?'chevron open':'chevron'}/><b>{moduleNode.title}</b>{actions('module',moduleNode.id,moduleNode.title)}</div>
                      {moduleOpen && <div className="treeChildren lessonsTree">{moduleNode.items.map(item=><div className="treeRow lessonTree" key={item.id}>{iconFor(item.type)}<span title={item.title}>{item.title}</span>{actions('content',item.id,item.title)}</div>)}</div>}
                    </div>;
                  })}
                </div>;
              })}
            </div>;
          })}
        </div>
      </div>
    </div>
  </section>;
}

function Learn({cur,modules,courseTitle,setActive,back,logout}:any){
  if(!cur)return <div className="learn"><button onClick={back}><ArrowLeft/> Back</button><p>No content available.</p></div>;
  const src=cur.driveFileId?drivePreview(cur.driveFileId):cur.sourceUrl;
  return <div className="learn"><header><button onClick={back}><ArrowLeft/> {courseTitle}</button><b>{cur.moduleName}</b><button onClick={logout}><LogOut size={16}/>Sign out</button></header><div className="learnGrid"><section>{src?(cur.type==='image'?<div className="video"><img src={src} alt={cur.title} style={{maxWidth:'100%',maxHeight:'100%'}}/></div>:<div className="video"><iframe src={src} title={cur.title} allow="autoplay" allowFullScreen style={{width:'100%',height:'100%',border:0}}/></div>):<div className="video"><Play size={42}/></div>}<small>CURRENT LESSON</small><h1>{cur.title}</h1><p>{cur.type}</p></section><section className="playlist"><h3>{courseTitle}</h3>{modules.map((m:Module)=><div key={m.id}><small>{m.title}</small>{m.items.map(i=><button key={i.id} className={i.id===cur.id?'now':''} onClick={()=>setActive(i.id)}>{iconFor(i.type)}{i.title}</button>)}</div>)}</section></div></div>;
}

createRoot(document.getElementById('root')!).render(<App/>);