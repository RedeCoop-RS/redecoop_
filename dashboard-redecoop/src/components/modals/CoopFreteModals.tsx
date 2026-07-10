import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { PicturePicker } from '@/components/ui/PicturePicker'
import { ShowImageModal } from '@/components/modals/ConfirmModal'
import { cooperativeService, cooperativeLabel } from '@/services/cooperative.service'
import { driverService } from '@/services/driver.service'
import { vehicleService } from '@/services/vehicle.service'
import type { Driver, Vehicle } from '@/types'
import { useAuth } from '@/contexts/AuthContext'
import { driverImage, formatBloodType, vehicleImage } from '@/lib/format'
import { resolveStorageUrl } from '@/lib/storage'

export function DriverModal({
  open,
  driver,
  onClose,
  onSaved,
}: {
  open: boolean
  driver?: Driver | null
  onClose: () => void
  onSaved: () => void
}) {
  const { user, isAdmin } = useAuth()
  const [coops, setCoops] = useState<{ id: number; fantasyName?: string; companyName?: string; name?: string }[]>([])
  const [cnhCategories, setCnhCategories] = useState<string[]>([])
  const [bloodTypes, setBloodTypes] = useState<string[]>([])
  const [form, setForm] = useState<Record<string, string>>({})
  const [photo, setPhoto] = useState<File | null>(null)
  const [existingPhoto, setExistingPhoto] = useState('')
  const [previewSrc, setPreviewSrc] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setPhoto(null)
    setExistingPhoto(driver ? resolveStorageUrl(driverImage(driver) ?? '') : '')
    if (isAdmin) cooperativeService.select().then(setCoops)
    Promise.all([driverService.categoriesCnh(), driverService.typesBlood()]).then(([c, b]) => {
      setCnhCategories(c)
      setBloodTypes(b)
    })
    if (driver) {
      setForm({
        name: driver.name,
        cooperativeId: String(driver.cooperativeId ?? user?.cooperative?.id ?? ''),
        phone: driver.phone ?? '',
        cpf: driver.cpf ?? '',
        cnhCategory: driver.cnhCategory ?? '',
        numberCnh: driver.numberCnh ?? '',
        bloodType: driver.bloodType ?? '',
        securityContact: driver.securityContact ?? '',
        dateBirth: driver.dateBirth?.slice(0, 10) ?? '',
      })
    } else {
      setForm({ cooperativeId: String(user?.cooperative?.id ?? ''), name: '', phone: '', cpf: '', cnhCategory: '', numberCnh: '', bloodType: '', securityContact: '', dateBirth: '', password: '' })
    }
  }, [open, driver, isAdmin, user])

  const save = async () => {
    setSaving(true)
    try {
      const payload = { ...form, img: photo ?? undefined }
      if (driver) await driverService.update(driver.id, payload)
      else await driverService.create(payload)
      toast.success('Motorista salvo!')
      onSaved()
      onClose()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <Modal open={open} onClose={onClose} title={driver ? 'Editar motorista' : 'Novo motorista'} size="lg">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Nome" value={form.name ?? ''} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          {isAdmin && (
            <Select label="Cooperativa" value={form.cooperativeId ?? ''} onChange={(e) => setForm({ ...form, cooperativeId: e.target.value })} placeholder="Selecione..." options={coops.map((c) => ({ value: c.id, label: cooperativeLabel(c) }))} />
          )}
          <Input label="Telefone" value={form.phone ?? ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <Input label="CPF" value={form.cpf ?? ''} onChange={(e) => setForm({ ...form, cpf: e.target.value })} />
          <Select label="Categoria CNH" value={form.cnhCategory ?? ''} onChange={(e) => setForm({ ...form, cnhCategory: e.target.value })} placeholder="Selecione..." options={cnhCategories.map((c) => ({ value: c, label: c }))} />
          <Input label="Número CNH" value={form.numberCnh ?? ''} onChange={(e) => setForm({ ...form, numberCnh: e.target.value })} />
          <Select label="Tipo sanguíneo" value={form.bloodType ?? ''} onChange={(e) => setForm({ ...form, bloodType: e.target.value })} placeholder="Selecione..." options={bloodTypes.map((b) => ({ value: b, label: formatBloodType(b) }))} />
          <Input label="Contato emergência" value={form.securityContact ?? ''} onChange={(e) => setForm({ ...form, securityContact: e.target.value })} />
          <Input label="Data nascimento" type="date" value={form.dateBirth ?? ''} onChange={(e) => setForm({ ...form, dateBirth: e.target.value })} />
          {!driver && <Input label="Senha" type="password" value={form.password ?? ''} onChange={(e) => setForm({ ...form, password: e.target.value })} />}
          <div className="coopfrete-photo-field">
            <span className="coopfrete-photo-field__label">Foto</span>
            <PicturePicker
              compact
              existingSrc={existingPhoto}
              file={photo}
              onChange={setPhoto}
              onPreviewClick={setPreviewSrc}
              onClear={() => setExistingPhoto('')}
            />
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={save} disabled={saving}>Salvar</Button>
        </div>
      </Modal>
      <ShowImageModal open={Boolean(previewSrc)} src={previewSrc ?? ''} onClose={() => setPreviewSrc(null)} />
    </>
  )
}

