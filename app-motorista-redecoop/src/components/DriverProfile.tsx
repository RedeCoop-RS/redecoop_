import { useEffect, useState } from 'react'
import { environment } from '@/config/environment'
import { useAuth } from '@/contexts/AuthContext'
import { formatBirthDate } from '@/lib/travel'
import { getTotalTravelsFinished } from '@/services/driver.service'

export function DriverProfile() {
  const { user } = useAuth()
  const [totalTravels, setTotalTravels] = useState(0)

  const driver = user?.driver
  const avatarSrc = driver?.img ? `${environment.storageUrl}${driver.img}` : null

  useEffect(() => {
    getTotalTravelsFinished()
      .then(setTotalTravels)
      .catch(() => {})
  }, [])

  return (
    <section className="max-w-3xl mx-auto px-4 pt-6">
      <div className="text-center mb-5">
        <h1 className="text-2xl sm:text-3xl font-bold text-ink">
          Olá, <span className="text-green">{driver?.name?.split(' ')[0]}</span>!
        </h1>
      </div>

      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="flex flex-col sm:flex-row items-center gap-5 p-5 sm:p-6">
          <div className="relative shrink-0">
            <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl overflow-hidden bg-green-soft ring-4 ring-green/10 shadow-md">
              {avatarSrc ? (
                <img
                  src={avatarSrc}
                  className="w-full h-full object-cover"
                  alt="Foto do motorista"
                />
              ) : (
                <div
                  className="w-full h-full flex items-center justify-center text-green/40"
                  aria-hidden
                >
                  <span className="material-icons text-5xl">person</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex-1 text-center sm:text-left min-w-0 w-full">
            <h2 className="font-bold text-lg text-ink break-words">{driver?.name}</h2>
            <p className="text-sm text-grey-dark mt-0.5 break-words">
              {driver?.cooperative?.name}
            </p>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
              <div className="flex items-center justify-center sm:justify-start gap-2 bg-green-soft/60 rounded-xl px-3 py-2">
                <span className="material-icons text-green text-[1.1rem]">badge</span>
                <span className="text-grey-dark">
                  CNH {driver?.cnhCategory} — {driver?.numberCnh}
                </span>
              </div>
              <div className="flex items-center justify-center sm:justify-start gap-2 bg-surface rounded-xl px-3 py-2">
                <span className="material-icons text-green text-[1.1rem]">cake</span>
                <span className="text-grey-dark">
                  {driver?.dateBirth ? formatBirthDate(driver.dateBirth) : '—'}
                </span>
              </div>
              <div className="flex items-center justify-center sm:justify-start gap-2 bg-surface rounded-xl px-3 py-2 sm:col-span-2">
                <span className="material-icons text-green text-[1.1rem]">local_shipping</span>
                <span className="text-grey-dark font-medium">
                  {totalTravels} viagen{totalTravels === 1 ? '' : 's'} concluída
                  {totalTravels === 1 ? '' : 's'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
