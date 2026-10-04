---
title: 1. เตรียม source code
updatedAt: "{{BUILD_DATE}}"
---

ขั้นตอนนี้เตรียม source code สำหรับใช้รัน scripts และให้ Argo CD โหลด manifests

## 1.1 สร้าง repository สำหรับการติดตั้ง

สร้าง repository ใหม่ใน Git hosting ของคุณโดยใช้ branch `main` แล้วนำ [`please-payment-k3s-demo`](https://github.com/wintech-thai/please-payment-k3s-demo) มาใช้เป็น template ของ repository นี้ เพื่อให้ปรับค่าได้โดยไม่แก้ template ต้นทาง

## 1.2 ตรวจ source repositories

เตรียม URL และสิทธิ์อ่าน repository ที่สร้างในข้อ 1.1 สำหรับ VM และ Argo CD แล้วทดสอบ clone ในข้อ 3.1 และเชื่อม repository ในข้อ 3.5 เพราะหลังรัน bootstrap Argo CD จะอ่าน manifests จาก repository นี้

- **Public repository:** VM และ Argo CD อ่านผ่าน URL ได้โดยไม่ต้องตั้ง credentials
- **Private repository:** เตรียมสิทธิ์อ่านสำหรับ clone บน VM และ credentials แบบอ่านอย่างเดียวสำหรับ Argo CD แยกกัน โดยเชื่อม repository ในข้อ [3.5](./install-k3s#35-เริ่ม-sync-applications-ด้วย-script-04) สิทธิ์ที่ใช้ clone บน VM ไม่ได้ถูกส่งให้ Argo CD อัตโนมัติ

## 1.3 ตั้งค่าที่จำเป็นก่อนติดตั้ง

แก้เฉพาะค่า source code ที่เกี่ยวกับการติดตั้งนี้ตามลำดับที่ scripts ใช้:

| Script | เปิดไฟล์ | สิ่งที่ต้องทำ |
| --- | --- | --- |
| `04-boot-strap.bash` | `04-boot-strap.bash` | ตั้ง `DATA_PLANE_REMOTE_REPO` ให้เป็น URL ของ repository ที่สร้างในข้อ 1.1 |
| `04-boot-strap.bash` | `99-deployments/applications/*.yaml` | เปลี่ยน `repoURL` ที่อ้างถึง template ให้ชี้ไป repository เดียวกัน |
| `04-boot-strap.bash` | `99-deployments/manifests/please-payment/values.yaml` | ตั้ง `domain1`, `domain2` และ `domain3` เป็น hostname ของ Admin, Merchant และ API |
| `04-boot-strap.bash` | `99-deployments/manifests/cert-manager/templates/cluster-issuer-dns.yaml` | เปลี่ยน `email` เป็นอีเมลที่ใช้รับแจ้งเตือนการต่ออายุ certificate |

ตรวจว่า hostname ใน `99-deployments/manifests/please-payment/templates/please-payment-cert.yaml` อ้างถึงค่า `domain1`–`domain3` จาก `values.yaml` แล้วจึง push source code ที่แก้ไขไปยัง repository ของคุณก่อนรัน bootstrap

## 1.4 ค่า secret บน VM

อย่าใส่ secret ใน repository. ก่อนรัน `01-initial-secrets.bash` ให้เตรียมไฟล์ `.env` บน VM ตามหน้า [3. ติดตั้งระบบ](./install-k3s) โดยตั้ง `DISCORD_WEBHOOK` ให้ ExternalSecret ของ `discord-alm`

## Checklist

- ⬜ สร้าง repository ใหม่บน branch `main` และนำ template ไปไว้แล้ว
- ⬜ เตรียม URL และสิทธิ์อ่าน repository สำหรับ VM และ Argo CD แล้ว
- ⬜ ตั้ง `domain1`–`domain3` และอีเมลใน ClusterIssuer แล้ว
- ⬜ เปลี่ยน repository URL ใน bootstrap และ Application manifests แล้ว
- ⬜ push source code ที่แก้ไขไปยัง repository ก่อนติดตั้ง

ขั้นตอนถัดไป: [2. เตรียม VM](./prepare-vm)
