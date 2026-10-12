import { useEffect, useState } from 'react'
import { NavLink, Outlet, Route, Routes, useNavigate } from 'react-router-dom'
import { AuthPage } from './features/auth/AuthPage'
import { CalendarPage } from './features/calendar/CalendarPage'
import { DreamDetailPage } from './features/dreams/DreamDetailPage'
import { DreamFormPage } from './features/dreams/DreamFormPage'
import { DreamListPage } from './features/dreams/DreamListPage'
import { NetworkPage } from './features/network/NetworkPage'
import { useAuthStore } from './stores/auth-store'
import { useUiStore } from './stores/ui-store'

const navigation = [
  { to: '/', label: '今日', end: true },
  { to: '/dreams', label: '梦境' },
  { to: '/network', label: '词网络' },
  { to: '/calendar', label: '日历' },
]

function AppLayout() {
  const theme = useUiStore((state) => state.theme)
  const toggleTheme = useUiStore((state) => state.toggleTheme)
  const user = useAuthStore((state) => state.user)
  const signOut = useAuthStore((state) => state.signOut)
  const navigate = useNavigate()
  const [signOutError, setSignOutError] = useState<string | null>(null)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  async function handleSignOut(): Promise<void> {
    setSignOutError(null)
    try {
      await signOut()
      navigate('/login')
    } catch (error) {
      setSignOutError(error instanceof Error ? error.message : '退出登录失败')
    }
  }

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
          <span className="hidden max-w-28 truncate text-xs text-dream-muted dark:text-dream-muted-dark sm:inline">
            {user?.nickname}
          </span>
          <button
            className="whitespace-nowrap text-sm text-dream-muted hover:text-dream-violet dark:text-dream-muted-dark"
            type="button"
            onClick={() => void handleSignOut()}
          >
            退出
          </button>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-5 sm:px-8">
        {signOutError && <p className="mt-4 text-sm text-red-500" role="alert">{signOutError}</p>}
        <Outlet />
      </main>
      <footer className="border-t border-dream-line px-8 py-5 text-center text-xs text-dream-muted dark:border-dream-line-dark dark:text-dream-muted-dark">
        把梦留下，慢慢读懂自己。
      </footer>
    </div>
  )
}

function HomePage() {
  const user = useAuthStore((state) => state.user)
  return (
    <section className="mx-auto my-16 max-w-3xl text-center sm:my-24">
      <p className="mb-4 text-[11px] font-bold tracking-[0.2em] text-dream-violet">DREAM JOURNAL</p>
      <h1 className="font-dream-serif text-4xl font-medium leading-tight tracking-tight sm:text-5xl">
        早安，{user?.nickname}。记得昨夜的梦吗？
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
      <DreamListPage compact todayOnly />
    </section>
  )
}

function ProtectedRoutes() {
  const user = useAuthStore((state) => state.user)
  const loading = useAuthStore((state) => state.loading)
  const error = useAuthStore((state) => state.error)
  const initialize = useAuthStore((state) => state.initialize)
  const navigate = useNavigate()

  useEffect(() => {
    void initialize()
  }, [initialize])

  useEffect(() => {
    if (!loading && !user && !error) navigate('/login', { replace: true })
  }, [loading, user, error, navigate])

  if (loading) {
    return <div className="py-24 text-center text-sm text-dream-muted">正在验证登录状态…</div>
  }
  if (error) {
    return (
      <div className="py-24 text-center">
        <p className="text-sm text-red-500" role="alert">{error}</p>
        <button className="mt-4 text-sm text-dream-violet underline" type="button" onClick={() => void initialize()}>
          重试
        </button>
      </div>
    )
  }
  if (!user) return null

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<HomePage />} />
        <Route path="record" element={<DreamFormPage />} />
        <Route path="dream/:id" element={<DreamDetailPage />} />
        <Route path="dream/:id/edit" element={<DreamFormPage />} />
        <Route path="dreams" element={<DreamListPage />} />
        <Route path="calendar" element={<CalendarPage />} />
        <Route path="network" element={<NetworkPage />} />
        <Route path="profile" element={<div className="py-16 text-center">个人设置将在后续版本开放</div>} />
        <Route path="*" element={<div className="py-16 text-center">页面不存在</div>} />
      </Route>
    </Routes>
  )
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<AuthPage />} />
      <Route path="/register" element={<AuthPage initialMode="register" />} />
      <Route path="/*" element={<ProtectedRoutes />} />
    </Routes>
  )
}

export default App
