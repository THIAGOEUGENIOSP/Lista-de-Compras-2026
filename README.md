# Lista-de-Compras-2026

## Estrutura
- `apps/web`: aplicação web principal.
- `apps/mobile`: wrapper nativo (Capacitor) para Android/iOS.

## Rodar web
```bash
cd apps/web
# abrir index.html com seu servidor/local setup atual
```

## Gerar app mobile (Capacitor)
```bash
cd apps/mobile
npm run install:cap
npm run cap:android
npm run cap:sync
npm run open:android
```

Para iOS (macOS):
```bash
npm run cap:ios
npm run cap:sync
npm run open:ios
```
