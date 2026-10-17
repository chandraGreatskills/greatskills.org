import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { useLenis } from './lib/hooks'
import Layout from './components/Layout'
import Home from './pages/Home'
import WhatWeDo from './pages/WhatWeDo'
import Resources from './pages/Resources'
import Programs from './pages/Programs'
import Connect from './pages/Connect'
import AboutUs from './pages/AboutUs'
import Career from './pages/Career'
import JobOpenings from './pages/JobOpenings'
import Blogs from './pages/Blogs'
import DataAiScientist from './pages/DataAiScientist'
import Help from './pages/Help'
import LegalPage from './pages/LegalPage'
import { legalDocs } from './data/legal'

function AppShell() {
  useLenis()
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="/what-we-do" element={<WhatWeDo />} />
        <Route path="/resources" element={<Resources />} />
        <Route path="/programs" element={<Programs />} />
        <Route path="/connect" element={<Connect />} />
        {/* The live site publishes the Connect page at /contact-us/. */}
        <Route path="/contact-us" element={<Navigate to="/connect" replace />} />
        <Route path="/about-us" element={<AboutUs />} />
        <Route path="/career" element={<Career />} />
        <Route path="/job-openings" element={<JobOpenings />} />
        <Route path="/blogs" element={<Blogs />} />
        <Route path="/data-ai-scientist" element={<DataAiScientist />} />
        {/* /obb-program/ is live but the program is not ready; keep the inbound
            link working by sending it to the programs index. */}
        <Route path="/obb-program" element={<Navigate to="/programs" replace />} />
        <Route path="/help" element={<Help />} />
        {legalDocs.map((doc) => (
          <Route key={doc.slug} path={`/${doc.slug}`} element={<LegalPage />} />
        ))}
        <Route path="*" element={<Home />} />
      </Route>
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  )
}
