import { FormEvent, ReactNode, useEffect, useRef, useState } from 'react'
import {
  createBrowserRouter, Link, NavLink, Navigate, Outlet, useNavigate, useOutletContext, useParams,
} from 'react-router'
import {
  ArrowRight, BadgeCheck, BarChart3, BrainCircuit, BriefcaseBusiness, Building2,
  Check, ChevronRight, CircleHelp, Clock3, Database, FileCheck2, Gauge, GitBranch,
  HandCoins, Headphones, LayoutDashboard, LockKeyhole, LogOut, Menu, MessageSquareText,
  Network, PhilippinePeso, Search, ShieldCheck, Sparkles, Target, Upload,
  UserRound, UsersRound, WalletCards, X,
} from 'lucide-react'
import {
  Bar, BarChart, CartesianGrid, Cell, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
  Scatter, ScatterChart, ZAxis,
} from 'recharts'
import { api, auth, type MeResponse, type ModelMetrics, type MetricsResponse } from './api'

const models = [
  { slug: 'loan-amount', name: 'Linear Regression', service: 'Loan assessment', line: 'Find a suggested amount', icon: BarChart3 },
  { slug: 'decision', name: 'Decision Tree', service: 'Loan assessment', line: 'Follow clear rules', icon: GitBranch },
  { slug: 'similar-borrowers', name: 'KNN', service: 'Loan assessment', line: 'Ask people like you', icon: UsersRound },
  { slug: 'classify-message', name: 'Naive Bayes', service: 'Customer support', line: 'Sort messages fast', icon: MessageSquareText },
  { slug: 'risk-label', name: 'SVM', service: 'Risk prediction', line: 'Draw a safety line', icon: ShieldCheck },
  { slug: 'default-probability', name: 'Neural Network', service: 'Risk prediction', line: 'Spot hidden risk', icon: Network },
]

function Logo() {
  return <Link to="/" className="logo"><span>₱</span> ₱esoLend</Link>
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
    </footer>
  </>
}

function Home() {
  return <>
    <section className="hero section">
      <div className="hero-copy">
        <h1>Every peso has a reason.</h1>
        <p>Financial peace of mind starts here.</p>
        <div className="actions"><Link className="button" to="/login">Apply now <ArrowRight size={18}/></Link><Link className="button secondary" to="/ml-lab">Explore models</Link></div>
      </div>
      <div className="hero-visual">
        <div className="limit-card">
          <div className="card-top"><span className="icon-box mint"><PhilippinePeso/></span><span className="status neutral">Demo product cap</span></div>
          <span className="muted">Maximum loan amount</span>
          <strong>₱60,000</strong>
          <small className="estimate-note">Actual offers depend on each application.</small>
        </div>
        <div className="float-card risk"><ShieldCheck/><span><b>Clear terms</b></span></div>
        <div className="float-card speed"><Clock3/><span><b>Decision in minutes</b></span></div>
      </div>
    </section>
    <section className="section compact">
      <div className="section-head"><div><span className="kicker">WHAT WE DO</span><h2>Smarter at every step</h2></div><p>Three services. Six models.</p></div>
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
  const needs = [
    { title: 'Estimate suggested loan amounts', text: 'Match offers to what a borrower can afford.', icon: <HandCoins/> },
    { title: 'Judge repayment risk', text: 'Spot risk early and make decisions easier to explain.', icon: <ShieldCheck/> },
    { title: 'Route customer messages', text: 'Send each message to the team best placed to help.', icon: <Headphones/> },
  ]
  const goals = [
    'Offer amounts borrowers can afford.',
    'Explain decisions with clear reasons.',
    'Identify repayment risk early.',
    'Get customer messages to the right team.',
  ]
  const goalTitles = ['Affordable offers', 'Clear reasons', 'Early risk detection', 'Faster support']
  return <div className="page section company-page">
    <h1 className="company-title">About ₱esoLend</h1>
    <section className="panel company-card company-overview">
      <p>₱esoLend is a fictional digital lending company in the Philippines. It uses machine learning to estimate suggested loan amounts, assess repayment risk, and route customer messages, so every decision is faster and easier to explain.</p>
    </section>
    <div className="company-principles">
      <InfoCard className="company-card" icon={<Target/>} title="Mission" text="To make borrowing faster and easier to understand by explaining every lending decision in plain language."/>
      <InfoCard className="company-card" icon={<Sparkles/>} title="Vision" text="A lending industry where every customer can see why a decision was made."/>
    </div>
    <section className="company-section">
      <h2 className="company-section-heading">Data-driven needs</h2>
      <div className="company-needs">{needs.map(item=><InfoCard className="company-card" key={item.title} icon={item.icon} title={item.title} text={item.text}/>)}</div>
    </section>
    <section className="company-section">
      <h2 className="company-section-heading">What we work toward</h2>
      <div className="company-goals">{goals.map((goal,index)=><InfoCard
        className="company-card"
        key={goal}
        icon={index===0?<HandCoins/>:index===1?<Check/>:index===2?<ShieldCheck/>:<Headphones/>}
        title={goalTitles[index]}
        text={goal}
      />)}</div>
    </section>
  </div>
}

function InfoCard({icon,title,text,className=''}:{icon:ReactNode,title:string,text:string,className?:string}) {
  return <article className={`info-card ${className}`}><span className="icon-box">{icon}</span><h3>{title}</h3><p>{text}</p></article>
}

function PageIntro({kicker,title,text}:{kicker:string,title:string,text:string}) {
  return <div className="page-intro"><span className="kicker">{kicker}</span><h1>{title}</h1><p>{text}</p></div>
}

function MLLab() {
  const {slug:routeSlug}=useParams()
  const initialSlug=models.some(item=>item.slug===routeSlug)?routeSlug!:models[0].slug
  const [activeSlug,setActiveSlug]=useState(initialSlug)
  useEffect(()=>{
    setActiveSlug(models.some(item=>item.slug===routeSlug)?routeSlug!:models[0].slug)
  },[routeSlug])
  const activeModel=models.find(item=>item.slug===activeSlug)??models[0]
  return <div className="page section ml-lab-page">
    <div className="ml-tab-list" role="tablist" aria-label="Machine learning models">
      {models.map(item=><button
        key={item.slug}
        id={`tab-${item.slug}`}
        type="button"
        role="tab"
        aria-selected={activeSlug===item.slug}
        aria-controls="ml-model-panel"
        className={activeSlug===item.slug?'active':''}
        onClick={()=>setActiveSlug(item.slug)}
      >{item.name}</button>)}
    </div>
    <Algorithm slug={activeModel.slug}/>
  </div>
}

