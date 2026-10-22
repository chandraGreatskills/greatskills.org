// Marks a member or opening made by the simulation engine, so nobody takes a
// demo student or job for a real one.
export default function DemoBadge({ show, className = '' }: { show?: boolean; className?: string }) {
  if (!show) return null
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-amber-800 ${className}`}
      title="Sample profile shown to give a feel for the network"
    >
      Demo
    </span>
  )
}