export function VehicleModal({
  open,
  vehicle,
  onClose,
  onSaved,
}: {
  open: boolean
  vehicle?: Vehicle | null
  onClose: () => void
  onSaved: () => void
}) {
  const { user, isAdmin } = useAuth()
  const [coops, setCoops] = useState<{ id: number; fantasyName?: string; companyName?: string; name?: string }[]>([])
  const [types, setTypes] = useState<{ id: number; name: string }[]>([])
  const [form, setForm] = useState<Record<string, string>>({})
  const [photo, setPhoto] = useState<File | null>(null)
  const [existingPhoto, setExistingPhoto] = useState('')
  const [previewSrc, setPreviewSrc] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setPhoto(null)
    setExistingPhoto(vehicle ? resolveStorageUrl(vehicleImage(vehicle) ?? '') : '')
    if (isAdmin) cooperativeService.select().then(setCoops)
    vehicleService.types().then(setTypes)
    if (vehicle) {
      setForm({
        model: vehicle.model,
        cooperativeId: String(vehicle.cooperativeId ?? user?.cooperative?.id ?? ''),
        licensePlate: vehicle.licensePlate ?? '',
        typeId: String(vehicle.typeId ?? vehicle.type?.id ?? ''),
        volume: String(vehicle.volume ?? ''),
        maximumWeight: String(vehicle.maximumWeight ?? ''),
      })
    } else {
      setForm({ cooperativeId: String(user?.cooperative?.id ?? ''), model: '', licensePlate: '', typeId: '', volume: '', maximumWeight: '' })
    }
  }, [open, vehicle, isAdmin, user])

  const save = async () => {
    setSaving(true)
    try {
      const payload = { ...form, img: photo ?? undefined }
      if (vehicle) await vehicleService.update(vehicle.id, payload)
      else await vehicleService.create(payload)
      toast.success('Veículo salvo!')
      onSaved()
      onClose()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <Modal open={open} onClose={onClose} title={vehicle ? 'Editar veículo' : 'Novo veículo'} size="lg">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Modelo" value={form.model ?? ''} onChange={(e) => setForm({ ...form, model: e.target.value })} />
          {isAdmin && (
            <Select label="Cooperativa" value={form.cooperativeId ?? ''} onChange={(e) => setForm({ ...form, cooperativeId: e.target.value })} placeholder="Selecione..." options={coops.map((c) => ({ value: c.id, label: cooperativeLabel(c) }))} />
          )}
          <Input label="Placa" value={form.licensePlate ?? ''} onChange={(e) => setForm({ ...form, licensePlate: e.target.value })} />
          <Select label="Tipo" value={form.typeId ?? ''} onChange={(e) => setForm({ ...form, typeId: e.target.value })} placeholder="Selecione..." options={types.map((t) => ({ value: t.id, label: t.name }))} />
          <Input label="Volume (m³)" type="number" value={form.volume ?? ''} onChange={(e) => setForm({ ...form, volume: e.target.value })} />
          <Input label="Peso máximo (kg)" type="number" value={form.maximumWeight ?? ''} onChange={(e) => setForm({ ...form, maximumWeight: e.target.value })} />
          <div className="coopfrete-photo-field">
            <span className="coopfrete-photo-field__label">Foto</span>
            <PicturePicker
              compact
              existingSrc={existingPhoto}
              file={photo}
              onChange={setPhoto}
              onPreviewClick={setPreviewSrc}
              onClear={() => setExistingPhoto('')}
            />
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={save} disabled={saving}>Salvar</Button>
        </div>
      </Modal>
      <ShowImageModal open={Boolean(previewSrc)} src={previewSrc ?? ''} onClose={() => setPreviewSrc(null)} />
    </>
  )
}

export { TravelModal, TravelOfferModal, TravelViewModal } from '@/components/modals/TravelModals'