type TreeNode = {
  feature?: string
  threshold?: number
  prediction?: string
  samples: number
  left?: TreeNode
  right?: TreeNode
}

type Neighbor = {
  borrower_id: string
  income: number
  loan_amount: number
  credit_score: number
  outcome: string
}

type RiskChartGrid = {
  income_values: number[]
  credit_score_values: number[]
  predictions: number[][]
  labels?: Record<string, string>
}

type RiskSample = {
  income: number
  credit_score: number
  actual: number
}

type PredictionResult = {
  amount?: number
  approved?: boolean
  risk?: number
  interpretation?: string
  suggested_amount?: number
  mae?: number
  r2?: number
  decision?: string
  rules_path?: string[]
  tree?: TreeNode
  accuracy?: number
  risky_wrongly_approved?: number
  neighbors?: Neighbor[]
  paid_back_count?: number
  k?: number
  accuracy_by_k?: Record<string, number>
  topic?: string
  probabilities?: Record<string, number>
  top_words?: Record<string, string[]>
  label?: 'Low' | 'High'
  recall_risky?: number
  confusion_matrix?: number[][]
  sample_points?: RiskSample[]
  chart_grid?: RiskChartGrid | null
  probability?: number
}

type AlgorithmTabState = {
  values: Record<string, string>
  result: PredictionResult | null
  resultValues: Record<string, string> | null
  error: string
  loading: boolean
  stale: boolean
  attempted: boolean
  requestId: number
}

const borrowerInputs = [
  { name: 'income', label: 'Monthly income', value: '40000' },
  { name: 'expenses', label: 'Monthly expenses', value: '20000' },
  { name: 'age', label: 'Age', value: '35' },
  { name: 'credit_score', label: 'Credit score', value: '650' },
  { name: 'years_of_work', label: 'Years of work', value: '5' },
  { name: 'debts', label: 'Existing debts', value: '5000' },
  { name: 'loan_amount', label: 'Requested loan amount', value: '50000' },
  { name: 'late_payments', label: 'Late payments', value: '1' },
] as const

const algorithmInputs: Record<string, string[]> = {
  'loan-amount': ['income', 'expenses', 'credit_score', 'years_of_work'],
  'classify-message': ['message'],
  decision: [...borrowerInputs.map(field => field.name), 'payment_history'],
  'similar-borrowers': [...borrowerInputs.map(field => field.name), 'payment_history'],
  'risk-label': [...borrowerInputs.map(field => field.name), 'payment_history'],
  'default-probability': [...borrowerInputs.map(field => field.name), 'payment_history'],
}

const algorithmFeatures: Record<string, string[]> = {
  'loan-amount': ['income', 'expenses', 'credit_score', 'years_of_work'],
  decision: [...borrowerInputs.map(field => field.name), 'payment_history'],
  'similar-borrowers': [...borrowerInputs.map(field => field.name), 'payment_history'],
  'classify-message': ['message'],
  'risk-label': [...borrowerInputs.map(field => field.name), 'payment_history'],
  'default-probability': [...borrowerInputs.map(field => field.name), 'payment_history'],
}

const featureReasons: Record<string, string> = {
  income: 'Shows what a borrower can afford.',
  expenses: 'Shows what remains after regular costs.',
  credit_score: 'Signals the borrower’s credit track record.',
  late_payments: 'Shows how often payments were late.',
  payment_history: 'Summarizes the borrower’s repayment track record.',
  debts: 'Shows existing financial obligations.',
  loan_amount: 'Shows the size of the loan request.',
  years_of_work: 'Helps indicate income stability.',
  age: 'Adds context about borrower stability.',
  message: 'Its words help identify the customer’s topic.',
}

const algorithmNarratives: Record<string, { what: string; why: [string, string] }> = {
  'loan-amount': {
    what: 'Estimates a number: a suggested loan amount.',
    why: [
      'Offers amounts based on income, expenses, credit score and years of work.',
      'Helps us: aim for offers that fit what a borrower can afford.',
    ],
  },
  decision: {
    what: 'Asks yes/no questions and shows the rules it followed.',
    why: [
      'Approves or rejects a loan with a visible reason.',
      'Helps us: make every decision explainable.',
    ],
  },
  'similar-borrowers': {
    what: 'Finds the 5 most similar example borrowers in our dataset.',
    why: [
      'Shows what happened to people like the applicant.',
      'Helps us: give a second opinion backed by real examples.',
    ],
  },
  'classify-message': {
    what: 'Reads a message and picks its topic from the words.',
    why: [
      'Sends each customer message to the right team.',
      'Helps us: answer customers faster.',
    ],
  },
  'risk-label': {
    what: 'Draws a line between low-risk and high-risk borrowers.',
    why: [
      'Labels each applicant low or high risk.',
      'Helps us: catch risky loans early; missing one costs more than flagging a safe one.',
    ],
  },
  'default-probability': {
    what: 'Combines many details into one percentage.',
    why: [
      'Estimates the chance a borrower will not pay back.',
      'Helps us: set limits or interest levels.',
    ],
  },
}

const defaultAlgorithmValues: Record<string, string> = {
  income: '40000',
  expenses: '20000',
  age: '35',
  credit_score: '650',
  years_of_work: '5',
  debts: '5000',
  loan_amount: '50000',
  late_payments: '1',
  payment_history: 'Good',
  message: 'Hi, I made a late payment and need help.',
}

const algorithmScenarios: Record<string, string> = {
  'loan-amount': 'Maria applies for a loan. What amount does the model suggest for her income and expenses?',
  decision: "Maria's application arrives. Is it approved, and which rules decided it?",
  'similar-borrowers': 'A new applicant arrives. What happened to the five most similar example borrowers in our dataset?',
  'classify-message': 'A customer writes about a late payment. Which team should get the message?',
  'risk-label': 'Is this applicant low risk or high risk?',
  'default-probability': 'What is the chance this borrower will not pay back?',
}

const algorithmSteps: Record<string, string[]> = {
  'loan-amount': [
    'Learns how borrower details relate to suggested loan amounts in our dataset.',
    'Fits a straight-line pattern to examples.',
    'Uses inputs to suggest an amount.',
  ],
  decision: [
    'Finds repayment rules from dataset examples.',
    'Repeats questions up to four levels.',
    'Follows answers to an approval decision.',
  ],
  'similar-borrowers': [
    'Scales details for fair comparison.',
    'Finds five closest examples in our dataset.',
    'Counts how many repaid.',
  ],
  'classify-message': [
    'Counts words in each message topic.',
    'Estimates topics from message words.',
    'Routes by the likeliest topic.',
  ],
  'risk-label': [
    'Plots example borrowers from our dataset.',
    'Finds a boundary to catch risky cases.',
    'Labels by which side the applicant falls.',
  ],
  'default-probability': [
    'Takes all nine borrower details.',
    'Combines patterns through learned layers.',
    'Estimates the chance of non-payment.',
  ],
}

