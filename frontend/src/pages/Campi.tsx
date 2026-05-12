import { PageLayout } from '@/components/layout/PageLayout'
import { CampusDemographicsForm } from '@/components/CampusDemographicsForm'

export default function Campi() {
  return (
    <PageLayout
      title="Gestão de campi"
      description="Cadastro de população e área construída para normalização do Eco Score."
    >
      <CampusDemographicsForm />
    </PageLayout>
  )
}
