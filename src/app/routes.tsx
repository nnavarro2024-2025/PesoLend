import { FormEvent, ReactNode, useEffect, useState } from 'react'
import {
  createBrowserRouter, Link, NavLink, Navigate, Outlet, useNavigate, useParams,
} from 'react-router'
import {
  ArrowRight, BadgeCheck, BarChart3, BrainCircuit, BriefcaseBusiness, Building2,
  Check, ChevronRight, CircleHelp, Clock3, Database, FileCheck2, Gauge, GitBranch,
  HandCoins, Headphones, LayoutDashboard, LockKeyhole, LogOut, Menu, MessageSquareText,
  MoveRight, Network, PhilippinePeso, Search, ShieldCheck, Sparkles, Target, Upload,
  UserRound, UsersRound, WalletCards, X,
} from 'lucide-react'
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { auth, demoPrediction } from './api'

const models = [
  { slug: 'loan-amount', name: 'Linear Regression', service: 'Loan assessment', line: 'Find a safe amount', icon: BarChart3 },
  { slug: 'decision', name: 'Decision Tree', service: 'Loan assessment', line: 'Follow clear rules', icon: GitBranch },
  { slug: 'similar-borrowers', name: 'KNN', service: 'Loan assessment', line: 'Ask people like you', icon: UsersRound },
  { slug: 'classify-message', name: 'Naive Bayes', service: 'Customer support', line: 'Sort messages fast', icon: MessageSquareText },
  { slug: 'risk-label', name: 'SVM', service: 'Risk prediction', line: 'Draw a safety line', icon: ShieldCheck },
  { slug: 'default-probability', name: 'Neural Network', service: 'Risk prediction', line: 'Spot hidden risk', icon: Network },
]

function Logo() {
  return <Link to="/" className="logo"><span>P</span> PesoLend</Link>
}

function PublicShell() {
  const [open, setOpen] = useState(false)
  return <>
    <header className="topbar">
      <div className="nav-wrap">
        <Logo />
        <button className="menu-button" onClick={() => setOpen(!open)} aria-label="Open menu"><Menu /></button>
        <nav className={open ? 'public-nav open' : 'public-nav'}>
          <NavLink to="/">Home</NavLink><NavLink to="/company">Company</NavLink>
          <NavLink to="/ml-lab">ML Lab</NavLink><NavLink to="/data">Data</NavLink>
          <NavLink to="/login">Log in</NavLink><Link className="button small" to="/login">Apply now</Link>
        </nav>
      </div>
    </header>
    <main><Outlet /></main>
    <footer>
      <div><Logo /><p>Loans made clear.</p></div>
      <div><b>Explore</b><Link to="/company">Company</Link><Link to="/ml-lab">ML Lab</Link><Link to="/data">Data</Link></div>
      <div><b>Portals</b><Link to="/login">Borrower</Link><Link to="/login">Loan officer</Link></div>
      <p className="copyright">© 2025 PesoLend · Philippines</p>
    </footer>
  </>
}

