import Sidebar from '../components/Sidebar'
import Topbar from '../components/Topbar'
import MobileNav from '../components/MobileNav'
import { useAuth } from '../providers/AuthProvider'

export default function DashboardLayout({ title, campusLabel, status, children }) {
  const { claims, signOut } = useAuth()
  const isSuper = claims?.role === 'super'

  return (
    <div className="min-h-screen md:flex">
      <Sidebar isSuper={isSuper} />
      <div className="flex-1 px-6 pb-20 pt-10 md:px-10">
        <Topbar title={title} campusLabel={campusLabel} status={status} />
        <div className="mt-8 space-y-8">{children}</div>
      </div>
      <MobileNav isSuper={isSuper} onSignOut={signOut} />
    </div>
  )
}