const algorithmLimitations: Record<string, string> = {
  'loan-amount': 'Assumes a straight-line pattern and was trained on synthetic data, so real-world amounts would differ.',
  decision: 'It can still approve risky borrowers, so a loan officer reviews the result.',
  'similar-borrowers': 'The answer depends on K and on what counts as similar.',
  'classify-message': 'It only knows words it saw in training, so new Taglish phrases can be misread.',
  'risk-label': 'It flags some safe borrowers as high risk, and the chart shows only two of the nine details.',
  'default-probability': 'It is hard to explain why it gave a number, and it caught fewer risky borrowers than the SVM on our data.',
}

function makePredictionInput(slug: string, values: Record<string, string>): Record<string, unknown> {
  const input: Record<string, unknown> = {}
  for (const name of algorithmInputs[slug] ?? algorithmInputs['loan-amount']) {
    input[name] = name === 'message' || name === 'payment_history'
      ? values[name].trim()
      : Number(values[name])
  }
  return input
}

function EvaluationSummary({slug,metrics,error}:{slug:string,metrics:MetricsResponse|null,error:string}) {
  const modelMetrics:ModelMetrics|undefined=metrics?.models[slug]
  if(!modelMetrics)return <div className="evaluation-unavailable" role={error?'alert':'status'}>{error?'Evaluation metrics unavailable.':'Loading evaluation metrics…'}</div>

  if(slug==='loan-amount'&&typeof modelMetrics.mae==='number'){
    return <div className="evaluation-summary">On synthetic test borrowers, it was off by about ₱{Math.round(modelMetrics.mae).toLocaleString()} on average.</div>
  }
  if(slug==='decision'&&typeof modelMetrics.accuracy==='number'&&typeof modelMetrics.risky_wrongly_approved==='number'){
    return <div className="evaluation-summary">On synthetic test borrowers, right for about {Math.round(modelMetrics.accuracy*100)} of every 100; wrongly approved {modelMetrics.risky_wrongly_approved} risky ones.</div>
  }
  if(slug==='similar-borrowers'&&typeof modelMetrics.accuracy==='number'){
    return <div className="evaluation-summary">On synthetic test borrowers, right about {Math.round(modelMetrics.accuracy*100)} of 100 times with K=5; we compared K=3, 5 and 7.</div>
  }
  if(slug==='classify-message'&&typeof modelMetrics.accuracy==='number'){
    return <div className="evaluation-summary">On synthetic test messages, sorted about {Math.round(modelMetrics.accuracy*100)} of every 100 correctly.</div>
  }
  if((slug==='risk-label'||slug==='default-probability')&&typeof modelMetrics.recall_on_risky_borrowers==='number'){
    const recall=Math.round(modelMetrics.recall_on_risky_borrowers*100)
    return <div className="evaluation-summary">{slug==='risk-label'
      ? `On synthetic test borrowers, caught about ${recall} of every 100 who really did not repay.`
      : `On synthetic test borrowers, caught about ${recall} of every 100 risky borrowers, and gives a percentage instead of a label.`}</div>
  }
  return <div className="evaluation-unavailable" role="status">Evaluation metrics unavailable.</div>
}

function activeTreePath(
  node: TreeNode,
  values: Record<string, number>,
  path = 'root',
): string[] {
  if (!node.feature || !node.left || !node.right) return [path]
  const left = (values[node.feature] ?? 0) <= (node.threshold ?? 0)
  return [path, ...activeTreePath(node[left ? 'left' : 'right']!, values, `${path}-${left ? 'L' : 'R'}`)]
}

function TreeDiagram({
  node,
  path,
  activePath,
  showFullTree,
}: {
  node: TreeNode
  path: string
  activePath: string[]
  showFullTree: boolean
}) {
  const isActive = activePath.includes(path)
  if (!node.feature || !node.left || !node.right) {
    return <li className={isActive ? 'tree-node active' : 'tree-node'}>
      <span className="tree-result">{node.prediction ?? 'Result'} <small>({node.samples} samples)</small></span>
    </li>
  }
  return <li className={isActive ? 'tree-node active' : 'tree-node'}>
    <span>{node.feature.replaceAll('_', ' ')} ≤ {node.threshold?.toFixed(2)}</span>
    <ul>
      {(showFullTree||activePath.includes(`${path}-L`))&&<li><small>Yes</small><ul><TreeDiagram node={node.left} path={`${path}-L`} activePath={activePath} showFullTree={showFullTree}/></ul></li>}
      {(showFullTree||activePath.includes(`${path}-R`))&&<li><small>No</small><ul><TreeDiagram node={node.right} path={`${path}-R`} activePath={activePath} showFullTree={showFullTree}/></ul></li>}
    </ul>
  </li>
}

