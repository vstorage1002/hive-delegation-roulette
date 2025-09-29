# Hive Delegation Roulette

This is a Node.js project that selects random winners from @bayanihive delegators using a roulette system.

## Features
- Fetches delegators from Hive blockchain
- Splits them into tiers:
  - Tier 1: <100 HP
  - Tier 2: ≥100 HP
- Runs a weighted roulette to pick a random winner

## Usage
```bash
node index.js
```

## Installation
```bash
npm install
```

## Project Structure
```
hive-delegation-roulette/
│── package.json
│── index.js
│── README.md
│── src/
│    ├── hive.js
│    ├── tiers.js
│    └── utils.js
```
