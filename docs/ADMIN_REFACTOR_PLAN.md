# Plano de Refatoracao - Admin.tsx (9825 linhas)

## Objetivo

Quebrar o `client/src/pages/Admin.tsx` (9825 linhas, monolitico) em arquivos pequenos e componentizados, facilitando manutencao, leitura e debug.

---

## Estrutura Atual

```
client/src/pages/Admin.tsx  ←  9825 linhas, TUDO junto
```

### Componentes que ja estao separados (manter como estao):
- `client/src/components/admin/GallerySection.tsx`
- `client/src/components/admin/ServicePostsSection.tsx`
- `client/src/pages/UsersSection.tsx`

---

## Estrutura Proposta

```
client/src/
├── pages/
│   └── Admin.tsx                          ←  ~150 linhas (shell + routing)
│
├── components/admin/
│   ├── AdminSidebar.tsx                   ←  Sidebar com menu draggable
│   ├── AdminHeader.tsx                    ←  Header com breadcrumb e toggle
│   │
│   ├── DashboardSection.tsx               ←  Dashboard KPIs e overview
│   ├── HeroSettingsSection.tsx            ←  Hero, trust badges, consulting steps
│   ├── CompanySettingsSection.tsx          ←  Info empresa, horarios, logos
│   ├── SEOSection.tsx                     ←  SEO metadata e schema
│   ├── LeadsSection.tsx                   ←  Leads + Form Editor
│   ├── FaqsSection.tsx                    ←  FAQ CRUD
│   ├── ChatSection.tsx                    ←  Chat settings e conversas
│   ├── TwilioSection.tsx                  ←  Twilio SMS config
│   ├── IntegrationsSection.tsx            ←  GHL, OpenAI, Analytics
│   ├── BlogSection.tsx                    ←  Blog CRUD
│   ├── GallerySection.tsx                 ←  (ja existe)
│   ├── ServicePostsSection.tsx            ←  (ja existe)
│   │
│   └── shared/
│       ├── types.ts                       ←  Interfaces compartilhadas
│       ├── constants.ts                   ←  Defaults (business hours, chat objectives)
│       └── utils.ts                       ←  uploadFileToServer, ensureArray
```

---

## Detalhamento por Arquivo

### 1. `Admin.tsx` (~150 linhas) - Shell Principal

**O que fica:**
- `SidebarProvider` wrapper
- Roteamento por `activeSection` state (localStorage)
- Import de todos os section components
- Renderizacao condicional `{activeSection === 'leads' && <LeadsSection />}`

**O que sai:**
- Toda logica de negocio
- Todos os componentes internos
- Todas as interfaces/types

```tsx
// Exemplo simplificado do novo Admin.tsx
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { DashboardSection } from '@/components/admin/DashboardSection';
import { LeadsSection } from '@/components/admin/LeadsSection';
// ... etc

export default function Admin() {
  const [activeSection, setActiveSection] = useState<AdminSection>(
    (localStorage.getItem('admin-section') as AdminSection) || 'dashboard'
  );

  return (
    <SidebarProvider>
      <AdminSidebar activeSection={activeSection} onSectionChange={setActiveSection} />
      <main>
        <AdminHeader />
        {activeSection === 'dashboard' && <DashboardSection />}
        {activeSection === 'leads' && <LeadsSection />}
        {activeSection === 'hero' && <HeroSettingsSection />}
        {/* ... */}
      </main>
    </SidebarProvider>
  );
}
```

---

### 2. `AdminSidebar.tsx` (~200 linhas)

**Extrair de:** linhas 180-350 do Admin.tsx atual

**Conteudo:**
- Menu items array (12 itens)
- Drag-and-drop reorder (dnd-kit)
- `SidebarSortableItem` sub-componente
- Persistencia da ordem em `company_settings.sectionsOrder`
- Logo, footer com theme toggle e logout

**Props:**
```tsx
interface AdminSidebarProps {
  activeSection: AdminSection;
  onSectionChange: (section: AdminSection) => void;
}
```

---

### 3. `AdminHeader.tsx` (~50 linhas)

**Conteudo:**
- `SidebarTrigger` (hamburger mobile)
- Breadcrumb ou titulo da secao ativa
- Indicador de status (saving, etc)

---

