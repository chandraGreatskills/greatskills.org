import type { RelationshipKind } from './types'

// How the author knows the person, phrased from the author's side for the
// form, and from the reader's side on the profile.
export const RELATIONSHIPS: { value: RelationshipKind; label: string }[] = [
  { value: 'taught', label: 'I taught them' },
  { value: 'mentored', label: 'I mentored them' },
  { value: 'managed', label: 'I managed them' },
  { value: 'reported_to', label: 'They managed me' },
  { value: 'worked_with', label: 'We worked together' },
  { value: 'studied_with', label: 'We studied together' },
]

export function relationLine(kind: RelationshipKind, author: string, recipient: string) {
  const a = author.replace(/^(Dr|Prof)\.?\s+/i, '').split(' ')[0]
  const r = recipient.replace(/^(Dr|Prof)\.?\s+/i, '').split(' ')[0]
  return {
    taught: `${a} taught ${r}`,
    mentored: `${a} mentored ${r}`,
    managed: `${a} managed ${r} directly`,
    reported_to: `${r} managed ${a} directly`,
    worked_with: `${a} worked with ${r}`,
    studied_with: `${a} studied with ${r}`,
  }[kind]
}
