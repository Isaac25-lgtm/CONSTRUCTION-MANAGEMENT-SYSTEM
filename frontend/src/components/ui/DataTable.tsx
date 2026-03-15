import type { ReactNode } from 'react'

interface Column<T> {
  key: string
  header: string
  render: (row: T, index: number) => ReactNode
  width?: string
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  emptyText?: string
  onRowClick?: (row: T) => void
  renderExpanded?: (row: T) => ReactNode | null
}

/** Reusable data table matching prototype sTH/sTD styling. */
export function DataTable<T>({ columns, data, emptyText = 'No data', onRowClick, renderExpanded }: DataTableProps<T>) {
  return (
    <div className="overflow-x-auto rounded-[10px] border border-bp-border bg-bp-bg2">
      <table className="bp-table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key} style={col.width ? { width: col.width } : undefined}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="!text-center !py-8 !text-bp-muted">
                {emptyText}
              </td>
            </tr>
          ) : (
            data.map((row, i) => {
              const expanded = renderExpanded?.(row)
              return (
                <>
                  <tr
                    key={i}
                    className={onRowClick ? 'cursor-pointer' : ''}
                    onClick={() => onRowClick?.(row)}
                  >
                    {columns.map((col) => (
                      <td key={col.key}>{col.render(row, i)}</td>
                    ))}
                  </tr>
                  {expanded && (
                    <tr key={`${i}-exp`}>
                      <td colSpan={columns.length} className="!p-0">
                        {expanded}
                      </td>
                    </tr>
                  )}
                </>
              )
            })
          )}
        </tbody>
      </table>
    </div>
  )
}
