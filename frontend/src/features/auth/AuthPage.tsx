import { useState, useEffect } from "react";
import type { FormEvent } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuthStore } from "@/stores/auth-store";
import { mcpLoginTool } from "@/webmcp";
import { useWebMCP } from "use-webmcp-tool";

interface AuthPageProps {
  initialMode?: "login" | "register";
}

export function AuthPage({ initialMode = "login" }: AuthPageProps) {
  const [mode, setMode] = useState(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const signIn = useAuthStore((state) => state.signIn);
  const signUp = useAuthStore((state) => state.signUp);
  const navigate = useNavigate();
  const [completedRequestId, setCompletedRequestId] = useState<string | null>(
    null,
  );

  useWebMCP(mcpLoginTool);

  useEffect(() => {
    if (completedRequestId) {
      window.dispatchEvent(
        new CustomEvent(`tool-completion-${completedRequestId}`),
      );
      // setCompletedRequestId(null);
    }
  }, [completedRequestId]);

  useEffect(() => {
    const handleSubmitForm = (event: CustomEvent) => {
      const { requestId } = event.detail;
      setMode("login");
      setEmail(event.detail.email);
      setPassword(event.detail.password);
      submit(event as unknown as FormEvent<HTMLFormElement>);

      if (requestId) {
        setCompletedRequestId(requestId);
      }
    };

    window.addEventListener("mcp-login", handleSubmitForm as EventListener);

    return () => {
      window.removeEventListener(
        "mcp-login",
        handleSubmitForm as EventListener,
      );
    };
  });

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      if (mode === "register")
        await signUp(email, password, nickname || "梦旅人");
      else await signIn(email, password);
      navigate("/", { replace: true });
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "请求失败，请重试",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-dream-paper px-5 py-12 text-dream-ink dark:bg-dream-night dark:text-dream-mist">
      <section className="w-full max-w-md rounded-3xl border border-dream-line bg-white p-7 dark:border-dream-line-dark dark:bg-dream-card sm:p-10">
        <NavLink
          className="mb-10 inline-flex items-center gap-2 text-lg font-semibold text-inherit no-underline"
          to="/"
        >
          <span className="text-dream-violet" aria-hidden="true">
            ✳
          </span>
          梦间
        </NavLink>
        <p className="mb-3 text-[11px] font-bold tracking-[0.2em] text-dream-violet">
          DREAM JOURNAL
        </p>
        <h1 className="font-dream-serif text-3xl">
          {mode === "register" ? "开启你的梦境日记" : "欢迎回来"}
        </h1>
        <p className="mb-7 mt-3 text-sm text-dream-muted dark:text-dream-muted-dark">
          梦境默认只对你自己可见。
        </p>
        <form className="space-y-4" onSubmit={(event) => void submit(event)}>
          {mode === "register" && (
            <label className="block text-sm">
              昵称
              <input
                autoComplete="nickname"
                className="mt-2 w-full rounded-xl border border-dream-line bg-transparent px-4 py-3 outline-none focus:border-dream-violet dark:border-dream-line-dark"
                maxLength={40}
                value={nickname}
                onChange={(event) => setNickname(event.target.value)}
              />
            </label>
          )}
          <label className="block text-sm">
            邮箱
            <input
              autoComplete="email"
              className="mt-2 w-full rounded-xl border border-dream-line bg-transparent px-4 py-3 outline-none focus:border-dream-violet dark:border-dream-line-dark"
              required
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>
          <label className="block text-sm">
            密码
            <input
              autoComplete={
                mode === "register" ? "new-password" : "current-password"
              }
              className="mt-2 w-full rounded-xl border border-dream-line bg-transparent px-4 py-3 outline-none focus:border-dream-violet dark:border-dream-line-dark"
              minLength={mode === "register" ? 10 : 1}
              required
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            {mode === "register" && (
              <span className="mt-1 block text-xs text-dream-muted">
                至少 10 个字符
              </span>
            )}
          </label>
          {error && (
            <p className="text-sm text-red-500" role="alert">
              {error}
            </p>
          )}
          <button
            className="w-full rounded-full bg-dream-violet px-5 py-3 text-sm text-white transition hover:bg-dream-violet-dark disabled:opacity-50 dark:text-dream-night"
            disabled={pending}
            type="submit"
          >
            {pending ? "请稍候…" : mode === "register" ? "创建账户" : "登录"}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-dream-muted dark:text-dream-muted-dark">
          {mode === "register" ? "已经有账户？" : "还没有账户？"}
          <button
            className="ml-1 text-dream-violet underline"
            type="button"
            onClick={() => {
              setMode(mode === "register" ? "login" : "register");
              setError(null);
            }}
          >
            {mode === "register" ? "登录" : "注册"}
          </button>
        </p>
      </section>
    </main>
  );
}
