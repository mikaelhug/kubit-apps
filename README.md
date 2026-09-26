# kubit-apps

Applications for the Kubit lab cluster, deployed by Flux from this repository.
Every app is a folder under `apps/` plus one file under `flux/` that tells Flux to
deploy it. Push to `main` and the cluster follows within Flux's fetch interval.

```
apps/<name>/      one app: a kustomization (plain YAML and/or a HelmRelease)
flux/<name>.yaml  the Flux Kustomization that deploys apps/<name>/
apps/cluster-issuer/  self-signed ClusterIssuer for app TLS
.sops.yaml        who can decrypt secrets: you and each cluster
.githooks/        pre-commit guard against plaintext Secrets
```

## How it works

```
Kubit ──> GitRepository "flux-system" (this repo, main)
          Kustomization "flux-system" (path ./flux) ──> Kustomization "podinfo"  ──> apps/podinfo  ──> namespace podinfo
                                                        Kustomization "it-tools" ──> apps/it-tools ──> namespace it-tools
                                                        …
```

- **Kubit** creates both Flux objects in `flux-system` from the cluster's
  `platform.flux.repository`. Nothing in this repository bootstraps anything.
- Kubit's Kustomization applies `flux/`: one Flux Kustomization per app. Each app
  builds, applies and fails on its own, so a broken app never holds back the others.
  Kubit's Flux card lists every app with its revision or its error, and raises a
  `flux.not-ready` alert when one keeps failing.
- The **platform** (MetalLB, ingress-nginx, cert-manager, Longhorn, Flux itself) is
  not here: Kubit installs and upgrades it as add-ons.

## Prerequisites

A Kubit cluster: a new one comes with everything these apps use (MetalLB,
ingress-nginx, cert-manager, Flux, Longhorn, Builds). Give Kubit the repository when
you create the cluster (lab host dialog or wizard), or later under Add-ons → Flux →
Configure:

- Repository `https://github.com/mikaelhug/kubit-apps.git`
- Path `./flux`

Once the cluster exists, add its SOPS recipient to `.sops.yaml` (see Secrets).

Once per clone, turn on the pre-commit guard:

```bash
git config core.hooksPath .githooks
```

## Add an app

Create `apps/<name>/` and `flux/<name>.yaml` (copy another file in `flux/` and change
the name and path). The name is the app name and its namespace, so use lowercase
letters, digits and dashes. Then commit and push. If the push is rejected because
someone else pushed first, `git pull --rebase` and push again.

**Plain YAML** (see `apps/ben-clock`):

```
apps/<name>/
  kustomization.yaml   namespace: <name>, resources: ns.yaml + the files below
  ns.yaml              copy from another app and rename
  deployment.yaml
  service.yaml
  ingress.yaml         host <name>.192.168.105.200.nip.io, cert-manager.io/cluster-issuer: selfsigned
  pvc.yaml             optional, storageClassName: longhorn
```

**A Helm chart**: a HelmRepository and a HelmRelease, values inline.

```
apps/<name>/
  kustomization.yaml   namespace: <name>, resources: ns.yaml, repository.yaml, release.yaml
  repository.yaml      HelmRepository <name>: the chart repository URL
  release.yaml         HelmRelease <name>: chart, pinned version, values,
                       install/upgrade remediation retries: 3
```

**Your own code** (see `apps/ana-phoenix`): the cluster builds the image (Kubit's
Builds add-on); there is no CI to set up.

```
apps/<name>/
  src/                 the code and its Dockerfile
  build/job.yaml       a Job in namespace kubit-builds that runs buildctl: Git context
                       https://github.com/mikaelhug/kubit-apps.git#main:apps/<name>/src,
                       pushes registry.kubit-builds.svc:5000/<name>:<version>
  build/kustomization.yaml
  deployment.yaml      image registry.kubit/<name>:<version>
flux/<name>-build.yaml Kustomization for build/: wait: true, force: true, timeout: 30m
flux/<name>.yaml       dependsOn: <name>-build
```

Bump `<version>` in `build/job.yaml` and `deployment.yaml` together when the code
changes: the new version re-creates the build Job, and the app rolls once the image
is in the registry. Build state and logs: Kubit → Add-ons → Builds.

Check a folder before pushing: `kubectl kustomize apps/<name>`. Kustomize's
`helmCharts` does not work under Flux; use a HelmRelease.

Guidelines:
- Pin versions (chart `version`, image tags). Never use `latest`.
- Images must run on arm64; the lab VMs on the Mac are arm64.
- Set resource requests; the lab nodes are small.
- Stateful data goes on a PVC with `storageClassName: longhorn`, and uses a
  `Recreate` strategy for single-replica apps.
- `ns.yaml` sets Pod Security `baseline`. Use `restricted` for apps that run as
  non-root.

## Secrets

Secrets live in Git, encrypted with [SOPS](https://getsops.io) and
[age](https://age-encryption.org). Only the values are encrypted; names and structure
stay readable. Flux decrypts them inside the cluster with the cluster's own key,
which Kubit created and installed as `flux-system/sops-age`, so nothing depends on
Kubit or this laptop at runtime.

`.sops.yaml` lists who can decrypt: your personal key (to edit) and one key per
cluster. Every `apps/**/*.sops.yaml` is encrypted for all of them.

**Once per machine:**

```bash
brew install sops age
age-keygen -o ~/Library/Application\ Support/sops/age/keys.txt
```

Keep a copy of that key in your password manager. Put its public key (`age1…`, printed
by `age-keygen`) in `.sops.yaml`.

**Add a secret to an app** (see `apps/eve-bot`):

1. Create `apps/<name>/secret.sops.yaml`, a normal Secret with `stringData`, and
   encrypt it before staging: `sops encrypt -i apps/<name>/secret.sops.yaml`.
   Or create and edit in one go: `sops edit apps/<name>/secret.sops.yaml`.
2. List it under `resources:` in the kustomization, like any other file.
3. Use it from the pod: `envFrom: secretRef` or a volume.

Change a value later with `sops edit <file>`, then commit and push.

**Add a cluster:** copy its recipient from Kubit (cluster → Add-ons → Flux → SOPS
recipient, or `kubit sops recipient <cluster>`), add it under `age:` in `.sops.yaml`,
then re-encrypt every file for the new list:

```bash
find apps -name '*.sops.yaml' -exec sops updatekeys -y {} \;
```

**Public repository:** the ciphertext is safe to publish, but history is permanent.
If a key ever leaks, change the secret values, not only the key. The pre-commit hook
refuses plaintext Secrets and unencrypted `*.sops.yaml` files.

## Change or remove an app

- **Change:** edit the files and push. Flux applies the difference, and reverts
  changes made by hand in the cluster within ten minutes.
- **Remove:** delete the folder and its `flux/<name>.yaml`, and push. Flux prunes
  everything it created, including the namespace and its volumes.

## Where to look

- **Kubit:** cluster → Add-ons → Flux for the sync state (revision, errors), and
  Workloads, Network, Storage under the **Apps** scope for the apps themselves. Flux
  has no UI of its own.
- **The apps:** `https://<name>.192.168.105.200.nip.io`. The certificates are
  self-signed, so the browser warns once.
