variable "harbor_url" {
  description = "Harbor registry URL"
  type        = string
  default     = "https://10.32.20.51:30443"
}

variable "harbor_admin_password" {
  description = "Harbor admin password"
  type        = string
  sensitive   = true
}

variable "github_token" {
  description = "GitHub Personal Access Token"
  type        = string
  sensitive   = true
}

variable "github_owner" {
  description = "GitHub owner/organization"
  type        = string
  default     = "Julie08080808"
}

variable "github_app_id" {
  description = "GitHub App ID for ARC"
  type        = string
}

variable "github_app_installation_id" {
  description = "GitHub App installation ID for ARC"
  type        = string
}

variable "github_app_private_key" {
  description = "GitHub App private key for ARC"
  type        = string
  sensitive   = true
}

variable "kubeconfig_path" {
  description = "Path to kubeconfig file"
  type        = string
  default     = "~/.kube/config"
}

variable "harbor_runner_username" {
  description = "Harbor Robot Account username for ARC Runner"
  type        = string
  default     = "robot$arc-runner"
}

variable "harbor_runner_password" {
  description = "Harbor Robot Account password for ARC Runner"
  type        = string
  sensitive   = true
}

