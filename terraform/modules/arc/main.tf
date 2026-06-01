resource "kubernetes_secret" "github_app_secret" {
  metadata {
    name      = "github-app-secret"
    namespace = "arc-runners"
  }

  data = {
    github_app_id              = var.github_app_id
    github_app_installation_id = var.github_app_installation_id
    github_app_private_key     = var.github_app_private_key
  }
}

resource "helm_release" "arc_controller" {
  name      = "arc"
  namespace = "arc-systems"
  chart     = "oci://ghcr.io/actions/actions-runner-controller-charts/gha-runner-scale-set-controller"

  depends_on = [kubernetes_secret.github_app_secret]
}

resource "helm_release" "arc_runner_set" {
  name      = "arc-runner-set"
  namespace = "arc-runners"
  chart     = "oci://ghcr.io/actions/actions-runner-controller-charts/gha-runner-scale-set"

  values = [
    yamlencode({
      githubConfigUrl    = "https://github.com/${var.github_owner}/${var.github_repo}"
      githubConfigSecret = "github-app-secret"

      minRunners = 0
      maxRunners = 5

      template = {
        spec = {
          runtimeClassName = "kata"
          nodeSelector = {
            kata = "true"
          }
          containers = [
            {
              name    = "runner"
              image   = "10.32.20.51:30443/ci/arc-runner:latest"
              command = ["/home/runner/run.sh"]
              resources = {
                requests = {
                  cpu    = "1"
                  memory = "4Gi"
                }
                limits = {
                  cpu    = "4"
                  memory = "8Gi"
                }
              }
            }
          ]
        }
      }
    })
  ]

  depends_on = [helm_release.arc_controller]
}
