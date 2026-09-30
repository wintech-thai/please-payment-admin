---
title: 4. ตั้งค่า Domain และ DNS
updatedAt: "{{BUILD_DATE}}"
---

หน้านี้อธิบายการชี้ DNS และตรวจ endpoint หลัง workloads พร้อม. ก่อน bootstrap ให้ตั้งค่า domain และอีเมลสำหรับ certificate ตามหน้า 1 แล้ว push การตั้งค่า จากนั้นทำตามขั้นตอนด้านล่างและตรวจ `Ready=True`

## 4.1 ยืนยัน hostname

ค่าหลักใน `99-deployments/manifests/please-payment/values.yaml`:

```yaml
domain1: admin.example.com
domain2: merchant.example.com
domain3: api.example.com
```

| Hostname | ใช้สำหรับ |
| --- | --- |
| `admin.<domain>` | Admin |
| `merchant.<domain>` | Merchant portal |
| `api.<domain>` | Public API |

Ingress และ certificate manifest ใช้ทั้งสาม domains

## 4.2 สร้าง DNS records

สร้าง A record สำหรับแต่ละ hostname ให้ชี้ Static public IP ของ VM:

| Type | Name | Target | Proxy |
| --- | --- | --- | --- |
| A | `admin` | `<VM_STATIC_PUBLIC_IP>` | เลือก Proxied หรือ DNS only |
| A | `merchant` | `<VM_STATIC_PUBLIC_IP>` | ใช้โหมดเดียวกัน |
| A | `api` | `<VM_STATIC_PUBLIC_IP>` | ใช้โหมดเดียวกัน |

## 4.3 ชี้ DNS ไปยัง VM

ตั้ง A records ในข้อ 4.2 ให้ชี้ไปยัง Static public IPv4 ของ VM แล้วตรวจ DNS และ certificate ตามข้อ 4.4

## 4.4 ตรวจ DNS, ingress และ TLS

จากเครื่องผู้ดูแล ตรวจ DNS:

```bash
dig +short admin.example.com
dig +short merchant.example.com
dig +short api.example.com
```

จาก VM ใช้ kubeconfig ที่ script 00 เตรียมให้:

```bash
export KUBECONFIG="$HOME/k3s.yaml"
kubectl get ingress -A
kubectl get certificate,certificaterequest,challenge,order -A
```

`cert-manager` ใช้ HTTP-01 ขอ certificate จาก Let's Encrypt จึงต้องเปิด TCP 80 ให้เข้าถึง VM และเปิด TCP 443 สำหรับ HTTPS [รายละเอียด HTTP-01](https://cert-manager.io/docs/configuration/acme/http01/)

- **DNS only หรือ DNS provider ที่ไม่ทำ proxy:** ให้ A records ชี้ตรงไปยัง Static public IP แล้วรอ certificate ทั้งสามเป็น `Ready=True`
- **Cloudflare Proxied:** ตั้งเป็น **DNS only** ระหว่างออก certificate; เมื่อทั้งสามเป็น `Ready=True` แล้วจึงเปิด **Proxied** และตั้ง SSL/TLS เป็น **Full (strict)** ห้ามใช้ **Flexible**
- **Proxy provider อื่น:** ให้ proxy ส่ง HTTP-01 challenge ถึง VM ได้ หรือปิด proxy ชั่วคราวระหว่างออก certificate

ก่อนถือว่า HTTPS พร้อม ต้องเห็น `admin-cert`, `merchant-cert`, `api-cert` เป็น `Ready=True` และ Ingress อ้าง TLS secrets ถูกต้อง. เมื่อใช้ DNS only ผล `dig` ควรเป็น Static public IP ของ VM; เมื่อใช้ Cloudflare Proxied อาจเห็น Cloudflare IP ซึ่งเป็นปกติ

## 4.5 ทดสอบ endpoints หลัง TLS พร้อม

```bash
curl -sSIL --max-time 20 https://admin.example.com
curl -sSIL --max-time 20 https://merchant.example.com
curl -sSIL --max-time 20 https://api.example.com
```

Admin และ Merchant ควรตอบหน้า login หรือ redirect ตามปกติ. API root อาจตอบ `404` ได้หากไม่มี route `/` แต่การเชื่อมต่อ TLS ต้องสำเร็จ

เครื่องมือใน `/tools` ให้เข้าผ่าน Static public IPv4 ของ VM โดยใช้ HTTPS เช่น `https://<ip-address>/tools/argocd`, `https://<ip-address>/tools/grafana-k8s` และ `https://<ip-address>/tools/grafana-loki` ตามหน้า [5. ตรวจสอบหลังติดตั้ง](./misc)

## 4.6 Checklist

- ⬜ `domain1`–`domain3` ตรงกับค่าใน `values.yaml`
- ⬜ DNS records ทั้งสามชี้ Static public IP ที่ถูกต้อง
- ⬜ มี certificate และ TLS secret สำหรับทุก hostname; ตรวจ `Ready=True`
- ⬜ หากใช้ Proxied ตั้ง Cloudflare SSL/TLS เป็น Full (strict) หลัง origin TLS พร้อม; หากใช้ DNS only ให้ยืนยัน certificate ที่ origin โดยตรง
- ⬜ Admin, Merchant และ API endpoints ตอบตามที่คาด
- ⬜ เข้าเครื่องมือใน `/tools` ผ่าน `https://<ip-address>` ได้

ขั้นตอนถัดไป: [5. ตรวจสอบหลังติดตั้ง](./misc)
