resource "helm_release" "kyverno" {
  name             = "kyverno"
  repository       = "https://kyverno.github.io/kyverno/"
  chart            = "kyverno"
  namespace        = "kyverno"
  create_namespace = true

  wait    = true
  timeout = 600

  values = [
    yamlencode({
      admissionController = {
        replicas = 1
      }

      backgroundController = {
        replicas = 1
      }

      cleanupController = {
        replicas = 1
      }

      reportsController = {
        replicas = 1
      }
    })
  ]
}
