# Ordo 🐶

> *«A ordem dará à tua vida uma harmonia perfeita»* — S. Josemaría Escrivá

**Ordo** é uma app de rotina diária feita em português, para quem quer pôr ordem na vida: oração, estudo, trabalho, treino e tudo o resto, cada coisa ao seu tempo.

O nome vem do latim *ordo* — "ordem" — e nasce da frase de S. Josemaría Escrivá que abre este documento. A tua rotina ganha um companheiro fiel: um cão chamado **Ordo** que vive da tua constância. Cumpre as tuas tarefas e ele cresce, ganha energia, pontos e novidade (até ao nome!) — um pequeno incentivo para não deixares o dia escapar.

## Porquê o Ordo

- **Uma rotina guiada** — montas os teus dias uma vez e o Ordo lembra-te do que vem a seguir, na altura certa.
- **Notificações lembram-te** — cada tarefa pode avisar-te antes da hora, para não falhar nem um compromisso.
- **Cada coisa ao seu tempo** — oração e treino, estudo e trabalho, descanso e vida: a ordem certa dá harmonia ao dia.
- **Os teus dados são teus** — tudo fica guardado *apenas no teu telemóvel*, sem servidores, sem contas, sem publicidade.
- **Um cão que cresce contigo** — o Ordo acompanha cada conquista e anima-te quando falhas, dando à rotina um rosto (e um rabinho).

## Funcionalidades

- Onboarding que monta a tua rotina numa conversa rápida: acordar, treino, oração, estudo, trabalho e objetivos.
- Página **Hoje** com a tua próxima tarefa em destaque e a sequência do dia.
- Gestão completa da **Rotina**: tarefas, dias da semana, horas, durações e lembretes por tarefa.
- Diário de **Treinos** e acompanhamento de **peso**.
- Perfil pessoal com dados, objetivos e estatísticas da tua constância.
- A tua **Criatura**: nome, energia, nível, moedas e lojinha de acessórios.
- Modo **escuro** e modo **claro**, ferramentas de foco e respiração.
- 100% em **português**.

## Tecnologias

Construído com **Expo SDK 57** e **React Native**, em TypeScript — um ecossistema que dá apoio à app de rotina dentro do telemóvel, de Android a iOS.

- [Expo SDK 57](https://docs.expo.dev/versions/v57.0.0/) · React Native 0.86 · React 19 · TypeScript strict
- `expo-sqlite` — base de dados local (sem backend)
- `react-native-svg` — o desenho do cão
- React Navigation — navegação em abas
- `expo-notifications` — lembretes das tarefas

## Como correr

```bash
cd Ordo
npm install
npx expo start --tunnel   # ou: npx expo start
```

Escaneia o QR code com o **Expo Go** (ou usa `npx expo start` se o telemóvel estiver na mesma rede).

> **Nota:** no Expo Go (Android) as notificações não funcionam — limitação do SDK. Numa build de desenvolvimento (`eas build --profile development`) os lembretes ficam ativos.

## Privacidade

O Ordo não tem servidor, não pede conta e não recolhe dados. A base de dados (`ordo.db`) vive só no teu dispositivo e pode ser apagada em qualquer altura a partir das definições da app.

---

Feito com entusiasmo para dar ordem aos dias. 🐶