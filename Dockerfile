FROM alpine/openssl AS certificates-generator
COPY scripts/generate_dev_certificates.sh /scripts/generate_dev_certificates.sh
RUN . /scripts/generate_dev_certificates.sh

FROM espressif/idf:v5.3 AS firmware-builder
SHELL ["/bin/bash", "-c"]
COPY CMakeLists.txt sdkconfig /workspace/
COPY main /workspace/main
COPY --from=certificates-generator /main/server_cert.pem /workspace/main/server_cert.pem
WORKDIR /workspace
RUN source /opt/esp/idf/export.sh > /dev/null 2>&1 && idf.py set-target esp32 && idf.py build

FROM node:18-alpine AS node-builder
ENV GCP_BUILDPACKS=1
WORKDIR /app
COPY package*.json .
RUN npm i -D @sveltejs/adapter-node && npm ci
COPY --from=firmware-builder /workspace/static/firmware/merged-firmware-esp32.bin static/firmware/merged-firmware-esp32.bin
COPY --from=certificates-generator /certificates/ certificates/
COPY .env.example *.config.* LICENSE tsconfig.json ./
COPY src src/
COPY static static/ 
RUN cp .env.example .env && npm run build && npm prune --production

FROM node-builder AS node-preview
WORKDIR /app
RUN npm i && npm run db:push -- --force && npm run db:load-ingredients:install
ENTRYPOINT [ "npm", "run", "preview" ]
