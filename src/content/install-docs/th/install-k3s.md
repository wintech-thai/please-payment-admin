---
title: "2. ติดตั้ง K3s + ArgoCD"
updatedAt: "{{BUILD_DATE}}"
---

# ติดตั้ง K3s + ArgoCD

## 1. Clone repo

```bash
git clone https://github.com/wintech-thai/please-payment-k3s-demo.git
cd please-payment-k3s-demo
```

Repo นี้แบ่งเป็น 2 ฝั่ง:

- **Data plane** = repo นี้เอง มีสคริปต์ติดตั้ง k3s/addons/monitoring และ manifest ของ ingress/config เสริม
- **Control plane** = repo แยก [`please-payment-control-plane`](https://github.com/wintech-thai/please-payment-control-plane) ที่มี Helm values ของแอป please-payment จริง (admin/merchant/web/api/jobs) — ArgoCD จะไปดึงมาให้เองในขั้นตอน bootstrap ไม่ต้อง clone เอง

## 2. ติดตั้ง K3s (single-node cluster)

```bash
bash 00-install-k3s.bash
```

สคริปต์นี้ลง k3s แบบ single-node (`--cluster-init`), ปิด Traefik ที่มาเป็น default ไว้ (เพราะจะลง ingress-nginx เองแทนในขั้นต่อไป) แล้ว copy kubeconfig มาไว้ที่ `~/k3s.yaml`

ตั้งค่าให้ `kubectl` ใช้ config นี้:

```bash
export KUBECONFIG=$HOME/k3s.yaml
echo 'export KUBECONFIG=$HOME/k3s.yaml' >> ~/.bashrc
```

## 3. เตรียม secret เริ่มต้น

สร้างไฟล์ `.env` ไว้ที่ root ของ repo (ค่าที่ใส่จะถูกเก็บเป็น Secret ชื่อ `initial-secret-preset`):

```bash
DUMMY=demo
MUTUAL_KEY=<กำหนดค่าเป็น key ลับของคุณเอง>
DISCORD_WEBHOOK=<Discord webhook URL สำหรับรับการแจ้งเตือน>
```

- `MUTUAL_KEY` — ใช้เป็น shared secret ระหว่าง service ต่างๆ ในระบบ please-payment (ตรวจสอบผ่าน header `X-Forward-Mutual-Key`) ตั้งเป็นค่าอะไรก็ได้ที่คาดเดายาก แต่ต้องตรงกันทุก service
- `DISCORD_WEBHOOK` — ใช้โดย addon `discord-alm` สำหรับส่งการแจ้งเตือนเข้า Discord channel

จากนั้นรัน:

```bash
bash 01-initial-secrets.bash
```

สคริปต์นี้จะ:
- รัน Job ที่ generate ค่า Secret เริ่มต้นชื่อ `initial-secret` (namespace `default`) เช่น username/password สำหรับ Git และ Grafana แบบสุ่มให้อัตโนมัติ
- สร้าง namespace `gitea` และ secret สำหรับ Git ไว้ใน namespace นั้น
- นำค่าจากไฟล์ `.env` ไปสร้างเป็น Secret เพิ่มเติม (`initial-secret-preset`)

## 4. ติดตั้ง Addons (ArgoCD, Ingress, cert-manager, external-secrets)

```bash
bash 02-initial-addons.bash
```

ลง 4 addon หลักผ่าน k3s Helm controller:
- **ArgoCD** (จะเข้าใช้งานผ่าน path `/tools/argocd` — ตั้งค่าไว้ในไฟล์ `00-configs/addons-argocd.yaml`)
- **ingress-nginx** (ผูก host port 80/443 ตรงกับเครื่อง — เหตุผลที่ต้องเปิด firewall 80/443 ในขั้นตอนก่อนหน้า)
- **cert-manager** (ออกใบรับรอง TLS ให้อัตโนมัติผ่าน Let's Encrypt)
- **external-secrets**

## 5. ติดตั้ง Monitoring (Prometheus + Grafana)

```bash
bash 03-install-monitoring.bash
```

ลง Prometheus/Grafana ใน namespace `monitoring` พร้อม config แจ้งเตือนผ่าน Discord (`03-monitoring/alm-config.yaml`)

> ⚠️ ค่า default ใน `alm-config.yaml` ชี้ไปที่ Discord webhook ของ environment dev — ถ้าจะใช้จริงบน production ต้องแก้ URL ในไฟล์นี้ก่อน

## 6. Bootstrap ArgoCD ให้ deploy แอปจริง

```bash
bash 04-boot-strap.bash dev
```

ขั้นตอนนี้ทำหลายอย่างพร้อมกัน:

1. เปิด ingress ให้เข้า ArgoCD ได้ทันทีที่ `/tools/argocd` (ก่อนจะมี domain จริงด้วยซ้ำ — เข้าผ่าน IP ได้เลย เพื่อ debug ได้ตั้งแต่ต้น)
2. เพราะรันด้วย mode `dev` สคริปต์จะแก้ `repoURL` ใน ArgoCD Application ให้ชี้ไปที่ repo **remote** บน GitHub (repo ที่ clone มานี่เอง) แทนที่จะดึงจาก Gitea ภายในคลัสเตอร์ตามค่า default
3. Apply ArgoCD Application/ApplicationSet 2 ตัว:
   - `bootstrap-data-plane` → ดึง `99-deployments/applications` จาก repo นี้ (ingress, cert-manager, monitoring, discord alert, config เสริมของ please-payment)
   - `bootstrap-please-payment-prod` → ดึงแอป please-payment จริงจาก repo `please-payment-control-plane` (admin/merchant/web/api/jobs + redis/postgresql)
4. Label คลัสเตอร์ด้วย `custom: "true"` (ไฟล์ `argocd-cluster-secret.yaml`) — จำเป็นเพราะ ApplicationSet ทั้งสองตัวใช้ cluster selector นี้เป็นตัวกรองว่าจะ deploy ที่คลัสเตอร์ไหน
5. ตั้งค่า credential ให้ ArgoCD ดึง code จาก GitHub ได้ (ไฟล์ `argocd-local-repo.yaml`)

## 7. เข้า ArgoCD และรอ sync

เปิด `http://<PUBLIC_IP>/tools/argocd`

Password เริ่มต้นของ ArgoCD (ค่า default ทั่วไป ไม่เกี่ยวกับ password ของแอป please-payment):

```bash
kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath='{.data.password}' | base64 -d
```

รอให้ทุก Application ใน ArgoCD ขึ้นสถานะ **Synced / Healthy** (รอบแรกอาจใช้เวลาหลายนาทีเพราะต้อง pull image หลายตัว)

## 8. หา password เริ่มต้นของ Please Payment Admin

Password สำหรับ login เข้าหน้า Please Payment Admin ครั้งแรก จะถูก generate และ print ไว้ใน log ของ pod ที่รัน API (`onix-api`) ตอน pod เริ่มทำงานครั้งแรกเท่านั้น:

```bash
kubectl -n please-payment-production logs deploy/please-payment-prod-onix-api | grep -i admin
```

ขั้นตอนต่อไป: [ตั้งค่า Domain และ DNS](/documents/install/domain-dns)
