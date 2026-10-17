export const nav = [
  { label: 'About Us', href: '/about-us' },
  { label: 'What we do', href: '/what-we-do' },
  { label: 'Resources', href: '/resources' },
  { label: 'Programs', href: '/programs' },
  { label: 'Connect', href: '/connect' },
]

// Portal (achievers.greatskills.org). Overridable via VITE_PORTAL_URL for prod.
export const PORTAL_URL =
  import.meta.env.VITE_PORTAL_URL || 'http://localhost:5174'

export const heroBullets = [
  {
    title: 'Personalized Learning and Skilling',
    text: 'Tailored to unlock your full potential.',
  },
  {
    title: 'Community of Innovators',
    text: 'Collaborate with learners, leaders, and experts.',
  },
  {
    title: 'Empowering Success',
    text: 'Expert consulting for individuals and businesses.',
  },
]

export const partnerLogos = [
  { name: 'T-Mobile', src: '/assets/t-mobile-1.svg' },
  { name: 'George Mason University', src: '/assets/George-Mason.svg' },
  { name: 'Siasat', src: '/assets/siasat-1.svg' },
  { name: 'StackNexus', src: '/assets/stacknexus-1.svg' },
  { name: 'Adroitts', src: '/assets/adroitts.svg' },
  { name: 'ANGRAU', src: '/assets/ANGRAU-1.svg' },
  { name: 'AIMSCS', src: '/assets/AIMSCS-1.svg' },
  { name: 'Partner', src: '/assets/image-27.svg' },
  { name: 'Partner', src: '/assets/Untitled-1.svg' },
  { name: 'Partner', src: '/assets/Untitled-2.svg' },
]

export const valueProps = [
  {
    title: 'Education & Learning',
    text: 'Traditional education often lacks personalization. Great Skills offers tailored course plans to match your unique learning pace.',
  },
  {
    title: 'Skills & Opportunities',
    text: 'Skills don’t always translate to real-world opportunities. Great Skills empowers you with self-assessment tools to bridge that gap.',
  },
  {
    title: 'Personal Growth & Success',
    text: 'Growth often stalls without guidance. Great Skills provides mentorship and insights to keep you on the path to success.',
  },
]

export const stats = [
  { value: 3000, suffix: '+', label: 'Students Trained' },
  { value: 25, suffix: '+', label: 'Logos of our life-long students' },
  { value: 20, suffix: '+', label: 'Dedicated Staff' },
  { value: 100, suffix: '+', label: 'Years of collective experience' },
]

export const offerings = [
  {
    title: 'Learning',
    text: 'Personalized training across a variety of fields, including AI, Data Science, and more.',
    img: '/assets/Learning.png',
  },
  {
    title: 'Skills',
    text: 'Building both professional and life skills that inspire growth and drive long-term success.',
    img: '/assets/Skills.png',
  },
  {
    title: 'Talent Hub',
    text: 'Connecting individuals with global job opportunities through our exclusive talent network.',
    img: '/assets/Talent-Hub.png',
  },
  {
    title: 'Consulting',
    text: 'Offering tailored business solutions to foster innovation and operational efficiency.',
    img: '/assets/Consulting.png',
  },
]

export const dataiFeatures = [
  'Tailored for Industry-Specific Applications',
  'Hands-on Projects in Your Field of Study',
  'One Hour Daily for Future Success',
  'Learn with Real-World Data from Your Domain',
  'Assignments Aligned with Industry Needs',
  'Concepts Curated and led by Industry Experts',
]

export const actionBlocks = [
  {
    title: 'Webinar Registration',
    text: 'Join industry-specific webinars with expert insights.',
    cta: 'Register Now',
    img: '/assets/Webinar-Registration.png',
  },
  {
    title: 'Data Science Mastery',
    text: 'Explore custom learning paths and hands-on projects.',
    cta: 'Explore More',
    img: '/assets/Data-Science-Mastery.png',
  },
  {
    title: 'Download Brochure',
    text: 'Learn more about DatAI with our detailed brochure.',
    cta: 'Download Now',
    img: '/assets/Download-Brochure.png',
  },
]

