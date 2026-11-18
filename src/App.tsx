import { CreatorPage } from '@/components/CreatorPage'
import { CreateProfilePage } from '@/components/CreateProfilePage'
import { Dashboard } from '@/components/Dashboard'
import { Footer, Header } from '@/components/Header'
import { HistoryPage } from '@/components/HistoryPage'
import { Landing } from '@/components/Landing'
import { EmptyState } from '@/components/ui'
import { Link, matchRoute, usePathname } from '@/lib/router'

export default function App() {
  const route = matchRoute(usePathname())

  return (
    <div className="flex min-h-dvh flex-col">
      <Header />
      <main className="flex-1">
        {route.name === 'home' && <Landing />}
        {route.name === 'dashboard' && <Dashboard />}
        {route.name === 'createProfile' && <CreateProfilePage />}
        {route.name === 'creator' && <CreatorPage key={route.handle} handle={route.handle} />}
        {route.name === 'history' && <HistoryPage />}
        {route.name === 'notFound' && (
          <div className="mx-auto max-w-xl px-4 py-16">
            <EmptyState
              title="Page not found"
              body="That link does not lead anywhere."
              action={
                <Link to="/" className="btn-primary mt-2">
                  Back home
                </Link>
              }
            />
          </div>
        )}
      </main>
      <Footer />
    </div>
  )
}