function Home() {
  return <>
    <section className="hero section">
      <div className="hero-copy">
        <span className="eyebrow"><Sparkles size={15}/> Fairer lending with ML</span>
        <h1>Fast loans.<br/><em>Clear decisions.</em></h1>
        <p>Simple borrowing, powered by data you can understand.</p>
        <div className="actions"><Link className="button" to="/login">Apply now <ArrowRight size={18}/></Link><Link className="button secondary" to="/ml-lab">Explore models</Link></div>
        <div className="trust-row"><span><Check/> Clear reasons</span><span><Check/> Secure data</span><span><Check/> Human review</span></div>
      </div>
      <div className="hero-visual">
        <div className="limit-card">
          <div className="card-top"><span className="icon-box mint"><PhilippinePeso/></span><span className="status success">Eligible</span></div>
          <span className="muted">Your estimated limit</span><strong>₱48,000</strong>
          <div className="meter"><i style={{width:'76%'}}/></div>
          <div className="split"><span>Model confidence</span><b>92%</b></div>
        </div>
        <div className="float-card risk"><ShieldCheck/><span><b>Low risk</b><small>5 models agree</small></span></div>
        <div className="float-card speed"><Clock3/><span><b>3 minutes</b><small>Average decision</small></span></div>
      </div>
    </section>
    <section className="section compact">
      <div className="section-head"><div><span className="kicker">WHAT WE DO</span><h2>Smarter at every step</h2></div><p>Three services. Six models. One clear answer.</p></div>
      <div className="card-grid three">
        <Service icon={<HandCoins/>} title="Loan assessment" text="A fair amount and clear decision."/>
        <Service icon={<Headphones/>} title="Support sorting" text="Your message reaches the right team."/>
        <Service icon={<ShieldCheck/>} title="Risk prediction" text="Safer loans for everyone."/>
      </div>
    </section>
    <section className="process-band">
      <div className="section compact"><span className="kicker light">HOW IT WORKS</span><div className="steps">
        {['Apply','Verify','Models check','Decision','Loan'].map((s,i)=><div key={s}><b>{i+1}</b><span>{s}</span>{i<4&&<ChevronRight/>}</div>)}
      </div></div>
    </section>
    <section className="section">
      <div className="section-head"><div><span className="kicker">THE ML LAB</span><h2>Meet the decision team</h2></div><Link className="text-link" to="/ml-lab">View all models <ArrowRight/></Link></div>
      <div className="model-grid">{models.map(m=><ModelCard key={m.slug} {...m}/>)}</div>
    </section>
    <section className="section video-block">
      <div><span className="kicker">IN 45 SECONDS</span><h2>How PesoLend works</h2><p>From application to a clear, fair offer.</p></div>
      <div className="video-placeholder"><button aria-label="Play video"><MoveRight/></button><span>Watch overview · 0:45</span></div>
    </section>
  </>
}

function Service({icon,title,text}:{icon:ReactNode,title:string,text:string}) {
  return <article className="service-card"><span className="icon-box">{icon}</span><h3>{title}</h3><p>{text}</p><Link to="/ml-lab">See models <ArrowRight/></Link></article>
}

function ModelCard({slug,name,service,line,icon:Icon}:typeof models[number]) {
  return <Link to={`/ml-lab/${slug}`} className="model-card">
    <div className="card-top"><span className="icon-box soft"><Icon/></span><span className="number">0{models.findIndex(m=>m.slug===slug)+1}</span></div>
    <span className="tag">{service}</span><h3>{name}</h3><p>{line}</p><span className="circle-arrow"><ArrowRight/></span>
  </Link>
}

function Company() {
  return <div className="page section">
    <PageIntro kicker="ABOUT PESOLEND" title="Lending built on clarity" text="Faster access. Fairer decisions. Better understanding."/>
    <div className="card-grid three">
      <InfoCard icon={<Target/>} title="Mission" text="Make fair credit easy to reach."/>
      <InfoCard icon={<Sparkles/>} title="Vision" text="A future where every decision is clear."/>
      <InfoCard icon={<BadgeCheck/>} title="Goals" text="Fast answers. Lower risk. More trust."/>
    </div>
    <div className="section-head inner"><div><span className="kicker">MACHINE LEARNING</span><h2>One journey, six models</h2></div></div>
    <div className="flow">{models.map((m,i)=><Link to={`/ml-lab/${m.slug}`} key={m.slug}><b>{i+1}</b><span>{m.name}<small>{m.line}</small></span></Link>)}</div>
  </div>
}

function InfoCard({icon,title,text}:{icon:ReactNode,title:string,text:string}) {
  return <article className="info-card"><span className="icon-box">{icon}</span><h3>{title}</h3><p>{text}</p></article>
}

function PageIntro({kicker,title,text}:{kicker:string,title:string,text:string}) {
  return <div className="page-intro"><span className="kicker">{kicker}</span><h1>{title}</h1><p>{text}</p></div>
}

function MLLab() {
  return <div className="page section">
    <PageIntro kicker="INTERACTIVE ML LAB" title="Models you can understand" text="Change the inputs. See every decision."/>
    {['Loan assessment','Customer support','Risk prediction'].map(group=><section className="model-group" key={group}>
      <div className="group-title"><span>{group==='Loan assessment'?<HandCoins/>:group==='Customer support'?<Headphones/>:<ShieldCheck/>}</span><h2>{group}</h2><i>{models.filter(m=>m.service===group).length} models</i></div>
      <div className="model-grid">{models.filter(m=>m.service===group).map(m=><ModelCard key={m.slug} {...m}/>)}</div>
    </section>)}
  </div>
}

