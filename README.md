# DevSecOps CI/CD Pipeline on Custom Kubernetes

> 主要在建立了一套完整的 DevSecOps CI/CD pipeline，運行在自建的三台 VM Kubernetes 叢集上。  
> 核心理念是 **Shift Left Security**：把安全檢查從「上線前才做」提前到「每一次 PR 就做」。

---

## 目錄

- [Concept Development](#concept-development)
- [Implementation Resources](#implementation-resources)
- [Existing Library / Software](#existing-library--software)
- [Implementation Process](#implementation-process)
- [Knowledge from Lecture](#knowledge-from-lecture)
- [Installation](#installation)
- [Usage](#usage)
- [Job Assignment](#job-assignment)
- [References](#references)

---

## Concept Development

一套以 GitHub Actions + ARC + Kata Containers + BuildKit + Harbor + Argo CD + Kyverno + OWASP ZAP + Syft + Grype + Cosign + FOSSA + CodeRabbit 組成的 DevSecOps CI/CD pipeline，跑在自建的 Kubernetes 叢集上。

---

```
PR gate（靜態分析 + DAST）
    ↓
build（image + SBOM + CVE scan + 簽章）
    ↓
GitOps staging（部署 + DAST gate）
    ↓
production approval
    ↓
production promotion（同一個 digest，不重新 build）
```

每一層都有安全 gate，任何一層出問題就阻止往下走。

---

### 三台 VM 的分工

```
VM1 — Control Plane / 管理入口
├── Kubernetes control plane（kube-apiserver、scheduler、controller-manager、etcd）
├── Terraform / Helm 管理入口
├── Argo CD（GitOps 部署引擎）
└── Kyverno（K8s admission control）

VM2 — CI Worker / Security Testing
├── GitHub Actions ARC Runner Pod
├── Kata Containers Runtime（MicroVM 隔離 CI 環境）
├── BuildKit client
├── Syft / Grype / Cosign
├── PR DAST + Main Build DAST 控制流程
└── OWASP ZAP job

VM3 — Harbor / Staging / Production
├── Harbor Registry（存放所有 image）
├── Staging App（namespace: staging-youtube-music-bot）
├── Production App（namespace: production-youtube-music-bot）
└── 未來：Prometheus + Grafana + Loki
```

> VM2 的核心概念：不可信任、高風險、會被 CI 建立又銷毀的東西，全部放 VM2。

---

### 三個 Repository 的分工

| Repo | 用途 | 連結 |
|------|------|------|
| `youtube-music-bot` | App 程式碼、Dockerfile、GitHub Actions workflows | [連結](https://github.com/Julie08080808/youtube-music-bot) |
| `infra` | Terraform modules、自訂 Runner Image、BuildKit Dockerfile、K8s manifests | [連結](https://github.com/Julie08080808/infra) |
| `youtube-music-bot-gitops` | GitOps repo，管理 staging / production 的 K8s manifests | [連結](https://github.com/Julie08080808/youtube-music-bot-gitops) |

**GitOps repo 是部署的唯一真相來源：**

```
App repo        → 產生 image digest
GitOps repo     → 記錄 staging / production 要部署哪個 digest
Argo CD         → 讓 cluster live state 追上 GitOps desired state
```

---

### 完整 Pipeline 架構

#### CI 靜態分析只在 PR 階段執行，push main 後不重複跑。

```
Developer
    │
    │ git push feature branch
    ▼
Feature Branch
    │
    │ Open Pull Request to main
    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        Pull Request Stage                           │
│                      Trigger: pull_request                          │
└─────────────────────────────────────────────────────────────────────┘
    │
    │ 以下六個 job 平行執行
    │
    ├──────────┬──────────┬──────────┬──────────┬──────────┐
    ▼          ▼          ▼          ▼          ▼          ▼
┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐
│ci.yml  │ │CodeQL  │ │Depend. │ │ FOSSA  │ │PR DAST │ │CodeRab-│
│PR only │ │SAST    │ │Review  │ │License │ │Preview │ │bit     │
│        │ │        │ │/ Snyk  │ │Supply  │ │+ ZAP   │ │AI Code │
├────────┤ ├────────┤ ├────────┤ ├────────┤ ├────────┤ │Review  │
│Biome   │ │Code    │ │Depend. │ │Current:│ │Build PR│ ├────────┤
│tsc     │ │Scan    │ │Diff    │ │Analyze │ │Image   │ │PR      │
│Semgrep │ │Security│ │Check   │ │only    │ │Push    │ │Summary │
│Build   │ │Query   │ │Vuln.   │ │Future: │ │Harbor  │ │Workflow│
│Hadolint│ │Analysis│ │License │ │Gate    │ │Deploy  │ │Docker  │
│        │ │        │ │Risk    │ │        │ │Temp Env│ │K8s     │
│        │ │        │ │        │ │        │ │ZAP Scan│ │Terrafor│
│        │ │        │ │        │ │        │ │Cleanup │ │m Review│
└────────┘ └────────┘ └────────┘ └────────┘ └────────┘ └────────┘
    │          │          │          │          │          │
    └──────────┴──────────┴──────────┴──────────┴──────────┘
                                │
                                ▼
                  ┌─────────────────────────┐
                  │   PR Checks / Review    │
                  └─────────────────────────┘
                                │
                                │ Merge PR to main
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                           Main Stage                                │
│                         Trigger: push main                          │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
                  ┌─────────────────────────┐
                  │     main-build.yml      │
                  │  Runs on ARC Runner     │
                  │     VM2 / node2         │
                  ├─────────────────────────┤
                  │ BuildKit build image    │
                  │ Push image to Harbor    │
                  │ Resolve image digest    │
                  │ Syft generate SBOM      │
                  │ Grype CVE scan          │
                  │ Cosign sign image       │
                  │ Cosign verify image     │
                  └─────────────────────────┘
                                │
                                ▼
                  ┌─────────────────────────┐
                  │   Main Build DAST       │
                  │  Ephemeral ZAP Scan     │
                  ├─────────────────────────┤
                  │ Create ci-dast-<sha>    │
                  │ Deploy built image      │
                  │ Run OWASP ZAP baseline  │
                  │ Upload ZAP artifacts    │
                  │ Cleanup namespace       │
                  │ WARN: report only       │
                  └─────────────────────────┘
                                │
                                ▼
                  ┌─────────────────────────┐
                  │     cd-staging.yml      │
                  │     GitOps Staging      │
                  ├─────────────────────────┤
                  │ Update staging digest   │
                  │ Push GitOps repo        │
                  │ Argo CD sync staging    │
                  │ Deploy App to VM3       │
                  │ Smoke test              │
                  │ ZAP Staging DAST        │
                  └─────────────────────────┘
                                │
                                ▼
                  ┌─────────────────────────┐
                  │   Staging DAST Gate     │
                  ├─────────────────────────┤
                  │ FAIL-NEW must be 0      │
                  │ WARN-NEW must be 0      │
                  │ If failed: stop here    │
                  │ Production blocked      │
                  └─────────────────────────┘
                                │
                                │ Passed
                                ▼
                  ┌─────────────────────────┐
                  │  Production Approval    │
                  │      人工審核           │
                  └─────────────────────────┘
                                │
                                ▼
                  ┌─────────────────────────┐
                  │   cd-production.yml     │
                  │   GitOps Production     │
                  ├─────────────────────────┤
                  │ Read staging digest     │
                  │ Promote same digest     │
                  │ Update production       │
                  │ overlay                 │
                  │ Argo CD sync production │
                  │ Deploy App to VM3       │
                  │ Smoke test production   │
                  └─────────────────────────┘
```

---

### 使用 Kata Containers 跑 CI

每個 CI job 都在獨立的 **Kata MicroVM** 裡執行，有自己的 Linux kernel，跟 VM2 的 host kernel 完全隔離：

```
ARC EphemeralRunner Pod（runtimeClassName: kata）
    ↓
Kata MicroVM（獨立 Linux Kernel 6.1.38）
    ↓
CI 工具執行（build、scan、ZAP 動態攻擊...）
    ↓
Job 完成，MicroVM 自動銷毀，不留任何狀態
```

這確保了：
- 惡意套件和 ZAP 動態攻擊被關在 MicroVM 裡，打不出去
- 每個 CI job 之間完全隔離
- 每次都是全新乾淨的環境

---

### Production 只 promote，不重新 build

```
Main Build 產出 digest：sha256:xxxx
                ↓
cd-staging 部署 sha256:xxxx 到 staging
                ↓
Staging DAST 通過
                ↓
cd-production promote 同一個 sha256:xxxx 到 production
```

Production 永遠不直接部署任意 image，只 promote staging 已通過所有安全測試的 digest。

---

### 目前尚未收緊的地方

| 項目 | 現況 | 目標 |
|------|------|------|
| FOSSA | analyze-only bootstrap | run-tests: true，正式 PR gate |
| Biome | report only | 修完問題後改為 blocking |
| Hadolint | report only | 修完 Dockerfile 後改為 blocking |
| PR DAST WARN | 不擋 | 修完 security headers 後改為 blocking |
| Main Build DAST WARN | 不擋 | 之後改為 blocking |
| Kyverno | audit / warn | Enforce（未簽章 image 不准部署） |
| Branch Protection | 部分完成 | 逐步加入 required checks |
| Monitoring | 未完成 | Prometheus + Grafana + Loki |

---

## Implementation Resources

### 硬體需求

| VM | 角色 | 建議記憶體 | 建議 CPU | 建議磁碟 |
|----|------|-----------|---------|---------|
| VM1 | Control Plane | 16GB | 4 cores | 50GB |
| VM2 | CI Worker | 32GB+ | 8 cores | 200GB |
| VM3 | Production Worker | 32GB | 4 cores | 50GB |

> VM2 需要最多資源，因為每個 Kata MicroVM 約需要 4-8GB 記憶體，多個平行 job 會等比例增加記憶體需求。

### 軟體需求

| 軟體 | 版本 | 安裝位置 |
|------|------|---------|
| Ubuntu | 24.04 LTS | 三台 VM |
| Kubernetes | v1.30 | 三台 VM |
| containerd | v2.x | 三台 VM |
| Kata Containers | 3.2.0 | VM2 |
| Docker | 29.x | VM2（build/push runner image 用） |
| Helm | v3.x | VM1 |
| Terraform | 1.15.x | VM1 |

### 帳號需求

| 服務 | 用途 | 費用 |
|------|------|------|
| GitHub | Repo、Actions、GitHub App | 免費 |
| FOSSA | License 掃描 | 免費方案 |
| Harbor | 自架，不需外部帳號 | 免費 |

---

## Existing Library / Software

### Kubernetes 與 Container 平台

| 工具 | 版本 | 用途 |
|------|------|------|
| Kubernetes | v1.30 | 自建叢集 |
| containerd | v2.2.x | K8s CRI runtime |
| Calico | v3.27 | CNI 網路插件 |
| Kata Containers | 3.2.0 | MicroVM 隔離 CI 環境 |
| local-path-provisioner | latest | K8s 本地儲存 StorageClass |

### CI/CD 與 GitOps

| 工具 | 版本 | 用途 |
|------|------|------|
| GitHub Actions | - | CI/CD workflow 觸發與執行 |
| ARC（Actions Runner Controller） | 0.14.2 | 在 K8s 動態建立 Runner Pod |
| BuildKit | v0.30.0 | 高效能 Container Image 建置 |
| Harbor | v2.x | 私有 Container Registry |
| Argo CD | latest | GitOps 部署引擎 |
| Kustomize | - | Staging / Production overlay 管理 |
| Terraform | 1.15.x | Infrastructure as Code |
| Helm | v3.x | K8s 應用程式套件管理 |

### DevSecOps 安全工具

| 工具 | 用途 |
|------|------|
| Biome | TypeScript / JavaScript Lint + Format |
| tsc | TypeScript 型別檢查 |
| Semgrep | 規則式靜態安全掃描 |
| CodeQL | 深度跨函式資料流分析（SAST） |
| Hadolint | Dockerfile 最佳實踐檢查 |
| Syft | 產生 SBOM（軟體元件清單） |
| Grype | CVE 漏洞掃描 |
| FOSSA | License 合規與供應鏈掃描 |
| Cosign | Container Image 數位簽章與驗證 |
| OWASP ZAP | 動態安全測試（DAST） |
| Kyverno | K8s admission control 政策 |
| CodeRabbit | AI Code Review（SaaS） |
| Snyk / Dependency Review | Dependency 漏洞與 License 風險 |

### 自訂 Runner Image 內建工具

```
harbor.jlsa.local:30443/ci/arc-runner:v0.4.0

內建：kubectl、buildctl、syft、grype、cosign
     jq、yq、git、curl、node、npm、tsc、python3
```

工具全部預裝在 image 裡，CI job 不需要每次下載，減少外網依賴、執行速度更穩定。

---

## Implementation Process

### Phase 1：自建 Kubernetes 叢集

用 kubeadm 在三台 Ubuntu 24.04 VM 上建立 Kubernetes v1.30 叢集，包含：
- 關閉 Swap、設定核心模組、調整網路參數
- 安裝 containerd（SystemdCgroup = true）
- VM1 初始化 Control Plane
- 安裝 Calico CNI（排除了 Tigera Operator CRD 載入問題）
- VM2、VM3 用 kubeadm join 加入叢集
- 為各 node 貼上專屬 label

### Phase 2：Kata Containers（VM2）

在 VM2 安裝 Kata Containers 靜態包（amd64），設定 containerd 對接 Kata，建立 K8s RuntimeClass，讓 ARC Runner Pod 自動在 Kata MicroVM 裡執行 CI job。

設定 containerd 信任 Harbor（自簽憑證）：
- 設定 `certs.d/hosts.toml`（skip_verify）
- 設定 `config_path = '/etc/containerd/certs.d'`

### Phase 3：Terraform 管理所有基礎設施

`infra` repo 的 `terraform/` 資料夾管理所有平台元件：

```
modules/
├── namespaces/         建立所有 K8s namespace
├── harbor/             安裝 Harbor + Project + Robot Account
├── arc/                安裝 ARC Controller + RunnerScaleSet
├── secrets/            建立 K8s secret
├── kyverno/            安裝 Kyverno
├── runtimeclass/       建立 RuntimeClass kata
└── argocd_apps/        建立 Argo CD Application
```

### Phase 4：GitHub App + ARC

建立 GitHub App 做身份驗證，ARC 使用 Long-Poll 方式連線 GitHub，不需要公開 IP。Runner Pod 跑在 VM2 的 Kata MicroVM 裡，job 完成後 Pod 自動銷毀。

### Phase 5：Harbor + 自訂 Runner Image

Harbor 安裝在 VM3（`dedicated=production-storage`），用來存放：
- App image
- ARC runner image
- BuildKit image
- ZAP image
- Cosign signature artifact

自訂 Runner Image 預裝所有 CI 工具，推到 Harbor 後由 ARC 自動拉取使用。

### Phase 6：CI Pipeline

**App repo 的 workflows：**

| 檔案 | 觸發時機 | 說明 |
|------|---------|------|
| `ci.yml` | PR only | Biome、tsc、Semgrep、Build、Hadolint |
| `codeql.yml` | PR | SAST 深度分析 |
| `dependency-review.yml` | PR | Dependency 漏洞與 License |
| `fossa.yml` | PR / push main | License / 供應鏈掃描 |
| `pr-dast.yml` | PR | preview 環境 + ZAP |
| `main-build.yml` | push main | BuildKit build、SBOM、CVE、Cosign、DAST |
| `cd-staging.yml` | main build 成功後 | GitOps staging 部署 |
| `cd-production.yml` | staging DAST 通過 + 人工 approval | GitOps production 部署 |

### Phase 7：GitOps CD + Argo CD

GitOps repo 用 Kustomize 管理 overlay：

```
apps/youtube-music-bot/
├── base/
└── overlays/
    ├── staging/
    └── production/
```

Argo CD 持續監控 GitOps repo，偵測到 digest 變更就自動 sync 部署，不需要手動 kubectl apply。

---

## Knowledge from Lecture

### Shift Left Security

把安全測試提前到開發流程的最早期。越早發現問題，修復成本越低。每個 PR 都自動跑 SAST、Dependency scan、License scan、DAST。

### Defense in Depth

不依賴單一工具，而是多層防護：

```
PR Gate
  ↓
Main Build Gate
  ↓
Image Supply Chain Gate（SBOM + CVE + Cosign）
  ↓
Main Build DAST
  ↓
Staging DAST Gate
  ↓
Production Approval
  ↓
Production Promotion
  ↓
Kyverno Admission Policy
```

任何一層發現問題就阻止往下走。

### GitOps

以 Git repository 作為系統狀態的唯一真實來源（Single Source of Truth）。Argo CD 持續監控 GitOps repo，有任何變更就自動同步到 K8s，所有部署都有 git 記錄可以追蹤和回滾。

### Immutable Infrastructure

基礎設施不做修改，只做替換。每次部署都是全新的 Pod，使用新的 image digest，不是在現有 Pod 上做更改。

### Zero Trust

不預設任何元件是可信任的：
- 每個 CI job 都在獨立 MicroVM 裡執行，完成後銷毀
- Production 只接受 staging 已驗證過的 digest
- Kyverno 驗證每個 Pod 的 Cosign 簽章（待修改逐步收緊中）

### SBOM（軟體元件清單）

列出 Container Image 裡所有套件、版本、License，方便追蹤供應鏈風險。使用 Syft 產生 SBOM，再用 Grype 掃描 CVE。

---

## Installation

> **注意**：本專題建立在自建 Kubernetes 叢集上，叢集的詳細建置步驟（kubeadm、Calico 安裝等）請參考 [Kubernetes 官方文件](https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/)。以下說明假設 K8s 叢集已正常運作。

### 前置條件

- 三台 VM 的 K8s 叢集已建立，且 `kubectl get nodes` 三台都是 `Ready`
- VM2 已安裝 Kata Containers，RuntimeClass `kata` 已建立
- VM2 已設定 containerd 信任 Harbor（`certs.d/hosts.toml`）
- Helm 和 Terraform 已安裝在 VM1

確認 node label：

```bash
kubectl get nodes -L dedicated
# node2 → dedicated=ci-security
# node3 → dedicated=production-storage
```

---

### Step 1：Fork 或 clone 三個 repo

```bash
# App repo
https://github.com/Julie08080808/youtube-music-bot

# GitOps repo
https://github.com/Julie08080808/youtube-music-bot-gitops

# Infra repo
https://github.com/Julie08080808/infra
```

---

### Step 2：建立 GitHub App（給 ARC 用）

1. 去 `https://github.com/settings/apps/new`
2. 填寫 App 名稱，Homepage URL 填你的 repo URL
3. **Webhook → Active：取消勾選**（ARC 用 Long-Poll，不需要 Webhook）
4. 設定 Repository permissions：

   | 項目 | 設定值 |
   |------|--------|
   | Actions | Read & write |
   | Administration | Read & write |
   | Checks | Read & write |
   | Contents | Read |
   | Metadata | Read（預設） |
   | Pull requests | Read & write |

5. 建立後記下 **App ID**
6. 點 **Generate a private key** → 下載 `.pem`
7. 點 **Install App** → 選你的 repo → 記下 **Installation ID**

---

### Step 3：設定 terraform.tfvars（VM1）

```bash
cd ~/infra/terraform

cat > terraform.tfvars << 'EOF'
harbor_admin_password      = "你的Harbor密碼"
github_token               = "ghp_xxx..."
github_owner               = "你的GitHub帳號"
github_app_id              = "你的AppID"
github_app_installation_id = "你的InstallationID"
harbor_url                 = "https://你的VM3_IP:30443"
harbor_runner_username     = "robot$arc-runner"
harbor_runner_password     = "robot帳號的secret"
gitops_repo_token          = "github_pat_xxx"

github_app_private_key = <<EOT
-----BEGIN RSA PRIVATE KEY-----
貼上你的.pem內容
-----END RSA PRIVATE KEY-----
EOT
EOF
```

> `terraform.tfvars` 和 `terraform.tfstate` 絕對不能 commit 到 repo。

---

### Step 4：執行 Terraform（VM1）

```bash
cd ~/infra/terraform

terraform init
terraform fmt -recursive
terraform validate
terraform plan
terraform apply
```

Terraform 會自動建立：namespaces、local-path-provisioner、Harbor、ARC、Kyverno、Argo CD Applications、所有 K8s secrets。

---

### Step 5：Build 並 Push 自訂 Runner Image（VM2）

```bash
# 登入 Harbor
docker login <HARBOR_IP>:30443

# Build
docker build \
  -t <HARBOR_IP>:30443/ci/arc-runner:latest \
  -f infra/runner-images/arc-runner/Dockerfile \
  infra/runner-images/arc-runner/

# Push
docker push <HARBOR_IP>:30443/ci/arc-runner:latest
```

---

### Step 6：設定 GitHub Actions Secrets

在 App repo 的 `Settings → Secrets and variables → Actions` 建立：

| Secret 名稱 | 說明 | 取得方式 |
|-------------|------|---------|
| `K8S_KUBECONFIG_B64` | kubeconfig base64 | `cat ~/.kube/config \| base64 -w0` |
| `HARBOR_USERNAME` | Harbor 登入帳號（Robot Account） | Harbor 介面 |
| `HARBOR_PASSWORD` | Harbor 登入密碼 | Harbor 介面 |
| `HARBOR_CA_CRT` | Harbor CA 憑證 | Harbor 介面下載 |
| `COSIGN_PRIVATE_KEY` | Cosign 私鑰 | `cosign generate-key-pair` |
| `COSIGN_PUBLIC_KEY` | Cosign 公鑰 | 同上 |
| `COSIGN_PASSWORD` | Cosign 私鑰密碼 | 自訂 |
| `GITOPS_PAT` | 操作 GitOps repo 的 PAT | GitHub Settings → Tokens |
| `FOSSA_API_KEY` | FOSSA API Key | `app.fossa.com → Integrations → API Tokens` |

---

### Step 7：驗證部署

```bash
# 確認 nodes
kubectl get nodes -o wide
kubectl get nodes -L dedicated

# 確認 ARC Runner
kubectl get pods -n arc-runners -o wide
kubectl get AutoscalingRunnerSet -n arc-runners

# 確認 RuntimeClass
kubectl get runtimeclass

# 確認 Harbor secrets
kubectl get secret harbor-registry-secret -n arc-runners
kubectl get secret harbor-registry-secret -n staging-youtube-music-bot
kubectl get secret harbor-registry-secret -n production-youtube-music-bot

# 確認 Argo CD Applications
kubectl get applications -n argocd
# 預期：youtube-music-bot-staging    Synced  Healthy
#       youtube-music-bot-production  Synced  Healthy

# 確認服務
curl http://<VM3_IP>:31081  # Staging
curl http://<VM3_IP>:31080  # Production
```

---

## Usage

### 開發新功能的流程

```bash
# 建立 feature branch
git checkout main && git pull
git checkout -b feature/xxx

# 開發完成後
git add .
git commit -m "feat: xxx"
git push -u origin feature/xxx
```

開 Pull Request 到 main，以下六個 job 會**自動平行執行**：

```
ci.yml（Biome、tsc、Semgrep、Build、Hadolint）
CodeQL
Dependency Review / Snyk
FOSSA analyze
PR DAST（preview 環境 + ZAP）
CodeRabbit（AI review，不擋 PR）
```

### Merge 後的自動流程

PR merge 進 main 後，自動觸發：

```
main-build.yml → cd-staging.yml → （staging DAST 通過）→ cd-production.yml
```

Production 需要：
1. Staging DAST 通過（FAIL = 0、WARN = 0）
2. **人工 Approval**（可人工或自動）

### 確認 CI 執行狀態

```bash
# 監控 Runner Pod
kubectl get pods -n arc-runners -w

# 查看 ARC Controller log
kubectl logs -n arc-systems deployment/arc-gha-rs-controller --tail=30

# 查看 Argo CD 部署狀態
kubectl get applications -n argocd
```

### 查看 CI 報告

每次 CI 執行完成後，可以在 GitHub Actions 頁面的 **Artifacts** 下載：
- `biome-report`
- `tsc-report`
- ZAP HTML / JSON report
- SBOM（spdx.json）
- Grype report
- Build metadata

---

## Job Assignment

| 工作項目 | 說明 |
|---------|------|
| K8s 叢集建置 | 三台 VM 初始化、Calico CNI、node join、node label |
| Kata Containers | VM2 安裝設定、RuntimeClass、containerd 對接 |
| GitHub App + ARC | GitHub App 建立、ARC Controller、RunnerScaleSet |
| Harbor + Runner Image | Harbor 安裝、自訂 Runner Image build/push |
| Terraform IaC | infra repo 建立、所有 module 撰寫、terraform apply |
| CI Pipeline | ci.yml、codeql.yml、dependency-review.yml、fossa.yml、pr-dast.yml、main-build.yml |
| CD Pipeline | cd-staging.yml、cd-production.yml、GitOps repo 設計 |
| 文件撰寫 | README、架構說明、Installation guide |

---

## References

### 官方文件

- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [Kata Containers Documentation](https://katacontainers.io/docs/)
- [Actions Runner Controller](https://github.com/actions/actions-runner-controller)
- [Harbor Documentation](https://goharbor.io/docs/)
- [Argo CD Documentation](https://argo-cd.readthedocs.io/)
- [Kyverno Documentation](https://kyverno.io/docs/)
- [Terraform Documentation](https://developer.hashicorp.com/terraform/docs)
- [Calico Documentation](https://docs.tigera.io/calico/latest/about/)
- [BuildKit Documentation](https://github.com/moby/buildkit)

### 安全工具文件

- [Biome](https://biomejs.dev/)
- [Semgrep Rules](https://semgrep.dev/r)
- [CodeQL Documentation](https://codeql.github.com/docs/)
- [Syft](https://github.com/anchore/syft)
- [Grype](https://github.com/anchore/grype)
- [Sigstore Cosign](https://docs.sigstore.dev/cosign/overview/)
- [FOSSA Documentation](https://docs.fossa.com/)
- [OWASP ZAP](https://www.zaproxy.org/docs/)
- [CodeRabbit Documentation](https://docs.coderabbit.ai/)

### 概念參考

- [DevSecOps: Shifting Security Left](https://www.redhat.com/en/topics/devops/what-is-devsecops)
- [OpenGitOps Principles](https://opengitops.dev/)
- [SBOM: Software Bill of Materials](https://www.cisa.gov/sbom)
- [Kata Containers Architecture](https://katacontainers.io/learn/)
- [Kustomize Documentation](https://kustomize.io/)