### 4. `DashboardSection.tsx` (~350 linhas)

**Extrair de:** linhas 419-761

**Conteudo:**
- KPIs cards (total leads, hot/warm/cold, blog posts, FAQs)
- Lead funnel chart
- Recent leads list
- Brand profile completeness
- Integrations status
- Query: `/api/company-settings`, `/api/form-leads`, `/api/blog`, `/api/faqs`

---

### 5. `HeroSettingsSection.tsx` (~600 linhas)

**Extrair de:** linhas 762-2343

**Conteudo:**
- Hero image/title/subtitle/CTA editor
- Trust badges editor (drag-and-drop icons)
- Categories section toggle
- Reviews section config
- Blog section config
- About section config
- Areas Served section config
- Consulting Steps editor (drag-and-drop steps)
- Auto-save com debounce de 800ms
- `SavedIndicator` sub-componente

**Nota:** Este e o maior componente. Se necessario, pode ser subdividido em:
- `HeroEditor.tsx` (hero image/title)
- `TrustBadgesEditor.tsx` (badges)
- `ConsultingStepsEditor.tsx` (steps)
- `HomepageSectionsEditor.tsx` (categories, reviews, blog, about, areas served)

---

### 6. `CompanySettingsSection.tsx` (~360 linhas)

**Extrair de:** linhas 2412-2771

**Conteudo:**
- Company name, email, phone, address
- Business hours editor (7 dias)
- Logo upload (main + dark)
- Social links (Facebook, Instagram, etc)
- Homepage content settings
- Interfaces: `DayHours`, `BusinessHours`, `CompanySettingsData`

---

### 7. `SEOSection.tsx` (~360 linhas)

**Extrair de:** linhas 2772-3127

**Conteudo:**
- SEO title, description, keywords
- Open Graph tags
- Twitter card config
- Local business schema (JSON-LD)
- Interface: `SEOSettingsData`

---

### 8. `CategoriesSection.tsx` + `ServicesSection.tsx`

**Status:** removidos do projeto.

**Decisao aplicada:**
- Componentes e tipos legados de services/category/subcategory foram eliminados do admin.

---

### 9. `LeadsSection.tsx` (~750 linhas)

**Extrair de:** linhas 4914-5666

**Conteudo:**
- Lista de leads com filtros (classificacao, status, busca)
- Dashboard stats (total, hot, warm, cold, disqualified)
- Modal de detalhes do lead
- Acoes: atualizar status, notas, deletar
- `FormEditorContent` sub-componente (editor de formulario)
- `SortableQuestionItem` sub-componente
- `ThresholdsForm` sub-componente
- `QuestionForm` sub-componente

**Nota:** Se necessario, `FormEditorContent` pode ser extraido para `FormEditor.tsx` separado.

---

### 10. `FaqsSection.tsx` (~300 linhas)

**Extrair de:** linhas 6162-6463

**Conteudo:**
- FAQ CRUD com drag-and-drop reorder
- `SortableFaqItem` sub-componente
- `FaqForm` dialog

---

### 11. `ChatSection.tsx` (~1100 linhas)

**Extrair de:** linhas 6464-7610

**Conteudo:**
- Chat widget settings (agent name, avatar, prompts)
- Intake objectives editor
- URL exclusion rules
- Performance thresholds
- Conversation history viewer
- `ObjectiveRow` sub-componente
- Interfaces: `IntakeObjective`, `ChatSettingsData`, `ConversationSummary`, `ConversationMessage`, `UrlRule`

---

### 12. `TwilioSection.tsx` (~370 linhas)

**Extrair de:** linhas 7658-8021

**Conteudo:**
- Twilio Account SID, Auth Token, Phone Number
- SMS alert configuration
- Test SMS functionality
- Interface: `TwilioSettingsForm`

---

### 13. `IntegrationsSection.tsx` (~670 linhas)

**Extrair de:** linhas 8032-8697

**Conteudo:**
- GoHighLevel settings (API key, location)
- OpenAI settings (API key, model)
- Analytics settings (GTM, GA4, Facebook Pixel)
- Interfaces: `GHLSettings`, `OpenAISettings`, `AnalyticsSettings`

---

### 14. `BlogSection.tsx` (~1100 linhas)

**Extrair de:** linhas 8699-9821

