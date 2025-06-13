import { ENV_VARS } from "./env_vars";
import { writeFileSync } from "fs";

export function generate(env: string) {
  let turnupTemplate = `#!/bin/bash
# GCP auth
gcloud auth application-default login
gcloud config set project ${ENV_VARS.projectId}

# Create service account
gcloud iam service-accounts create ${ENV_VARS.builderAccount}

# Grant permissions to the service account
gcloud projects add-iam-policy-binding ${ENV_VARS.projectId} --member="serviceAccount:${ENV_VARS.builderAccount}@${ENV_VARS.projectId}.iam.gserviceaccount.com" --role='roles/cloudbuild.builds.builder' --condition=None
gcloud projects add-iam-policy-binding ${ENV_VARS.projectId} --member="serviceAccount:${ENV_VARS.builderAccount}@${ENV_VARS.projectId}.iam.gserviceaccount.com" --role='roles/container.developer' --condition=None
`;
  writeFileSync(`${env}/turnup.sh`, turnupTemplate);

  let cloudbuildTemplate = `steps:
- name: 'node:20.12.1'
  entrypoint: 'npm'
  args: ['ci']
- name: node:20.12.1
  entrypoint: npx
  args: ['bundage', 'bfn', '${env}/main', 'main_bin', '-t', 'bin']
- name: 'gcr.io/cloud-builders/docker'
  args: ['build', '-t', 'gcr.io/${ENV_VARS.projectId}/${ENV_VARS.releaseServiceName}:latest', '-f', '${env}/Dockerfile', '.']
- name: "gcr.io/cloud-builders/docker"
  args: ['push', 'gcr.io/${ENV_VARS.projectId}/${ENV_VARS.releaseServiceName}:latest']
- name: 'gcr.io/cloud-builders/kubectl'
  args: ['apply', '-f', '${env}/service.yaml']
  env:
    - 'CLOUDSDK_CONTAINER_CLUSTER=${ENV_VARS.clusterName}'
    - 'CLOUDSDK_COMPUTE_REGION=${ENV_VARS.clusterRegion}'
options:
  logging: CLOUD_LOGGING_ONLY
`;
  writeFileSync(`${env}/cloudbuild.yaml`, cloudbuildTemplate);

  let dockerTemplate = `FROM node:20.12.1

WORKDIR /app
COPY package.json .
COPY package-lock.json .
COPY bin/ .
RUN npm ci --omit=dev

CMD ["node", "main_bin"]
`;
  writeFileSync(`${env}/Dockerfile`, dockerTemplate);

  let serviceTemplate = `apiVersion: batch/v1
kind: CronJob
metadata:
  name: ${ENV_VARS.releaseServiceName}
spec:
  schedule: "0 0 * * *"
  concurrencyPolicy: Forbid
  timezone: "${ENV_VARS.timezoneIdentifier}"
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: ${ENV_VARS.serviceAccount}
          containers:
          - name: ${ENV_VARS.releaseServiceName}
            image: gcr.io/phading-dev/${ENV_VARS.releaseServiceName}:latest
            imagePullPolicy: IfNotPresent
            resources:
              requests:
                cpu: "${ENV_VARS.cpu}"
                memory: "${ENV_VARS.memory}"
              limits:
                cpu: "${ENV_VARS.cpu}"
                memory: "${ENV_VARS.memory}"
          restartPolicy: OnFailure
`;
  writeFileSync(`${env}/service.yaml`, serviceTemplate);

  let mainTemplate = `import "./env";
import "../main";
`;
  writeFileSync(`${env}/main.ts`, mainTemplate);
}

import "./dev/env";
generate("dev");
