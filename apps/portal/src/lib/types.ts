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
  // Demo member made by the simulation engine.
  is_demo?: boolean
  // Where the signed-in member stands with this person.
  connection: ConnectionState
  connection_id?: string | null
  mutual_connections: number
  mutual_sample: MemberMini[]
  shared_orgs: string[]
  shared_skills: string[]
  shared_interests: string[]
  shared_city?: string | null
}

export type ConnectionState = 'none' | 'sent' | 'received' | 'connected'

// Someone else's profile, already trimmed by the API to what this viewer may
// see. Fields they can't see are missing or empty.
export type ProfileView = {
  viewer: 'public' | 'member' | 'connection'
  id: string
  user_id?: string | null
  handle: string
  full_name: string
  headline?: string | null
  avatar_url?: string | null
  cover?: string | null
  pronouns?: string | null
  member_type: string
  location?: string | null
  industry?: string | null
  bio?: string | null
  bio_truncated: boolean
  skills: string[]
  skills_truncated: boolean
  interests: string[]
  open_to_mentor: boolean
  open_to_work?: boolean
  verified_roles: VerifiedRole[]
  is_demo: boolean
  experiences: Experience[]
  education: Education[]
  connection: ConnectionState
  connection_id?: string | null
  degree?: '1st' | '2nd' | '3rd+' | null
  connection_count?: number | null
  mutual_connections: number
  mutual_sample: MemberMini[]
  recommendations_received: Recommendation[]
  recommendations_given: Recommendation[]
}

// One person in the member's own network, with the link between them.
export type NetworkItem = {
  id: string
  message?: string | null
  created_at: string
  member: ProfileCard
}

export type NetworkSummary = {
  connections: number
  received: number
  sent: number
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
  cover?: string | null
  pronouns?: string | null
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
  is_synthetic?: boolean
  is_plus: boolean
  plus_requested: boolean
  can_upload_video: boolean
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
  pay?: string | null
  eligibility?: string | null
  closes_at?: string | null
  org_id?: string | null
  posted_by: string
  // open | closed, as set by the poster. is_open also accounts for the date.
  status: string
  created_at: string
  is_demo?: boolean
  is_open: boolean
  org?: { name: string; slug: string; logo_url?: string | null; verified: boolean } | null
  poster?: { full_name: string; handle: string; avatar_url?: string | null } | null
  applicants: number
  mine: boolean
  saved: boolean
  // submitted | reviewed | shortlisted | rejected | accepted
  applied_status?: string | null
}

export type MyApplication = {
  id: string
  status: string
  cover_note?: string | null
  created_at: string
  updated_at: string
  opportunity: Opportunity
}

export type Applicant = {
  id: string
  status: string
  cover_note?: string | null
  created_at: string
  has_resume: boolean
  resume_filename?: string | null
  member: ProfileCard
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
  org_slug: string
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

// Who sees demo data from the simulation engine.
export type DemoMode = 'off' | 'admins' | 'everyone'

export type DemoSetting = {
  mode: DemoMode
  members: number
  organizations: number
  opportunities: number
}

// A member shown as a small photo and name, e.g. in a mutual connections list.
export type MemberMini = {
  user_id: string
  handle: string
  full_name: string
  avatar_url?: string | null
  headline?: string | null
}

export type RelationshipKind = 'taught' | 'managed' | 'worked_with' | 'mentored' | 'studied_with' | 'reported_to'

// A recommendation with the other person: the author on received ones, the
// recipient on given ones.
export type Recommendation = {
  id: string
  relationship_kind: RelationshipKind
  body: string
  status: 'pending' | 'shown' | 'hidden'
  created_at: string
  updated_at: string
  person: MemberMini
}

export type HomeRole = 'student' | 'seeker' | 'mentor' | 'employer' | 'campus' | 'admin'

export type HomeOpening = {
  id: string
  title: string
  kind: string
  org_name?: string | null
  location?: string | null
  remote: boolean
  closes_at?: string | null
  created_at: string
  is_demo: boolean
  matched_skills: string[]
  applicants: number
  new_applicants: number
}

export type HomeApplication = {
  id: string
  opportunity_id: string
  title: string
  org_name?: string | null
  status: string
  created_at: string
  person?: MemberMini | null
}

// The home page for one role, from GET /home.
export type Home = {
  role: HomeRole
  roles: HomeRole[]
  org_name?: string | null
  stats: { label: string; value: number }[]
  openings: HomeOpening[]
  applications: HomeApplication[]
  people: { person: MemberMini; note?: string | null }[]
  people_title?: string | null
}

export type OrgCard = {
  id: string
  name: string
  slug: string
  org_type: string
  tagline?: string | null
  location?: string | null
  logo_url?: string | null
  followers: number
  following: boolean
  is_demo: boolean
}

export type OrgPage = OrgCard & {
  description?: string | null
  website?: string | null
  can_edit: boolean
  staff_count: number
  student_count: number
  openings: { id: string; title: string; kind: string; location?: string | null; remote: boolean; closes_at?: string | null; created_at: string }[]
  people: { person: MemberMini; kind: 'student' | 'faculty' | 'recruiter' }[]
}

export type Post = {
  id: string
  body: string
  kind: 'post' | 'article'
  title?: string | null
  images: string[]
  video_url?: string | null
  video?: PostVideo | null
  visibility: 'members' | 'connections'
  created_at: string
  author: MemberMini
  org?: { name: string; slug: string; logo_url?: string | null; org_type: string } | null
  likes: number
  liked: boolean
  comments: number
  can_delete: boolean
  is_demo: boolean
}

export type PostComment = {
  id: string
  body: string
  created_at: string
  author: MemberMini
  can_delete: boolean
}

export type ChatMessage = {
  id: string
  sender_id: string
  body: string
  created_at: string
  unsent: boolean
  mine: boolean
  seen: boolean
  can_unsend: boolean
}

export type Conversation = {
  id: string
  other: MemberMini
  status: 'active' | 'request' | 'declined'
  incoming_request: boolean
  last_message?: string | null
  last_message_mine: boolean
  last_message_at?: string | null
  unread: number
  starred: boolean
  archived: boolean
  opportunity_title?: string | null
  is_demo: boolean
}

export type Thread = Conversation & { messages: ChatMessage[]; can_send: boolean; reason?: string | null }

export type AppNotification = {
  id: string
  kind: string
  text: string
  link: string
  created_at: string
  read: boolean
  actor?: MemberMini | null
}

export type Promotion = {
  id: string
  sponsor: string
  title: string
  body: string
  image_url?: string | null
  cta: string
  placement: 'rail' | 'feed'
  why: string
}

export type SiteUpdate = { id: string; title: string; body?: string | null; link?: string | null; published: boolean; created_at: string }

export type PostVideo = { id: string; status: 'processing' | 'ready' | 'failed'; url?: string | null; poster?: string | null; error?: string | null }
