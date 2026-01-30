#!/bin/bash

# Script لرفع التحديثات إلى السيرفر

echo "🚀 بدء عملية الرفع..."

# التحقق من وجود تغييرات
if [[ -z $(git status -s) ]]; then
    echo "✅ لا توجد تغييرات للرفع"
    exit 0
fi

# عرض الملفات المعدلة
echo "📝 الملفات المعدلة:"
git status -s

# تأكيد الرفع
read -p "هل تريد رفع هذه التغييرات؟ (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ تم إلغاء الرفع"
    exit 1
fi

# إضافة الملفات
echo "📦 إضافة الملفات..."
git add server/src/services/aiService.ts
git add server/src/index.ts

# عمل commit
echo "💾 حفظ التغييرات..."
read -p "أدخل رسالة الـ commit: " commit_message
if [[ -z "$commit_message" ]]; then
    commit_message="تحديث: تبسيط AI وإضافة manual-trade"
fi
git commit -m "$commit_message"

# رفع إلى GitHub
echo "⬆️ رفع إلى GitHub..."
git push origin main

if [ $? -eq 0 ]; then
    echo "✅ تم الرفع بنجاح!"
    echo "🔄 Railway سيقوم بالتحديث تلقائياً..."
    echo "⏳ انتظر 1-2 دقيقة ثم تحقق من السيرفر"
else
    echo "❌ فشل الرفع! تحقق من الأخطاء أعلاه"
    exit 1
fi

# عرض logs (اختياري)
read -p "هل تريد مشاهدة logs السيرفر؟ (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "📊 جاري عرض logs..."
    railway logs --tail
fi
