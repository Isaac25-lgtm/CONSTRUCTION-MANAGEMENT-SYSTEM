interface EmptyStateProps {
  icon?: string
  title: string
  description?: string
}

export function EmptyState({ icon = '📭', title, description }: EmptyStateProps) {
  return (
    <div className="rounded-[10px] border border-bp-border bg-bp-bg2 p-10 text-center">
      <div className="mb-2 text-3xl">{icon}</div>
      <p className="font-semibold text-bp-text">{title}</p>
      {description && (
        <p className="mt-1 text-sm text-bp-muted">{description}</p>
      )}
    </div>
  )
}
