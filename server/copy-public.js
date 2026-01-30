// copy-public.js - نسخ مجلد public إلى dist
const fs = require('fs');
const path = require('path');

const sourceDir = path.join(__dirname, 'public');
const targetDir = path.join(__dirname, 'dist', 'public');

// إنشاء مجلد dist/public إذا لم يكن موجوداً
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

// نسخ جميع الملفات
function copyFiles(source, target) {
  const files = fs.readdirSync(source);
  
  files.forEach(file => {
    const sourcePath = path.join(source, file);
    const targetPath = path.join(target, file);
    
    if (fs.statSync(sourcePath).isDirectory()) {
      if (!fs.existsSync(targetPath)) {
        fs.mkdirSync(targetPath, { recursive: true });
      }
      copyFiles(sourcePath, targetPath);
    } else {
      fs.copyFileSync(sourcePath, targetPath);
      console.log(`✅ Copied: ${file}`);
    }
  });
}

console.log('📦 Copying public files to dist...');
copyFiles(sourceDir, targetDir);
console.log('✅ Public files copied successfully!');
