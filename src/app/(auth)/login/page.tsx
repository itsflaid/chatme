"use client"

import { signIn } from "next-auth/react"
import Image from "next/image"
import { FiArrowRight, FiCheckCircle, FiClock, FiLock } from "react-icons/fi"
import ThemeToggle from "@/components/theme/ThemeToggle"

export default function LoginPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[var(--bg)] text-[var(--text)]">
      <div className="fixed right-4 top-4 z-30 sm:right-6 sm:top-6">
        <ThemeToggle className="shadow-lg shadow-black/10" />
      </div>
      <div className="grid min-h-screen lg:grid-cols-[1.02fr_0.98fr]">
        <section className="relative flex min-h-[58vh] flex-col justify-between border-b border-[var(--border)] px-5 py-5 sm:px-8 lg:min-h-screen lg:border-b-0 lg:border-r lg:px-12 lg:py-10">
          <div
            className="absolute inset-0 opacity-80"
            style={{
              background:
                "linear-gradient(135deg, var(--bg) 0%, var(--surface) 52%, var(--bg2) 100%)",
            }}
          />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[length:34px_34px]" />

          <div className="relative z-10 flex items-center gap-3">
            <Image
              src="/logo.png"
              alt="Chatme"
              width={44}
              height={44}
              className="rounded-xl border border-[var(--border2)] bg-[var(--surface)]"
              priority
            />
            <div>
              <p className="font-sora text-lg font-bold leading-none">Chatme</p>
              <p className="mt-1 text-xs text-[var(--text2)]">Workspace pribadi</p>
            </div>
          </div>

          <div className="relative z-10 mx-auto flex w-full max-w-xl flex-1 items-center py-10">
            <div className="w-full">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[rgba(245,197,24,0.25)] bg-[rgba(245,197,24,0.09)] px-3 py-1.5 text-xs font-medium text-[var(--accent2)]">
                <FiClock size={13} />
                <span>Reminder hari ini</span>
              </div>

              <h1 className="max-w-lg font-sora text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl">
                Chatme
              </h1>
              <p className="mt-4 max-w-md text-base leading-7 text-[var(--text2)] sm:text-lg">
                Catatan, obrolan, dan pengingat dalam satu ruang yang tenang.
              </p>

              <div className="neo-panel mt-8 w-full max-w-md -rotate-1 rounded-2xl bg-[var(--surface)] p-3">
                <div className="flex items-center gap-3 border-b-2 border-[var(--neo-line)] pb-3">
                  <div className="neo-button flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent)] font-sora text-lg font-bold text-[var(--bg)]">
                    C
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">Inbox</p>
                    <p className="text-xs text-[var(--text3)]">3 pesan aktif</p>
                  </div>
                </div>

                <div className="flex flex-col gap-3 pt-4">
                  <div className="neo-card ml-auto max-w-[78%] rotate-1 rounded-xl rounded-br-sm bg-[var(--accent)] px-4 py-2.5 text-sm leading-relaxed text-[var(--bg)]">
                    Review konsep dashboard jam 4 sore
                  </div>
                  <div className="neo-card mr-auto max-w-[82%] -rotate-1 rounded-xl rounded-bl-sm bg-[var(--surface2)] px-4 py-2.5 text-sm leading-relaxed">
                    Jangan lupa: Review konsep dashboard
                  </div>
                  <div className="neo-card flex items-center justify-between rounded-xl bg-[var(--bg)] px-3 py-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <FiCheckCircle className="flex-shrink-0 text-[#2dd4bf]" size={16} />
                      <span className="truncate text-xs text-[var(--text2)]">Selesai ditandai</span>
                    </div>
                    <span className="text-xs font-semibold text-[#2dd4bf]">0 aktif</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="relative z-10 hidden items-center gap-2 text-xs text-[var(--text3)] sm:flex">
            <FiLock size={13} />
            <span>Akses akun dilindungi Google OAuth</span>
          </div>
        </section>

        <section className="flex items-center justify-center px-5 py-10 sm:px-8 lg:px-12">
          <div className="w-full max-w-md">
            <div className="mb-8">
              <p className="font-sora text-2xl font-bold">Masuk</p>
              <p className="mt-2 text-sm leading-6 text-[var(--text2)]">
                Gunakan akun Google untuk membuka ruang Chatme kamu.
              </p>
            </div>

            <div className="neo-panel rounded-2xl bg-[var(--surface)] p-5 sm:p-6">
              <button
                onClick={() => signIn("google", { callbackUrl: "/" })}
                className="neo-button group flex w-full items-center justify-between rounded-xl bg-[var(--surface2)] px-4 py-3.5 text-sm font-semibold text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2 focus:ring-offset-[var(--bg)]"
              >
                <span className="flex items-center gap-3">
                  <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Lanjutkan dengan Google
                </span>
                <FiArrowRight
                  size={17}
                  className="text-[var(--text3)] transition group-hover:translate-x-0.5 group-hover:text-[var(--accent)]"
                />
              </button>

              <div className="mt-5 grid grid-cols-3 gap-2 text-center">
                <div className="neo-card rounded-xl bg-[var(--bg)] px-3 py-3">
                  <p className="font-sora text-sm font-bold text-[var(--accent)]">Chat</p>
                  <p className="mt-1 text-[11px] text-[var(--text3)]">cepat</p>
                </div>
                <div className="neo-card rounded-xl bg-[var(--bg)] px-3 py-3">
                  <p className="font-sora text-sm font-bold text-[#2dd4bf]">Todo</p>
                  <p className="mt-1 text-[11px] text-[var(--text3)]">rapi</p>
                </div>
                <div className="neo-card rounded-xl bg-[var(--bg)] px-3 py-3">
                  <p className="font-sora text-sm font-bold text-[#60a5fa]">Ingat</p>
                  <p className="mt-1 text-[11px] text-[var(--text3)]">tepat</p>
                </div>
              </div>
            </div>

            <p className="mt-5 text-center text-xs leading-5 text-[var(--text3)]">
              Dengan masuk, kamu bisa melanjutkan workspace yang tersimpan di akunmu.
            </p>
          </div>
        </section>
      </div>
    </main>
  )
}
