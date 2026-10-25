import type { Profile } from './types'

// What makes a profile complete, in the order worth doing them. Each step
// says what to do next rather than just docking a percentage.
const STEPS: { done: (p: Profile) => boolean; todo: string }[] = [
  { done: (p) => !!p.full_name?.trim(), todo: 'Add your name' },
  { done: (p) => !!p.headline?.trim(), todo: 'Add a headline so people know what you do' },
  { done: (p) => !!p.avatar_url, todo: 'Add a photo, profiles with one get more replies' },
  { done: (p) => p.skills.length >= 3, todo: 'Add at least 3 skills to show up in searches' },
  { done: (p) => p.education.length > 0 || p.experiences.length > 0, todo: 'Add your education or experience' },
  { done: (p) => !!p.location?.trim(), todo: 'Add your location' },
  { done: (p) => !!p.bio?.trim(), todo: 'Write a short About' },
  { done: (p) => p.resumes.length > 0, todo: 'Upload a resume so applying is one step' },
]

export function completion(p?: Profile | null) {
  if (!p) return { percent: 0, next: [] as string[] }
  const missing = STEPS.filter((s) => !s.done(p)).map((s) => s.todo)
  return {
    percent: Math.round(((STEPS.length - missing.length) / STEPS.length) * 100),
    next: missing,
  }
}
