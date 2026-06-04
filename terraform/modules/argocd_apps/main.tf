resource "kubernetes_secret" "gitops_repo" {
  metadata {
    name      = "repo-youtube-music-bot-gitops"
    namespace = "argocd"

    labels = {
      "argocd.argoproj.io/secret-type" = "repository"
    }
  }

  type = "Opaque"

  data = {
    type     = "git"
    url      = var.gitops_repo_url
    username = var.github_username
    password = var.gitops_repo_token
  }
}

resource "kubernetes_manifest" "youtube_music_bot_staging" {
  manifest = {
    apiVersion = "argoproj.io/v1alpha1"
    kind       = "Application"

    metadata = {
      name      = "${var.app_name}-staging"
      namespace = "argocd"
    }

    spec = {
      project = "default"

      source = {
        repoURL        = var.gitops_repo_url
        targetRevision = "main"
        path           = "apps/youtube-music-bot/overlays/staging"
      }

      destination = {
        server    = "https://kubernetes.default.svc"
        namespace = "staging-youtube-music-bot"
      }

      syncPolicy = {
        automated = {
          prune    = true
          selfHeal = true
        }

        syncOptions = [
          "CreateNamespace=true"
        ]
      }
    }
  }

  depends_on = [
    kubernetes_secret.gitops_repo
  ]
}

resource "kubernetes_manifest" "youtube_music_bot_production" {
  manifest = {
    apiVersion = "argoproj.io/v1alpha1"
    kind       = "Application"

    metadata = {
      name      = "${var.app_name}-production"
      namespace = "argocd"
    }

    spec = {
      project = "default"

      source = {
        repoURL        = var.gitops_repo_url
        targetRevision = "main"
        path           = "apps/youtube-music-bot/overlays/production"
      }

      destination = {
        server    = "https://kubernetes.default.svc"
        namespace = "production-youtube-music-bot"
      }

      syncPolicy = {
        automated = {
          prune    = true
          selfHeal = true
        }

        syncOptions = [
          "CreateNamespace=true"
        ]
      }
    }
  }

  depends_on = [
    kubernetes_secret.gitops_repo
  ]
}
