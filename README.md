# kubit-apps

Applications for the Kubit lab cluster, deployed by Argo CD from this repository.
Every folder under `apps/` is one application in its own namespace. Push to `main` and
the cluster follows within about a minute; delete a folder and the app is removed.

```
bootstrap/        Terraform, run once per cluster: creates the root Application
argocd/           what the root Application syncs
  project.yaml        AppProject "apps": what apps may touch
  applicationset.yaml one Application per apps/<name>/, namespace <name>
  cluster-issuer.yaml self-signed ClusterIssuer for app TLS
apps/<name>/      one app: a kustomization (plain YAML and/or a Helm chart)
```

## How it works

```
terraform apply ──> Application "bootstrap" ──> argocd/
                                                  ├─ AppProject "apps"
                                                  └─ ApplicationSet "apps" ──> apps/podinfo      ──> namespace podinfo
                                                                              apps/it-tools     ──> namespace it-tools
                                                                              apps/uptime-kuma  ──> namespace uptime-kuma
```

- The **ApplicationSet** scans `apps/*` (git directory generator). Each folder becomes
  an Argo CD Application named after the folder, deployed into a namespace of the same
  name, with automated sync, prune and self-heal.
- The **AppProject** keeps apps in their lane. They may create their own namespace and
  anything inside it. They may not touch Kubernetes' or Kubit's platform namespaces, and
  may not create Argo CD objects.
- The **platform** (MetalLB, ingress-nginx, cert-manager, Longhorn, Argo CD itself) is
  not here: Kubit installs and upgrades it as add-ons.

## Prerequisites

A Kubit cluster with these add-ons enabled: MetalLB, ingress-nginx, cert-manager,
Argo CD and Longhorn (Longhorn only if an app uses a volume). The Argo CD add-on needs
these values (Kubit → cluster → Add-ons → ArgoCD → Configure):

```yaml
configs:
  cm:
    kustomize.buildOptions: --enable-helm
    timeout.reconciliation: 60s
```

`--enable-helm` lets an app folder pull in a Helm chart. `60s` makes Argo CD check Git
every minute; the default is three.

## Bootstrap (once per cluster)

```bash
cd bootstrap
terraform init
terraform apply
```

This uses the kubeconfig Kubit keeps at `~/.kubit/clusters/lab/kubeconfig`
(`-var kubeconfig=...` for another cluster). Terraform only creates the root
Application; everything after that comes from Git.

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

**A Helm chart** (see `apps/podinfo`):

```yaml
# apps/<name>/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
namespace: <name>
resources:
  - ns.yaml
helmCharts:
  - name: <chart>
    repo: <chart repository URL>
    version: <pinned version>
    releaseName: <name>
    namespace: <name>
    valuesFile: values.yaml
```

Check a folder before pushing: `kubectl kustomize --enable-helm apps/<name>`.

Guidelines:
- Pin versions (chart `version`, image tags). Never use `latest`.
- Images must run on arm64; the lab VMs on the Mac are arm64.
- Set resource requests; the lab nodes are small.
- Stateful data goes on a PVC with `storageClassName: longhorn`, and uses a
  `Recreate` strategy for single-replica apps.
- `ns.yaml` sets Pod Security `baseline`. Use `restricted` for apps that run as
  non-root.

## Change or remove an app

- **Change:** edit the files and push. Argo CD applies the difference, and reverts
  changes made by hand in the cluster (self-heal).
- **Remove:** delete the folder and push. The Application is removed, and with it
  everything it created, including the namespace and its volumes.

## Where to look

- **Argo CD:** the UI is on its own LoadBalancer IP. Find it on Kubit's ArgoCD card
  (*Open*). The user is `admin`; the password is in secret
  `argocd/argocd-initial-admin-secret`.
- **Kubit:** cluster → Workloads, Network, Storage, under the **Apps** scope.
- **The apps:**
  - `https://podinfo.192.168.105.200.nip.io`
  - `https://it-tools.192.168.105.200.nip.io`
  - `https://uptime-kuma.192.168.105.200.nip.io`

  The certificates are self-signed, so the browser warns once.
