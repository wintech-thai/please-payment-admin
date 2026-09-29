---
title: 5. ตรวจสอบหลังติดตั้ง
updatedAt: "{{BUILD_DATE}}"
---

ทำหน้านี้หลัง workloads พร้อมและตั้ง DNS แล้ว. HTTPS ต้องมี origin certificate ที่ใช้งานได้ตามหน้า 4. ตรวจ Admin และเปลี่ยน seed password ก่อนตรวจเครื่องมือดูแล

## 5.1 เข้า Please Payment Admin ครั้งแรก

API สร้างบัญชี `admin` ระหว่าง database migration และเขียน seed password ลง startup log. อ่าน log ใน terminal ส่วนตัวเท่านั้น:

```bash
export KUBECONFIG="$HOME/k3s.yaml"
kubectl logs -n please-payment-production \
  deploy/please-payment-prod-onix-api --all-containers=true \
  | grep 'MigrateUsers : Added'
```

ใช้ชื่อผู้ใช้ `admin` และ seed password ที่ `https://admin.example.com/login` แล้วเปลี่ยนรหัสผ่านทันที. อย่าเก็บรหัสผ่านใน Git, `.env`, ticket หรือ screenshot.

<figure class="install-evidence">
<img src="/docs/images/install/step-5.1-admin-seed.png" alt="ตัวอย่าง log ยืนยันการสร้าง admin โดยปิดบัง seed password" />
<figcaption>ภาพที่ 5.1 Log ยืนยันการสร้างบัญชี Admin</figcaption>
</figure>

หากไม่พบข้อความ ให้ตรวจ pod และ log ล่าสุดใน terminal ส่วนตัว:

```bash
kubectl get pods -n please-payment-production
kubectl logs -n please-payment-production deploy/please-payment-prod-onix-api \
  --all-containers=true --tail=200
```

## 5.2 เข้า Argo CD

เปิด `https://admin.example.com/tool/argocd` บัญชีเริ่มต้นคือ `admin`. รันคำสั่งนี้ใน terminal ส่วนตัวเพื่ออ่าน initial password:

```bash
kubectl -n argocd get secret argocd-initial-admin-secret \
  -o jsonpath='{.data.password}' | base64 -d; echo
```

เก็บรหัสผ่านใน password manager และเปลี่ยนตามนโยบาย. ห้าม commit หรือ screenshot รหัสผ่าน

ตรวจว่า applications หลักเป็น `Synced` และ `Healthy`:

```bash
kubectl get applications -n argocd
```

<figure class="install-evidence">
<img src="/docs/images/install/step-5-2-argocd.png" alt="ตัวอย่างผล kubectl get applications ที่ทุก application เป็น Synced และ Healthy" />
<figcaption>ภาพที่ 5.2 สถานะ Applications ใน Argo CD</figcaption>
</figure>

## 5.3 ดู CPU และ memory

เปิด `https://admin.example.com/tool/grafana-k8s` เพื่อดู metrics ของ node และ pods. หากต้องใช้ credentials เริ่มต้น ให้อ่านใน terminal ส่วนตัวเท่านั้น:

```bash
kubectl get secret initial-secret -n default \
  -o jsonpath='{.data.GRAFANA_USER}' | base64 -d; echo
kubectl get secret initial-secret -n default \
  -o jsonpath='{.data.GRAFANA_PASSWORD}' | base64 -d; echo
```

ตรวจว่า Grafana และ metrics components ทำงาน:

```bash
kubectl get pods -n monitoring
```

<figure class="install-evidence">
<img src="/docs/images/install/step-5-3-grafana.png" alt="ตัวอย่างผลตรวจ pods ของ Grafana และ Prometheus components ในสถานะ Running" />
<figcaption>ภาพที่ 5.3 สถานะ Grafana และ Metrics</figcaption>
</figure>

## 5.4 ดู logs

เปิด Grafana Loki ที่ `https://admin.example.com/tool/grafana-loki` เพื่อค้นหาและดู log. หากยังเข้าไม่ได้ ให้ตรวจ pod และ service ใน namespace `loki-log` ก่อน

```bash
kubectl get pods -n loki-log
```

<figure class="install-evidence">
<img src="/docs/images/install/step-5-4-loki.png" alt="ตัวอย่างผลตรวจ pods ของ Loki, Grafana และ Promtail ในสถานะ Running" />
<figcaption>ภาพที่ 5.4 สถานะ Loki และ Log Collection</figcaption>
</figure>

## 5.5 ตรวจสุขภาพระบบ

ใช้ kubeconfig ที่ script 00 คัดลอกไว้ใน home directory:

```bash
export KUBECONFIG="$HOME/k3s.yaml"
kubectl get nodes -o wide
kubectl get applications -n argocd
kubectl get pods -A
kubectl get pvc -A
kubectl get ingress,certificate -A
findmnt -T /data
df -hT /data
```

ผลที่ควรได้หลังแก้ส่วนที่ template ยังขาด:

- node เป็น `Ready`
- Applications หลักเป็น `Synced` และ `Healthy`
- pods สำคัญอยู่ใน `Running` หรือ `Completed` ตามชนิดงาน
- PVC เป็น `Bound`
- certificate ทุก hostname เป็น `Ready=True` หลังติดตั้ง certificate manifests ที่รองรับแล้ว
- `/data` ใช้ filesystem และพื้นที่ตามแผน

## 5.6 ตรวจ scheduled jobs

```bash
kubectl get cronjobs,jobs -n please-payment-production
kubectl describe cronjob payment-cleanup -n please-payment-production
```

`payment-cleanup` ต้องมี API key ที่ backend อนุมัติสำหรับงานนี้. ห้ามสร้างหรือฝัง API key ลง Git, manifest หรือ screenshot

หาก job แจ้งว่าไม่พบ API key ชื่อ `payment-cleanup` ให้ผู้ดูแลที่ได้รับสิทธิ์เปิด **Administrator → API Keys** แล้วตรวจหรือสร้าง key ชื่อนี้ให้มีสถานะ Active และกำหนดสิทธิ์เท่าที่จำเป็น เก็บค่า key ไว้ใน password manager เท่านั้น; อย่าใส่ใน `.env` หรือ manifest

ห้ามนำค่า secret หรือ raw log ที่มีข้อมูลลับไปเก็บใน Git, ticket, chat หรือ screenshot

## 5.7 Discord alerts

template มี `discord-alm` application และ Alertmanager routing config. การส่งจริงขึ้นกับ `DISCORD_WEBHOOK` ใน initial secret; หลังตั้งค่าแล้วให้ทดสอบการแจ้งเตือนตามนโยบายของระบบ

```bash
kubectl get pods -n discord-alm
```

## 5.8 Checklist ตรวจสอบหลังติดตั้ง

- ⬜ เข้า Admin ได้และเปลี่ยน seed password แล้ว
- ⬜ เข้า Argo CD ได้และเก็บ credentials อย่างปลอดภัย
- ⬜ Applications หลักเป็น `Synced/Healthy`
- ⬜ Grafana Kubernetes และ Grafana Loki เปิดได้
- ⬜ ตรวจ certificate ของทุก hostname แล้ว
- ⬜ ตรวจ `payment-cleanup` และ scheduled jobs แล้ว
- ⬜ ตรวจ pod ของ `discord-alm` และทดสอบการส่ง alert แล้ว
- ⬜ จำกัด permission `.env` บน VM และไม่ commit ไฟล์
