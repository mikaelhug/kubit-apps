# kubit-apps

Applications for the Kubit lab cluster, deployed by Flux from this repository.
Every folder under `apps/` is one application in its own namespace. Push to `main` and
the cluster follows within Flux's fetch interval; delete a folder and the app is removed.

```
apps/<name>/      one app: a kustomization (plain YAML and/or a HelmRelease)
apps/cluster-issuer/  self-signed ClusterIssuer for app TLS
.sops.yaml        who can decrypt secrets: you and each cluster
.githooks/        pre-commit guard against plaintext Secrets
```

## How it works

```
Kubit ──> GitRepository "flux-system" (this repo, main)
          Kustomization "flux-system" (path ./apps, prune, SOPS) ──> apps/podinfo      ──> namespace podinfo
                                                                     apps/it-tools     ──> namespace it-tools
                                                                     apps/uptime-kuma  ──> namespace uptime-kuma
```

- **Kubit** creates both Flux objects in `flux-system` from the cluster's
  `platform.flux.repository`. Nothing in this repository bootstraps anything.
- `apps/` has no `kustomization.yaml`, so Flux generates one that includes every
  folder's kustomization. A folder you add is applied on the next fetch; a folder you
  delete is pruned with everything it created.
- One Kustomization builds all folders: a folder that does not build blocks the others
  until it is fixed. Kubit's Flux card shows the error.
- The **platform** (MetalLB, ingress-nginx, cert-manager, Longhorn, Flux itself) is
  not here: Kubit installs and upgrades it as add-ons.

## Prerequisites

A Kubit cluster with these add-ons enabled: MetalLB, ingress-nginx, cert-manager,
Flux and Longhorn (Longhorn only if an app uses a volume). In Kubit → cluster →
Add-ons → Flux → Configure:

- Repository `https://github.com/mikaelhug/kubit-apps.git`
- Path `./apps`
- Interval `1m` (the default, `5m`, is fine outside the lab)

Then *Plan changes* and apply. The Flux card shows the fetched revision and whether it
applied.

Once per clone, turn on the pre-commit guard:

```bash
git config core.hooksPath .githooks
```

## Add an app

Create `apps/<name>/`. The folder name is the app name and its namespace, so use
lowercase letters, digits and dashes. Then commit and push.

**Plain YAML** (see `apps/it-tools`):

```
apps/<name>/
  kustomization.yaml   namespace: <name>, resources: ns.yaml + the files below
  ns.yaml              copy from another app and rename
  deployment.yaml
  service.yaml
  ingress.yaml         host <name>.192.168.105.200.nip.io, cert-manager.io/cluster-issuer: selfsigned
  pvc.yaml             optional, storageClassName: longhorn
```

**A Helm chart** (see `apps/podinfo`): a HelmRepository and a HelmRelease, values inline.

```
apps/<name>/
  kustomization.yaml   namespace: <name>, resources: ns.yaml, repository.yaml, release.yaml
  repository.yaml      HelmRepository <name>: the chart repository URL
  release.yaml         HelmRelease <name>: chart, pinned version, values
```

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

**Add a secret to an app** (see `apps/linkding`):

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
- **Remove:** delete the folder and push. Flux prunes everything it created,
  including the namespace and its volumes.

## Where to look

- **Kubit:** cluster → Add-ons → Flux for the sync state (revision, errors), and
  Workloads, Network, Storage under the **Apps** scope for the apps themselves. Flux
  has no UI of its own.
- **The apps:**
  - `https://podinfo.192.168.105.200.nip.io`
  - `https://it-tools.192.168.105.200.nip.io`
  - `https://whoami.192.168.105.200.nip.io`
  - `https://uptime-kuma.192.168.105.200.nip.io`
  - `https://linkding.192.168.105.200.nip.io`: user `admin`, password from
    `sops decrypt apps/linkding/secret.sops.yaml`

  The certificates are self-signed, so the browser warns once.