function Algorithm() {
  const { slug = '' } = useParams()
  const model = models.find(m=>m.slug===slug) || models[0]
  const [income,setIncome]=useState(42000), [amount,setAmount]=useState(50000)
  const [loading,setLoading]=useState(false), [result,setResult]=useState<Awaited<ReturnType<typeof demoPrediction>>|null>(null)
  const index=models.indexOf(model)
  async function run(e:FormEvent){e.preventDefault();setLoading(true);setResult(await demoPrediction(slug,income,amount));setLoading(false)}
  const chart=[28,38,46,55,65,76].map((v,i)=>({income:(i+2)*10, safe:v, actual:v+(i%2?4:-3)}))
  return <div className="page section algorithm-page">
    <div className="breadcrumbs"><Link to="/ml-lab">ML Lab</Link><ChevronRight/> {model.name}</div>
    <div className="algo-hero">
      <div><span className="tag">{model.service}</span><h1>{model.name}</h1><p>{model.line}. <span>Clear inputs, visible logic.</span></p></div>
      <span className="algo-number">0{index+1}</span>
    </div>
    <section className="inputs-strip"><div><h3>What data goes in</h3><p>Only signals linked to affordability.</p></div><div>{['Monthly income','Loan amount','Existing debts','Payment history'].map(x=><span className="chip" key={x}>{x}</span>)}</div></section>
    <div className="demo-grid">
      <form className="panel form-panel" onSubmit={run}><span className="kicker">TRY IT</span><h2>Test a scenario</h2>
        <label>Monthly income <b>₱{income.toLocaleString()}</b><input type="range" min="12000" max="120000" step="1000" value={income} onChange={e=>setIncome(+e.target.value)}/></label>
        <label>Requested amount <b>₱{amount.toLocaleString()}</b><input type="range" min="5000" max="150000" step="1000" value={amount} onChange={e=>setAmount(+e.target.value)}/></label>
        {model.name==='KNN'&&<div><span className="field-label">Closest borrowers</span><div className="choice-row"><button type="button">K = 3</button><button type="button" className="selected">K = 5</button><button type="button">K = 7</button></div></div>}
        <button className="button full" disabled={loading}>{loading?'Checking…':'Run model'} <ArrowRight/></button>
      </form>
      <div className="panel result-panel"><div className="card-top"><div><span className="kicker">LIVE RESULT</span><h2>{result?'Prediction ready':'Ready to predict'}</h2></div>{result&&<span className={`status ${result.approved?'success':'danger'}`}>{result.approved?'Low risk':'High risk'}</span>}</div>
        {!result?<div className="empty-chart"><BrainCircuit/><p>Adjust inputs, then run the model.</p></div>:<>
          <div className="big-result">{model.name==='Linear Regression'?`₱${result.amount.toLocaleString()}`:`${result.risk}%`}<small>{model.name==='Linear Regression'?'suggested safe amount':'estimated risk'}</small></div>
          <ResponsiveContainer width="100%" height={180}><AreaChart data={chart}><defs><linearGradient id="fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#38a478" stopOpacity=".35"/><stop offset="1" stopColor="#38a478" stopOpacity="0"/></linearGradient></defs><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="income"/><YAxis/><Tooltip/><Area type="monotone" dataKey="safe" stroke="#12664a" fill="url(#fill)" strokeWidth={3}/></AreaChart></ResponsiveContainer>
        </>}
      </div>
    </div>
    {result&&<section className="meaning"><span><CircleHelp/></span><div><h3>What this means</h3><p>{result.interpretation}</p></div></section>}
    <div className="metrics-row"><div><span>Accuracy</span><b>91.4%</b><small>On test data</small></div><div><span>{model.name==='Linear Regression'?'Mean error':'Risk recall'}</span><b>{model.name==='Linear Regression'?'₱2,140':'88.7%'}</b><small>Latest evaluation</small></div><div className="metric-note"><b>Why it helps</b><p>Faster reviews with consistent evidence.</p></div></div>
    <details><summary>How it works <ChevronRight/></summary><div className="detail-body">{['Read the inputs','Compare learned patterns','Score the outcome','Explain the result'].map((x,i)=><span key={x}><b>{i+1}</b>{x}</span>)}</div></details>
    <details><summary>Limitations <ChevronRight/></summary><p className="detail-copy">Patterns depend on training data. A loan officer can review every result.</p></details>
    <div className="prev-next">{index>0?<Link to={`/ml-lab/${models[index-1].slug}`}>← {models[index-1].name}</Link>:<span/>}{index<5?<Link to={`/ml-lab/${models[index+1].slug}`}>{models[index+1].name} →</Link>:<Link to="/ml-lab">All models →</Link>}</div>
  </div>
}

