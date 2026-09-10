# RUNBOOK - Ordo App

## Pré-requisitos

- **Node.js** (v18+ recomendado)
- **npm** ou **yarn**
- **Expo Go** no telemóvel (para testes rápidos)
- **Android Studio** ou **Xcode** (para builds nativos)

## 1. Instalar Dependências

```bash
cd Ordo
npm install
```

## 2. Correr em Desenvolvimento

### Opção A: Expo Go (mais rápido)
```bash
npx expo start
```
- Escaneia o QR code com o Expo Go
- Funciona no mesmo WiFi

### Opção B: Tunnel (para redes diferentes)
```bash
npx expo start --tunnel
```
- Útil quando o telemóvel está noutra rede

### Opção C: Plataforma específica
```bash
# Android
npx expo start --android

# iOS
npx expo start --ios

# Web
npx expo start --web
```

## 3. Testar Notificações

**Importante:** Notificações NÃO funcionam no Expo Go (limitação do SDK).

Para testar notificações, precisas de um **development build**:

```bash
# Instalar EAS CLI globalmente
npm install -g eas-cli

# Login na conta Expo
eas login

# Criar development build para Android
eas build --profile development --platform android

# Criar development build para iOS
eas build --profile development --platform ios
```

## 4. Compilar para Produção

### Opção A: EAS Build (recomendado)
```bash
# Build para Android (APK ou AAB)
eas build --platform android

# Build para iOS
eas build --platform ios
```

### Opção B: Build local (sem nuvem)
```bash
# Gerar pastas nativas
npx expo prebuild

# Android
cd android
./gradlew assembleRelease

# iOS
cd ios
xcodebuild -workspace Ordo.xcworkspace -scheme Ordo -configuration Release
```

## 5. Testes

### Testar Onboarding do Zero
1. Abrir a app
2. Ir para **Configurações**
3. Clicar em **"Repor onboarding (primeira vez)"**
4. Seguir o fluxo inicial

### Testar Funcionalidades
- **Hoje**: Criar tarefa, completar tarefa, usar temporizador
- **Rotina**: Adicionar/editar/remover tarefas
- **Treinos**: Registar treino, pesar-se
- **Perfil**: Alterar dados, ver progresso
- **Criatura**: Alimentar, verificar nível
- **Configurações**: Mudar tema, testar notificações

## 6. debugging

### Logs
```bash
# Ver logs do Metro bundler
npx expo start --logs

# Ver logs do Android
adb logcat | grep -i expo
```

### Ferramentas
- **Expo DevTools**: Abre automaticamente com `npx expo start`
- **React Native Debugger**: Ferramenta desktop para debugging
- **Chrome DevTools**: Press `j` no terminal do Expo para abrir

### Erros Comuns

#### "Unable to resolve module"
```bash
# Limpar cache
npx expo start -c
```

#### "Metro bundler error"
```bash
# Reiniciar Metro
npx expo start --reset
```

#### "Device not connected"
1. Verificar USB debugging ligado (Android)
2. Verificar WiFi (se wireless)
3. `adb devices` para ver dispositivos ligados

## 7. Build Profiles (EAS)

Criar `eas.json` na raiz do projeto:

```json
{
  "cli": {
    "version": ">= 3.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal"
    },
    "production": {}
  },
  "submit": {
    "production": {}
  }
}
```

## 8. Publicar

### Android (Google Play)
```bash
# Build para produção
eas build --platform android --profile production

# Submeter à Play Store
eas submit --platform android
```

### iOS (App Store)
```bash
# Build para produção
eas build --platform ios --profile production

# Submeter à App Store
eas submit --platform ios
```

## 9. Comandos Úteis

```bash
# Verificar estado do Expo
npx expo doctor

# Atualizar Expo
npx expo install --fix

# Limpar cache
npx expo start -c

# Gerar ícones
npx expo prebuild
```

## 10. Estrutura do Projeto

```
Ordo/
├── App.tsx              # Raiz da app
├── src/
│   ├── screens/         # Ecraos
│   ├── components/      # Componentes
│   ├── db/              # Base de dados
│   └── lib/             # Utilitários
├── assets/              # Imagens, ícones
├── app.json             # Configuração Expo
├── package.json         # Dependências
└── tsconfig.json        # Configuração TypeScript
```

## Notas Importantes

1. **SQLite**: Dados guardados apenas no dispositivo (sem backup automático)
2. **Notificações**: Apenas em development builds, não no Expo Go
3. **Temas**: App suporta tema escuro e claro
4. **Dados**: Tudo local, sem servidor externo