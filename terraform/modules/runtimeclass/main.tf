resource "kubernetes_manifest" "kata_runtimeclass" {
  manifest = {
    apiVersion = "node.k8s.io/v1"
    kind       = "RuntimeClass"

    metadata = {
      name = "kata"
    }

    handler = "kata"
  }
}
