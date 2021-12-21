# 0x exchange contract fee wrapper

# Install dependencies

Tested on Node v16.11.0.

```bash
$ npm install
```

# Deploying on Klaytn network
Create an `.env` file (see `.env.sample`) and set the following environmental variables:
```
KAS_ACCESS_KEY=your_kas_access_key
KAS_SECRET_KEY=your_kas_secret_key
ADDRESS=deployed_address
PRIVATE_KEY=deployed_private_key
```

## 1. Compile contracts
```bash
$ truffle compile
```

## 2. Deploy to Baobab
```bash
$ npm run deploy:baobab
```

## 3. Deploy to Cypress
```bash
$ npm run deploy:cypress
```