function Algorithm({slug}:{slug:string}) {
  const model = models.find(m=>m.slug===slug) || models[0]
  const fields = algorithmInputs[model.slug] ?? algorithmInputs['loan-amount']
  const usedFeatures = algorithmFeatures[model.slug] ?? algorithmFeatures['loan-amount']
  const [values,setValues]=useState<Record<string,string>>(defaultAlgorithmValues)
  const [loading,setLoading]=useState(false)
  const [error,setError]=useState('')
  const [fieldErrors,setFieldErrors]=useState<Record<string,string>>({})
  const [result,setResult]=useState<PredictionResult|null>(null)
  const [resultValues,setResultValues]=useState<Record<string,string>|null>(null)
  const [stale,setStale]=useState(false)
  const [showFullTree,setShowFullTree]=useState(false)
  const [metrics,setMetrics]=useState<MetricsResponse|null>(null)
  const [metricsError,setMetricsError]=useState('')
  const tabCache=useRef(new Map<string,AlgorithmTabState>())
  const requestSequence=useRef(0)
  const activeSlug=useRef(model.slug)

  useEffect(() => {
    let active=true
    api.metrics().then(response=>{
      if(active)setMetrics(response)
    }).catch(requestError=>{
      if(active)setMetricsError(requestError instanceof Error?requestError.message:'Could not load evaluation metrics.')
    })
    return ()=>{active=false}
  },[])

  async function requestPrediction(requestSlug:string,requestValues:Record<string,string>) {
    const requestId=++requestSequence.current
    const previous=tabCache.current.get(requestSlug)
    const next:AlgorithmTabState={
      values:{...requestValues},
      result:previous?.result??null,
      resultValues:previous?.resultValues??null,
      error:'',
      loading:true,
      stale:Boolean(previous?.result&&previous.resultValues&&fields.some(name=>previous.resultValues?.[name]!==requestValues[name])),
      attempted:true,
      requestId,
    }
    tabCache.current.set(requestSlug,next)
    if(activeSlug.current===requestSlug){
      setValues(next.values)
      setResult(next.result)
      setResultValues(next.resultValues)
      setError('')
      setLoading(true)
      setStale(next.stale)
    }
    try {
      const prediction=await api.predict<PredictionResult>(requestSlug,makePredictionInput(requestSlug,requestValues))
      const current=tabCache.current.get(requestSlug)
      if(current?.requestId!==requestId)return
      tabCache.current.set(requestSlug,{...next,result:prediction,resultValues:{...requestValues},loading:false,stale:false})
      if(activeSlug.current===requestSlug){
        setResult(prediction)
        setResultValues({...requestValues})
        setLoading(false)
        setStale(false)
      }
    } catch (requestError) {
      const current=tabCache.current.get(requestSlug)
      if(current?.requestId!==requestId)return
      const message=requestError instanceof Error?requestError.message:'Prediction failed. Please try again.'
      tabCache.current.set(requestSlug,{...next,error:message,loading:false})
      if(activeSlug.current===requestSlug){
        setError(message)
        setLoading(false)
      }
    }
  }

  useEffect(() => {
    activeSlug.current=model.slug
    setFieldErrors({})
    setShowFullTree(false)
    let tab=tabCache.current.get(model.slug)
    if(!tab){
      tab={
        values:{...defaultAlgorithmValues},
        result:null,
        resultValues:null,
        error:'',
        loading:false,
        stale:false,
        attempted:false,
        requestId:0,
      }
      tabCache.current.set(model.slug,tab)
    }
    setValues({...tab.values})
    setResult(tab.result)
    setResultValues(tab.resultValues)
    setError(tab.error)
    setLoading(tab.loading)
    setStale(tab.stale)
    if(!tab.attempted)void requestPrediction(model.slug,tab.values)
  }, [model.slug])

  function updateInput(name: string, value: string) {
    const nextValues={...values,[name]:value}
    if(fieldErrors[name]){
      setFieldErrors(current=>{
        const next={...current}
        delete next[name]
        return next
      })
    }
    const current=tabCache.current.get(model.slug)
    const resultIsStale=Boolean(current?.result&&current.resultValues&&fields.some(fieldName=>current.resultValues?.[fieldName]!==nextValues[fieldName]))
    tabCache.current.set(model.slug,{
      values:nextValues,
      result:current?.result??null,
      resultValues:current?.resultValues??null,
      error:'',
      loading:false,
      stale:resultIsStale,
      attempted:current?.attempted??true,
      requestId:++requestSequence.current,
    })
    setValues(nextValues)
    setResult(current?.result??null)
    setResultValues(current?.resultValues??null)
    setStale(resultIsStale)
    setError('')
    setLoading(false)
  }

  async function run(event:FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextErrors:Record<string,string>={}
    for(const name of fields){
      if(name==='payment_history')continue
      if(name==='message'){
        if(!values[name].trim())nextErrors[name]='Enter a message.'
        continue
      }
      const value=values[name].trim()
      if(!value)nextErrors[name]='Enter a value.'
      else if(Number(value)<0)nextErrors[name]='Value cannot be negative.'
    }
    setFieldErrors(nextErrors)
    if(Object.keys(nextErrors).length>0)return
    await requestPrediction(model.slug,values)
  }

  const treeValues = Object.fromEntries(
    Object.entries(resultValues??values).filter(([key]) => key !== 'message' && key !== 'payment_history')
      .map(([key,value]) => [key, Number(value)]),
  )
  treeValues.payment_history = ({ Poor: 0, Fair: 1, Good: 2, Excellent: 3 } as Record<string, number>)[(resultValues??values).payment_history]
  const activePath = result?.tree ? activeTreePath(result.tree, treeValues) : []
  const accuracyData = Object.entries(metrics?.models['similar-borrowers']?.accuracy_by_k ?? {})
    .sort(([left],[right]) => Number(left) - Number(right))
    .map(([k,accuracy]) => ({ k: `K = ${k}`, accuracy: accuracy * 100 }))
  const chartGrid = result?.chart_grid
  const regionPoints = chartGrid
    ? chartGrid.predictions.flatMap((row,y) => row.map((prediction,x) => ({
      x: chartGrid.income_values[x],
      y: chartGrid.credit_score_values[y],
      prediction,
      z: 1,
    })))
    : []
  const paidRegion = regionPoints.filter(point => point.prediction === 1)
  const unpaidRegion = regionPoints.filter(point => point.prediction === 0)
  const riskSamples = (result?.sample_points ?? []).map(point => ({
    x: point.income,
    y: point.credit_score,
    actual: point.actual,
    z: 1,
  }))
  const narrative = algorithmNarratives[model.slug]
  const scenario = algorithmScenarios[model.slug]
  const limitation = algorithmLimitations[model.slug]
  const steps = algorithmSteps[model.slug]

  return <div className="algorithm-page" id="ml-model-panel" role="tabpanel" aria-labelledby={`tab-${model.slug}`}>
    <header className="ml-model-heading">
      <span className="tag">{model.service}</span>
      <h1>{model.name}</h1>
      <p className="scenario-line">{scenario}</p>
    </header>
    <div className="ml-workspace">
      <div className="ml-explanations">
        <section className="plain-section">
          <h2>What it does</h2>
          <div className="what-copy">{narrative.what}</div>
        </section>
        <section className="plain-section">
          <h2>How PesoLend uses it</h2>
          <ul className="why-points">{narrative.why.map(point=><li key={point}>{point}</li>)}</ul>
        </section>
        <section className="plain-section">
          <h2>Data it uses</h2>
          <div className="feature-chips">{usedFeatures.map(name=><div className="feature-chip" key={name}><b>{name.replaceAll('_',' ')}</b><span>{featureReasons[name]}</span></div>)}</div>
        </section>
        <section className="how-it-works ml-how-it-works">
          <h2>How it works</h2>
          <ol>{steps.map((step,stepIndex)=><li key={step}><span>{stepIndex+1}</span><p>{step}</p></li>)}</ol>
        </section>
        <p className="model-limitation"><b>Limitation</b> {limitation}</p>
      </div>
      <div className="ml-controls">
        <form className="panel form-panel" noValidate onSubmit={run}>
          <span className="kicker">TRY IT</span><h2>Test a scenario</h2>
          <div className={`model-form-grid${fields.length>5?' two-column':''}`}>
          {fields.map(name => name === 'payment_history'
            ? <label key={name} className="model-form-field"><span>Payment history</span>
                <select required value={values[name]} onChange={event=>updateInput(name,event.target.value)}>
                  {['Poor','Fair','Good','Excellent'].map(option=><option key={option}>{option}</option>)}
                </select>
              </label>
            : name === 'message'
              ? <label key={name} className="model-form-field"><span>Customer message</span>
                  <textarea required minLength={1} maxLength={2000} value={values[name]} onChange={event=>updateInput(name,event.target.value)} placeholder="Type a customer message"/>
                  {fieldErrors[name]&&<small className="field-error" role="alert">{fieldErrors[name]}</small>}
                </label>
              : (() => {
                const field = borrowerInputs.find(item=>item.name===name)!
                const unit=name==='credit_score'?'score'
                  :name==='years_of_work'||name==='age'?'years'
                  :name==='late_payments'?'payments':'₱'
                return <label key={name} className="model-form-field"><span>{field.label}</span>
                  <div className="input-with-unit">
                    <input type="number" inputMode="numeric" min={0} step="any"
                      value={values[name]} onChange={event=>updateInput(name,event.target.value)}/>
                    <small>{unit}</small>
                  </div>
                  {fieldErrors[name]&&<small className="field-error" role="alert">{fieldErrors[name]}</small>}
                </label>
              })())}
          </div>
          <button className="button full" disabled={loading}>{loading?'Calculating…':'Run model'} <ArrowRight/></button>
        </form>
        <div className="panel result-panel">
          <div className="card-top"><div><span className="kicker">LIVE RESULT</span><h2>{loading?<><span className="calculating-spinner" aria-hidden="true"/>Calculating…</>:error?'Unable to calculate':result?'Prediction result':'Ready to try'}</h2></div>
            {model.slug==='risk-label'&&result?.label&&!error&&<span className={`status ${result.label==='Low'?'success':'danger'}${stale?' stale-result':''}`}>{result.label} risk</span>}
          </div>
          {!result&&!loading&&!error
              ? <p className="ready-message">Press Run model to see this example.</p>
              : null}
          {result&&model.slug==='decision'&&!error&&<div className={`decision-summary${stale?' stale-result':''}`}>
            <h3>Decision: {result.decision}</h3>
            <section className="meaning"><span><CircleHelp/></span><div><h3>What this means</h3><p>{result.interpretation}</p></div></section>
            <EvaluationSummary slug={model.slug} metrics={metrics} error={metricsError}/>
          </div>}
          {result&&!error&&<div className={`ml-result${stale?' stale-result':''}`}>
                {stale&&<p className="stale-note">Inputs changed. Press Run model.</p>}
                {model.slug==='loan-amount'&&<>
                  {typeof result.suggested_amount==='number'
                    ? <div className="big-result">₱{result.suggested_amount.toLocaleString()}<small>Suggested loan amount</small><small className="estimate-note">An estimate, not a guarantee.</small></div>
                    : <p className="api-error">The API did not return a suggested amount.</p>}
                </>}
                {model.slug==='decision'&&<>
                  <div className="decision-tree-card">
                    <h4>Decision tree (highlighted path is your result)</h4>
                    {result.tree&&<div className="tree-scroll"><ul className="tree-diagram"><TreeDiagram node={result.tree} path="root" activePath={activePath} showFullTree={showFullTree}/></ul></div>}
                    {result.tree&&<button className="tree-toggle" type="button" aria-expanded={showFullTree} onClick={()=>setShowFullTree(current=>!current)}>{showFullTree?'Show highlighted path':'Show full tree'}</button>}
                  </div>
                  <h4>Rules followed</h4>
                  <ol className="rules-list">{(result.rules_path??[]).map((rule,i)=><li key={`${i}-${rule}`}>{rule}</li>)}</ol>
                </>}
                {model.slug==='similar-borrowers'&&<>
                  <h3>{result.paid_back_count ?? 'Unavailable'} of {result.k ?? 'Unavailable'} closest borrowers paid back</h3>
                  <div className="table-scroll"><table><thead><tr>{['Borrower ID','Income','Loan amount','Credit score','Outcome'].map(column=><th key={column}>{column}</th>)}</tr></thead>
                    <tbody>{(result.neighbors??[]).map(neighbor=><tr key={neighbor.borrower_id}><td>{neighbor.borrower_id}</td><td>₱{neighbor.income.toLocaleString()}</td><td>₱{neighbor.loan_amount.toLocaleString()}</td><td>{neighbor.credit_score}</td><td>{neighbor.outcome}</td></tr>)}</tbody>
                  </table></div>
                  <h4>Accuracy by K</h4>
                  <ResponsiveContainer width="100%" height={190}><BarChart data={accuracyData}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="k"/><YAxis domain={[0,100]} unit="%"/><Tooltip formatter={value=>`${Number(value).toFixed(1)}%`}/><Bar dataKey="accuracy" name="Accuracy" fill="#12664a" radius={[5,5,0,0]}/></BarChart></ResponsiveContainer>
                </>}
                {model.slug==='classify-message'&&<>
                  <h3>Topic: {result.topic}</h3>
                  <ResponsiveContainer width="100%" height={220}><BarChart data={Object.entries(result.probabilities??{}).map(([topic,probability])=>({topic,probability:probability*100}))} layout="vertical" margin={{left:10,right:20}}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false}/><XAxis type="number" domain={[0,100]} unit="%"/><YAxis type="category" dataKey="topic" width={125}/><Tooltip formatter={value=>`${Number(value).toFixed(1)}%`}/><Bar dataKey="probability" name="Probability" fill="#12664a" radius={[0,5,5,0]}/>
                  </BarChart></ResponsiveContainer>
                  <h4>Words most associated with each topic</h4>
                  <div className="topic-words">{Object.entries(result.top_words??{}).map(([topic,words])=><div key={topic}><b>{topic}</b><span>{words.join(' · ')}</span></div>)}</div>
                </>}
                {model.slug==='risk-label'&&<>
                  <h4>Confusion matrix</h4>
                  <div className="table-scroll"><table><thead><tr><th></th><th>Predicted risky</th><th>Predicted paid back</th></tr></thead><tbody>
                    {(result.confusion_matrix??[]).map((row,i)=><tr key={i}><th>{i===0?'Actually risky':'Actually paid back'}</th>{row.map((count,j)=><td key={j}>{count}</td>)}</tr>)}
                  </tbody></table></div>
                  {chartGrid&&<><h4>Risk regions and test borrowers</h4><div className="risk-chart">
                    <ResponsiveContainer width="100%" height={330}><ScatterChart margin={{top:10,right:20,bottom:25,left:10}}>
                      <CartesianGrid strokeDasharray="3 3"/><XAxis type="number" dataKey="x" name="Income" domain={[0,100000]} ticks={[20000,40000,60000,80000,100000]} tickFormatter={value=>`₱${Math.round(Number(value)/1000)}k`} label={{value:'Income',position:'insideBottom',offset:-15}}/><YAxis type="number" dataKey="y" name="Credit score" domain={['dataMin','dataMax']} label={{value:'Credit score',angle:-90,position:'insideLeft'}}/><ZAxis type="number" dataKey="z" range={[34,34]}/><Tooltip cursor={{strokeDasharray:'3 3'}}/>
                      <Scatter name="Predicted paid back region" data={paidRegion} fill="#bcebd5" shape="square" opacity={0.45}/>
                      <Scatter name="Predicted risky region" data={unpaidRegion} fill="#f3c6bd" shape="square" opacity={0.45}/>
                      <Scatter name="Actually paid back" data={riskSamples.filter(point=>point.actual===1)} fill="#12664a"/>
                      <Scatter name="Actually risky" data={riskSamples.filter(point=>point.actual===0)} fill="#b7433f"/>
                    </ScatterChart></ResponsiveContainer>
                    <div className="chart-legend"><span><i className="paid"/> Paid back</span><span><i className="unpaid"/> Not paid</span><span>Shaded regions are 2-feature SVM predictions.</span></div>
                  </div></>}
                </>}
                {model.slug==='default-probability'&&<>
                  <h3>Probability of not paying back</h3>
                  {typeof result.probability==='number'
                    ? <div className="probability-gauge"><div className="gauge-track"><i style={{left:`${Math.max(0,Math.min(1,result.probability))*100}%`}}/></div><div className="gauge-labels"><span>0%</span><b>{(result.probability*100).toFixed(1)}%</b><span>100%</span></div></div>
                    : <p className="api-error">The API did not return a probability.</p>}
                </>}
                </div>}
          {error&&!loading&&<div className="api-error" role="alert">{error}</div>}
          {result&&!error&&model.slug!=='decision'&&<section className={`meaning${stale?' stale-result':''}`}><span><CircleHelp/></span><div><h3>What this means</h3><p>{result.interpretation}</p></div></section>}
          {model.slug!=='decision'&&<EvaluationSummary slug={model.slug} metrics={metrics} error={metricsError}/>}
        </div>
      </div>
    </div>
  </div>
}

