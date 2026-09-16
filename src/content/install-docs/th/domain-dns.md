---
title: "3. ตั้งค่า Domain และ DNS"
updatedAt: "{{BUILD_DATE}}"
---

# ตั้งค่า Domain และ DNS

ระบบต้องใช้ **4 subdomain** ชี้มาที่เครื่องเดียวกัน:

| Subdomain (ตัวอย่าง) | ใช้สำหรับ |
|---|---|
| `admin.yourdomain.com` | Please Payment Admin |
| `merchant.yourdomain.com` | Please Payment Merchant |
| `api.yourdomain.com` | Public API |
| `docs.yourdomain.com` | API Documentation (proxy ไปที่ path `/documents` ของ admin) |

## 1. แก้ domain ในโค้ด

แก้ไฟล์ `99-deployments/manifests/please-payment/values.yaml` ใน repo ของคุณ ให้เป็นโดเมนของคุณเอง:

```yaml
domain1: admin.yourdomain.com
domain2: merchant.yourdomain.com
domain3: api.yourdomain.com
domain4: docs.yourdomain.com
```

Commit + push ขึ้น repo แล้วรอ ArgoCD sync (Application `please-payment-custom` ตั้งค่า `selfHeal: false` ไว้ — ถ้าไม่ auto sync ให้กด **Sync** เองในหน้า ArgoCD)

## 2. ตั้งค่า DNS

สร้าง A record ทั้ง 4 subdomain ให้ชี้ไปที่ **Public IP** ของเครื่อง VM ที่สร้างไว้

ถ้าใช้ **Cloudflare** เป็นผู้ดูแล DNS มีให้เลือก 2 แบบ:

- **Proxy mode (ไอคอนเมฆสีส้ม)** — Cloudflare จะออก certificate (HTTPS) ให้อัตโนมัติที่ฝั่ง edge เลย ไม่ต้องพึ่ง cert-manager บนเครื่องเรา ง่ายกว่า แนะนำให้ใช้แบบนี้ก่อน
- **DNS only (ไอคอนเมฆสีเทา)** — traffic วิ่งตรงเข้าเครื่องเราเลย กรณีนี้ cert-manager (ที่ลงไว้ใน addons) จะเป็นคนขอ certificate จาก Let's Encrypt เองผ่าน HTTP-01 challenge (ต้องเปิด port 80 ให้เข้าถึงได้จากอินเทอร์เน็ตจริง)

> ดูความแตกต่างเพิ่มเติม: [Cloudflare SSL/TLS encryption modes](https://developers.cloudflare.com/ssl/origin-configuration/ssl-modes/)

## 3. ตรวจสอบ

รอ DNS propagate (โดยทั่วไปไม่กี่นาที) แล้วเข้าทดสอบ:

- `https://admin.yourdomain.com` → หน้า login Please Payment Admin
- `https://merchant.yourdomain.com` → หน้า login Please Payment Merchant
- `https://api.yourdomain.com` → Public API
- `https://docs.yourdomain.com` → เอกสาร API

ถ้าเลือกใช้ **DNS only** และ cert-manager ยัง issue certificate ไม่สำเร็จ ตรวจสอบสถานะได้ด้วย:

```bash
kubectl get certificate -A
kubectl describe certificate admin-cert
```

---

เมื่อเสร็จทั้ง 3 ขั้นตอนแล้ว ระบบ Please Payment ก็พร้อมใช้งานบนเครื่องของคุณเอง 🎉
