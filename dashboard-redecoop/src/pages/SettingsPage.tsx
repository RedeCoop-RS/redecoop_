import { PageHeader } from '@/components/ui/PageHeader'
import { PanelConfigForm } from '@/components/settings/PanelConfigForm'
import { CooperativeProfileForm } from '@/components/settings/CooperativeProfileForm'

export function SettingsPanelPage() {
  return (
    <div>
      <PageHeader
        title="Configurações do Painel"
        description="Parâmetros globais do sistema RedeCoop."
      />
      <div className="panel-card">
        <div className="panel-card__body">
          <PanelConfigForm />
        </div>
      </div>
    </div>
  )
}

export function SettingsCooperativePage() {
  return (
    <div>
      <PageHeader
        title="Configurações da Cooperativa"
        description="Perfil, contato e regiões de atendimento da sua cooperativa."
      />
      <CooperativeProfileForm />
    </div>
  )
}