type DatasetPreview = {
  rows: Record<string, string | number | null>[]
  columns: string[]
  total_rows: number
  source: string
  class_balance: Record<string, number>
}

function DataPage(){
  const [tab,setTab]=useState<'borrowers'|'messages'>('borrowers')
  const [query,setQuery]=useState('')
  const [dataset,setDataset]=useState<DatasetPreview|null>(null)
  const [loading,setLoading]=useState(true)
  const [error,setError]=useState('')

  useEffect(()=>{
    let active=true
    setLoading(true)
    setError('')
    setDataset(null)
    api.dataset<DatasetPreview>(tab).then(data=>{
      if(active)setDataset(data)
    }).catch(requestError=>{
      if(active)setError(requestError instanceof Error?requestError.message:'Could not load dataset.')
    }).finally(()=>{
      if(active)setLoading(false)
    })
    return ()=>{active=false}
  },[tab])

  const columns = dataset?.columns ?? []
  const visibleRows=(dataset?.rows??[]).filter(row=>
    Object.values(row).some(value=>String(value??'').toLowerCase().includes(query.toLowerCase())),
  )
  const classBalance=Object.entries(dataset?.class_balance??{}).map(([name,value])=>({n:name,v:value}))
  const classColors=['#12664a','#f2b774','#83bca0','#e29a82']

  return <div className="page section"><PageIntro kicker="OPEN DATA" title="See what models learn" text="Synthetic data generated for this project. Every column explained below."/>
    <div className="tabs"><button className={tab==='borrowers'?'active':''} onClick={()=>{setTab('borrowers');setQuery('')}}>Borrower data</button><button className={tab==='messages'?'active':''} onClick={()=>{setTab('messages');setQuery('')}}>Customer messages</button></div>
    <div className="data-stats"><div><Database/><span><small>Source</small><b>{dataset?.source??(loading?'Loading…':'Unavailable')}</b></span></div><div><BarChart3/><span><small>Rows</small><b>{dataset?`${dataset.total_rows.toLocaleString()} records`:loading?'Loading…':'Unavailable'}</b></span></div><div><GitBranch/><span><small>Columns</small><b>{dataset?`${dataset.columns.length} columns`:loading?'Loading…':'Unavailable'}</b></span></div><button className="button secondary">Download CSV</button></div>
    <section className="panel table-panel"><div className="table-head"><div><h2>Data preview</h2><p>{dataset?`First ${dataset.rows.length} rows`:loading?'Loading preview…':'Preview unavailable'}</p></div><label className="search"><Search/><input placeholder="Search rows" value={query} onChange={e=>setQuery(e.target.value)}/></label></div>
      {loading?<p className="api-state" role="status">Loading dataset…</p>
        :error?<p className="api-error" role="alert">{error}</p>
          :<div className="table-scroll"><table><thead><tr>{columns.map(column=><th key={column}>{column.replaceAll('_',' ')}</th>)}</tr></thead><tbody>{visibleRows.map((row,index)=><tr key={index}>{columns.map(column=>{
            const value=row[column]
            const outcome=column==='paid_back'?(value===1?'Paid back':'Not paid'):value
            return <td key={column}>{column==='paid_back'?<span className={`status ${value===1?'success':'danger'}`}>{outcome}</span>:String(value??'')}</td>
          })}</tr>)}</tbody></table></div>}
    </section>
    <div className="data-bottom panel"><div><span className="kicker">CLASS BALANCE</span><h2>{tab==='borrowers'?'Payment outcome':'Message topic'}</h2>
      {loading?<p className="api-state" role="status">Loading class balance…</p>
        :error?<p className="api-error" role="alert">{error}</p>
          :<><ResponsiveContainer width="100%" height={190}><PieChart><Pie data={classBalance} dataKey="v" nameKey="n" innerRadius={55} outerRadius={80}>{classBalance.map((item,index)=><Cell fill={classColors[index%classColors.length]} key={item.n}/>)}</Pie><Tooltip/></PieChart></ResponsiveContainer><div className="class-balance-list">{classBalance.map((item,index)=><span key={item.n}><i style={{background:classColors[index%classColors.length]}}/>{item.n}: {item.v.toLocaleString()}</span>)}</div></>}
    </div><div className="dictionary"><h2>Column dictionary</h2>{columns.map(column=>{
      const description: Record<string, { meaning: string; usedBy: string }> = {
        income: { meaning: 'Borrower’s monthly income.', usedBy: 'Linear Regression, Decision Tree, KNN, SVM, Neural Network' },
        expenses: { meaning: 'Borrower’s monthly expenses.', usedBy: 'Linear Regression, Decision Tree, KNN, SVM, Neural Network' },
        age: { meaning: 'Borrower’s age.', usedBy: 'Decision Tree, KNN, SVM, Neural Network' },
        credit_score: { meaning: 'Borrower’s credit score.', usedBy: 'Linear Regression, Decision Tree, KNN, SVM, Neural Network' },
        years_of_work: { meaning: 'Years the borrower has worked.', usedBy: 'Linear Regression, Decision Tree, KNN, SVM, Neural Network' },
        debts: { meaning: 'Borrower’s existing debts.', usedBy: 'Decision Tree, KNN, SVM, Neural Network' },
        loan_amount: { meaning: 'Amount requested by the borrower.', usedBy: 'Decision Tree, KNN, SVM, Neural Network' },
        late_payments: { meaning: 'Number of recorded late payments.', usedBy: 'Decision Tree, KNN, SVM, Neural Network' },
        payment_history: { meaning: 'Text repayment-history category, encoded for training.', usedBy: 'Decision Tree, KNN, SVM, Neural Network' },
        paid_back: { meaning: 'Whether the borrower repaid; the classification target.', usedBy: 'Decision Tree, KNN, SVM, Neural Network (target)' },
        safe_loan_amount: { meaning: 'Generated target for the suggested loan amount.', usedBy: 'Linear Regression (target)' },
        message: { meaning: 'Customer message text.', usedBy: 'Naive Bayes' },
        topic: { meaning: 'Labeled message topic; the classification target.', usedBy: 'Naive Bayes (target)' },
      }
      const detail=description[column]
      return <div key={column}><b>{column.replaceAll('_',' ')}</b><span>{detail?.meaning??'Column returned in the dataset.'}</span><small>Used by: {detail?.usedBy??'Not used by a trained model'}</small></div>
    })}</div></div>
  </div>
}