export const talentHubFeatures = [
  'Fast-Track IT Professional Transformation',
  'Time Optimization for Success',
  'Open Access Platform for all',
  'Referral-based job network growth',
  'Customized career guide with you',
  'AI-driven skill-job matching',
]

export const testimonials = [
  {
    name: 'Soni Sehgal',
    role: 'Business Owner',
    img: '/assets/Soni-Sehgal.png',
    quote:
      'Thanks to Great Skills, I transitioned to a data science career and landed my dream job.',
  },
  {
    name: 'Ashutosh Patel',
    role: 'Project Manager',
    img: '/assets/Ashutosh-Patel.png',
    quote:
      'The personalized mentorship and consulting helped us scale our business faster than we imagined.',
  },
  {
    name: 'Komal Srivastav',
    role: 'Operations Manager',
    img: '/assets/Komal-Srivastav-1.png',
    quote:
      'Thanks to Great Skills, I transitioned to a data science career and landed my dream job.',
  },
  {
    name: 'Harish Gupta',
    role: 'Student',
    img: '/assets/Harish-Gupta.png',
    quote:
      'Thanks to Great Skills, I transitioned to a data science career and landed my dream job.',
  },
]

export const footer = {
  blurb:
    'Great Skills provides comprehensive, real-time training focused on personal and professional growth. With a wide range of offerings that include AI, data science, professional skills, life skills, and academic tutoring for school and college subjects, Great Skills delivers innovative and personalized education learning.',
  columns: [
    {
      title: 'About',
      links: ['Programs', 'Resources', 'Careers', 'Connect Us'],
    },
  ],
  phones: ['+91 996 325 6789', '+1 737 777 0288'],
  email: 'contact@greatskills.org',
  locations: [
    { country: 'USA', address: '2615 New Concorde Ct., Herndon, VA 20171' },
    { country: 'INDIA', address: '303 Sy No 64, GEM Towers, Kondapur, Hyderabad 500084' },
    { country: 'CANADA', address: '8930 158 Street, Surrey, BC V4N 3K6' },
  ],
  legal: [
    { label: 'Privacy Policy', to: '/privacy-policy' },
    { label: 'Cookie Notice', to: '/cookie-notice' },
    { label: 'Security', to: '/security' },
    { label: 'Terms of Use', to: '/terms-conditions' },
  ],
}

/* ----------------------------------------------------------------- insights */

/** Post-to-image pairing mirrors the live Insights grid, artwork swap included. */
export const blogPosts = [
  {
    slug: 'datai-scientist',
    title: 'DatAI Scientist',
    tag: 'Data Science',
    date: 'October 11, 2024',
    img: '/assets/Attitude-Unlocking-Success-min.jpg',
    excerpt:
      'In today’s rapidly evolving landscape, two unstoppable forces: data and Artificial Intelligence (AI).',
  },
  {
    slug: 'attitude-unlocking-success',
    title: 'Attitude: Unlocking Success',
    tag: 'Data Science',
    date: 'October 11, 2024',
    img: '/assets/DatAI-Scientist-AI.jpg',
    excerpt:
      'In today’s rapidly evolving landscape, two unstoppable forces: data and Artificial Intelligence (AI).',
  },
  {
    slug: 'the-unstoppable-duo',
    title: 'The Unstoppable Duo',
    tag: 'Data Science',
    date: 'October 11, 2024',
    img: '/assets/WhatsApp-Image-2024-10-11-at-21.58.46_e48ae15e.jpg',
    excerpt:
      'In today’s rapidly evolving landscape, two unstoppable forces: data and Artificial Intelligence (AI).',
  },
]

/* ---------------------------------------------------------------- careers */

export const careerStats = [
  { value: '100+', label: 'Projects Launched' },
  { value: '100+ years', label: 'Collective Experience' },
  { value: 'Thousands', label: 'Successful Learners' },
]

export const careerPerks = [
  'Group Health Coverage',
  'Group Retirement Plan',
  'Generous Paid Time-Off',
  'Ideal Work-life Balance',
  'Continuous Development',
  'Rewards & Recognition',
]

