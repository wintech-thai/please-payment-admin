---
title: "1. เตรียมเครื่อง VM (GCP)"
updatedAt: "{{BUILD_DATE}}"
---

# เตรียมเครื่อง VM

ตัวอย่างนี้ใช้ **Google Cloud Platform (GCP)** แต่จริงๆ ใช้ Cloud provider เจ้าไหนก็ได้ ขอแค่ SSH เข้าเครื่องได้และเปิด public IP ได้

## 1. สร้าง Compute Engine VM

1. เปิด **Compute Engine > VM instances > Create Instance**
2. ตั้งชื่อเครื่อง เช่น `please-payment-demo`
3. **Region/Zone**: เลือกใกล้ผู้ใช้งาน (ตัวอย่างใช้ Singapore — `asia-southeast1`)
4. **Machine type**: อย่างน้อย **4 vCPU / 16 GB RAM** (สเปกเล็กกว่านี้ทดสอบแล้วไม่พอสำหรับรัน k3s + ArgoCD + Prometheus + please-payment ทั้งชุด)
5. **Boot disk**: Ubuntu 24.04 LTS หรือ 26.04 LTS, ขนาด **300 GB**
6. **Networking**: ต้องมี **Public IP** (ค่า default ของ GCP จะสร้างให้อยู่แล้ว เช็คให้แน่ใจว่าไม่ได้ปิดไว้)

## 2. ตั้งค่า Firewall

k3s ใช้ ingress-nginx แบบ `hostPort` (ผูกกับ port ของเครื่องโดยตรง ไม่ผ่าน Cloud Load Balancer) ดังนั้นต้องเปิด port 80/443 ที่ระดับ Cloud firewall เอง:

1. สร้าง **Firewall rule** ใหม่ (VPC network > Firewall):
   - Direction: Ingress
   - Targets: Specified target tags (เช่น `please-payment-demo`)
   - Source IP ranges: `0.0.0.0/0`
   - Protocols/ports: `tcp:80,443` (เพิ่ม `tcp:22` ด้วยถ้ายังไม่มี rule สำหรับ SSH)
2. กลับไปที่ VM instance ที่สร้างไว้ → ใส่ **Network tag** ให้ตรงกับ tag ที่ตั้งใน firewall rule (เช่น `please-payment-demo`)

> ดูรายละเอียดเพิ่มเติมเรื่อง Network tags/Firewall ได้ที่ [เอกสาร GCP Firewall rules](https://cloud.google.com/firewall/docs/firewalls)

## 3. เตรียมเครื่องก่อนติดตั้ง

SSH เข้าเครื่องที่สร้างไว้ แล้วรัน:

```bash
sudo apt update
sudo apt install -y git vim
```

เครื่อง Ubuntu ใหม่มักไม่มี `git` ติดตั้งมาให้ตั้งแต่แรก ต้องลงเองก่อนจะ clone repo ในขั้นตอนถัดไป

ขั้นตอนต่อไป: [ติดตั้ง K3s + ArgoCD](/documents/install/install-k3s)
