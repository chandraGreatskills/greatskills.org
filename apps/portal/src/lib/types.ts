export type Experience = {
  id: string
  title: string
  company: string
  location?: string | null
  start_year?: number | null
  end_year?: number | null
  description?: string | null
}

export type Education = {
  id: string
  school: string
  degree?: string | null
  field?: string | null
  start_year?: number | null
  end_year?: number | null
}

export type Resume = {
  id: string
  filename: string
  size_bytes: number
  is_primary: boolean
}

// Directory card. user_id is what connection requests address.
export type ProfileCard = {
  id: string
  user_id: string
  handle: string
  full_name: string
  headline?: string | null
  avatar_url?: string | null
  member_type: string
  location?: string | null
  verified_roles: VerifiedRole[]
}

export type Profile = {
  id: string
  handle: string
  full_name: string
  headline?: string | null
  bio?: string | null
  location?: string | null
  industry?: string | null
  avatar_url?: string | null
  member_type: string
  skills: string[]
  interests: string[]
  open_to_work: boolean
  open_to_mentor: boolean
  experiences: Experience[]
  education: Education[]
  resumes: Resume[]
}

export type Me = {
  id: string
  email: string
  is_verified: boolean
  role: string
  profile: Profile | null
}

export type Opportunity = {
  id: string
  title: string
  kind: string
  location?: string | null
  remote: boolean
  description?: string | null
  skills_wanted: string[]
  posted_by: string
  status: string
}

export type RoleKind = 'student' | 'faculty' | 'recruiter'

// A checked role as other members see it: school or work email confirmed,
// organization approved.
export type VerifiedRole = {
  kind: RoleKind
  org_name: string
  org_slug: string
}

// The member's own view of a role they added.
export type Affiliation = {
  id: string
  kind: RoleKind
  email: string
  // email_sent | awaiting_org | verified | rejected | revoked
  status: string
  org_name: string
  org_status: string
  verified_at?: string | null
  created_at: string
}

export type OrgReview = {
  id: string
  name: string
  slug: string
  org_type: string
  status: string
  domains: string[]
  created_at: string
  waiting: number
  requested_by?: string | null
}

export type AdminAffiliation = {
  id: string
  kind: RoleKind
  email: string
  status: string
  member_name: string
  member_handle: string
  created_at: string
}
