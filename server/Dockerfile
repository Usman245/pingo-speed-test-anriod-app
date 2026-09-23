# No dependencies to install, so no build stage and nothing to npm ci.
FROM node:22-alpine

WORKDIR /app
COPY package.json ./
COPY src ./src

ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

# Node in a container gets a small default heap. This process barely allocates
# after boot (one 16 MB entropy pool), so the default is fine — what it does
# need is to not be PID 1 swallowing signals.
USER node
CMD ["node", "src/server.js"]
