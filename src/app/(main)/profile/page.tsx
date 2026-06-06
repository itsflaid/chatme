import Image from "next/image"
import Link from "next/link"
import { redirect } from "next/navigation"
import { FiArrowLeft, FiCalendar, FiEdit3, FiMail, FiShield } from "react-icons/fi"
import { auth } from "@/auth"

export default async function ProfilePage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const name = session.user.name || "Pengguna Chatme"
  const email = session.user.email || "email belum tersedia"
  const initial = name.charAt(0).toUpperCase()

  return (
    <main className="min-h-full flex-1 overflow-y-auto bg-[var(--bg)] p-3 sm:p-6">
      <div className="mx-auto w-full max-w-3xl">
        <div className="mb-5 flex items-center gap-3">
          <Link
            href="/"
            aria-label="Kembali"
            className="neo-button flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--surface)] text-[var(--text)]"
          >
            <FiArrowLeft size={19} />
          </Link>
          <div>
            <h1 className="font-sora text-xl font-bold text-[var(--text)]">My Profile</h1>
            <p className="text-xs text-[var(--text3)]">Informasi akun Chatme kamu</p>
          </div>
        </div>

        <section className="neo-panel rounded-2xl bg-[var(--surface)] p-5 sm:p-7">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            {session.user.image ? (
              <Image
                src={session.user.image}
                alt={name}
                width={88}
                height={88}
                unoptimized
                className="neo-card h-20 w-20 rounded-xl object-cover sm:h-24 sm:w-24"
              />
            ) : (
              <div className="neo-card flex h-20 w-20 items-center justify-center rounded-xl bg-[var(--accent)] font-sora text-3xl font-bold text-[var(--accent-ink)] sm:h-24 sm:w-24">
                {initial}
              </div>
            )}

            <div className="min-w-0 flex-1">
              <div className="mb-2 inline-flex rotate-1 rounded-md border-2 border-[var(--neo-line)] bg-[var(--accent)] px-2 py-1 text-[10px] font-bold uppercase text-[var(--accent-ink)]">
                Personal account
              </div>
              <h2 className="truncate font-sora text-2xl font-bold text-[var(--text)]">{name}</h2>
              <p className="mt-1 truncate text-sm text-[var(--text2)]">{email}</p>
            </div>

            <button
              type="button"
              className="neo-button flex items-center justify-center gap-2 rounded-xl bg-[var(--paper)] px-4 py-2.5 text-sm font-bold text-[var(--accent-ink)]"
            >
              <FiEdit3 size={15} />
              Edit Profile
            </button>
          </div>

          <div className="my-6 border-t-2 border-dashed border-[var(--neo-line)]" />

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="neo-card rounded-xl bg-[var(--surface2)] p-4">
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg border-2 border-[var(--neo-line)] bg-[var(--sage)] text-[var(--accent-ink)]">
                <FiMail size={17} />
              </div>
              <p className="text-xs font-bold uppercase text-[var(--text3)]">Email</p>
              <p className="mt-1 break-all text-sm font-semibold text-[var(--text)]">{email}</p>
            </div>

            <div className="neo-card rounded-xl bg-[var(--surface2)] p-4">
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg border-2 border-[var(--neo-line)] bg-[var(--coral)] text-[var(--accent-ink)]">
                <FiShield size={17} />
              </div>
              <p className="text-xs font-bold uppercase text-[var(--text3)]">Login Provider</p>
              <p className="mt-1 text-sm font-semibold text-[var(--text)]">Google OAuth</p>
            </div>
          </div>
        </section>

        <section className="mt-5 grid grid-cols-3 gap-3">
          {[
            { value: "12", label: "Rooms" },
            { value: "48", label: "Notes" },
            { value: "7", label: "Reminders" },
          ].map((item, index) => (
            <div
              key={item.label}
              className={`neo-card rounded-xl p-4 text-center ${
                index === 0
                  ? "bg-[var(--accent)]"
                  : index === 1
                    ? "bg-[var(--sage)]"
                    : "bg-[var(--coral)]"
              }`}
            >
              <p className="font-sora text-xl font-black text-[var(--accent-ink)]">{item.value}</p>
              <p className="mt-1 text-[11px] font-bold text-[var(--accent-ink)]">{item.label}</p>
            </div>
          ))}
        </section>

        <div className="mt-5 flex items-center gap-2 text-xs text-[var(--text3)]">
          <FiCalendar size={14} />
          <span>Halaman profil ini masih berupa tampilan dummy.</span>
        </div>
      </div>
    </main>
  )
}
