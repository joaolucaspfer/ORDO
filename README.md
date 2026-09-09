# Ordo 🐶

> *Um dia bonito começa com uma manhã guardada.*

O **Ordo** é uma app de rotina diária (feita em português, sem servidor) que te ajuda a guardar o teu dia — oração, estudo, trabalho, treino — acompanhado por um cão chamado **Ordo** que vive da tua constância: cumprir tarefas dá-lhe energia, XP e moedas, e ele cresce contigo.

Tudo fica guardado **apenas no teu telemóvel** (SQLite local).

---

## Funcionalidades

- **Onboarding que monta a tua rotina** — perfil (nome, foto, aniversário, hora de acordar), treino, orações, estudo, trabalho e objetivo de peso. Cada resposta vira tarefas com hora, duração e dias da semana sugeridos.
- **Página inicial (Hoje)** — saudação (e «Feliz aniversário 🎂» no teu dia) + a *próxima tarefa* em destaque e as seguintes, com botão de concluir e temporizador de foco (▶) para tarefas com duração.
- **Rotina** — lista e edição de tarefas (categoria, dias da semana, hora, passos, meta de minutos) e **lembretes por tarefa**: se queres notificação e quanto tempo antes (5/15/30/60 min).
- **Treinos** — diário de treinos ao estilo Strava (tipo, duração, notas) **+ acompanhamento de peso** (objetivo, progresso, registo diário e histórico).
- **Perfil** — dados pessoais, foto, hora de acordar, **objetivo de peso** com barra de progresso, históricos de pesagem, números da tua rotina e lembretes de pesagem.
- **Criatura** — o cão (SVG animado) com nome (predefinido **Ordo**, alterável), energia, nível, moedas, cor do pelo e lojinha de acessórios.
- **Configurações (⚙️ no canto superior direito)** — tema **escuro/claro**, teste de notificações, atalhos, **repor onboarding** (voltar a entrar como primeira vez) e limpar histórico.

## Tecnologias

- [Expo SDK 57](https://docs.expo.dev/versions/v57.0.0/) · React Native 0.86 · React 19 · TypeScript (strict)
- `expo-sqlite` — base de dados local (sem backend)
- `react-native-svg` — desenho do cão (`DachshundView`)
- React Navigation (bottom tabs)
- `expo-notifications` — lembretes com aviso prévio

## Como correr

```bash
cd Ordo
npm install
npx expo start --tunnel   # ou: npx expo start
```

Escaneia o QR code com o Expo Go (ou com os telemóveis na mesma rede via `--tunnel`, se o telemóvel estiver noutra rede).

> **Nota (notificações):** no **Expo Go (Android)** as notificações não funcionam (limitação do Expo SDK). A app abre normalmente, mas os lembretes só funcionam numa **development build** (`eas build --profile development`).

## Estrutura

```
App.tsx                    # Raiz: provider do tema, navegação (5 abas + Config no topo), onboarding
src/
  screens/                 # Hoje, Rotina, Treinos, Perfil, Criatura, Configurações, Onboarding
  components/              # DachshundView (o cão)
  db/                      # migrations + acesso aos dados (tasks, profile, weight, workouts, creator, streak…)
  lib/                     # helpers (datas, categorias, onboarding/builder de rotina, notificações, reset)
  theme.tsx                # paletas escura/clara + ThemeProvider/useTheme
  navigation.ts            # parâmetros das rotas
```

## Dados

Base local `ordo.db`, migrada automaticamente na abertura (`src/db/migrations.ts`):

- `tasks`, `checkins`, `sessions`, `bonus`
- `profile` (nome, foto, aniversário, hora de acordar, objetivo de peso…)
- `creature`, `owned`, `wardrobe`
- `workouts`, `weigh_ins`
- `settings` (ex.: tema)

## Como testar o onboarding do zero

Configurações → **«Repor onboarding (primeira vez)»** — apaga perfil, tarefas e criatura e volta às perguntas iniciais (com a introdução).

## Roadmap / ideias

- Fazer build de desenvolvimento para ativar notificações no Android
- Arte final do cão (o desenho atual é uma ilustração SVG temporária)
- Backup/exportação dos dados