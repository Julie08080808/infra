resource "kubernetes_secret" "github_app_secret" {
  metadata {
    name      = "github-app-secret"
    namespace = "arc-runners"
  }

  type = "Opaque"

  data = {
    github_app_id              = tostring(var.github_app_id)
    github_app_installation_id = tostring(var.github_app_installation_id)
    github_app_private_key     = var.github_app_private_key
  }
}

resource "helm_release" "arc_controller" {
  name       = "arc"
  repository = "oci://ghcr.io/actions/actions-runner-controller-charts"
  chart      = "gha-runner-scale-set-controller"
  namespace  = "arc-systems"
  version    = var.arc_chart_version

  wait    = true
  timeout = 600
}

resource "helm_release" "arc_runner_set" {
  name       = "arc-runner-set"
  repository = "oci://ghcr.io/actions/actions-runner-controller-charts"
  chart      = "gha-runner-scale-set"
  namespace  = "arc-runners"
  version    = var.arc_chart_version

  wait    = true
  timeout = 600

  values = [
    yamlencode({
      githubConfigUrl    = "https://github.com/${var.github_owner}/${var.github_repo}"
      githubConfigSecret = kubernetes_secret.github_app_secret.metadata[0].name

      minRunners = var.min_runners
      maxRunners = var.max_runners

      template = {
        spec = {
          runtimeClassName = var.runtime_class_name

          nodeSelector = var.node_selector

          imagePullSecrets = [
            {
              name = var.image_pull_secret_name
            }
          ]

          containers = [
            {
              name    = "runner"
              image   = var.runner_image
              command = ["/home/runner/run.sh"]

              resources = {
                requests = {
                  cpu    = var.runner_cpu_request
                  memory = var.runner_memory_request
                }

                limits = {
                  cpu    = var.runner_cpu_limit
                  memory = var.runner_memory_limit
                }
              }
            }
          ]
        }
      }
    })
  ]

  depends_on = [
    helm_release.arc_controller,
    kubernetes_secret.github_app_secret
  ]
}
