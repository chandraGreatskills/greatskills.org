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
  file_url: string
  size_bytes: number
  is_primary: boolean
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
