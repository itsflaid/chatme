"use client"

import { useEffect, useState } from "react"
import { FiBell, FiCheckCircle } from "react-icons/fi"
import { usePushSubscription } from "@/hooks/usePushSubscription"

export default function EnablePushButton() {
  const { enablePush } = usePushSubscription()
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  // Cek subscription yang SUDAH ada saat komponen mount. Sebelumnya tombol ini selalu mulai
  // dari "Aktifkan Notifikasi" walau user udah pernah subscribe, jadi gak bisa dipakai buat
  // mastiin push beneran aktif di browser ini — sekarang bisa dipakai buat cross-check cepat
  // tanpa harus buka database, salah satu langkah diagnosa notif yang gak muncul.
  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return
    if (Notification.permission !== "granted") return
    navigator.serviceWorker.ready
      .then((registration) => registration.pushManager.getSubscription())
      .then((subscription) => setDone(!!subscription))
      .catch(() => {})
  }, [])

  async function handleClick() {
    if (loading || done) return
    setLoading(true)
    try {
      const ok = await enablePush()
      if (ok) setDone(true)
    } catch {
      // permission denied atau error subscribe — biarkan tombol bisa dicoba lagi
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading || done}
      className="neo-button mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-bold text-[var(--accent-ink)] disabled:opacity-40"
    >
      {done ? <FiCheckCircle size={16} /> : <FiBell size={16} />}
      {done ? "Notifikasi Aktif" : loading ? "Mengaktifkan..." : "Aktifkan Notifikasi"}
    </button>
  )
}