# 🗑️ مسح Push Tokens القديمة

## ⏰ انتظر 2-3 دقائق حتى يتم Deploy على Railway

ثم افتح هذا الرابط في المتصفح:

```
https://ict-ai-trader-production.up.railway.app/api/auth/clear-all-push-tokens
```

أو استخدم curl:

```bash
curl -X POST https://ict-ai-trader-production.up.railway.app/api/auth/clear-all-push-tokens
```

---

## ✅ النتيجة المتوقعة:

```json
{
  "success": true,
  "message": "تم مسح 6 push token بنجاح",
  "clearedCount": 6,
  "totalUsers": 6
}
```

---

## 📱 بعد المسح:

1. ✅ ابني APK جديد
2. ✅ وزعه على المستخدمين
3. ✅ عند فتح التطبيق، سيتم تسجيل Push Token جديد
4. ✅ الإشعارات ستعمل!

---

## 🧪 للتحقق:

```bash
# قبل المسح
curl https://ict-ai-trader-production.up.railway.app/api/auth/list-push-tokens

# بعد المسح
curl https://ict-ai-trader-production.up.railway.app/api/auth/list-push-tokens
```
