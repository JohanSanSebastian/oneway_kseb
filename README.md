# KSEB Quick Pay Sandbox

A sandbox environment that mirrors the KSEB Quick Pay UX with mock consumer data, captcha simulation, and a UPI payment flow.

## Prerequisites
- Node.js 18+

## Setup
1. Install root dev tools:
   - `npm install`
2. Install server dependencies:
   - `npm install --prefix server`
3. Install client dependencies:
   - `npm install --prefix client`

## Run
- Start both client and server:
  - `npm run dev`

The client runs on http://localhost:5173 and proxies API calls to http://localhost:3001.

## Mock Data
Consumer records live in `server/data/consumers.json`.
