terraform {
  required_version = ">= 1.6.0"

  required_providers {
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.27"
    }

    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.13"
    }

    harbor = {
      source  = "goharbor/harbor"
      version = "~> 3.10"
    }

    github = {
      source  = "integrations/github"
      version = "~> 6.0"
    }
  }
}