const rows = [
  ['PL-2041','₱42,000','₱30,000','712','Paid back'],['PL-2042','₱28,000','₱18,000','654','Paid back'],
  ['PL-2043','₱61,000','₱75,000','590','Not paid'],['PL-2044','₱35,000','₱24,000','681','Paid back'],
  ['PL-2045','₱19,000','₱35,000','572','Not paid'],['PL-2046','₱52,000','₱40,000','730','Paid back'],
]
function DataPage(){
  const [tab,setTab]=useState('Borrower data'), [query,setQuery]=useState('')
  return <div className="page section"><PageIntro kicker="OPEN DATA" title="See what models learn" text="Synthetic data. Clear definitions. No hidden fields."/>
    <div className="tabs"><button className={tab==='Borrower data'?'active':''} onClick={()=>setTab('Borrower data')}>Borrower data</button><button className={tab!=='Borrower data'?'active':''} onClick={()=>setTab('Customer messages')}>Customer messages</button></div>
    <div className="data-stats"><div><Database/><span><small>Source</small><b>Synthetic · PesoLend</b></span></div><div><BarChart3/><span><small>Rows</small><b>10,000 records</b></span></div><div><GitBranch/><span><small>Split</small><b>80% train · 20% test</b></span></div><button className="button secondary">Download CSV</button></div>
    <section className="panel table-panel"><div className="table-head"><div><h2>Data preview</h2><p>First 20 rows</p></div><label className="search"><Search/><input placeholder="Search rows" value={query} onChange={e=>setQuery(e.target.value)}/></label></div>
      <div className="table-scroll"><table><thead><tr>{['Borrower ID','Income','Loan amount','Credit score','Outcome'].map(x=><th key={x}>{x}</th>)}</tr></thead><tbody>{rows.filter(r=>r.join(' ').toLowerCase().includes(query.toLowerCase())).map(r=><tr key={r[0]}>{r.map((c,i)=><td key={c}>{i===4?<span className={`status ${c==='Paid back'?'success':'danger'}`}>{c}</span>:c}</td>)}</tr>)}</tbody></table></div>
    </section>
    <div className="data-bottom panel"><div><span className="kicker">CLASS BALANCE</span><h2>Payment outcome</h2><ResponsiveContainer width="100%" height={190}><PieChart><Pie data={[{n:'Paid back',v:73},{n:'Not paid',v:27}]} dataKey="v" innerRadius={55} outerRadius={80}>{['#12664a','#f2b774'].map(c=><Cell fill={c} key={c}/>)}</Pie><Tooltip/></PieChart></ResponsiveContainer></div><div className="dictionary"><h2>Column dictionary</h2>{[['Income','Monthly earnings','All loan models'],['Credit score','Credit history signal','Tree, KNN, SVM'],['Outcome','Paid or not paid','Risk models']].map(r=><div key={r[0]}><b>{r[0]}</b><span>{r[1]}</span><small>{r[2]}</small></div>)}</div></div>
  </div>
}

