'use client'

import React from 'react'
import {
  CalendarClock,
  Check,
  ChevronDown,
  Clock3,
  Loader2,
  PencilLine,
  Play,
  Plus,
  Power,
  RefreshCw,
  Save,
  ShieldAlert,
  Trash2,
  X,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { deleteCronJob, loadCronSnapshot, runCronNow, saveCronDraft, setCronJobEnabled } from '@/domain/cron/cron-service'
import { cn } from '@/lib/utils'
import { useToastStore } from '@/store/toast-store'
import { useTranslation } from 'react-i18next'
import type { CronDelivery, CronDraft, CronJob, CronRunMode, CronSchedule, CronSnapshot } from '../../../shared/cron'

type EveryUnit = 'minutes' | 'hours' | 'days'
type DeliveryMode = CronDelivery['mode']
type CronFormMode = 'regular' | 'advanced'

type CronFormState = {
  id: string | null
  name: string
  description: string
  enabled: boolean
  deleteAfterRun: boolean
  agentId: string
  sessionKey: string
  scheduleKind: CronSchedule['kind']
  scheduleAt: string
  everyAmount: string
  everyUnit: EveryUnit
  cronExpr: string
  cronTz: string
  cronStaggerMs: string
  sessionTarget: 'main' | 'isolated'
  wakeMode: 'next-heartbeat' | 'now'
  payloadKind: 'agentTurn' | 'systemEvent'
  payloadText: string
  payloadModel: string
  payloadThinking: string
  timeoutSeconds: string
  lightContext: boolean
  deliveryMode: DeliveryMode
  deliveryChannel: string
  deliveryTo: string
  deliveryBestEffort: boolean
}

function createEmptyForm(): CronFormState {
  return {
    id: null,
    name: '',
    description: '',
    enabled: true,
    deleteAfterRun: false,
    agentId: '',
    sessionKey: '',
    scheduleKind: 'every',
    scheduleAt: '',
    everyAmount: '30',
    everyUnit: 'minutes',
    cronExpr: '0 */1 * * *',
    cronTz: '',
    cronStaggerMs: '',
    sessionTarget: 'isolated',
    wakeMode: 'next-heartbeat',
    payloadKind: 'agentTurn',
    payloadText: '',
    payloadModel: '',
    payloadThinking: '',
    timeoutSeconds: '',
    lightContext: true,
    deliveryMode: 'none',
    deliveryChannel: 'telegram',
    deliveryTo: '',
    deliveryBestEffort: true,
  }
}

function syncPayloadKind(form: CronFormState, payloadKind: CronFormState['payloadKind']): CronFormState {
  if (payloadKind === 'systemEvent') {
    return {
      ...form,
      payloadKind: 'systemEvent',
      sessionTarget: 'main',
      deliveryMode: 'none',
      deliveryChannel: '',
      deliveryTo: '',
      deliveryBestEffort: false,
      payloadModel: '',
      payloadThinking: '',
      timeoutSeconds: '',
      lightContext: false,
    }
  }

  return {
    ...form,
    payloadKind: 'agentTurn',
    sessionTarget: 'isolated',
    deliveryMode: form.deliveryMode === 'none' ? 'announce' : form.deliveryMode,
    deliveryChannel: form.deliveryChannel || 'telegram',
    lightContext: true,
  }
}

function syncSessionTarget(form: CronFormState, sessionTarget: CronFormState['sessionTarget']): CronFormState {
  return sessionTarget === 'main' ? syncPayloadKind(form, 'systemEvent') : syncPayloadKind(form, 'agentTurn')
}

function syncScheduleKind(form: CronFormState, scheduleKind: CronFormState['scheduleKind']): CronFormState {
  return {
    ...form,
    scheduleKind,
    deleteAfterRun: scheduleKind === 'at' ? true : false,
  }
}

function syncDeliveryMode(form: CronFormState, deliveryMode: DeliveryMode): CronFormState {
  if (deliveryMode === 'none') {
    return {
      ...form,
      deliveryMode,
      deliveryChannel: '',
      deliveryTo: '',
      deliveryBestEffort: false,
    }
  }

  if (deliveryMode === 'webhook') {
    return {
      ...form,
      deliveryMode,
      deliveryChannel: '',
      deliveryBestEffort: false,
    }
  }

  return {
    ...form,
    deliveryMode,
    deliveryChannel: form.deliveryChannel || 'telegram',
    deliveryBestEffort: true,
  }
}

function formatRelativeTime(timestamp?: number | null) {
  if (!timestamp) return '-'
  const diff = Math.max(0, Date.now() - timestamp)
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

function formatNextRun(timestamp?: number | null) {
  if (!timestamp) return '-'
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(timestamp))
}

function formatDateTimeLocal(isoString?: string) {
  if (!isoString) return ''
  const timestamp = Date.parse(isoString)
  if (!Number.isFinite(timestamp)) return ''
  const date = new Date(timestamp)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hour = String(date.getHours()).padStart(2, '0')
  const minute = String(date.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day}T${hour}:${minute}`
}

function formatSchedule(job: CronJob, t: ReturnType<typeof useTranslation>['t']) {
  if (job.schedule.kind === 'at') {
    return `${t('cron.form.runAt')}: ${formatNextRun(Date.parse(job.schedule.at))}`
  }

  if (job.schedule.kind === 'every') {
    const everyMs = job.schedule.everyMs
    if (everyMs % 86_400_000 === 0) return `${t('cron.every')}${everyMs / 86_400_000}${t('cron.days')}`
    if (everyMs % 3_600_000 === 0) return `${t('cron.every')}${everyMs / 3_600_000}${t('cron.hours')}`
    return `${t('cron.every')}${Math.round(everyMs / 60_000)}${t('cron.minutes')}`
  }

  return `Cron: ${job.schedule.expr}${job.schedule.tz ? ` (${job.schedule.tz})` : ''}`
}

function getDeliverySummary(job: CronJob) {
  if (!job.delivery || job.delivery.mode === 'none') return '不投递'
  if (job.delivery.mode === 'webhook') return `Webhook · ${job.delivery.to ?? '-'}`
  return `渠道投递 · ${job.delivery.channel ?? '-'} / ${job.delivery.to ?? '-'}`
}

function detectFormMode(job: CronJob): CronFormMode {
  if (job.payload.kind === 'agentTurn' && (job.payload.model || job.payload.thinking || job.payload.timeoutSeconds || job.payload.lightContext === false)) {
    return 'advanced'
  }
  if (job.schedule.kind === 'cron' && (job.schedule.tz || job.schedule.staggerMs)) return 'advanced'
  if (job.delivery?.mode === 'webhook') return 'advanced'
  if (job.agentId || job.sessionKey || !job.enabled) return 'advanced'
  return 'regular'
}

function formFromJob(job: CronJob): CronFormState {
  const form = createEmptyForm()
  form.id = job.id
  form.name = job.name
  form.description = job.description ?? ''
  form.enabled = job.enabled
  form.deleteAfterRun = job.deleteAfterRun ?? false
  form.agentId = job.agentId ?? ''
  form.sessionKey = job.sessionKey ?? ''
  form.scheduleKind = job.schedule.kind
  form.sessionTarget = job.sessionTarget
  form.wakeMode = job.wakeMode
  form.payloadKind = job.payload.kind

  if (job.schedule.kind === 'at') {
    form.scheduleAt = formatDateTimeLocal(job.schedule.at)
  } else if (job.schedule.kind === 'every') {
    const everyMs = job.schedule.everyMs
    if (everyMs % 86_400_000 === 0) {
      form.everyAmount = String(everyMs / 86_400_000)
      form.everyUnit = 'days'
    } else if (everyMs % 3_600_000 === 0) {
      form.everyAmount = String(everyMs / 3_600_000)
      form.everyUnit = 'hours'
    } else {
      form.everyAmount = String(Math.max(1, Math.round(everyMs / 60_000)))
      form.everyUnit = 'minutes'
    }
  } else {
    form.cronExpr = job.schedule.expr
    form.cronTz = job.schedule.tz ?? ''
    form.cronStaggerMs = job.schedule.staggerMs ? String(job.schedule.staggerMs) : ''
  }

  if (job.payload.kind === 'systemEvent') {
    form.payloadText = job.payload.text
  } else {
    form.payloadText = job.payload.message
    form.payloadModel = job.payload.model ?? ''
    form.payloadThinking = job.payload.thinking ?? ''
    form.timeoutSeconds = job.payload.timeoutSeconds ? String(job.payload.timeoutSeconds) : ''
    form.lightContext = job.payload.lightContext ?? true
  }

  if (job.delivery) {
    form.deliveryMode = job.delivery.mode
    form.deliveryChannel = job.delivery.channel ?? ''
    form.deliveryTo = job.delivery.to ?? ''
    form.deliveryBestEffort = Boolean(job.delivery.bestEffort)
  }

  return form
}

function formToDraft(form: CronFormState): CronDraft {
  let schedule: CronSchedule
  if (form.scheduleKind === 'at') {
    schedule = { kind: 'at', at: new Date(form.scheduleAt).toISOString() }
  } else if (form.scheduleKind === 'every') {
    const amount = Math.max(1, Number(form.everyAmount || '0'))
    const mult = form.everyUnit === 'days' ? 86_400_000 : form.everyUnit === 'hours' ? 3_600_000 : 60_000
    schedule = { kind: 'every', everyMs: amount * mult }
  } else {
    schedule = {
      kind: 'cron',
      expr: form.cronExpr.trim(),
      tz: form.cronTz.trim() || undefined,
      staggerMs: form.cronStaggerMs.trim() ? Number(form.cronStaggerMs.trim()) : undefined,
    }
  }

  const delivery =
    form.payloadKind === 'agentTurn' && form.deliveryMode !== 'none'
      ? {
          mode: form.deliveryMode,
          channel: form.deliveryMode === 'announce' ? form.deliveryChannel.trim() || undefined : undefined,
          to: form.deliveryTo.trim() || undefined,
          bestEffort: form.deliveryMode === 'announce' ? form.deliveryBestEffort : undefined,
        }
      : undefined

  return {
    id: form.id,
    name: form.name.trim(),
    description: form.description.trim() || undefined,
    enabled: form.enabled,
    deleteAfterRun: form.scheduleKind === 'at' ? form.deleteAfterRun : false,
    agentId: form.agentId.trim() || null,
    sessionKey: form.sessionKey.trim() || null,
    schedule,
    sessionTarget: form.sessionTarget,
    wakeMode: form.wakeMode,
    payload:
      form.payloadKind === 'systemEvent'
        ? { kind: 'systemEvent', text: form.payloadText.trim() }
        : {
            kind: 'agentTurn',
            message: form.payloadText.trim(),
            model: form.payloadModel.trim() || undefined,
            thinking: form.payloadThinking.trim() || undefined,
            timeoutSeconds: form.timeoutSeconds.trim() ? Number(form.timeoutSeconds.trim()) : undefined,
            lightContext: form.lightContext,
          },
    delivery,
  }
}

function validateForm(form: CronFormState) {
  if (!form.name.trim()) return '请填写任务名称'
  if (form.scheduleKind === 'at' && !form.scheduleAt.trim()) return '请选择执行时间'
  if (form.scheduleKind === 'at' && Number.isNaN(Date.parse(form.scheduleAt))) return '请选择有效的执行时间'
  if (form.scheduleKind === 'every' && (!form.everyAmount.trim() || Number(form.everyAmount) <= 0)) return '请填写有效的执行间隔'
  if (form.scheduleKind === 'cron' && !form.cronExpr.trim()) return '请填写 Cron 表达式'
  if (!form.payloadText.trim()) return '请填写任务内容'
  if (form.payloadKind === 'systemEvent' && form.sessionTarget !== 'main') return 'systemEvent 只能运行在主会话'
  if (form.payloadKind === 'agentTurn' && form.sessionTarget !== 'isolated') return 'agentTurn 只能运行在独立会话'
  if (form.timeoutSeconds.trim() && Number(form.timeoutSeconds) <= 0) return '超时时间必须大于 0'
  if (form.scheduleKind === 'cron' && form.cronStaggerMs.trim() && Number(form.cronStaggerMs) < 0) return '错峰毫秒数不能小于 0'
  if (form.payloadKind === 'agentTurn' && form.deliveryMode === 'announce') {
    if (!form.deliveryChannel.trim()) return '请选择投递渠道'
    if (!form.deliveryTo.trim()) return '请填写投递目标'
  }
  if (form.payloadKind === 'agentTurn' && form.deliveryMode === 'webhook') {
    if (!form.deliveryTo.trim()) return '请填写 Webhook 地址'
    try {
      const url = new URL(form.deliveryTo.trim())
      if (!['http:', 'https:'].includes(url.protocol)) return 'Webhook 地址必须是 http 或 https'
    } catch {
      return 'Webhook 地址格式不正确'
    }
  }
  return null
}

function DropdownField({ value, onChange, options }: { value: string; onChange: (value: string) => void; options: Array<{ value: string; label: string }> }) {
  const [open, setOpen] = React.useState(false)
  const rootRef = React.useRef<HTMLDivElement | null>(null)
  const selected = options.find((option) => option.value === value) ?? options[0]

  React.useEffect(() => {
    if (!open) return
    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [open])

  React.useEffect(() => {
    setOpen(false)
  }, [value])

  return (
    <div ref={rootRef} className='relative'>
      <button type='button' className='flex h-11 w-full items-center justify-between rounded-2xl border border-input bg-background px-3 text-left text-sm text-foreground transition hover:border-ring/40 dark:bg-muted/35' onClick={() => setOpen((current) => !current)}>
        <span className='truncate'>{selected?.label ?? value}</span>
        <ChevronDown className={cn('h-4 w-4 shrink-0 text-muted-foreground transition', open && 'rotate-180')} />
      </button>
      {open ? (
        <div className='absolute left-0 right-0 top-[calc(100%+0.5rem)] z-30 overflow-hidden rounded-2xl border border-border/90 bg-popover shadow-[0_20px_50px_-24px_rgba(15,23,42,0.45)]'>
          <div className='max-h-64 overflow-y-auto p-1'>
            {options.map((option) => (
              <button
                key={option.value}
                type='button'
                className={cn('flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition', option.value === value ? 'bg-primary/10 text-foreground' : 'text-foreground hover:bg-muted/70')}
                onMouseDown={(event) => {
                  event.preventDefault()
                  setOpen(false)
                }}
                onClick={() => {
                  setOpen(false)
                  onChange(option.value)
                }}
              >
                <span className='truncate'>{option.label}</span>
                {option.value === value ? <Check className='ml-3 h-4 w-4 shrink-0 text-primary' /> : null}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}
function ModelField({ value, onChange, options, placeholder }: { value: string; onChange: (value: string) => void; options: string[]; placeholder?: string }) {
  const [open, setOpen] = React.useState(false)
  const rootRef = React.useRef<HTMLDivElement | null>(null)
  const filteredOptions = React.useMemo(() => {
    const keyword = value.trim().toLowerCase()
    return options.filter((option) => !keyword || option.toLowerCase().includes(keyword)).slice(0, 12)
  }, [options, value])

  React.useEffect(() => {
    if (!open) return
    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [open])

  React.useEffect(() => {
    setOpen(false)
  }, [value])

  return (
    <div ref={rootRef} className='relative'>
      <button type='button' className='pointer-events-none absolute right-3 top-1/2 z-10 -translate-y-1/2 text-muted-foreground' tabIndex={-1}>
        <ChevronDown className={cn('h-4 w-4 transition', open && 'rotate-180')} />
      </button>
      <Input value={value} placeholder={placeholder} onFocus={() => setOpen(true)} onChange={(event) => { onChange(event.target.value); setOpen(true) }} className='h-11 rounded-2xl pr-10 dark:bg-muted/35' />
      {open && filteredOptions.length ? (
        <div className='absolute left-0 right-0 top-[calc(100%+0.5rem)] z-30 overflow-hidden rounded-2xl border border-border/90 bg-popover shadow-[0_20px_50px_-24px_rgba(15,23,42,0.45)]'>
          <div className='max-h-64 overflow-y-auto p-1'>
            {filteredOptions.map((option) => (
              <button
                key={option}
                type='button'
                className={cn('flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition', option === value ? 'bg-primary/10 text-foreground' : 'text-foreground hover:bg-muted/70')}
                onMouseDown={(event) => {
                  event.preventDefault()
                  setOpen(false)
                }}
                onClick={() => {
                  setOpen(false)
                  onChange(option)
                }}
              >
                <span className='truncate'>{option}</span>
                {option === value ? <Check className='ml-3 h-4 w-4 shrink-0 text-primary' /> : null}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}

function SummaryCard({
  title,
  value,
  hint,
  icon: Icon,
  tone = 'slate',
}: {
  title: string
  value: string
  hint: string
  icon: React.ComponentType<{ className?: string }>
  tone?: 'slate' | 'emerald' | 'primary'
}) {
  const toneClasses =
    tone === 'emerald'
      ? 'border border-emerald-200/80 bg-card text-emerald-600 dark:border-emerald-400/24 dark:bg-card dark:text-emerald-300'
      : tone === 'primary'
        ? 'border border-primary/16 bg-card text-primary dark:border-primary/24 dark:bg-card dark:text-primary'
        : 'border border-border/80 bg-card text-foreground'

  return (
    <div className='rounded-[24px] border border-border/80 bg-card/95 p-4 shadow-sm dark:bg-card/85'>
      <div className='flex items-start justify-between gap-4'>
        <div className='space-y-2'>
          <div className='text-sm font-medium text-muted-foreground'>{title}</div>
          <div className='text-2xl font-bold tracking-tight text-foreground'>{value}</div>
          <div className='text-xs leading-6 text-muted-foreground'>{hint}</div>
        </div>
        <div className={cn('flex h-11 w-11 items-center justify-center rounded-2xl', toneClasses)}>
          <Icon className='h-5 w-5' />
        </div>
      </div>
    </div>
  )
}

function FormSection({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className='rounded-[24px] border border-border/80 bg-card/90 p-4'>
      <div className='mb-4'>
        <div className='text-sm font-semibold text-foreground'>{title}</div>
        {description ? <div className='mt-1 text-xs leading-6 text-muted-foreground'>{description}</div> : null}
      </div>
      <div className='space-y-4'>{children}</div>
    </div>
  )
}

function TaskEditorDialog({
  open,
  formMode,
  form,
  busy,
  modelSuggestions,
  onClose,
  onFormModeChange,
  onChange,
  onSubmit,
}: {
  open: boolean
  formMode: CronFormMode
  form: CronFormState
  busy: boolean
  modelSuggestions: string[]
  onClose: () => void
  onFormModeChange: (mode: CronFormMode) => void
  onChange: (updater: (current: CronFormState) => CronFormState) => void
  onSubmit: () => void
}) {
  if (!open) return null

  const isEditing = Boolean(form.id)
  const isAt = form.scheduleKind === 'at'
  const isCron = form.scheduleKind === 'cron'
  const isAgentTurn = form.payloadKind === 'agentTurn'
  const showAnnounce = isAgentTurn && form.deliveryMode === 'announce'
  const showWebhook = isAgentTurn && form.deliveryMode === 'webhook'

  return (
    <div
      className='app-overlay-scrim fixed inset-0 z-50 flex items-center justify-center px-4 py-6 backdrop-blur-sm'
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose()
        }
      }}
    >
      <div className='app-dialog-shell flex max-h-[88vh] w-full max-w-5xl flex-col overflow-hidden rounded-[32px]'>
        <div className='app-dialog-section flex items-start justify-between gap-4 border-b px-6 py-5'>
          <div className='space-y-2'>
            <div className='text-2xl font-bold text-foreground'>{isEditing ? '编辑任务' : '创建任务'}</div>
            <div className='text-sm text-muted-foreground'>创建任务通过弹出层完成，普通模式适合常规任务，高阶模式适合完整配置。</div>
          </div>
          <button type='button' className='flex h-12 w-12 items-center justify-center rounded-2xl text-muted-foreground transition hover:bg-muted/70 hover:text-foreground' onClick={onClose}>
            <X className='h-5 w-5' />
          </button>
        </div>

        <div className='app-dialog-section border-b px-6 py-4'>
          <div className='inline-flex rounded-xl bg-muted p-1'>
            {([
              { key: 'regular', label: '普通创建' },
              { key: 'advanced', label: '高阶创建' },
            ] as const).map((item) => (
              <button
                key={item.key}
                type='button'
                onClick={() => onFormModeChange(item.key)}
                className={cn(
                  'inline-flex items-center rounded-lg px-4 py-2 text-sm font-medium transition-colors',
                  formMode === item.key
                    ? 'bg-background text-foreground shadow-sm ring-1 ring-border'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className='min-h-0 flex-1 overflow-y-auto px-6 py-6'>
          <div className='space-y-5'>
            <FormSection title='基础配置' description='普通创建只展示最常用字段，部分关联配置会自动联动。'>
              <div className='grid gap-4 lg:grid-cols-2'>
                <label className='space-y-2 text-sm'><span className='font-medium text-foreground'>任务名称</span><Input value={form.name} onChange={(event) => onChange((current) => ({ ...current, name: event.target.value }))} className='rounded-2xl' /></label>
                <label className='space-y-2 text-sm'><span className='font-medium text-foreground'>说明</span><Input value={form.description} onChange={(event) => onChange((current) => ({ ...current, description: event.target.value }))} className='rounded-2xl' /></label>
              </div>
              <div className='grid gap-4 lg:grid-cols-2'>
                <label className='space-y-2 text-sm'><span className='font-medium text-foreground'>任务类型</span><DropdownField value={form.payloadKind} onChange={(value) => onChange((current) => syncPayloadKind(current, value as CronFormState['payloadKind']))} options={[{ value: 'agentTurn', label: '独立执行任务' }, { value: 'systemEvent', label: '主会话提醒' }]} /></label>
                <label className='space-y-2 text-sm'><span className='font-medium text-foreground'>调度方式</span><DropdownField value={form.scheduleKind} onChange={(value) => onChange((current) => syncScheduleKind(current, value as CronFormState['scheduleKind']))} options={[{ value: 'every', label: '周期执行' }, { value: 'at', label: '单次执行' }, { value: 'cron', label: 'Cron 表达式' }]} /></label>
              </div>
              {isAt ? <label className='space-y-2 text-sm'><span className='font-medium text-foreground'>执行时间</span><Input type='datetime-local' value={form.scheduleAt} onChange={(event) => onChange((current) => ({ ...current, scheduleAt: event.target.value, deleteAfterRun: true }))} className='rounded-2xl' /></label> : null}
              {form.scheduleKind === 'every' ? <div className='grid gap-4 lg:grid-cols-[minmax(0,1fr)_180px]'><label className='space-y-2 text-sm'><span className='font-medium text-foreground'>执行间隔</span><Input value={form.everyAmount} onChange={(event) => onChange((current) => ({ ...current, everyAmount: event.target.value }))} className='rounded-2xl' /></label><label className='space-y-2 text-sm'><span className='font-medium text-foreground'>单位</span><DropdownField value={form.everyUnit} onChange={(value) => onChange((current) => ({ ...current, everyUnit: value as EveryUnit }))} options={[{ value: 'minutes', label: '分钟' }, { value: 'hours', label: '小时' }, { value: 'days', label: '天' }]} /></label></div> : null}
              {isCron ? <div className='grid gap-4 lg:grid-cols-2'><label className='space-y-2 text-sm'><span className='font-medium text-foreground'>Cron 表达式</span><Input value={form.cronExpr} onChange={(event) => onChange((current) => ({ ...current, cronExpr: event.target.value }))} className='rounded-2xl' /></label><label className='space-y-2 text-sm'><span className='font-medium text-foreground'>时区</span><Input value={form.cronTz} onChange={(event) => onChange((current) => ({ ...current, cronTz: event.target.value }))} className='rounded-2xl' /></label></div> : null}
              <label className='space-y-2 text-sm'><span className='font-medium text-foreground'>任务内容</span><Textarea value={form.payloadText} onChange={(event) => onChange((current) => ({ ...current, payloadText: event.target.value }))} className='min-h-[140px] rounded-2xl' /></label>
            </FormSection>
            {isAgentTurn ? (
              <FormSection title='投递配置' description='普通模式支持不投递和渠道投递，高阶模式额外支持 Webhook。'>
                <div className='grid gap-4 lg:grid-cols-2'>
                  <label className='space-y-2 text-sm'><span className='font-medium text-foreground'>投递方式</span><DropdownField value={form.deliveryMode} onChange={(value) => onChange((current) => syncDeliveryMode(current, value as DeliveryMode))} options={formMode === 'advanced' ? [{ value: 'none', label: '不投递' }, { value: 'announce', label: '渠道投递' }, { value: 'webhook', label: 'Webhook' }] : [{ value: 'none', label: '不投递' }, { value: 'announce', label: '渠道投递' }]} /></label>
                  {showAnnounce ? <label className='space-y-2 text-sm'><span className='font-medium text-foreground'>渠道</span><DropdownField value={form.deliveryChannel} onChange={(value) => onChange((current) => ({ ...current, deliveryChannel: value }))} options={[{ value: 'telegram', label: 'Telegram' }, { value: 'discord', label: 'Discord' }, { value: 'slack', label: 'Slack' }, { value: 'whatsapp', label: 'WhatsApp' }, { value: 'mattermost', label: 'Mattermost' }, { value: 'signal', label: 'Signal' }, { value: 'imessage', label: 'iMessage' }, { value: 'last', label: 'Last Active' }]} /></label> : null}
                </div>
                {showAnnounce || showWebhook ? <label className='space-y-2 text-sm'><span className='font-medium text-foreground'>目标地址</span><Input value={form.deliveryTo} onChange={(event) => onChange((current) => ({ ...current, deliveryTo: event.target.value }))} className='rounded-2xl' /></label> : null}
                {showAnnounce ? <label className='flex items-center gap-3 rounded-2xl border border-border/70 bg-muted/20 px-4 py-3 text-sm'><input type='checkbox' checked={form.deliveryBestEffort} onChange={(event) => onChange((current) => ({ ...current, deliveryBestEffort: event.target.checked }))} /><span>投递失败不阻断任务</span></label> : null}
              </FormSection>
            ) : null}

            {formMode === 'advanced' ? (
              <FormSection title='高阶设置' description='这里补充 OpenClaw 文档里的进阶字段，包括关联约束后的完整配置。'>
                <div className='grid gap-4 lg:grid-cols-2'>
                  <label className='space-y-2 text-sm'><span className='font-medium text-foreground'>会话目标</span><DropdownField value={form.sessionTarget} onChange={(value) => onChange((current) => syncSessionTarget(current, value as CronFormState['sessionTarget']))} options={[{ value: 'isolated', label: '独立会话' }, { value: 'main', label: '主会话' }]} /></label>
                  <label className='space-y-2 text-sm'><span className='font-medium text-foreground'>唤醒方式</span><DropdownField value={form.wakeMode} onChange={(value) => onChange((current) => ({ ...current, wakeMode: value as CronFormState['wakeMode'] }))} options={[{ value: 'next-heartbeat', label: '下个心跳' }, { value: 'now', label: '立即唤醒' }]} /></label>
                </div>
                {isCron ? <label className='space-y-2 text-sm'><span className='font-medium text-foreground'>错峰毫秒数</span><Input value={form.cronStaggerMs} onChange={(event) => onChange((current) => ({ ...current, cronStaggerMs: event.target.value }))} className='rounded-2xl' /></label> : null}
                {isAgentTurn ? <div className='grid gap-4 lg:grid-cols-2'><label className='space-y-2 text-sm'><span className='font-medium text-foreground'>模型覆盖</span><ModelField value={form.payloadModel} onChange={(value) => onChange((current) => ({ ...current, payloadModel: value }))} options={modelSuggestions} placeholder='provider/model' /></label><label className='space-y-2 text-sm'><span className='font-medium text-foreground'>Thinking</span><Input value={form.payloadThinking} onChange={(event) => onChange((current) => ({ ...current, payloadThinking: event.target.value }))} className='rounded-2xl' /></label><label className='space-y-2 text-sm'><span className='font-medium text-foreground'>超时时间（秒）</span><Input value={form.timeoutSeconds} onChange={(event) => onChange((current) => ({ ...current, timeoutSeconds: event.target.value }))} className='rounded-2xl' /></label><label className='flex items-center gap-3 rounded-2xl border border-border/70 bg-muted/20 px-4 py-3 text-sm'><input type='checkbox' checked={form.lightContext} onChange={(event) => onChange((current) => ({ ...current, lightContext: event.target.checked }))} /><span>启用 lightContext</span></label></div> : null}
                <div className='grid gap-4 lg:grid-cols-2'>
                  <label className='space-y-2 text-sm'><span className='font-medium text-foreground'>Agent ID</span><Input value={form.agentId} onChange={(event) => onChange((current) => ({ ...current, agentId: event.target.value }))} className='rounded-2xl' /></label>
                  <label className='space-y-2 text-sm'><span className='font-medium text-foreground'>Session Key</span><Input value={form.sessionKey} onChange={(event) => onChange((current) => ({ ...current, sessionKey: event.target.value }))} className='rounded-2xl' /></label>
                </div>
                <div className='grid gap-3 lg:grid-cols-2'>
                  <label className='flex items-center gap-3 rounded-2xl border border-border/70 bg-muted/20 px-4 py-3 text-sm'><input type='checkbox' checked={form.enabled} onChange={(event) => onChange((current) => ({ ...current, enabled: event.target.checked }))} /><span>启用此任务</span></label>
                  <label className={cn('flex items-center gap-3 rounded-2xl border border-border/70 bg-muted/20 px-4 py-3 text-sm', !isAt && 'opacity-60')}><input type='checkbox' checked={isAt ? form.deleteAfterRun : false} disabled={!isAt} onChange={(event) => onChange((current) => ({ ...current, deleteAfterRun: event.target.checked }))} /><span>执行后删除</span></label>
                </div>
              </FormSection>
            ) : null}
          </div>
        </div>

        <div className='app-dialog-section flex items-center justify-between gap-3 border-t px-6 py-5'>
          <div className='text-xs text-muted-foreground'>{isAt ? '单次任务默认会在执行后删除。' : isAgentTurn ? '独立执行任务会根据投递配置决定是否发送结果。' : '主会话提醒会自动绑定到主会话和 systemEvent。'}</div>
          <div className='flex items-center gap-3'>
            <Button variant='outline' className='rounded-2xl px-4' onClick={onClose} disabled={busy}>取消</Button>
            <Button className='rounded-2xl px-5' onClick={onSubmit} disabled={busy}>{busy ? <Loader2 className='mr-2 h-4 w-4 animate-spin' /> : <Save className='mr-2 h-4 w-4' />}{isEditing ? '保存修改' : '添加任务'}</Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function CronView() {
  const { t } = useTranslation()
  const [snapshot, setSnapshot] = React.useState<CronSnapshot | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [busy, setBusy] = React.useState(false)
  const [deleteTarget, setDeleteTarget] = React.useState<CronJob | null>(null)
  const [editorOpen, setEditorOpen] = React.useState(false)
  const [editorMode, setEditorMode] = React.useState<CronFormMode>('regular')
  const [form, setForm] = React.useState<CronFormState>(() => createEmptyForm())
  const pushToast = useToastStore((state) => state.pushToast)
  const jobs = snapshot?.jobs ?? []
  const status = snapshot?.status

  const loadSnapshot = React.useCallback(async () => {
    setLoading(true)
    try {
      const next = await loadCronSnapshot()
      setSnapshot(next)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      pushToast('error', message)
    } finally {
      setLoading(false)
    }
  }, [pushToast])

  React.useEffect(() => {
    void loadSnapshot()
  }, [loadSnapshot])

  const showToast = (kind: 'success' | 'error', text: string) => pushToast(kind, text)

  const handleSubmit = async () => {
    const error = validateForm(form)
    if (error) {
      showToast('error', error)
      return
    }
    setBusy(true)
    try {
      const next = await saveCronDraft(formToDraft(form))
      setSnapshot(next)
      setEditorOpen(false)
      showToast('success', form.id ? t('cron.messages.updated') : t('cron.messages.created'))
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  const handleToggle = async (job: CronJob) => {
    setBusy(true)
    try {
      setSnapshot(await setCronJobEnabled(job.id, !job.enabled))
      showToast('success', job.enabled ? t('cron.messages.disabled') : t('cron.messages.enabled'))
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  const handleRun = async (job: CronJob, mode: CronRunMode = 'force') => {
    setBusy(true)
    try {
      setSnapshot(await runCronNow(job.id, mode))
      showToast('success', t('cron.messages.ran'))
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setBusy(true)
    try {
      setSnapshot(await deleteCronJob(deleteTarget.id))
      setDeleteTarget(null)
      showToast('success', t('cron.messages.deleted'))
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  const openCreate = (mode: CronFormMode) => {
    setForm(createEmptyForm())
    setEditorMode(mode)
    setEditorOpen(true)
  }

  const openEdit = (job: CronJob) => {
    setForm(formFromJob(job))
    setEditorMode(detectFormMode(job))
    setEditorOpen(true)
  }

  return (
    <div className='h-full flex-1 overflow-auto bg-background p-6 lg:p-8'>
      <div className='mx-auto flex max-w-7xl flex-col gap-6'>
        <div className='flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between'>
          <div className='flex flex-col gap-2 lg:flex-row lg:items-end lg:gap-5'>
            <h1 className='text-3xl font-bold tracking-tight'>{t('cron.title')}</h1>
            <p className='text-sm text-muted-foreground lg:pb-1'>{t('cron.subtitle')}</p>
          </div>
          <div className='flex flex-wrap items-center gap-3'>
            <Button variant='outline' className='gap-2 rounded-2xl' onClick={loadSnapshot} disabled={loading || busy}><RefreshCw className={cn('h-4 w-4', (loading || busy) && 'animate-spin')} />{t('cron.refresh')}</Button>
            <Button variant='outline' className='gap-2 rounded-2xl' onClick={() => openCreate('advanced')} disabled={busy}><Plus className='h-4 w-4' />高阶创建</Button>
            <Button className='gap-2 rounded-2xl px-4' onClick={() => openCreate('regular')} disabled={busy}><Plus className='h-4 w-4' />{t('cron.newJob')}</Button>
          </div>
        </div>
        <div className='grid gap-4 lg:grid-cols-3'>
          <SummaryCard title={t('cron.summary.enabled')} value={status ? (status.enabled ? t('cron.enabled') : t('cron.disabled')) : '-'} hint={t('cron.summary.enabledHint')} icon={Power} tone={status?.enabled ? 'emerald' : 'primary'} />
          <SummaryCard title={t('cron.summary.jobs')} value={String(status?.jobs ?? jobs.length)} hint={t('cron.summary.jobsHint')} icon={CalendarClock} />
          <SummaryCard title={t('cron.summary.nextWake')} value={formatNextRun(status?.nextWakeAtMs)} hint={t('cron.summary.nextWakeHint')} icon={Clock3} />
        </div>
        <Card className='rounded-[28px] border-border/80 shadow-sm'>
          <CardHeader className='space-y-2'>
            <CardTitle className='text-2xl font-bold'>{t('cron.jobsTitle')}</CardTitle>
            <p className='text-sm text-muted-foreground'>{t('cron.jobsSubtitle')}</p>
          </CardHeader>
          <CardContent className='space-y-4'>
            {loading ? <div className='flex min-h-[240px] items-center justify-center rounded-3xl border border-dashed border-border bg-muted/20'><div className='flex items-center gap-3 text-muted-foreground'><Loader2 className='h-5 w-5 animate-spin' />{t('cron.loading')}</div></div> : jobs.length === 0 ? <div className='rounded-3xl border border-dashed border-border bg-muted/20 px-6 py-16 text-center'><ShieldAlert className='mx-auto h-10 w-10 text-muted-foreground/60' /><h3 className='mt-4 text-lg font-semibold'>{t('cron.emptyTitle')}</h3><p className='mt-2 text-sm text-muted-foreground'>当前请通过右上角添加按钮在弹出层里创建任务。</p><div className='mt-6 flex justify-center'><Button className='gap-2 rounded-2xl px-4' onClick={() => openCreate('regular')}><Plus className='h-4 w-4' />{t('cron.newJob')}</Button></div></div> : <div className='space-y-3'>{jobs.map((job) => <div key={job.id} className='rounded-[24px] border border-border/80 bg-card/95 p-4 shadow-sm dark:bg-card/85'><div className='flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between'><div className='min-w-0 flex-1'><div className='flex flex-wrap items-center gap-2'><h3 className='text-lg font-semibold text-foreground'>{job.name}</h3><span className={cn('rounded-full px-2.5 py-1 text-xs font-medium', job.enabled ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200' : 'border border-border/80 bg-muted/70 text-muted-foreground dark:bg-muted/40 dark:text-muted-foreground')}>{job.enabled ? t('cron.enabled') : t('cron.disabled')}</span><span className='rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground'>{job.payload.kind}</span><span className='rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground'>{job.sessionTarget}</span></div>{job.description ? <p className='mt-2 text-sm leading-6 text-muted-foreground'>{job.description}</p> : null}<p className='mt-2 text-sm leading-6 text-muted-foreground'>{formatSchedule(job, t)}</p><div className='mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground'><span className='rounded-full bg-muted px-2.5 py-1'>{t('cron.nextRun')}: {formatNextRun(job.state?.nextRunAtMs)}</span><span className='rounded-full bg-muted px-2.5 py-1'>{t('cron.lastRun')}: {formatRelativeTime(job.state?.lastRunAtMs)}</span><span className='rounded-full bg-muted px-2.5 py-1'>{getDeliverySummary(job)}</span></div></div><div className='flex shrink-0 flex-wrap items-center justify-end gap-2'><Button variant='outline' size='sm' className='rounded-xl' disabled={busy} onClick={() => openEdit(job)}><PencilLine className='mr-2 h-3.5 w-3.5' />编辑</Button><Button variant='outline' size='sm' className='rounded-xl' disabled={busy} onClick={() => handleToggle(job)}><Power className='mr-2 h-3.5 w-3.5' />{job.enabled ? t('cron.disable') : t('cron.enable')}</Button><Button variant='outline' size='sm' className='rounded-xl' disabled={busy} onClick={() => handleRun(job)}><Play className='mr-2 h-3.5 w-3.5' />{t('cron.runNow')}</Button><Button variant='outline' size='sm' className='rounded-xl text-destructive hover:bg-destructive/10 hover:text-destructive dark:border-destructive/20 dark:text-destructive dark:hover:bg-destructive/15' disabled={busy} onClick={() => setDeleteTarget(job)}><Trash2 className='mr-2 h-3.5 w-3.5' />{t('cron.delete')}</Button></div></div></div>)}</div>}
          </CardContent>
        </Card>
      </div>
      <TaskEditorDialog open={editorOpen} formMode={editorMode} form={form} busy={busy} modelSuggestions={snapshot?.modelSuggestions ?? []} onClose={() => !busy && setEditorOpen(false)} onFormModeChange={setEditorMode} onChange={(updater) => setForm((current) => updater(current))} onSubmit={() => void handleSubmit()} />
      {deleteTarget ? <div className='app-overlay-scrim fixed inset-0 z-50 flex items-center justify-center px-4 backdrop-blur-sm'><div className='app-dialog-shell w-full max-w-md rounded-[28px] p-6'><div className='text-xl font-black text-foreground'>{t('cron.deleteConfirmTitle')}</div><p className='mt-3 text-sm leading-7 text-muted-foreground'>{t('cron.deleteConfirmText', { name: deleteTarget.name })}</p><div className='mt-2 break-all rounded-2xl border border-border/80 bg-muted/40 px-3 py-2 font-mono text-xs text-muted-foreground'>{deleteTarget.id}</div><div className='mt-6 flex justify-end gap-3'><Button variant='outline' className='rounded-2xl px-4' onClick={() => setDeleteTarget(null)}>{t('cron.cancel')}</Button><Button className='rounded-2xl bg-destructive px-4 text-destructive-foreground hover:bg-destructive/90' onClick={() => void handleDelete()}><Trash2 className='mr-2 h-4 w-4' />{t('cron.delete')}</Button></div></div></div> : null}
    </div>
  )
}
