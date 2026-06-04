variable "gitops_repo_url" {
  description = "GitOps repository URL"
  type        = string
  default     = "https://github.com/Julie08080808/youtube-music-bot-gitops.git"
}

variable "github_username" {
  description = "GitHub username for private GitOps repo"
  type        = string
  default     = "Julie08080808"
}

variable "gitops_repo_token" {
  description = "GitHub PAT for Argo CD to read private GitOps repo"
  type        = string
  sensitive   = true
}

variable "app_name" {
  description = "Application name"
  type        = string
  default     = "youtube-music-bot"
}