function Login(){
  const nav=useNavigate()
  function enter(role:'borrower'|'officer'){auth.set(`demo-${role}`,role);nav(role==='borrower'?'/portal':'/officer')}
  return <div className="login-page"><div className="login-brand"><Logo/><div><span className="eyebrow"><ShieldCheck/> Secure access</span><h1>Welcome to clearer lending.</h1><p>Fast answers. Fair decisions. Your data protected.</p></div><div className="login-stat"><b>91.4%</b><span>Model accuracy</span></div></div>
    <div className="login-panel"><Link to="/" className="back">← Back to website</Link><div className="login-box"><h2>Log in</h2><p>Access your PesoLend account.</p><label>Email address<input type="email" placeholder="you@email.com"/></label><label>Password<input type="password" placeholder="••••••••"/></label><button className="button full" onClick={()=>enter('borrower')}>Log in</button><div className="divider"><span>Demo access</span></div><button className="demo-button" onClick={()=>enter('borrower')}><UserRound/> Demo as Borrower <ArrowRight/></button><button className="demo-button" onClick={()=>enter('officer')}><BriefcaseBusiness/> Demo as Loan Officer <ArrowRight/></button></div></div>
  </div>
}

const borrowerNav=[['Dashboard',LayoutDashboard,'/portal'],['Apply',FileCheck2,'/portal/apply'],['My Loans',WalletCards,'/portal/loans'],['Help',MessageSquareText,'/portal/help'],['Profile',UserRound,'/portal/profile']] as const
const officerNav=[['Applications',FileCheck2,'/officer'],['Support inbox',MessageSquareText,'/officer/support'],['ML Lab',BrainCircuit,'/ml-lab'],['Metrics',BarChart3,'/officer/metrics']] as const
function PortalShell({role}:{role:'borrower'|'officer'}){
  if(auth.role!==role) return <Navigate to="/login" replace/>
  const items=role==='borrower'?borrowerNav:officerNav
  return <div className="portal"><aside><Logo/><div className="role-label">{role==='borrower'?'BORROWER PORTAL':'OFFICER PORTAL'}</div><nav>{items.map(([n,I,p])=><NavLink end={p==='/portal'||p==='/officer'} to={p} key={n}><I/>{n}</NavLink>)}</nav><Link to="/" className="portal-public"><Building2/> Public website</Link><button className="logout" onClick={()=>auth.clear()}><LogOut/> Log out</button></aside><div className="portal-main"><header><button className="menu-button"><Menu/></button><div><b>{role==='borrower'?'Hi, Maria':'Loan operations'}</b><small>{role==='borrower'?'Your finances, made simple':'Tuesday, 18 March'}</small></div><span className="avatar">{role==='borrower'?'MS':'AO'}</span></header><Outlet/></div></div>
}

function BorrowerDashboard(){
  return <div className="dashboard"><div className="dash-head"><div><span className="kicker">OVERVIEW</span><h1>Good morning, Maria</h1></div><span className="status success"><BadgeCheck/> Identity verified</span></div>
    <div className="limit-banner"><div><span>Your loan limit</span><strong>₱48,000</strong><small>Updated from your latest profile</small><Link className="button cream" to="/portal/apply">Apply for a loan <ArrowRight/></Link></div><div className="limit-ring"><span>₱48k<small>available</small></span></div></div>
    <div className="dashboard-grid"><section className="panel active-loan"><div className="card-top"><div><span className="kicker">ACTIVE LOAN</span><h2>Personal loan</h2></div><span className="status success">On track</span></div><div className="loan-amount"><span>Remaining balance<b>₱18,240</b></span><span>Next payment<b>₱3,040</b><small>April 15</small></span></div><div className="progress"><i style={{width:'50%'}}/></div><div className="split"><span>6 of 12 payments</span><b>50% paid</b></div></section>
      <section className="quick"><h2>Quick actions</h2><div><button><span><PhilippinePeso/></span>Pay now</button><Link to="/portal/loans"><span><WalletCards/></span>My loans</Link><Link to="/portal/help"><span><CircleHelp/></span>Get help</Link></div></section></div>
    <section className="insight"><Sparkles/><div><b>Smart tip</b><p>Pay on time to keep your next offer low.</p></div><Link to="/ml-lab">How models help <ArrowRight/></Link></section>
  </div>
}

