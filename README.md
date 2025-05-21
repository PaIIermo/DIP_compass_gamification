# 🌲 DIP_Compass_gamification Project Setup & Usage

Welcome! This project uses [RedwoodJS](https://redwoodjs.com/) and assumes the person reading this already has a working Redwood development environment (Node.js, Yarn via Corepack, etc.).

## 🚀 Quick Start

If you already work with RedwoodJS, follow these steps to get up and running with this repo.

### 1. Clone the Repo

```bash
git clone https://gitlab.com/pallermo/DIP_Compass_gamification.git
cd DIP_Compass_gamification
```

### 2. Apply migrations

```bash
yarn rw prisma migrate dev
```

### 3. initialize the seed decay table

```bash
yarn rw exec seedDecayLookup
```

### 4. initialize the point system calculation
Initialization is scheduled immediately following.
Choose one of the following options for the updates:

Updates run in intervals in the wait argument (in seconds)
```bash
yarn rw exec PointSystemInitialization -- --wait=3000 --mode=immediate
```

Updates in intervals using mock values instead of real one from the database
```bash
corepack yarn rw exec PointSystemInitialization -- --wait=300 --mode=immediate --mock --mock-count=1000
```

Updates run in weekly (Monday +UTC)
```bash
yarn rw exec PointSystemInitialization -- --mode=weekly
```

### 5. start the Redwood server in developer mode

```bash
yarn rw dev
```

The page functionality will not be fully available until the server is initialized fully

### 6. start the background jobs by running the worker functionality

```bash
yarn rw jobs work
```