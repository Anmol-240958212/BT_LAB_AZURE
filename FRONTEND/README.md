# vaultOne Angular frontend

Use the repository-level [README](../README.md) and [startup guide](../startup.md) to run the complete platform. The frontend depends on the Auth, FD, Product & Pricing, MySQL, and Kafka services.

For frontend-only development:

```bash
npm install
npm start
```

Open `http://localhost:4200`. `proxy.conf.json` forwards Auth routes to `8080`, FD/report routes to `8081`, and Product routes to `8082`.

Build the production bundle with:

```bash
npm run build
```

This project uses Angular 22. Use a supported Node.js release, such as Node `22.22.3+`, `24.15.0+`, or `26+`.