function Apply(){
  const [step,setStep]=useState(1),[amount,setAmount]=useState(30000),[term,setTerm]=useState(6),[checking,setChecking]=useState(false)
  const next=()=>{if(step===3){setChecking(true);setTimeout(()=>{setChecking(false);setStep(4)},2200)}else setStep(step+1)}
  return <div className="dashboard apply-page"><div className="dash-head"><div><span className="kicker">NEW APPLICATION</span><h1>Apply for a loan</h1></div><span className="secure"><LockKeyhole/> Secure form</span></div><div className="stepper">{['Amount','Finances','Review','Result'].map((s,i)=><div className={step>=i+1?'active':''} key={s}><b>{step>i+1?<Check/>:i+1}</b><span>{s}</span></div>)}</div>
    {checking?<div className="checking panel"><span className="scan"><BrainCircuit/></span><h2>Checking your application</h2><p>Six models are reviewing your details.</p><div className="loading-line"><i/></div></div>:step<4?<section className="panel application-card">
      {step===1&&<><span className="kicker">STEP 1 OF 3</span><h2>How much do you need?</h2><div className="amount-display">₱{amount.toLocaleString()}</div><input type="range" min="5000" max="48000" step="1000" value={amount} onChange={e=>setAmount(+e.target.value)}/><div className="range-labels"><span>₱5,000</span><span>₱48,000 limit</span></div><span className="field-label">Choose a term</span><div className="term-grid">{[3,6,12].map(n=><button className={term===n?'selected':''} onClick={()=>setTerm(n)} key={n}><b>{n}</b> months<small>₱{Math.ceil(amount/n*1.035).toLocaleString()}/mo</small></button>)}</div><div className="safe-chip"><ShieldCheck/><span><b>Suggested safe amount</b>Up to ₱36,000</span></div></>}
      {step===2&&<><span className="kicker">STEP 2 OF 3</span><h2>Your finances</h2><div className="form-grid">{['Monthly income','Monthly expenses','Existing debts','Credit score'].map((x,i)=><label key={x}>{x}<input defaultValue={['42,000','18,500','3,000','712'][i]}/></label>)}</div><label>Payment history<select><option>Always on time</option><option>1–2 late payments</option></select></label></>}
      {step===3&&<><span className="kicker">STEP 3 OF 3</span><h2>Review details</h2><div className="review-box">{[['Loan amount',`₱${amount.toLocaleString()}`],['Term',`${term} months`],['Monthly income','₱42,000'],['Estimated payment',`₱${Math.ceil(amount/term*1.035).toLocaleString()}`]].map(r=><div key={r[0]}><span>{r[0]}</span><b>{r[1]}</b></div>)}</div><label className="consent"><input type="checkbox" defaultChecked/> I agree to a fair, automated assessment.</label></>}
      <div className="form-actions">{step>1&&<button className="button secondary" onClick={()=>setStep(step-1)}>Back</button>}<button className="button" onClick={next}>{step===3?'Submit application':'Continue'} <ArrowRight/></button></div>
    </section>:<section className="panel approval"><span className="approval-icon"><Check/></span><span className="kicker">APPLICATION APPROVED</span><h1>You’re approved</h1><p>Your strong payment history kept risk low.</p><div className="offer"><div><span>Loan amount</span><b>₱{amount.toLocaleString()}</b></div><div><span>Monthly payment</span><b>₱{Math.ceil(amount/term*1.035).toLocaleString()}</b></div><div><span>Term</span><b>{term} months</b></div><div><span>Interest</span><b>3.5%</b></div></div><button className="button">Accept offer</button><button className="button secondary">Decline</button></section>}
  </div>
}

function Placeholder({title,icon}:{title:string,icon:ReactNode}){return <div className="dashboard"><div className="dash-head"><div><span className="kicker">PESOLEND</span><h1>{title}</h1></div></div><div className="panel placeholder">{icon}<h2>{title}</h2><p>Your records and actions appear here.</p><button className="button">View details</button></div></div>}

