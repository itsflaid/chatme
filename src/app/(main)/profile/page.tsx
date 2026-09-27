import Link from "next/link"
import { redirect } from "next/navigation"
import {
  FiArrowLeft,
  FiCalendar,
  FiMail,
  FiLogOut,
  FiGrid,
  FiMessageSquare,
  FiBell,
  FiMessageCircle,
} from "react-icons/fi"
import { auth, signOut } from "@/auth"
import { prisma } from "@/lib/prisma"
import ProfileHeader from "@/components/profile/ProfileHeader"
import EnablePushButton from "@/components/profile/EnablePushButton"
import DangerZone from "@/components/profile/DangerZone"

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-2 text-[11px] font-black uppercase tracking-widest text-[var(--text3)]">
      {children}
    </p>
  )
}

function InfoRow({
  icon,
  iconBgClass,
  iconTextClass = "text-[var(--text)]",
  label,
  value,
}: {
  icon: React.ReactNode
  iconBgClass: string
  iconTextClass?: string
  label: string
  value: string
}) {
  return (
    <div className="flex items-center gap-3 p-4">
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border-2 border-[var(--neo-line)] ${iconTextClass} ${iconBgClass}`}
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--text3)]">{label}</p>
        <p className="truncate text-sm font-semibold text-[var(--text)]">{value}</p>
      </div>
    </div>
  )
}

export default async function ProfilePage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const [roomCount, noteCount, reminderCount, dbUser] = await Promise.all([
    prisma.room.count({ where: { userId: session.user.id } }),
    prisma.message.count({ where: { userId: session.user.id, isBot: false } }),
    prisma.message.count({
      where: { userId: session.user.id, remindAt: { not: null }, isRemindDone: false },
    }),
    prisma.user.findUniqueOrThrow({
      where: { id: session.user.id },
      select: { createdAt: true },
    }),
  ])

  const name = session.user.name || "Pengguna Chatme"
  const email = session.user.email || "email belum tersedia"
  const initial = name.charAt(0).toUpperCase()
  const joinedLabel = new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric" }).format(dbUser.createdAt)

  const ADMIN_WA_NUMBER = "6281348726973"
  const waMessage = `Halo Admin Chatme, saya ${name} (${email}).\n\nSaya mau: `
  const waHref = `https://wa.me/${ADMIN_WA_NUMBER}?text=${encodeURIComponent(waMessage)}`

  return (
    <main className="min-h-full flex-1 overflow-y-auto bg-[var(--bg)] p-3 sm:p-6">
      <div className="mx-auto w-full max-w-3xl">
        <div className="mb-6 flex items-center gap-3">
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

        <div className="flex flex-col gap-6">
          <section>
            <SectionLabel>Akun</SectionLabel>
            <div className="neo-panel rounded-2xl bg-[var(--surface)] p-5 sm:p-7">
              <ProfileHeader name={name} email={email} image={session.user.image} initial={initial} />

              <div className="my-6 border-t-2 border-dashed border-[var(--neo-line)]" />

              <div className="divide-y divide-dashed divide-[var(--neo-line)] overflow-hidden rounded-xl border-2 border-[var(--neo-line)] bg-[var(--surface2)]">
                <InfoRow icon={<FiMail size={16} />} iconBgClass="bg-[var(--sage)]" label="Email" value={email} />
                <InfoRow
                  icon={<FiCalendar size={16} />}
                  iconBgClass="bg-[var(--accent)]"
                  iconTextClass="text-[var(--accent-ink)]"
                  label="Bergabung"
                  value={joinedLabel}
                />
              </div>
            </div>
          </section>

          <section>
            <SectionLabel>Aktivitas</SectionLabel>
            <div className="grid grid-cols-3 gap-3">
              <div className="neo-card rounded-xl bg-[var(--accent)] p-4 text-center">
                <FiGrid size={14} className="mx-auto mb-2 text-[var(--accent-ink)]" />
                <p className="font-sora text-xl font-black text-[var(--accent-ink)]">{roomCount}</p>
                <p className="mt-1 text-[11px] font-bold text-[var(--accent-ink)]">Rooms</p>
              </div>
              <div className="-rotate-1 neo-card rounded-xl bg-[var(--accent)] p-4 text-center">
                <FiMessageSquare size={14} className="mx-auto mb-2 text-[var(--accent-ink)]" />
                <p className="font-sora text-xl font-black text-[var(--accent-ink)]">{noteCount}</p>
                <p className="mt-1 text-[11px] font-bold text-[var(--accent-ink)]">Catatan</p>
              </div>
              <div className="rotate-1 neo-card rounded-xl bg-[var(--accent)] p-4 text-center">
                <FiBell size={14} className="mx-auto mb-2 text-[var(--accent-ink)]" />
                <p className="font-sora text-xl font-black text-[var(--accent-ink)]">{reminderCount}</p>
                <p className="mt-1 text-[11px] font-bold text-[var(--accent-ink)]">Pengingat Aktif</p>
              </div>
            </div>
          </section>

          <section>
            <SectionLabel>Preferensi</SectionLabel>
            <EnablePushButton />
          </section>

          <section>
            <SectionLabel>Sesi</SectionLabel>
            <form
              action={async () => {
                "use server"
                await signOut()
              }}
            >
              <button
                type="submit"
                className="neo-button flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--coral)] px-4 py-3 text-sm font-bold text-white"
              >
                <FiLogOut size={16} />
                Logout
              </button>
            </form>
          </section>

          <section>
            <SectionLabel>Bantuan</SectionLabel>
            <a
              href={waHref}
              target="_blank"
              rel="noopener noreferrer"
              className="neo-button flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--surface2)] px-4 py-3 text-sm font-bold text-[var(--text)]"
            >
              <FiMessageCircle size={16} />
              Hubungi Admin
            </a>
          </section>

          <section>
            <DangerZone />
          </section>
        </div>

        <p className="mt-6 text-center text-xs text-[var(--text3)]">
          <Link href="/privacy" className="underline">
            Kebijakan Privasi
          </Link>
        </p>
      </div>
    </main>
  )
}