function Login(){
  const nav=useNavigate()
  const [email,setEmail]=useState('')
  const [password,setPassword]=useState('')
  const [loading,setLoading]=useState(false)
  const [error,setError]=useState('')
  async function enter(accountEmail:string, accountPassword:string){
    setLoading(true)
    setError('')
    try {
      const session=await api.login(accountEmail,accountPassword)
      auth.set(session.token,session.role)
      nav(session.role==='borrower'?'/portal':'/officer')
    } catch (loginError) {
      setError(loginError instanceof Error?loginError.message:'Could not log in. Please try again.')
    } finally {
      setLoading(false)
    }
  }
  function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault()
    void enter(email,password)
  }
  const demoPassword='demo1234'
  return <main className="login-page">
    <Link to="/" className="back">← Back to website</Link>
    <div className="login-container">
      <section className="login-panel">
        <form className="login-box" onSubmit={submit}>
          <Logo/>
          <label>Email address<input type="email" autoComplete="username" required value={email} onChange={event=>setEmail(event.target.value)} placeholder="you@email.com"/></label>
          <label>Password<input type="password" autoComplete="current-password" required value={password} onChange={event=>setPassword(event.target.value)} placeholder="••••••••"/></label>
          {error&&<p className="api-error" role="alert">{error}</p>}
          <button className="button full" type="submit" disabled={loading}>{loading?'Signing in…':'Log in'}</button>
          <div className="divider"><span>Demo access</span></div>
          <button className="demo-button" type="button" disabled={loading} onClick={()=>void enter('maria@pesolend.demo',demoPassword)}><UserRound/> Demo as Borrower (with loan) <ArrowRight/></button>
          <button className="demo-button" type="button" disabled={loading} onClick={()=>void enter('new@pesolend.demo',demoPassword)}><UserRound/> Demo as New Borrower <ArrowRight/></button>
          <button className="demo-button" type="button" disabled={loading} onClick={()=>void enter('officer@pesolend.demo',demoPassword)}><BriefcaseBusiness/> Demo as Loan Officer <ArrowRight/></button>
        </form>
      </section>
    </div>
  </main>
}

