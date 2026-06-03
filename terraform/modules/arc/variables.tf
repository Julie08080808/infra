variable "github_app_id" {
  description = "GitHub App ID"
  type        = string
}

variable "github_app_installation_id" {
  description = "GitHub App installation ID"
  type        = string
}

variable "github_app_private_key" {
  description = "GitHub App private key"
  type        = string
  sensitive   = true
}

variable "github_owner" {
  description = "GitHub owner or organization"
  type        = string
}

variable "github_repo" {
  description = "GitHub repository name"
  type        = string
}

variable "arc_chart_version" {
  description = "ARC Helm chart version"
  type        = string
  default     = "0.14.2"
}

variable "runner_image" {
  description = "Custom ARC runner image"
  type        = string
  default     = "harbor.jlsa.local:30443/ci/arc-runner:v0.4.0"
}

variable "image_pull_secret_name" {
  description = "Image pull secret name for Harbor"
  type        = string
  default     = "harbor-registry-secret"
}

variable "runtime_class_name" {
  description = "RuntimeClass for runner pods"
  type        = string
  default     = "kata"
}

variable "node_selector" {
  description = "Node selector for runner pods"
  type        = map(string)
  default = {
    kata = "true"
  }
}

variable "min_runners" {
  description = "Minimum number of runners"
  type        = number
  default     = 0
}

variable "max_runners" {
  description = "Maximum number of runners"
  type        = number
  default     = 2
}

variable "runner_cpu_request" {
  type    = string
  default = "2"
}

variable "runner_memory_request" {
  type    = string
  default = "4Gi"
}

variable "runner_ephemeral_storage_request" {
  type    = string
  default = "8Gi"
}

variable "runner_cpu_limit" {
  type    = string
  default = "3"
}

variable "runner_memory_limit" {
  type    = string
  default = "10Gi"
}

variable "runner_ephemeral_storage_limit" {
  type    = string
  default = "24Gi"
}
