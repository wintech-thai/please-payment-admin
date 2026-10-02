---
title: 3. ติดตั้งระบบ
updatedAt: "{{BUILD_DATE}}"
---

หน้านี้อธิบายการติดตั้งโปรแกรมบน VM ตั้งแต่สร้าง K3s cluster จนตรวจ applications และ storage โดยรัน script ตามลำดับใน VM เครื่องเดียวกัน:

> **ลำดับ:** `00-install-k3s.bash` → `01-initial-secrets.bash` → `02-initial-addons.bash` → `04-boot-strap.bash` → `03-install-monitoring.bash`
> รัน script `03` หลัง `04` เพราะ monitoring ต้องอ่าน secret ที่สร้างไว้และตั้งค่า alert หลัง Argo CD เริ่ม sync ระบบแล้ว

## ก่อนเริ่ม

- ตั้ง repository และค่าตาม [หน้า 1](./prepare-source-code) แล้ว
- เตรียมและตรวจ filesystem ที่ `/data` ตาม [หน้า 2](./prepare-vm) แล้ว

## 3.1 ดาวน์โหลด repository ลง VM

SSH เข้า VM ด้วยผู้ใช้ที่มีสิทธิ์ `sudo` แล้วติดตั้งเครื่องมือที่ใช้ในขั้นตอนนี้:

```bash
sudo apt update
sudo apt install -y git curl ca-certificates openssl nano dnsutils
```

ดาวน์โหลด repository ที่เตรียมไว้ในหน้า 1 แล้วเข้าโฟลเดอร์นั้น ก่อนรันให้แทน URL ตัวอย่างด้วย URL repository ของคุณ และเปลี่ยนชื่อโฟลเดอร์ในคำสั่ง `cd` ให้ตรงกับชื่อ repository:

```bash
git clone https://github.com/YOUR_ORG/please-payment-production.git
cd please-payment-production
```

ตรวจว่ามี installation scripts ครบ:

```bash
ls -1 *.bash
```

ควรเห็นไฟล์ `00-install-k3s.bash`, `01-initial-secrets.bash`, `02-initial-addons.bash`, `04-boot-strap.bash` และ `03-install-monitoring.bash`

<figure class="install-evidence">
<img src="/docs/images/install/step-3-1-script-list.png" alt="ผลลัพธ์คำสั่งที่แสดง installation scripts ทั้งห้าไฟล์" />
<figcaption>ภาพที่ 3.1 รายการสคริปต์ติดตั้ง</figcaption>
</figure>

## 3.2 ติดตั้ง K3s ด้วย script 00

K3s คือ Kubernetes รุ่นเบาที่ใช้รัน cluster บน VM เครื่องเดียว รัน script ด้วยสิทธิ์ root:

```bash
sudo bash ./00-install-k3s.bash
```

ก่อนใช้ `kubectl` ให้คัดลอก kubeconfig (ไฟล์เชื่อมต่อและยืนยันสิทธิ์เข้า cluster) มาไว้ใน home ของผู้ใช้ปัจจุบัน โดยกำหนดเจ้าของและ permission ให้อ่านได้เฉพาะผู้ใช้นี้:

```bash
sudo install -o "$USER" -g "$(id -gn)" -m 600 \
  /etc/rancher/k3s/k3s.yaml "$HOME/k3s.yaml"
export KUBECONFIG="$HOME/k3s.yaml"
```

ตรวจสถานะ node:

```bash
kubectl get nodes
```

ผลที่ต้องได้คือมี node อย่างน้อยหนึ่งตัวและสถานะเป็น `Ready` เมื่อเริ่ม SSH session ใหม่ ให้ตั้งค่า `KUBECONFIG` อีกครั้งก่อนใช้ `kubectl`

<figure class="install-evidence">
<img src="/docs/images/install/step-3-2-k3s-ready.png" alt="ผลลัพธ์ kubectl get nodes ที่แสดงสถานะ Ready" />
<figcaption>ภาพที่ 3.2 สถานะ K3s หลังติดตั้ง</figcaption>
</figure>

## 3.3 เตรียม secret และรัน script 01

