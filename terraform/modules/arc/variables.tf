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
  default     = "10.32.20.51:30443/ci/arc-runner:latest"
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
  default     = 1
}

variable "runner_cpu_request" {
  description = "Runner CPU request"
  type        = string
  default     = "1"
}

variable "runner_memory_request" {
  description = "Runner memory request"
  type        = string
  default     = "3Gi"
}

variable "runner_ephemeral_storage_request" {
  description = "Runner ephemeral storage request"
  type        = string
  default     = "4Gi"
}

variable "runner_cpu_limit" {
  description = "Runner CPU limit"
  type        = string
  default     = "3"
}

variable "runner_memory_limit" {
  description = "Runner memory limit"
  type        = string
  default     = "8Gi"
}

variable "runner_ephemeral_storage_limit" {
  description = "Runner ephemeral storage limit"
  type        = string
  default     = "16Gi"
}
