---
title: ภาพรวม
updatedAt: "{{BUILD_DATE}}"
---

# คู่มือการติดตั้ง Please Payment

เอกสารชุดนี้อธิบาย **วิธีติดตั้ง** Please Payment บนเครื่อง server ของคุณเอง โดยใช้ K3s (Kubernetes แบบเบา) และ ArgoCD สำหรับ deploy อัตโนมัติ

> เอกสารนี้ครอบคลุมเฉพาะขั้นตอนการติดตั้ง ไม่รวมวิธีการใช้งานระบบ (ดูวิธีใช้งาน API ได้ที่ [API Reference](/documents/overview))

## สิ่งที่ต้องเตรียม

- บัญชี Cloud provider ที่รองรับ SSH เข้าเครื่องได้ (ตัวอย่างในเอกสารนี้ใช้ Google Cloud Platform)
- โดเมนของคุณเอง (สำหรับชี้ไปที่หน้า admin และ merchant)
- ความรู้พื้นฐานเรื่อง Linux command line

## ขั้นตอนโดยสรุป

1. [เตรียมเครื่อง VM](/documents/install/prepare-vm) — สร้างเครื่องเปล่าบน Cloud
2. [ติดตั้ง K3s + ArgoCD](/documents/install/install-k3s) — ลงตัว cluster และระบบ deploy อัตโนมัติ
3. [ตั้งค่า Domain และ DNS](/documents/install/domain-dns) — ชี้โดเมนของคุณมาที่เครื่อง

## รูปแบบการติดตั้งที่รองรับ

- **K3s** (แนะนำ) — สำหรับทดลองใช้งานจริงบนเครื่องเดียว
- **Docker Compose** — *(เร็วๆ นี้)*
