---
title: ภาพรวม
updatedAt: "{{BUILD_DATE}}"
---

# คู่มือติดตั้งโปรแกรมบนเซิร์ฟเวอร์ของคุณ

คู่มือนี้อธิบายการเตรียม VM และการเริ่มระบบจาก repository [`please-payment-k3s-demo`](https://github.com/wintech-thai/please-payment-k3s-demo) โดยเรียงจากเตรียม source code ไปจนถึงตรวจรับระบบ

## ลำดับการติดตั้ง

1. [เตรียม source code](./prepare-source-code) — ตั้ง repository และตรวจสิทธิ์เข้าถึง source ที่ระบบต้องใช้
2. [เตรียม VM](./prepare-vm) — เตรียม Ubuntu, disk, public IP และ firewall
3. [ติดตั้งระบบ](./install-k3s) — รัน scripts ตามลำดับและตรวจ K3s/Argo CD
4. [ตั้งค่า Domain & DNS](./domain-dns) — กำหนด DNS และตรวจการเชื่อมต่อ
5. [ตรวจสอบหลังติดตั้ง](./misc) — เข้าเครื่องมือ ตรวจ workload, jobs และ credentials

## สิ่งที่ต้องเตรียมก่อนเริ่ม

| รายการ | ข้อกำหนด |
| --- | --- |
| Template | Clone `please-payment-k3s-demo` จาก GitHub |
| Source repositories | สิทธิ์อ่าน repositories ที่ระบุใน bootstrap และ Argo CD applications; template อ้างถึง repository แยกสำหรับ application/control-plane |
| VM | Ubuntu LTS, แนะนำ 8 vCPU / 32 GiB RAM / 300 GiB SSD |
| Network | Static public IPv4, TCP 22 จำกัดเฉพาะผู้ดูแล, TCP 80/443 เปิดรับจากอินเทอร์เน็ต |
| Domain | Hostnames สำหรับ Admin, Merchant และ API (`domain1`–`domain3`) |
| Secrets | ค่าเริ่มต้นจาก secret-init Job และ Discord Incoming Webhook สำหรับ `discord-alm` |

เก็บ password, token, private key และ webhook ไว้นอก Git เสมอ

## ส่วนประกอบใน template

![ผังส่วนประกอบหลักของระบบ](/install-guide/please-payment-architecture.svg)

template ประกอบด้วย K3s, ingress-nginx, cert-manager, External Secrets Operator, Argo CD, แอปพลิเคชันหลัก, PostgreSQL/Redis, monitoring, logs และ Discord alerts. รายการ applications มี `discord-alm` ซึ่งใช้ `DISCORD_WEBHOOK`

## ผลลัพธ์ที่คาดหวัง

- Node ของ K3s เป็น `Ready` และ Argo CD สร้าง Applications ตาม manifests ที่ sync ได้
- Workloads และ PVC แสดงสถานะพร้อมตามที่ระบบต้องการ
- Admin, Merchant และ API เข้าถึงได้เมื่อ DNS, ingress และ origin TLS ถูกตั้งค่าครบ
- Metrics, logs และ alerts พร้อมตรวจรับตามขั้นตอนในคู่มือ

เริ่มที่ [1. เตรียม source code](./prepare-source-code)