Secret คือข้อมูลลับที่เก็บใน Kubernetes เช่น key และ webhook ก่อนรัน script ให้เตรียมไฟล์ `.env` บน VM ซึ่ง script จะใช้สร้าง secret `initial-secret-preset`

สร้าง `MUTUAL_KEY` และไฟล์เริ่มต้น โดยรันคำสั่งนี้ครั้งเดียวในโฟลเดอร์ repository:

```bash
umask 077
printf 'DUMMY=demo\nMUTUAL_KEY=%s\n' "$(openssl rand -hex 32)" > .env
chmod 600 .env
```

เตรียม Discord Webhook สำหรับรับ alerts ตามขั้นตอนนี้:

- เปิด Discord server ที่คุณมีสิทธิ์จัดการ Webhooks แล้วไปที่ **Server Settings → Integrations → Webhooks → Create Webhook**
- เลือก text channel สำหรับรับ alerts แล้วคัดลอก **Webhook URL** ดู [คู่มือสร้าง Webhook ของ Discord](https://support.discord.com/hc/en-us/articles/228383668-Intro-to-Webhooks)
- เปิด `.env` ด้วยคำสั่งด้านล่าง แล้วเพิ่มบรรทัด `DISCORD_WEBHOOK` โดยใส่ URL จริงในไฟล์เท่านั้น

```bash
nano .env
```

ไฟล์ควรมีรูปแบบดังนี้ โดยคง `MUTUAL_KEY` ที่คำสั่งสร้างให้ และแทน Webhook URL ตัวอย่างด้วยค่าที่คัดลอกมา:

```dotenv
DUMMY=demo
MUTUAL_KEY=<ค่าที่สร้างไว้>
DISCORD_WEBHOOK=https://discord.com/api/webhooks/<webhook-id>/<webhook-token>
```

ไฟล์นี้มีความลับ อย่า commit หรือส่งให้ผู้อื่น โดย permission `600` จำกัดการอ่านไว้ที่ผู้ใช้ปัจจุบัน Script 01 จะนำค่าจากไฟล์นี้ไปสร้าง `initial-secret-preset`

เมื่อ `.env` พร้อมแล้ว รัน script 01 เพื่อสร้าง `initial-secret` และ `initial-secret-preset`:

```bash
chmod +x 01-initial-secrets.bash
./01-initial-secrets.bash
```

Script เริ่ม Job (งานที่ cluster รันให้เสร็จ) ชื่อ `secret-init` เพื่อสร้าง `initial-secret` แล้วรอจนพบ key `GIT_USER` หากคำสั่งยังไม่จบ ให้เปิด SSH session ที่สองเพื่อตรวจสถานะและ log อย่าเริ่ม script 01 ซ้ำขณะที่ session แรกยังรออยู่:

```bash
export KUBECONFIG="$HOME/k3s.yaml"
kubectl get job,pod -n default
kubectl describe pod -n default -l job-name=secret-init
kubectl logs -n default job/secret-init
```

หลัง script จบ ตรวจชื่อ secret โดยไม่เปิดดูค่าข้างใน:

```bash
kubectl wait --for=condition=complete job/secret-init -n default --timeout=5m
kubectl get secrets -n default
```

ทำต่อเมื่อ Job `secret-init` เป็น `Complete` และเห็น `initial-secret` กับ `initial-secret-preset` ในรายการ Script 01 อาจจบก่อน Job ทำงานเสร็จ เพราะรอเพียง secret key บางรายการ หากคำสั่ง `kubectl wait` หมดเวลา ให้ตรวจ pod และ log ตามคำสั่งด้านบน แล้วแก้สาเหตุก่อนติดตั้งส่วนถัดไป

<figure class="install-evidence">
<img src="/docs/images/install/step-3-3-initial-secrets.png" alt="ผลลัพธ์ secret-init สำเร็จและรายชื่อ secrets" />
<figcaption>ภาพที่ 3.3 ผลการสร้าง Secret</figcaption>
</figure>

## 3.4 ติดตั้งส่วนประกอบพื้นฐานด้วย script 02

ส่วนประกอบพื้นฐาน (addons) คือบริการที่ cluster ต้องใช้ เช่น Argo CD, ingress-nginx, cert-manager และ External Secrets Operator ติดตั้งด้วย script 02:

```bash
chmod +x 02-initial-addons.bash
./02-initial-addons.bash
```

ตรวจว่า Kubernetes สร้าง Deployments ของ addons ครบแล้ว ช่วงแรก Helm charts อาจยังติดตั้งอยู่ หากยังไม่พบ Deployment ของ namespace ใด ให้รอแล้วรันคำสั่งนี้อีกครั้ง:

```bash
kubectl get deployments -A
```

เมื่อมี Deployments ของ `argocd`, `ingress-nginx`, `cert-manager` และ `external-secrets` ครบแล้ว รอให้ทุก Deployment ในสี่ namespace นี้เป็น `Available` ก่อน bootstrap:

```bash
kubectl wait --for=condition=Available deployment --all -n argocd --timeout=10m
kubectl wait --for=condition=Available deployment --all -n ingress-nginx --timeout=10m
kubectl wait --for=condition=Available deployment --all -n cert-manager --timeout=10m
kubectl wait --for=condition=Available deployment --all -n external-secrets --timeout=10m
```

จากนั้นตรวจความพร้อมของ pods:

```bash
kubectl get pods -A
```

Pods ของบริการในสี่ namespace นี้ต้องเป็น `Running` และคอลัมน์ `READY` ต้องครบ เช่น `1/1` หรือ `2/2` ส่วน pods ของ Jobs ที่จบแล้วเป็น `Completed` ได้ หากคำสั่งรอหมดเวลา ให้ตรวจสถานะก่อนทำข้อ 3.5

<figure class="install-evidence">
<img src="/docs/images/install/step-3-4-addons.png" alt="ผลลัพธ์ pods ของ Argo CD ingress cert-manager และ external-secrets" />
<figcaption>ภาพที่ 3.4 สถานะ Addons</figcaption>
</figure>

## 3.5 เริ่ม sync applications ด้วย script 04

Script 04 ลงทะเบียนการตั้งค่าตั้งต้นกับ Argo CD จากนั้น Argo CD จะอ่าน repository ที่กำหนดและ sync applications (รายการแอปที่จะติดตั้ง) เข้าสู่ cluster

```bash
chmod +x 04-boot-strap.bash
./04-boot-strap.bash
```

หาก repository ของคุณเป็น **private** ให้เปิด `https://<ip-address>/tools/argocd` ด้วย Public IP ของ VM อ่าน initial password ตาม [ข้อ 5.2](./misc#52-เข้า-argo-cd) แล้วไปที่ **Settings → Repositories → Connect Repo** เลือก HTTPS ใส่ URL repository, username และ credentials แบบอ่านอย่างเดียว จากนั้นกดเชื่อมต่อและตรวจสถานะ `Successful` ใช้ URL เดียวกับ `DATA_PLANE_REMOTE_REPO` และ `repoURL` ที่ตั้งในหน้า 1 เก็บ credentials ใน Argo CD ไม่ใส่ลง source code

ตรวจรายการและสถานะ applications หลัง bootstrap และเชื่อม repository แล้ว:

```bash
kubectl get applications -n argocd
```

ก่อนทำหน้า 4 ให้ตรวจว่า Argo CD อ่าน repository ได้ และ applications เริ่ม sync โดยไม่มี error เรื่อง repository หรือ manifests ตรวจรายการทั้งหมด ไม่ดูเฉพาะ bootstrap application

Certificate อาจยังรอ DNS และทำให้บาง Application เป็น `Progressing` ได้ในขั้นนี้ ให้ทำข้อ 3.6–3.7 แล้วตั้ง DNS ในหน้า 4 ก่อนตรวจ `Ready=True` และ `Synced/Healthy` ครบอีกครั้งตามหน้า 5 ภาพด้านล่างเป็นตัวอย่างสถานะเมื่อระบบพร้อมทั้งหมดแล้ว

<figure class="install-evidence">
<img src="/docs/images/install/step-3-5-applications.png" alt="ผลลัพธ์ Argo CD applications เป็น Synced และ Healthy" />
<figcaption>ภาพที่ 3.5 สถานะ Applications ใน Argo CD</figcaption>
</figure>

## 3.6 ติดตั้ง metrics และ Discord alerts ด้วย script 03

Helm เป็นเครื่องมือที่ script ใช้ติดตั้ง Prometheus และ Grafana ติดตั้ง Helm CLI บน Ubuntu ตาม script ของโปรเจกต์ Helm แล้วตรวจเวอร์ชัน:

```bash
curl -fsSL -o get_helm.sh https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-4
chmod 700 get_helm.sh
sudo ./get_helm.sh
helm version
```

ดูรายละเอียดจาก [คู่มือติดตั้ง Helm อย่างเป็นทางการ](https://helm.sh/docs/intro/install/)

ทำขั้นนี้หลัง script 04 เพราะ Alertmanager (บริการรวบรวมและส่ง alert) เชื่อมไปยัง `discord-alm` และใช้ webhook จาก secret ที่สร้างไว้ หลังติดตั้ง ให้ทดสอบการส่ง alert ตามนโยบายของระบบ

```bash
chmod +x 03-install-monitoring.bash
./03-install-monitoring.bash
```

ตรวจ pod ของ metrics และ Discord:

```bash
kubectl get pods -n monitoring
kubectl get pods -n discord-alm
```

<figure class="install-evidence">
<img src="/docs/images/install/step-3-6-monitoring.png" alt="ผลลัพธ์ Helm และ pods ของ monitoring กับ Discord alerts" />
<figcaption>ภาพที่ 3.6 สถานะ Monitoring</figcaption>
</figure>

## 3.7 ตรวจ workload และ storage

ตรวจ pod ทุก namespace และ persistent volume claim (PVC — คำขอใช้พื้นที่เก็บข้อมูลของ pod):

```bash
kubectl get pods -A
kubectl get pvc -A
```

pod หลักไม่ควรค้างที่ `Pending`, `ImagePullBackOff` หรือ `CrashLoopBackOff` ส่วน PVC ที่ต้องใช้ควรเป็น `Bound` เมื่อผ่านแล้ว ไปที่ [4. ตั้งค่า Domain & DNS](./domain-dns) เพื่อตรวจ DNS และ TLS จากนั้นใช้หน้า [5. ตรวจสอบหลังติดตั้ง](./misc) ตรวจ Admin, Argo CD, metrics และ jobs

<figure class="install-evidence">
<img src="/docs/images/install/step-3-7-workloads-storage.png" alt="ผลลัพธ์ pods และ persistent volume claims ของระบบ" />
<figcaption>ภาพที่ 3.7 สถานะ Workloads และ Storage</figcaption>
</figure>

## Checklist

- ⬜ Clone repository สำหรับการติดตั้งลง VM แล้ว
- ⬜ รัน `00-install-k3s.bash` และ node เป็น `Ready`
- ⬜ ตั้ง `KUBECONFIG=$HOME/k3s.yaml` สำหรับ SSH session แล้ว
- ⬜ รัน `01-initial-secrets.bash` และ Job `secret-init` สำเร็จแล้ว
- ⬜ รัน `02-initial-addons.bash` และ addons Deployments เป็น `Available` แล้ว
- ⬜ รัน `04-boot-strap.bash` และ Argo CD applications เริ่ม sync แล้ว
- ⬜ หากใช้ private repository เชื่อม credentials แบบอ่านอย่างเดียวใน Argo CD แล้ว
- ⬜ ตั้ง `DISCORD_WEBHOOK` ใน `.env` สำหรับ ExternalSecret ของ Discord alerts
- ⬜ ติดตั้ง Helm แล้วรัน `03-install-monitoring.bash` หลัง bootstrap
- ⬜ ตรวจ pod ของ `discord-alm` และทดสอบการส่ง alert ตามนโยบายแล้ว
- ⬜ ตรวจ pod และ PVC ก่อนตั้งค่า domain แล้ว