const borrowerNav=[['Dashboard',LayoutDashboard,'/portal'],['Apply',FileCheck2,'/portal/apply'],['My Loans',WalletCards,'/portal/loans'],['Help',MessageSquareText,'/portal/help'],['Profile',UserRound,'/portal/profile']] as const
const officerNav=[['Applications',FileCheck2,'/officer'],['Support inbox',MessageSquareText,'/officer/support'],['ML Lab',BrainCircuit,'/ml-lab'],['Metrics',BarChart3,'/officer/metrics']] as const

function PortalShell({role}:{role:'borrower'|'officer'}){
  if(auth.role!==role) return <Navigate to="/login" replace/>
  return <PortalShellContent role={role}/>
}

function PortalShellContent({role}:{role:'borrower'|'officer'}){
  const nav=useNavigate()
  const [profile,setProfile]=useState<MeResponse|null>(null)
  const [profileError,setProfileError]=useState('')
  useEffect(()=>{
    let active=true
    api.me().then(data=>{
      if(active)setProfile(data)
    }).catch(requestError=>{
      if(active)setProfileError(requestError instanceof Error?requestError.message:'Could not load your account.')
    })
    return ()=>{active=false}
  },[])
  function logout(){
    auth.clear()
    nav('/login',{replace:true})
  }
  const items=role==='borrower'?borrowerNav:officerNav
  return <div className="portal"><aside><Logo/><div className="role-label">{role==='borrower'?'BORROWER PORTAL':'OFFICER PORTAL'}</div><nav>{items.map(([n,I,p])=><NavLink end={p==='/portal'||p==='/officer'} to={p} key={n}><I/>{n}</NavLink>)}</nav><Link to="/" className="portal-public"><Building2/> Public website</Link><button className="logout" onClick={logout}><LogOut/> Log out</button></aside><div className="portal-main"><header><button className="menu-button"><Menu/></button><div><b>{role==='borrower'?profile?`Hi, ${profile.name}`:profileError?'Welcome': 'Loading account…':'Loan operations'}</b><small>{role==='borrower'?"Let's make your money work for you.":'Officer workspace'}</small></div><span className="avatar">{role==='borrower'&&profile?profile.name.split(/\s+/).map(part=>part[0]).join('').slice(0,2).toUpperCase():'AO'}</span></header>{profileError&&<p className="api-error portal-error" role="alert">{profileError}</p>}<Outlet context={profile}/></div></div>
}