const applicants=[['Maria Santos','₱30,000','Today, 9:42','Review','Low'],['John Reyes','₱75,000','Today, 9:16','New','High'],['Ana Cruz','₱24,000','Yesterday','Review','Low'],['Paolo Lim','₱50,000','Yesterday','More info','Medium'],['Nina Garcia','₱18,000','Mar 16','Approved','Low']]
function Applications(){
  const [query,setQuery]=useState('')
  return <div className="dashboard"><div className="dash-head"><div><span className="kicker">LOAN OPERATIONS</span><h1>Applications</h1></div><button className="button secondary"><Upload/> Export</button></div>
    <div className="officer-stats"><div><span>New today</span><b>24</b><small>+8% this week</small></div><div><span>Needs review</span><b>11</b><small>4 high risk</small></div><div><span>Approved</span><b>86%</b><small>Last 30 days</small></div><div><span>Average time</span><b>3.2m</b><small>Decision speed</small></div></div>
    <section className="panel table-panel"><div className="table-head"><div className="filter-row"><button className="active">All</button><button>New</button><button>Review</button><button>Approved</button></div><label className="search"><Search/><input placeholder="Search applicants" value={query} onChange={e=>setQuery(e.target.value)}/></label></div><div className="table-scroll"><table><thead><tr>{['Applicant','Amount','Submitted','Status','Risk',''].map(x=><th key={x}>{x}</th>)}</tr></thead><tbody>{applicants.filter(a=>a.join('').toLowerCase().includes(query.toLowerCase())).map(a=><tr key={a[0]}><td><span className="person">{a[0].split(' ').map(x=>x[0]).join('')}</span><b>{a[0]}</b></td><td><b>{a[1]}</b></td><td>{a[2]}</td><td><span className="status neutral">{a[3]}</span></td><td><span className={`risk-dot ${a[4].toLowerCase()}`}/>{a[4]}</td><td><button className="table-action">View <ChevronRight/></button></td></tr>)}</tbody></table></div></section>
  </div>
}

function Metrics(){
  const data=[{m:'Tree',accuracy:89,recall:84},{m:'KNN',accuracy:86,recall:81},{m:'SVM',accuracy:91,recall:89},{m:'Neural net',accuracy:93,recall:92}]
  return <div className="dashboard"><div className="dash-head"><div><span className="kicker">MODEL HEALTH</span><h1>Metrics</h1></div><span className="status success">All models online</span></div><div className="officer-stats"><div><span>Accuracy</span><b>91.4%</b><small>+1.2% this month</small></div><div><span>Risk recall</span><b>88.7%</b><small>Safer approvals</small></div><div><span>Amount MAE</span><b>₱2,140</b><small>Linear regression</small></div><div><span>R² score</span><b>0.87</b><small>Strong fit</small></div></div><section className="panel metric-chart"><div><span className="kicker">MODEL COMPARISON</span><h2>Accuracy and recall</h2></div><ResponsiveContainer width="100%" height={310}><BarChart data={data}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="m"/><YAxis domain={[70,100]}/><Tooltip/><Bar dataKey="accuracy" fill="#12664a" radius={[5,5,0,0]}/><Bar dataKey="recall" fill="#8bd5b5" radius={[5,5,0,0]}/></BarChart></ResponsiveContainer></section></div>
}

function NotFound(){return <div className="page section"><PageIntro kicker="404" title="Page not found" text="Let’s get you back on track."/><Link className="button" to="/">Go home</Link></div>}

export const router=createBrowserRouter([
  {path:'/',Component:PublicShell,children:[
    {index:true,Component:Home},{path:'company',Component:Company},{path:'ml-lab',Component:MLLab},
    {path:'ml-lab/:slug',Component:Algorithm},{path:'data',Component:DataPage},
  ]},
  {path:'/login',Component:Login},
  {path:'/portal',element:<PortalShell role="borrower"/>,children:[
    {index:true,Component:BorrowerDashboard},{path:'apply',Component:Apply},
    {path:'loans',element:<Placeholder title="My loans" icon={<WalletCards/>}/>},
    {path:'help',element:<Placeholder title="Support messages" icon={<MessageSquareText/>}/>},
    {path:'profile',element:<Placeholder title="Your profile" icon={<UserRound/>}/>},
  ]},
  {path:'/officer',element:<PortalShell role="officer"/>,children:[
    {index:true,Component:Applications},
    {path:'support',element:<Placeholder title="Support inbox" icon={<MessageSquareText/>}/>},
    {path:'metrics',Component:Metrics},
  ]},
  {path:'*',Component:NotFound},
])
