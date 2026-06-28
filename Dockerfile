FROM mcr.microsoft.com/playwright:v1.49.1-noble

WORKDIR /app

COPY package.json package-lock.json tsconfig.json ./
RUN npm ci

COPY db ./db
COPY src ./src
RUN npm run build
RUN npm prune --omit=dev

ENV NODE_ENV=production

CMD ["node", "dist/index.js"]
