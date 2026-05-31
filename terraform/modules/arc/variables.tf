variable "github_app_id" {
  description = "GitHub App ID"
  sensitive   = true
}

variable "github_app_installation_id" {
  description = "GitHub App Installation ID"
  sensitive   = true
}

variable "github_app_private_key" {
  description = "GitHub App Private Key (.pem content)"
  sensitive   = true
}

variable "github_owner" {
  description = "GitHub owner"
}

variable "github_repo" {
  description = "GitHub repository name"
}
