import { AgencyProfileSettingsForm } from '@/components/partners/AgencyProfileSettingsForm'
import { AgencyCommissionSettingsForm } from '@/components/partners/AgencyCommissionSettingsForm'

export const dynamic = 'force-dynamic'

export default function AgencySettingsPage() {
  return (
    <div className="min-h-[calc(100vh-8rem)] bg-editorial-layer px-4 py-6 md:px-6 md:py-8">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <AgencyProfileSettingsForm />
        <AgencyCommissionSettingsForm />
      </div>
    </div>
  )
}
