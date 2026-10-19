FROM node:24-bookworm-slim
WORKDIR /app
COPY server.mjs ./server.mjs
ENV TGG_HUB_HOST=0.0.0.0 TGG_HUB_PORT=10040 TGG_HUB_ROOT=/data
USER node
EXPOSE 10040
CMD ["node", "server.mjs"]
