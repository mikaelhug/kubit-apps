FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY lib lib
COPY api api
COPY worker worker
COPY web web
USER node
CMD ["node", "api/server.js"]