**Conteudo:**
- Blog post list com filtros e sorting
- Blog post form (titulo, slug, conteudo, tags, imagem)
- Tag management
- Image upload
- Markdown preview

---

### 15. `shared/types.ts` (~80 linhas)

**Conteudo:**
```tsx
export type AdminSection = 'dashboard' | 'leads' | 'hero' | 'company' | 'gallery' | 'servicePosts' | 'seo' | 'faqs' | 'users' | 'chat' | 'integrations' | 'blog';

export interface DayHours { ... }
export interface BusinessHours { ... }
export interface CompanySettingsData { ... }
export interface SEOSettingsData { ... }
export interface IntakeObjective { ... }
export interface ChatSettingsData { ... }
export interface ConversationSummary { ... }
export interface ConversationMessage { ... }
export interface GHLSettings { ... }
export interface OpenAISettings { ... }
export interface AnalyticsSettings { ... }
export interface UrlRule { ... }
export interface TwilioSettingsForm { ... }
```

---

### 16. `shared/constants.ts` (~50 linhas)

**Conteudo:**
```tsx
export const DEFAULT_BUSINESS_HOURS: BusinessHours = { ... };
export const DEFAULT_CHAT_OBJECTIVES: IntakeObjective[] = [ ... ];
export const SIDEBAR_MENU_ITEMS = [ ... ];
```

---

### 17. `shared/utils.ts` (~50 linhas)

**Conteudo:**
```tsx
export function ensureArray<T>(value: T[] | string | null | undefined): T[] { ... }
export async function uploadFileToServer(file: File): Promise<string> { ... }
```

---

## Ordem de Execucao Recomendada

A refatoracao deve ser feita **de baixo para cima** (componentes menores primeiro) para minimizar risco:

| Fase | Tarefa | Risco |
|------|--------|-------|
| 1 | Criar `shared/types.ts`, `shared/constants.ts`, `shared/utils.ts` | Baixo |
| 2 | Extrair `FaqsSection.tsx` (menor, mais simples) | Baixo |
| 3 | Extrair `TwilioSection.tsx` | Baixo |
| 4 | Extrair `SEOSection.tsx` | Baixo |
| 5 | Extrair `CompanySettingsSection.tsx` | Baixo |
| 6 | Extrair `IntegrationsSection.tsx` | Baixo |
| 7 | Extrair `BlogSection.tsx` | Medio |
| 8 | Extrair `ChatSection.tsx` | Medio |
| 9 | Extrair `DashboardSection.tsx` | Medio |
| 10 | Extrair `LeadsSection.tsx` | Medio |
| 11 | Extrair `HeroSettingsSection.tsx` | Alto (auto-save, many sub-components) |
| 12 | Extrair `AdminSidebar.tsx` + `AdminHeader.tsx` | Medio |
| 13 | Confirmar remocao de CategoriesSection/ServicesSection | Concluido |
| 14 | Limpar `Admin.tsx` final | Baixo |

---

## Regras de Execucao

1. **Uma secao por vez** - extrair, testar, confirmar, proximo
2. **Rodar `npm run check` apos cada extracao** - garantir zero erros TypeScript
3. **Manter imports identicos** - cada secao deve importar seus proprios hooks, UI components, etc
4. **Nao mudar logica** - apenas mover codigo, sem refatorar comportamento
5. **Testar no browser apos cada extracao** - garantir que tudo funciona visualmente
6. **Nao renomear props/state** - manter nomes identicos para facilitar diff

---

## Resultado Esperado

| Metrica | Antes | Depois |
|---------|-------|--------|
| Linhas no Admin.tsx | 9825 | ~150 |
| Arquivos admin | 1 (+3 externos) | ~18 |
| Media linhas/arquivo | 9825 | ~450 |
| Maior arquivo | 9825 | ~1100 (BlogSection ou ChatSection) |

---

## Notas Finais

- Cada arquivo novo sera **self-contained** (imports proprios, sem dependencia circular)
- O `Admin.tsx` final sera apenas um **router/shell** que renderiza a secao ativa
- Hooks como `useToast`, `useQuery`, `useMutation` serao importados diretamente em cada secao
- O `queryClient` e `apiRequest` continuam sendo importados de `@/lib/queryClient`
- Nenhuma mudanca no backend e necessaria
