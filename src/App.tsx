import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AppProvider } from './context/AppContext'
import { Layout } from './components/Layout'
import { Timeline } from './screens/Timeline'
import { Recording } from './screens/Recording'
import { LogDetail } from './screens/LogDetail'
import { StrainLibrary } from './screens/StrainLibrary'
import { FacilitySetup } from './screens/FacilitySetup'
import { RunManagement } from './screens/RunManagement'

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <Layout>
          <Routes>
            <Route path="/" element={<Timeline />} />
            <Route path="/record" element={<Recording />} />
            <Route path="/logs/:id" element={<LogDetail />} />
            <Route path="/strains" element={<StrainLibrary />} />
            <Route path="/facility" element={<FacilitySetup />} />
            <Route path="/runs" element={<RunManagement />} />
          </Routes>
        </Layout>
      </AppProvider>
    </BrowserRouter>
  )
}
