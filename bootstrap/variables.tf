variable "kubeconfig" {
  description = "Admin kubeconfig of the cluster; Kubit keeps it at ~/.kubit/clusters/<name>/kubeconfig."
  type        = string
  default     = "~/.kubit/clusters/lab/kubeconfig"
}

variable "repo_url" {
  description = "This repository, as Argo CD reads it."
  type        = string
  default     = "https://github.com/mikaelhug/kubit-apps.git"
}

variable "revision" {
  description = "Branch, tag or commit Argo CD follows."
  type        = string
  default     = "HEAD"
}
