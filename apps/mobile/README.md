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

## Estrutura
- `apps/web`: versão web principal
- `apps/mobile`: shell nativo Capacitor apontando para `../web`

## Observações
- Sempre que atualizar o frontend em `apps/web`, rode `npm run cap:sync` em `apps/mobile`.
- Para separar branding/layout mobile no futuro, você pode manter uma build dedicada em `apps/web-mobile` e apontar `webDir` para ela.
