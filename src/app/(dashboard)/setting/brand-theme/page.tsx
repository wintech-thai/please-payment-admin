'use client'

import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import clsx from 'clsx'
import { adminConfigApi } from '@/lib/api/admin-config.api'
import type { AdminConfig } from '@/lib/api/admin-config.api'
import { THEME_LIST, DEFAULT_THEME, applyTheme } from '@/lib/brand-themes'
import type { ThemeName } from '@/lib/brand-themes'
import { useBrand } from '@/context/BrandContext'
import { resolveStorageUrl } from '@/lib/storage'
import { useLang } from '@/context/LanguageContext'

const MAX_FILE_SIZE = 2 * 1024 * 1024  // 2 MB
const LOGO_W = 240
const LOGO_H = 80

function StatusBadge({ enabled, labelEnabled, labelDisabled }: { enabled: boolean; labelEnabled: string; labelDisabled: string }) {
  return (
    <span className={clsx('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold',
      enabled ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500')}>
      <span className={clsx('w-1.5 h-1.5 rounded-full', enabled ? 'bg-emerald-500' : 'bg-gray-400')} />
      {enabled ? labelEnabled : labelDisabled}
    </span>
  )
}

export default function BrandThemePage() {
  const { refresh: refreshBrand } = useBrand()
  const { t } = useLang()
  const bt = t.brandTheme

  const [config, setConfig] = useState<AdminConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [togglingStatus, setTogglingStatus] = useState(false)

  // Form state
  const [brandName, setBrandName] = useState('')
  const [themeName, setThemeName] = useState<ThemeName>(DEFAULT_THEME)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string>('')
  const [logoError, setLogoError] = useState('')

  // Confirm cancel
  const [cancelConfirm, setCancelConfirm] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const s = config?.status?.toLowerCase() ?? ''
  const isEnabled = s === 'active' || s.startsWith('enable')
  const isDirty = editing

  async function load() {
    setLoading(true)
    try {
      const res = await adminConfigApi.getBrandConfig()
      const raw = res.data as any
      // Response: { status:"OK", configuration:{...} }
      const data: AdminConfig = raw?.configuration ?? raw?.data ?? raw
      setConfig(data)
      resetForm(data)
    } catch (err: any) {
      if (err?.code !== 'NOT_FOUND' && err?.response?.status !== 404) {
        toast.error(bt.toastLoadFailed)
      }
      setConfig(null)
      resetForm(null)
    } finally {
      setLoading(false)
    }
  }

  function resetForm(data: AdminConfig | null) {
    setBrandName(data?.brandConfig?.brandName || 'PLEASE PAYMENT')
    setThemeName((data?.brandConfig?.themeName as ThemeName) || DEFAULT_THEME)
    setLogoFile(null)
    setLogoPreview(resolveStorageUrl(data?.brandConfig?.logoImageUrl || ''))
    setLogoError('')
  }

  useEffect(() => { load() }, [])

  // Preview theme live while in edit mode
  useEffect(() => {
    if (editing) applyTheme(themeName)
  }, [themeName, editing])

  async function handleToggleStatus() {
    if (!config?.configId) return
    setTogglingStatus(true)
    try {
      if (isEnabled) {
        await adminConfigApi.disableConfigById(config.configId)
        toast.success(bt.toastDisabled)
      } else {
        await adminConfigApi.enableConfigById(config.configId)
        toast.success(bt.toastEnabled)
      }
      await load()
      refreshBrand()
    } catch (err: any) {
      toast.error(err?.message || bt.toastEnableFailed)
    } finally {
      setTogglingStatus(false)
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setLogoError('')

    if (file.size > MAX_FILE_SIZE) {
      setLogoError(`File too large. Max size is 2 MB.`)
      return
    }
    if (!['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp'].includes(file.type)) {
      setLogoError('Only PNG, JPEG, SVG, or WebP images are allowed.')
      return
    }

    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      if (img.naturalWidth < LOGO_W || img.naturalHeight < LOGO_H) {
        setLogoError(`Image too small. Minimum ${LOGO_W}×${LOGO_H} px required.`)
        return
      }
      setLogoFile(file)
      const reader = new FileReader()
      reader.onload = (ev) => setLogoPreview(ev.target?.result as string)
      reader.readAsDataURL(file)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      setLogoError('Could not read image dimensions.')
    }
    img.src = url
  }

  async function handleSave() {
    if (!brandName.trim()) { toast.error(bt.toastBrandNameRequired); return }
    setSaving(true)
    try {
      let logoPath = config?.brandConfig?.logoPath || ''

      // Upload new logo if selected
      if (logoFile) {
        const urlRes = await adminConfigApi.getLogoUploadPresignedUrl({ mimeType: logoFile.type })
        const urlData = urlRes.data as any
        const rawPresignedUrl: string = urlData?.presignedUrl || ''
        const objectName: string = urlData?.objectName || ''

        if (!rawPresignedUrl) throw new Error('Could not get upload URL')

        // Replace <STORAGE-API-BASE> placeholder before uploading
        const actualUrl = resolveStorageUrl(rawPresignedUrl)

        await fetch(actualUrl, {
          method: 'PUT',
          headers: { 'Content-Type': logoFile.type },
          body: logoFile,
        })

        logoPath = objectName
      }

      // API expects PascalCase fields (matching Ruby script reference)
      await adminConfigApi.setBrandConfig({
        BrandConfig: {
          BrandName: brandName.trim(),
          LogoPath: logoPath,
          ThemeName: themeName,
        },
      } as any)

      toast.success(bt.toastSaved)
      setEditing(false)
      await load()
      refreshBrand()
    } catch (err: any) {
      toast.error(err?.message || bt.toastSaveFailed)
    } finally {
      setSaving(false)
    }
  }

  function handleCancelClick() {
    if (isDirty) { setCancelConfirm(true) } else { setEditing(false) }
  }

  function confirmCancel() {
    setCancelConfirm(false)
    setEditing(false)
    resetForm(config)
    if (config?.brandConfig?.themeName) applyTheme(config.brandConfig.themeName as ThemeName)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{bt.title}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{bt.subtitle}</p>
        </div>
      </div>

      {/* Status Card */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={clsx('w-10 h-10 rounded-full flex items-center justify-center',
            isEnabled ? 'bg-emerald-100' : 'bg-gray-100')}>
            <svg className={clsx('w-5 h-5', isEnabled ? 'text-emerald-600' : 'text-gray-400')} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">{bt.statusTitle}</p>
            <p className="text-xs text-gray-500 mt-0.5">
              {isEnabled ? bt.statusActiveDesc : bt.statusDisabledDesc}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge enabled={isEnabled} labelEnabled={bt.statusEnabled} labelDisabled={bt.statusDisabled} />
          <button
            onClick={handleToggleStatus}
            disabled={togglingStatus || !config?.configId}
            className={clsx(
              'px-4 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50',
              isEnabled
                ? 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white'
            )}
          >
            {togglingStatus ? bt.btnUpdating : isEnabled ? bt.btnDisable : bt.btnEnable}
          </button>
        </div>
      </div>

      {/* Main Content Card */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {!editing && !!config?.configId && !isEnabled && (
              <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5">
                {bt.hintEnableFirst}
              </p>
            )}
            {!editing && (
              <button
                onClick={() => setEditing(true)}
                disabled={!!config?.configId && !isEnabled}
                title={!isEnabled ? 'Enable config first to edit' : 'Click to edit brand settings'}
                className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
                {bt.btnEdit}
              </button>
            )}
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Logo */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              {bt.logoLabel}
              <span className="ml-2 text-xs font-normal text-gray-400">{bt.logoHint}</span>
            </label>
            <div className="flex items-start gap-5">
              {/* Preview */}
              <div className={clsx(
                'w-48 h-16 rounded-lg border-2 border-dashed flex items-center justify-center overflow-hidden flex-shrink-0',
                logoPreview ? 'border-gray-200 bg-gray-50' : 'border-gray-300 bg-gray-50'
              )}>
                {logoPreview
                  ? <img src={logoPreview} alt="Logo preview" className="max-w-full max-h-full object-contain p-1" />
                  : <span className="text-xs text-gray-400">{bt.logoNoLogo}</span>
                }
              </div>

              {/* Upload button */}
              {editing && (
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    {bt.logoUpload}
                  </button>
                  {logoFile && (
                    <button
                      type="button"
                      onClick={() => { setLogoFile(null); setLogoPreview(config?.brandConfig?.logoImageUrl || ''); setLogoError('') }}
                      className="text-xs text-red-500 hover:text-red-700"
                    >
                      {bt.logoRemove}
                    </button>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/svg+xml,image/webp"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  {logoError && <p className="text-xs text-red-500">{logoError}</p>}
                </div>
              )}
            </div>
          </div>

          {/* Brand Name */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              {bt.brandNameLabel}
              <span className="ml-2 text-xs font-normal text-gray-400">{bt.brandNameMaxChars}</span>
            </label>
            {editing ? (
              <div className="relative max-w-sm">
                <input
                  type="text"
                  value={brandName}
                  onChange={e => setBrandName(e.target.value.slice(0, 30))}
                  maxLength={30}
                  placeholder="PLEASE PAYMENT"
                  className="input-field pr-12"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">{brandName.length}/30</span>
              </div>
            ) : (
              <p className="text-sm font-semibold text-gray-900 bg-gray-50 px-4 py-2.5 rounded-lg border border-gray-200 max-w-sm">
                {config?.brandConfig?.brandName || 'PLEASE PAYMENT'}
              </p>
            )}
          </div>

          {/* Theme Picker */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">{bt.colorThemeLabel}</label>
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
              {THEME_LIST.map(theme => {
                const isSelected = themeName === theme.name
                return (
                  <button
                    key={theme.name}
                    type="button"
                    onClick={() => editing && setThemeName(theme.name as ThemeName)}
                    disabled={!editing}
                    title={theme.label}
                    className={clsx(
                      'flex flex-col items-center gap-1.5 p-2 rounded-xl border-2 transition-all',
                      editing ? 'cursor-pointer hover:scale-105' : 'cursor-default',
                      isSelected ? 'border-gray-900 shadow-md scale-105' : 'border-gray-200 hover:border-gray-300'
                    )}
                  >
                    <span
                      className="w-8 h-8 rounded-full shadow-sm border border-white/50"
                      style={{ backgroundColor: theme.preview }}
                    />
                    <span className="text-[10px] font-medium text-gray-600 leading-tight text-center">{theme.label}</span>
                    {isSelected && (
                      <span className="w-2 h-2 rounded-full bg-gray-900" />
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Action Bar — Edit mode */}
        {editing && (
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-end gap-3">
            <button
              onClick={handleCancelClick}
              disabled={saving}
              className="px-5 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-50"
            >
              {bt.btnCancel}
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !!logoError}
              className="px-5 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
            >
              {saving ? bt.btnSaving : bt.btnSaveChanges}
            </button>
          </div>
        )}
      </div>

      {/* Cancel confirm modal */}
      {cancelConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
            </div>
            <h3 className="font-bold text-gray-900 mb-2">{bt.unsavedTitle}</h3>
            <p className="text-sm text-gray-500 mb-5">{bt.unsavedDesc}</p>
            <div className="flex gap-3">
              <button onClick={confirmCancel} className="flex-1 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
                {bt.unsavedCancel}
              </button>
              <button onClick={() => { setCancelConfirm(false); handleSave() }} disabled={saving} className="flex-1 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-lg text-sm font-semibold disabled:opacity-50">
                {bt.unsavedSave}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
