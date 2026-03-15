import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  PageHeader, SectionCard, StatusBadge, ActionButton,
  FilterChip, EmptyState, LoadingState,
} from '../../components/ui'
import {
  useNotifications, useMarkRead, useMarkAllRead,
  type NotificationData,
} from '../../hooks/useNotifications'

/**
 * Notifications page -- uses real API data only.
 * No demo fallback. Shows error state on failure.
 */

const levelColors: Record<string, string> = {
  info: '#3b82f6',
  warning: '#f97316',
  danger: '#ef4444',
  success: '#22c55e',
}

const levelIcons: Record<string, string> = {
  info: '\u2139\uFE0F',
  warning: '\u26A0\uFE0F',
  danger: '\u274C',
  success: '\u2705',
}

export function NotificationsPage() {
  const { data: apiData, isLoading, isError } = useNotifications()
  const markRead = useMarkRead()
  const markAllRead = useMarkAllRead()
  const navigate = useNavigate()
  const [activeCat, setActiveCat] = useState<string>('All')

  if (isLoading) return <LoadingState rows={6} />
  if (isError) {
    return (
      <div>
        <PageHeader title="Notifications & Alerts" icon="&#128276;" />
        <EmptyState icon="&#9888;" title="Failed to load notifications" description="Could not connect to the server. Check your connection and try again." />
      </div>
    )
  }

  const notifications: NotificationData[] = apiData?.results ?? []
  const unreadCount = apiData?.unread_count ?? 0

  // Build notification_type counts
  const typeCounts: Record<string, number> = {}
  notifications.forEach(n => {
    typeCounts[n.notification_type] = (typeCounts[n.notification_type] || 0) + 1
  })
  const categories = ['All', ...Object.keys(typeCounts)]

  const filtered = activeCat === 'All'
    ? notifications
    : notifications.filter(n => n.notification_type === activeCat)

  const handleClick = (n: NotificationData) => {
    if (!n.is_read) {
      markRead.mutate(n.id)
    }
    if (n.link) {
      navigate(n.link)
    }
  }

  return (
    <div>
      <PageHeader title="Notifications & Alerts" icon="&#128276;">
        <span className="text-[13px] text-bp-muted">{filtered.length} of {notifications.length}</span>
        {unreadCount > 0 && <StatusBadge text={`${unreadCount} unread`} color="#ef4444" />}
        {unreadCount > 0 && (
          <ActionButton
            variant="blue"
            size="sm"
            onClick={() => markAllRead.mutate()}
            disabled={markAllRead.isPending}
          >
            Mark All Read
          </ActionButton>
        )}
      </PageHeader>

      {/* Category filter chips */}
      {categories.length > 1 && (
        <div className="mb-4 grid grid-cols-[repeat(auto-fit,minmax(100px,1fr))] gap-1.5">
          {categories.map(cat => (
            <FilterChip
              key={cat}
              label={cat}
              count={cat === 'All' ? notifications.length : typeCounts[cat]}
              active={activeCat === cat}
              onClick={() => setActiveCat(cat)}
            />
          ))}
        </div>
      )}

      {/* Notification list */}
      {filtered.length === 0 ? (
        <EmptyState icon="&#9989;" title="All clear" description={notifications.length === 0 ? 'No notifications yet.' : 'No notifications in this category.'} />
      ) : (
        <div className="grid gap-1.5">
          {filtered.map(n => {
            const color = levelColors[n.level] || '#3b82f6'
            const icon = levelIcons[n.level] || '\u2139\uFE0F'
            return (
              <SectionCard key={n.id} padding="compact">
                <div
                  className="flex cursor-pointer items-start gap-3 px-1"
                  style={{ borderLeft: `3px solid ${color}`, paddingLeft: 12, opacity: n.is_read ? 0.65 : 1 }}
                  onClick={() => handleClick(n)}
                >
                  <span className="mt-0.5 flex-shrink-0 text-xl">{icon}</span>
                  <div className="min-w-0 flex-1">
                    <div className="mb-0.5 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <StatusBadge text={n.notification_type} color={color} />
                        <span className={`text-[13px] font-semibold text-bp-text ${n.is_read ? '' : 'font-bold'}`}>{n.title}</span>
                        {!n.is_read && <span className="inline-block h-2 w-2 rounded-full bg-bp-accent flex-shrink-0" />}
                      </div>
                      <span className="flex-shrink-0 text-[10px] text-bp-muted">
                        {new Date(n.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                      </span>
                    </div>
                    <div className="mt-0.5 text-[11px] text-bp-muted">{n.message}</div>
                  </div>
                  <span className="flex-shrink-0 text-sm text-bp-muted">&#8250;</span>
                </div>
              </SectionCard>
            )
          })}
        </div>
      )}
    </div>
  )
}
