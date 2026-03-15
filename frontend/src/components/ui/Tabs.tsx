interface Tab {
  key: string
  label: string
  icon?: string
}

interface TabsProps {
  tabs: Tab[]
  active: string
  onChange: (key: string) => void
}

/** Tab bar matching the prototype's settings/report tab style. */
export function Tabs({ tabs, active, onChange }: TabsProps) {
  return (
    <div className="mb-4 flex gap-1 border-b border-bp-border">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          className="cursor-pointer border-none px-3 py-2 text-[13px] transition-colors"
          style={{
            background: 'transparent',
            color: active === tab.key ? '#f59e0b' : '#94a3b8',
            borderBottom: active === tab.key ? '2px solid #f59e0b' : '2px solid transparent',
            fontWeight: active === tab.key ? 600 : 400,
          }}
        >
          {tab.icon && <span className="mr-1.5">{tab.icon}</span>}
          {tab.label}
        </button>
      ))}
    </div>
  )
}
