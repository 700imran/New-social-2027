import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const topics = [
  ['India News','▣','orange'],['Technology','◇','blue'],['Business','↗','blue'],
  ['Sports','◆','blue'],['Entertainment','▶','blue'],['Health & Fitness','●','blue'],
  ['Education','▤','blue'],['Environment','◯','blue'],['Culture','✦','blue']
];
const nav = [['Home','⌂'],['Discover','⌕'],['Create','+'],['Activity','♧'],['Profile','●']];

function Brand(){ return <div className="brand"><span className="brand-mark">B</span><span>BharatSpace</span></div> }
function BottomNav({screen,onChange}){
  return <nav className="bottom-nav">
    {nav.map(([label,icon],i)=> label==='Create' ?
      <button key={label} className="create-btn" onClick={()=>onChange('Create')} aria-label="Create"><span>+</span></button> :
      <button key={label} className={`nav-item ${screen===label?'active':''}`} onClick={()=>onChange(label)}>
        <span className="nav-icon">{icon}</span><span>{label}</span>
      </button>)}
  </nav>
}
function Home({go}){
  return <div className="screen home">
    <header className="home-header"><Brand/><div className="header-actions"><button>⌕</button><button>♧<b>3</b></button></div></header>
    <div className="tabs"><button className="selected">For You</button><button>Trending</button><button>India News</button><button>Tech</button><button>Culture</button></div>
    <section className="story-row">
      {[['Delhi Now','Today · India Gate','▣'],['Tech Creators','New voices','◇'],['Bharat Business','Markets & ideas','↗'],['Fitness India','Live wellness','●']].map(x=><button className="story" key={x[0]}><span className="story-icon">{x[2]}</span><strong>{x[0]}</strong><small>{x[1]}</small></button>)}
    </section>
    <article className="post-card">
      <div className="post-head"><div className="avatar orange">PS</div><div><strong>Pooja Sharma</strong><small>2h · New Delhi</small></div><button className="follow">Follow</button></div>
      <p className="post-copy"><b>Incredible crowd at India Gate today! 🇮🇳</b><br/>People from across India sharing stories.<br/><a>#IndiaUnites</a></p>
      <div className="media"><div className="gate"><span></span></div><div className="flag"><i></i><i></i><i></i></div><div className="people">•• • • •• •</div><span className="live">● LIVE</span></div>
      <div className="actions"><button className="liked">♥ 12.4K</button><button>◯ 1.2K</button><button>↗ 532</button><button className="save">⌑</button></div>
      <div className="comment"><div className="avatar blue">RK</div><div><p>Rohan: This is worth discussing.</p><a>View all comments</a></div></div>
    </article>
    <button className="event-banner" onClick={()=>go('Discover')}><span>HAPPENING NOW</span><strong>Delhi — 5 Sep</strong><small>Join the conversation →</small></button>
  </div>
}
function Discover(){
  const trends=[['#India2026','2.4M posts'],['#MakeInIndia','1.8M posts'],['#SpaceIndia','2.4M posts'],['#ClimateAction','1.8M posts']];
  return <div className="screen discover"><header className="simple-header"><h1>Discover</h1><span>⌕</span></header><div className="search">Search people, topics or places</div><h2>What’s happening now</h2><section className="hero"><div><strong>What’s<br/>Happening<br/>Now ⚡</strong><small>Real-time conversations across India</small><button>Explore now</button></div></section><h2>Trending Topics</h2><div className="trend-grid">{trends.map(t=><div className="trend" key={t[0]}><b>↗</b><div><strong>{t[0]}</strong><small>{t[1]}</small></div></div>)}</div><h2>Live now</h2><div className="live-card"><span className="live-chip">LIVE</span><div><strong>India Space Update</strong><small>Live from Sriharikota · 248K watching</small></div></div><div className="live-card"><div><strong>Cricket Fever</strong><small>India vs Australia · 1.1M watching</small></div></div></div>
}
function Compose(){ return <div className="screen compose"><header className="compose-head"><button>‹</button><h1>Create Post</h1><button className="post-btn">Post</button></header><div className="composer-user"><div className="avatar orange">PS</div><span>What’s on your mind, BharatSpace?</span></div><div className="divider"/><div className="media-tools"><button>Photo</button><button>Video</button><button>Poll</button><button>Article</button></div><div className="prompt"><span>✦</span><div><strong>Share something useful</strong><small>News · Tips · Ideas · Opportunities</small></div></div><strong className="topic-label">Post in relevant topics</strong><div className="pills"><button className="chosen">India News</button><button>Technology</button><button>Business</button></div><div className="preview"><strong>Let’s build a<br/>stronger India<br/>together 🇮🇳</strong><small>Preview</small></div></div> }
function Activity(){const rows=[['A0','Rohit Verma','mentioned you in a post','Great perspective on India’s green energy future.','2m'],['A1','Ananya Singh','liked your post','Love that India’s youth is creating change.','12m'],['BT','Bharat Today','shared your post','Important discussion on India’s next decade.','1h'],['A3','Tech Bharat','followed you','', '2h'],['A4','Vikram Joshi','commented on your post','Well said. Looking forward to more such insights.','5h']]; return <div className="screen activity"><h1>Activity</h1><div className="filters"><button className="active">All</button><button>Mentions</button><button>Reactions</button><button>Comments</button></div>{rows.map((r,i)=><div className="activity-row" key={r[1]}><div className={`avatar ${i===2?'red':'blue'}`}>{r[0]}</div><div className="activity-copy"><strong>{r[1]}</strong><span>{r[2]}</span>{r[3]&&<small>{r[3]}</small>}</div><time>{r[4]}</time>{i===1&&<b className="heart">♥</b>}</div>)}</div>}
function Profile(){return <div className="screen profile"><div className="cover"><span>🇮🇳</span></div><div className="profile-top"><div className="avatar orange big">PS</div><div><h1>Pooja Sharma ✓</h1><p>Tech · Innovation · India</p></div></div><p className="bio">Building a better India through technology, education and community.</p><p className="location">⌖ New Delhi, India · Joined May 2024</p><div className="profile-actions"><button>Edit Profile</button><button>Share Profile</button></div><div className="stats"><div><b>1.2K</b><span>Posts</span></div><div><b>58.4K</b><span>Followers</span></div><div><b>892</b><span>Following</span></div></div><h2>My Topics</h2><div className="pills profile-pills"><button className="chosen">India News</button><button>Tech</button><button>Climate</button><button>Education</button></div><article className="profile-post"><strong>Small actions, big impact! 🌱</strong><p>Let’s make India greener, cleaner and stronger.</p><small>124 reactions · 18 comments</small></article></div>}
function Onboarding({onDone}){const [selected,setSelected]=useState(new Set(['India News'])); const toggle=t=>setSelected(s=>{const n=new Set(s);n.has(t)?n.delete(t):n.add(t);return n}); return <div className="screen onboarding"><h1>What interests you?</h1><p>Build a feed around what matters to you</p><div className="topic-grid">{topics.map(([t,ic,c],i)=><button key={t} className={`topic-card ${selected.has(t)?'selected':''}`} onClick={()=>toggle(t)}><span className={c}>{ic}</span><strong>{t}</strong>{selected.has(t)&&<i>✓</i>}</button>)}</div><button className="get-started" onClick={onDone}>Get Started</button><div className="steps"><b>●</b> ○ ○ ○</div></div>}
function App(){const [screen,setScreen]=useState('onboarding'); const [onboard,setOnboard]=useState(true); const go=s=>setScreen(s); const content=useMemo(()=>{if(onboard)return <Onboarding onDone={()=>{setOnboard(false);setScreen('Home')}}/>; switch(screen){case'Home':return <Home go={go}/>;case'Discover':return <Discover/>;case'Create':return <Compose/>;case'Activity':return <Activity/>;case'Profile':return <Profile/>;default:return <Home go={go}/>}},[screen,onboard]); return <main className="app-shell">{content}{!onboard&&<BottomNav screen={screen} onChange={go}/>}</main>}

createRoot(document.getElementById('root')).render(<App/>);
