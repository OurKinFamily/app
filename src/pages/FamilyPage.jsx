import { Container } from '../components/Container'
import { PersonRidgeline } from '../components/PersonRidgeline'

export function FamilyPage() {
  return (
    <Container className="py-6 space-y-6">
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-medium text-white/80">Family</h1>
      </div>
      <PersonRidgeline endpoint="/api/people/year-density" />
    </Container>
  )
}
