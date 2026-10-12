import { useEffect } from 'react'
import { NavLink, Outlet, Route, Routes } from 'react-router-dom'
import { useUiStore } from './stores/ui-store'

const navigation = [
  { to: '/', label: '今日', end: true },
  { to: '/dreams', label: '梦境' },
  { to: '/calendar', label: '日历' },
  { to: '/network', label: '词网络' },
  { to: '/explore', label: '广场' },
]

const pages = [
  { path: 'record', title: '记录梦境' },
  { path: 'dream/:id', title: '梦境详情' },
  { path: 'dreams', title: '梦境列表' },
  { path: 'calendar', title: '日历' },
  { path: 'network', title: '词网络' },
  { path: 'explore', title: '联机广场' },
  { path: 'match', title: '梦境匹配' },
  { path: 'profile', title: '个人中心' },
]

function AppLayout() {
  const theme = useUiStore((state) => state.theme)
  const toggleTheme = useUiStore((state) => state.toggleTheme)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  return (
    <div className="flex min-h-screen flex-col bg-dream-paper text-dream-ink transition-colors dark:bg-dream-night dark:text-dream-mist">
      <header className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 border-b border-dream-line px-5 py-4 dark:border-dream-line-dark sm:flex-nowrap sm:gap-10 sm:px-8 sm:py-5">
        <NavLink className="inline-flex items-center gap-2 whitespace-nowrap text-lg font-semibold text-inherit no-underline" to="/" aria-label="梦间首页">
          <span className="text-xl text-dream-violet" aria-hidden="true">✳</span>
          <span>梦间</span>
        </NavLink>
        <nav className="order-1 flex w-full justify-between gap-0 overflow-x-auto py-1 sm:order-none sm:w-auto sm:justify-center sm:gap-7" aria-label="主导航">
          {navigation.map(({ to, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => `shrink-0 px-1 py-1 text-sm no-underline transition-colors hover:text-dream-violet ${isActive ? 'text-dream-violet' : 'text-dream-muted dark:text-dream-muted-dark'}`}
            >
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="flex items-center gap-4">
          <button
            className="rounded-full border border-dream-line px-3 py-1.5 text-xs text-dream-muted transition hover:border-dream-violet hover:text-dream-violet dark:border-dream-line-dark dark:text-dream-muted-dark"
            type="button"
            aria-pressed={theme === 'dark'}
            onClick={toggleTheme}
          >
            {theme === 'dark' ? '浅色' : '深色'}
          </button>
          <NavLink className="whitespace-nowrap text-sm text-dream-muted no-underline hover:text-dream-violet dark:text-dream-muted-dark" to="/profile">个人中心</NavLink>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-5 sm:px-8">
        <Outlet />
      </main>
      <footer className="border-t border-dream-line px-8 py-5 text-center text-xs text-dream-muted dark:border-dream-line-dark dark:text-dream-muted-dark">
        把梦留下，慢慢读懂自己。
      </footer>
    </div>
  )
}

function TodayPage() {
  return (
    <section className="mx-auto my-20 max-w-3xl text-center sm:my-28">
      <p className="mb-4 text-[11px] font-bold tracking-[0.2em] text-dream-violet">DREAM JOURNAL</p>
      <h1 className="font-dream-serif text-4xl font-medium leading-tight tracking-tight sm:text-5xl">
        早安，记得昨夜的梦吗？
      </h1>
      <p className="mx-auto mb-8 mt-5 max-w-xl text-sm leading-7 text-dream-muted dark:text-dream-muted-dark sm:text-base">
        趁记忆还清晰，把那些稍纵即逝的片段留在这里。
      </p>
      <NavLink
        className="inline-flex items-center gap-4 rounded-full bg-dream-violet px-5 py-3 text-sm text-white no-underline transition hover:-translate-y-0.5 hover:bg-dream-violet-dark dark:text-dream-night"
        to="/record"
      >
        记录一个梦 <span aria-hidden="true">↗</span>
      </NavLink>
      <div className="mt-14 flex items-center gap-4 rounded-2xl border border-dream-line bg-white p-5 text-left dark:border-dream-line-dark dark:bg-dream-card sm:mt-20 sm:p-6">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-dream-violet-soft text-xl text-dream-violet dark:bg-dream-violet-deep" aria-hidden="true">
          ☾
        </span>
        <div>
          <h2 className="mb-1 text-sm font-semibold">今天的梦，还在等你</h2>
          <p className="text-xs leading-6 text-dream-muted dark:text-dream-muted-dark">
            记录后，关键词与梦境网络会在这里陪你回看。
          </p>
        </div>
      </div>
    </section>
  )
}

interface PlaceholderPageProps {
  title: string
}

function PlaceholderPage({ title }: PlaceholderPageProps) {
  return (
    <section className="mx-auto my-24 max-w-3xl">
      <p className="mb-4 text-[11px] font-bold tracking-[0.2em] text-dream-violet">DREAM JOURNAL</p>
      <h1 className="font-dream-serif text-4xl font-medium tracking-tight">{title}</h1>
      <p className="mt-5 text-sm text-dream-muted dark:text-dream-muted-dark">
        页面已预留，功能将在后续开发中接入。
      </p>
    </section>
  )
}

function NotFoundPage() {
  return <PlaceholderPage title="页面不存在" />
}

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<TodayPage />} />
        {pages.map(({ path, title }) => (
          <Route key={path} path={path} element={<PlaceholderPage title={title} />} />
        ))}
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