// Portraits follow the live pairing on greatskills.org/career/.
export const careerJourneys = [
  {
    name: 'Chandrababu Vasasali',
    photo: '/assets/Soni-Sehgal.png',
    quote:
      'Our collaborative culture has allowed us to constantly innovate and grow in our roles. It’s been a truly rewarding experience, both personally and professionally.',
  },
  {
    name: 'Hemanth Reddy',
    photo: '/assets/Ashutosh-Patel.png',
    quote:
      'The mentorship and leadership training I received at GreatSkills enabled me to lead projects confidently and contribute to my team’s success.',
  },
  {
    name: 'Alpana Yadav',
    photo: '/assets/Komal-Srivastav-1.png',
    quote:
      'At Great Skills, I have been able to push my limits and excel in ways I never thought possible. The support and resources are second to none.',
  },
  {
    name: 'Swaroop Dunna',
    photo: '/assets/Harish-Gupta.png',
    quote:
      'We provide an environment where creativity knows no limits, and we explore solutions and paths others might hesitate to pursue.',
  },
]

export type JobType = 'Fulltime' | 'Contract' | 'Intern'

export const jobTypes: JobType[] = ['Fulltime', 'Contract', 'Intern']
export const jobLocations = ['South Africa', 'Canada', 'India']

export const jobOpenings: { title: string; type: JobType; location: string }[] = [
  { title: 'React Developer', type: 'Intern', location: 'Canada' },
  { title: 'React Developer', type: 'Contract', location: 'India' },
  { title: 'Frontend Developer', type: 'Fulltime', location: 'South Africa' },
]

/* --------------------------------------------------------------- about us */

export const aboutStats = [
  { value: '20+', label: 'Projects Launched' },
  { value: '100+', label: 'Satisfied Customers' },
  { value: '97+', label: 'Clients Retention' },
]

export const philosophy = [
  {
    title: 'Empowerment through Knowledge',
    text: 'We equip learners with cutting-edge skills in technology, data science, and life leadership to thrive in modern challenges.',
  },
  {
    title: 'Lifelong Learning',
    text: 'We foster continuous learning and growth through curiosity, creativity, and critical thinking at every stage of life.',
  },
  {
    title: 'Global Impact',
    text: 'We connect individuals with opportunities to shape a better world, ensuring meaningful contributions wherever they go.',
  },
  {
    title: 'Innovation for Tomorrow',
    text: 'We embrace emerging technologies and strategies to prepare for future challenges and opportunities.',
  },
]

export const leaders = [
  { name: 'Ashok Venkineni', focus: 'Yoga, Meditation & Breath', photo: '/assets/Ashok-Venkineni.svg' },
  { name: 'Srinivasa Rao', focus: 'Data Science, AI and ML', photo: '/assets/Srinivasa-Rao.svg' },
  { name: 'Swaroop Dunna', focus: 'Philosophy, Life, Technology', photo: '/assets/Swaroop-Dunna.svg' },
  { name: 'Chandrababu Vasasali', focus: 'Life Skills, Technology, Values', photo: '/assets/Chandrababu-Vasasali.svg' },
  { name: 'Dr. Sarma Venkataraman', focus: 'Blockchain, AI, ML, Cybersecurity', photo: '/assets/Dr.-Sarma-Venkataraman.svg' },
  { name: 'Vamsi Gottipati', focus: 'Full-Stack Development', photo: '/assets/Vamsi-Gottipati.svg' },
  { name: 'Anna Knight', focus: 'Product and Project Management', photo: '/assets/Anna-Knight.svg' },
  { name: 'Sundar Varadaraj', focus: 'Innovator, and Mentor', photo: '/assets/Sundar-Varadaraj.svg' },
]

export const exploreMore = [
  {
    title: 'Collaborate with Us',
    text: 'Whether you’re looking to join our team or partner with us, be part of a community that thrives on innovation, collaboration, and excellence. Together, let’s shape the future of learning.',
    cta: 'Opportunities',
    to: '/career',
  },
  {
    title: 'Discover who we are',
    text: 'Uncover our mission, values, and vision. Learn about the passionate people driving the future of education and equipping learners to thrive in a rapidly changing world.',
    cta: 'About Us',
    to: '/about-us',
  },
  {
    title: 'Stay informed',
    text: 'Dive into insights, success stories, and the latest trends in learning and professional growth. Stay informed on how we’re transforming the future, one skill at a time.',
    cta: 'Insights',
    to: '/resources',
  },
]
