# Mobile App (Capacitor)

Esta pasta separa a versão mobile da web.

## Pré-requisitos
- Node.js 20+
- Android Studio (Android)
- Xcode (iOS, apenas macOS)

## 1) Instalar dependências do Capacitor
```bash
cd apps/mobile
npm run install:cap
```

## 2) Adicionar plataformas
```bash
npm run cap:android
# opcional iOS
npm run cap:ios
```

## 3) Sincronizar código web (apps/web) para o app
```bash
npm run cap:sync
```

## 4) Abrir projeto nativo
```bash
npm run open:android
# ou
npm run open:ios
```

Se o comando `open:android` falhar no Windows:
```powershell
$env:CAPACITOR_ANDROID_STUDIO_PATH="C:\\Program Files\\Android\\Android Studio\\bin\\studio64.exe"
npm run open:android
```
Se preferir, abra manualmente:
- Android Studio -> Open -> `apps/mobile/android`

## Ícone e Splash
1. Adicione os arquivos base:
- `apps/mobile/assets/icon.png` (1024x1024)
- `apps/mobile/assets/splash.png` (2732x2732)

2. Gere assets:
```bash
npx @capacitor/assets generate --android
```

3. Sincronize novamente:
```bash
npm run cap:sync
```

## Estrutura
- `apps/web`: versão web principal
- `apps/mobile`: shell nativo Capacitor apontando para `../web`

## Observações
- Sempre que atualizar o frontend em `apps/web`, rode `npm run cap:sync` em `apps/mobile`.
- Para separar branding/layout mobile no futuro, você pode manter uma build dedicada em `apps/web-mobile` e apontar `webDir` para ela.
