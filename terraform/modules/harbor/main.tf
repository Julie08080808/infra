resource "helm_release" "harbor" {
  name       = "harbor"
  repository = "https://helm.goharbor.io"
  chart      = "harbor"
  namespace  = "harbor"

  timeout = 600

  values = [
    yamlencode({
      expose = {
        type = "nodePort"
        tls = {
          enabled = true
          auto = {
            commonName = "10.32.20.51"
          }
        }
        nodePort = {
          ports = {
            http = {
              nodePort = 30080
            }
            https = {
              nodePort = 30443
            }
          }
        }
      }

      externalURL = "https://10.32.20.51:30443"

      harborAdminPassword = var.harbor_admin_password

      persistence = {
        enabled        = true
        resourcePolicy = "keep"
        persistentVolumeClaim = {
          registry = {
            size = "20Gi"
          }
          jobservice = {
            size = "1Gi"
          }
          database = {
            size = "1Gi"
          }
          redis = {
            size = "1Gi"
          }
        }
      }

      nodeSelector = {
        dedicated = "production-storage"
      }
    })
  ]
}

resource "harbor_project" "ci" {
  name        = "ci"
  public      = true

  depends_on = [helm_release.harbor]
}

resource "harbor_robot_account" "arc_runner" {
  name        = "arc-runner"
  description = "Robot account for ARC Runner to push images"
  level       = "project"
  project_name = harbor_project.ci.name

  permissions {
    access {
      action   = "push"
      resource = "repository"
    }
    access {
      action   = "pull"
      resource = "repository"
    }
    kind      = "project"
    namespace = harbor_project.ci.name
  }

  depends_on = [harbor_project.ci]
}