function BorrowerDashboard(){
  const profile=useOutletContext<MeResponse|null>()
  const loan=profile?.active_loan
  const money=(amount:number)=>`₱${amount.toLocaleString()}`
  const dueDate=loan?new Date(`${loan.next_due_date}T00:00:00`).toLocaleDateString(undefined,{month:'long',day:'numeric'}):''
  const paidPercent=loan?Math.round(loan.paid_count/loan.total_count*100):0
  return <div className="dashboard"><div className="dash-head"><div><span className="kicker">OVERVIEW</span><h1>{profile?`Good morning, ${profile.name.split(' ')[0]}`:'Your dashboard'}</h1></div><div className="dashboard-badges"><span className="status neutral">Demo account</span><span className="status success"><BadgeCheck/> Identity verified</span></div></div>
    <div className="limit-banner"><div><span>Your loan limit</span><strong>{profile?money(profile.loan_limit):'Loading…'}</strong><small>Updated from your latest profile</small><Link className="button cream" to="/portal/apply">Apply for a loan <ArrowRight/></Link></div><div className="limit-ring"><span>{profile?money(profile.loan_limit):'—'}<small>available</small></span></div></div>
    <div className="dashboard-grid">{profile&&loan
      ? <section className="panel active-loan"><div className="card-top"><div><span className="kicker">ACTIVE LOAN</span><h2>{loan.product}</h2></div><span className="status success">{loan.status}</span></div><div className="loan-amount"><span>Remaining balance<b>{money(loan.balance)}</b></span><span>Next payment<b>{money(loan.monthly_payment)}</b><small>{dueDate}</small></span></div><div className="progress"><i style={{width:`${paidPercent}%`}}/></div><div className="split"><span>{loan.paid_count} of {loan.total_count} payments</span><b>{paidPercent}% paid</b></div></section>
      : profile
        ? <section className="panel active-loan empty-loans"><span className="kicker">ACTIVE LOAN</span><h2>No loans yet. Ready when you are.</h2><Link className="button" to="/portal/apply">Apply for a loan <ArrowRight/></Link></section>
        : <section className="panel active-loan"><p className="api-state" role="status">Loading your loan details…</p></section>}
      <section className="quick"><h2>Quick actions</h2><div>{loan&&<button><span><PhilippinePeso/></span>Pay now</button>}<Link to="/portal/loans"><span><WalletCards/></span>My loans</Link><Link to="/portal/help"><span><CircleHelp/></span>Get help</Link></div></section></div>
    <section className="insight"><Sparkles/><div><b>Smart tip</b><p>Pay on time to keep your next offer low.</p></div><Link to="/ml-lab">How models help <ArrowRight/></Link></section>
  </div>
}

function Apply(){
  const [step,setStep]=useState(1),[amount,setAmount]=useState(30000),[term,setTerm]=useState(6),[checking,setChecking]=useState(false)
  const next=()=>{if(step===3){setChecking(true);setTimeout(()=>{setChecking(false);setStep(4)},2200)}else setStep(step+1)}
  return <div className="dashboard apply-page"><div className="dash-head"><div><span className="kicker">NEW APPLICATION</span><h1>Apply for a loan</h1></div><span className="secure"><LockKeyhole/> Secure form</span></div><div className="stepper">{['Amount','Finances','Review','Result'].map((s,i)=><div className={step>=i+1?'active':''} key={s}><b>{step>i+1?<Check/>:i+1}</b><span>{s}</span></div>)}</div>
    {checking?<div className="checking panel"><span className="scan"><BrainCircuit/></span><h2>Checking your application</h2><p>Six models are reviewing your details.</p><div className="loading-line"><i/></div></div>:step<4?<section className="panel application-card">
      {step===1&&<><span className="kicker">STEP 1 OF 3</span><h2>How much do you need?</h2><div className="amount-display">₱{amount.toLocaleString()}</div><input type="range" min="5000" max="48000" step="1000" value={amount} onChange={e=>setAmount(+e.target.value)}/><div className="range-labels"><span>₱5,000</span><span>₱48,000 limit</span></div><span className="field-label">Choose a term</span><div className="term-grid">{[3,6,12].map(n=><button className={term===n?'selected':''} onClick={()=>setTerm(n)} key={n}><b>{n}</b> months<small>₱{Math.ceil(amount/n*1.035).toLocaleString()}/mo</small></button>)}</div><div className="safe-chip"><ShieldCheck/><span><b>Suggested loan amount</b>Up to ₱36,000</span></div></>}
      {step===2&&<><span className="kicker">STEP 2 OF 3</span><h2>Your finances</h2><div className="form-grid">{['Monthly income','Monthly expenses','Existing debts','Credit score'].map((x,i)=><label key={x}>{x}<input defaultValue={['42,000','18,500','3,000','712'][i]}/></label>)}</div><label>Payment history<select><option>Always on time</option><option>1–2 late payments</option></select></label></>}
      {step===3&&<><span className="kicker">STEP 3 OF 3</span><h2>Review details</h2><div className="review-box">{[['Loan amount',`₱${amount.toLocaleString()}`],['Term',`${term} months`],['Monthly income','₱42,000'],['Estimated payment',`₱${Math.ceil(amount/term*1.035).toLocaleString()}`]].map(r=><div key={r[0]}><span>{r[0]}</span><b>{r[1]}</b></div>)}</div><label className="consent"><input type="checkbox" defaultChecked/> I agree to a fair, automated assessment.</label></>}
      <div className="form-actions">{step>1&&<button className="button secondary" onClick={()=>setStep(step-1)}>Back</button>}<button className="button" onClick={next}>{step===3?'Submit application':'Continue'} <ArrowRight/></button></div>
    </section>:<section className="panel approval"><span className="approval-icon"><Check/></span><span className="kicker">APPLICATION APPROVED</span><h1>You’re approved</h1><p>Great things start with one application.</p><div className="offer"><div><span>Loan amount</span><b>₱{amount.toLocaleString()}</b></div><div><span>Monthly payment</span><b>₱{Math.ceil(amount/term*1.035).toLocaleString()}</b></div><div><span>Term</span><b>{term} months</b></div><div><span>Interest</span><b>3.5%</b></div></div><button className="button">Accept offer</button><button className="button secondary">Decline</button></section>}
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
    {path:'ml-lab/:slug',Component:MLLab},{path:'data',Component:DataPage},
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
