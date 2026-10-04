---
title: 2. เตรียม VM
updatedAt: "{{BUILD_DATE}}"
---

ขั้นตอนนี้ใช้เตรียม VM ให้พร้อมสำหรับติดตั้งโปรแกรม เมื่อทำเสร็จ จะมี Ubuntu VM ที่มีทรัพยากรเพียงพอ, มี Static Public IP และเข้าถึงผ่าน SSH ได้อย่างปลอดภัย ตัวอย่างในหน้านี้ใช้ Google Cloud Platform แต่ใช้หลักการเดียวกันได้กับ cloud provider อื่นหรือเครื่อง on-premises

## 2.1 VM ที่ต้องเตรียม

เตรียม VM หนึ่งเครื่องสำหรับรันบริการทั้งหมด ได้แก่ application, PostgreSQL, Redis, Argo CD, monitoring และ logs

## 2.2 สเปก VM ที่แนะนำ

| รายการ | ข้อกำหนดที่แนะนำ |
| --- | --- |
| Operating system | Ubuntu LTS รุ่นปัจจุบันที่รองรับ K3s |
| CPU | **อย่างน้อย 8 vCPU** |
| Memory | **อย่างน้อย 16 GiB** |
| Disk | **อย่างน้อย 200 GiB SSD** |
| IP | Static public IPv4 |

Disk ใช้เก็บข้อมูล PostgreSQL, Redis, container images, metrics และ logs จึงควรใช้ SSD และจองขนาดให้เพียงพอตั้งแต่เริ่มต้น

## 2.3 ตัวอย่าง: สร้าง VM บน GCP

1. เปิด **Compute Engine → VM instances → Create instance**
2. เลือก region และ zone ที่ต้องการใช้งาน
3. เลือก Ubuntu LTS เป็น operating system
4. เลือก series **E2 → Custom** แล้วตั้ง **8 vCPU / RAM 16 GiB** หรือเลือกขนาดที่มีทรัพยากรไม่น้อยกว่านี้ ดู [วิธีสร้าง Custom machine type](https://docs.cloud.google.com/compute/docs/instances/creating-instance-with-custom-machine-type)
5. ตั้ง boot disk เป็น SSD ขนาดอย่างน้อย 200 GiB
6. สร้าง Static external IPv4 แล้วผูกกับ VM เพื่อให้ IP ไม่เปลี่ยนเมื่อ stop หรือ start เครื่อง
7. เพิ่ม network tag เช่น `application-server` เพื่อใช้กับ firewall rules ในหัวข้อถัดไป

## 2.4 ตั้งค่า network และ firewall

สร้าง firewall rules สำหรับ network tag ของ VM ตามตารางนี้:

| Port | อนุญาตจาก | ใช้สำหรับ |
| --- | --- | --- |
| TCP 22 | IP ผู้ดูแล `/32` | SSH ติดตั้งและดูแลระบบ |
| TCP 80 | `0.0.0.0/0` | HTTP ingress และ Let's Encrypt HTTP-01 |
| TCP 443 | `0.0.0.0/0` | HTTPS สำหรับ Admin, Merchant และ API |

ใช้ IP ผู้ดูแลปัจจุบันเป็น source ของ TCP 22 และเปิด TCP 80/443 สำหรับผู้ใช้งานระบบ

## 2.5 ตรวจว่า VM พร้อม

SSH เข้า VM แล้วรันคำสั่งนี้เพื่อยืนยันว่า OS, CPU, memory และ disk ตรงตามสเปกก่อนเริ่มติดตั้ง:

```bash
lsb_release -a
nproc
free -h
sudo mkdir -p /data
lsblk -f
findmnt -T /data || true
df -hT /data
```

K3s ใน template กำหนด local storage path เป็น `/data`. หากใช้ disk แยก ให้ mount disk นั้นที่ `/data` ก่อนรัน script 00; หากยังไม่ได้ mount, `/data` จะใช้ filesystem ของ root disk. ตรวจ `lsblk -f`, `findmnt -T /data` และ `df -hT /data` ว่าแสดง filesystem และพื้นที่ของ disk ที่ตั้งใจใช้ อย่าตรวจเฉพาะ `/` เมื่อวางแผนใช้ disk แยก

ผลที่คาดหวังคือ SSH ใช้งานได้, Ubuntu พร้อมใช้งาน, มีอย่างน้อย 8 vCPU, RAM 16 GiB และ filesystem ที่ `/data` มีพื้นที่ตามแผน ภาพประกอบเป็นผลจาก VM ตัวอย่างที่มีทรัพยากรมากกว่าสเปกแนะนำ

<figure class="install-evidence">
<img src="/docs/images/install/step-2.5-vm-ready.png" alt="ตัวอย่างผลตรวจ CPU, memory และ disk ของ VM" />
<figcaption>ภาพที่ 2.5 ผลตรวจความพร้อมของ VM</figcaption>
</figure>

## 2.6 Checklist

- ⬜ สร้าง Ubuntu VM ที่มีอย่างน้อย 8 vCPU, RAM 16 GiB และ SSD 200 GiB ตามขนาดแนะนำ
- ⬜ ผูก Static public IP แล้ว
- ⬜ จำกัด SSH เฉพาะ IP ผู้ดูแล
- ⬜ เปิด TCP 80/443 แล้ว
- ⬜ SSH เข้า VM และตรวจ OS, CPU, memory และ filesystem ที่ `/data` แล้ว; mount disk แยกก่อนติดตั้งหากใช้

ขั้นตอนถัดไป: [3. ติดตั้งระบบ](./install-k3s)
