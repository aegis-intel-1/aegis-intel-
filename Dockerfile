ARG NODE_IMAGE=node:24-bookworm-slim
FROM ${NODE_IMAGE} AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM ${NODE_IMAGE}
WORKDIR /app
ENV NODE_ENV=production AEGIS_DEMO=false HOST=0.0.0.0 PORT=4310 DATA_DIR=/data PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
COPY package*.json ./
RUN npm ci --omit=dev && npx playwright install --with-deps chromium && npm cache clean --force && rm -rf /var/lib/apt/lists/*
COPY --from=build /app/dist ./dist
COPY server ./server
COPY scripts ./scripts
RUN mkdir -p /data && chown -R node:node /app /data /ms-playwright
USER node
EXPOSE 4310
HEALTHCHECK --interval=30s --timeout=5s CMD node -e "fetch('http://127.0.0.1:4310/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node","server/index.js"]
