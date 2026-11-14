# studio — คลังชิ้นส่วนวิดีโอ 2.5D

Remotion + Three.js: ฉากเป็นสามมิติ ตัวละครเป็นแผ่น 2D ที่วางในฉากด้วยกล้องตัวเดียวกัน

## โครงสร้าง

| ไฟล์ | หน้าที่ |
|---|---|
| `src/lib.ts` | ฟอนต์ ตัวสุ่มแบบ seed กล้อง และการฉายจุดสามมิติลงจอ |
| `src/Character.tsx` | ตัวละครการ์ตูน: ท่าเดิน สีหน้า ชุด |
| `src/Tall.tsx` | ตัวละครสัดส่วนสูงสำหรับฉากกลางคืน |
| `src/Village.tsx` | ฉากหมู่บ้านกลางวัน |
| `src/NightRoom.tsx` | ฉากห้องนอนเรือนไม้กลางคืน |
| `src/Demo.tsx`, `src/Night.tsx` | คลิปตัวอย่างสองเรื่อง |
| `render.json` | คิวเรนเดอร์: รายชื่อคลิปที่ให้ GitHub Actions เรนเดอร์ |

## ใช้งาน

```sh
npm ci
npx remotion studio            # พรีวิว
npx remotion render Demo out/demo.mp4
```

แก้ `render.json` แล้ว push เพื่อสั่งเรนเดอร์บน GitHub Actions ไฟล์ MP4 อยู่ในหน้า Actions ของแต่ละรอบ

ฟอนต์ Kanit ใช้สัญญาอนุญาต SIL Open Font License
