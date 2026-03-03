import type { ReactNode } from 'react'
import { EnvSetupGate } from '@/components/system/EnvSetupGate'

export default function PartnersDashboardLayout({ children }: { children: ReactNode }) {
  return <EnvSetupGate>{children}</EnvSetupGate>
}
