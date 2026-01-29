// create-icons.js
// سكريبت لإنشاء الأيقونات

const fs = require('fs');
const path = require('path');

// إنشاء صورة PNG بسيطة (1x1 pixel شفاف ثم تكبيرها)
// هذه صورة PNG بسيطة بخلفية داكنة مع نص ICT

// PNG header + IHDR + IDAT + IEND للون أخضر داكن
function createSimplePNG(width, height, r, g, b) {
  const { createCanvas } = require('canvas');
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  
  // خلفية داكنة
  ctx.fillStyle = '#0d1117';
  ctx.fillRect(0, 0, width, height);
  
  // مربع أخضر في الوسط
  const boxSize = Math.min(width, height) * 0.6;
  const boxX = (width - boxSize) / 2;
  const boxY = (height - boxSize) / 2;
  
  // تدرج أخضر
  const gradient = ctx.createLinearGradient(boxX, boxY, boxX + boxSize, boxY + boxSize);
  gradient.addColorStop(0, '#10b981');
  gradient.addColorStop(1, '#059669');
  
  // رسم مربع مستدير
  const radius = boxSize * 0.15;
  ctx.beginPath();
  ctx.moveTo(boxX + radius, boxY);
  ctx.lineTo(boxX + boxSize - radius, boxY);
  ctx.quadraticCurveTo(boxX + boxSize, boxY, boxX + boxSize, boxY + radius);
  ctx.lineTo(boxX + boxSize, boxY + boxSize - radius);
  ctx.quadraticCurveTo(boxX + boxSize, boxY + boxSize, boxX + boxSize - radius, boxY + boxSize);
  ctx.lineTo(boxX + radius, boxY + boxSize);
  ctx.quadraticCurveTo(boxX, boxY + boxSize, boxX, boxY + boxSize - radius);
  ctx.lineTo(boxX, boxY + radius);
  ctx.quadraticCurveTo(boxX, boxY, boxX + radius, boxY);
  ctx.closePath();
  ctx.fillStyle = gradient;
  ctx.fill();
  
  // نص ICT
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${boxSize * 0.35}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('ICT', width / 2, height / 2);
  
  return canvas.toBuffer('image/png');
}

function createNotificationIcon(size) {
  const { createCanvas } = require('canvas');
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  
  // خلفية شفافة
  ctx.clearRect(0, 0, size, size);
  
  // دائرة خضراء
  ctx.fillStyle = '#10b981';
  ctx.beginPath();
  ctx.arc(size/2, size/2, size/2 - 2, 0, Math.PI * 2);
  ctx.fill();
  
  // نص $
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${size * 0.5}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('$', size / 2, size / 2);
  
  return canvas.toBuffer('image/png');
}

function createSplashScreen(width, height) {
  const { createCanvas } = require('canvas');
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  
  // خلفية داكنة
  ctx.fillStyle = '#0d1117';
  ctx.fillRect(0, 0, width, height);
  
  // مربع في الوسط
  const boxSize = Math.min(width, height) * 0.25;
  const boxX = (width - boxSize) / 2;
  const boxY = (height - boxSize) / 2 - height * 0.1;
  
  // تدرج
  const gradient = ctx.createLinearGradient(boxX, boxY, boxX + boxSize, boxY + boxSize);
  gradient.addColorStop(0, '#6366f1');
  gradient.addColorStop(1, '#4f46e5');
  
  // مربع مستدير
  const radius = boxSize * 0.2;
  ctx.beginPath();
  ctx.moveTo(boxX + radius, boxY);
  ctx.lineTo(boxX + boxSize - radius, boxY);
  ctx.quadraticCurveTo(boxX + boxSize, boxY, boxX + boxSize, boxY + radius);
  ctx.lineTo(boxX + boxSize, boxY + boxSize - radius);
  ctx.quadraticCurveTo(boxX + boxSize, boxY + boxSize, boxX + boxSize - radius, boxY + boxSize);
  ctx.lineTo(boxX + radius, boxY + boxSize);
  ctx.quadraticCurveTo(boxX, boxY + boxSize, boxX, boxY + boxSize - radius);
  ctx.lineTo(boxX, boxY + radius);
  ctx.quadraticCurveTo(boxX, boxY, boxX + radius, boxY);
  ctx.closePath();
  ctx.fillStyle = gradient;
  ctx.fill();
  
  // نص ICT في المربع
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${boxSize * 0.4}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('ICT', width / 2, boxY + boxSize / 2);
  
  // اسم التطبيق
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${boxSize * 0.25}px Arial`;
  ctx.fillText('ICT AI Trader', width / 2, boxY + boxSize + boxSize * 0.4);
  
  return canvas.toBuffer('image/png');
}

async function main() {
  const assetsDir = path.join(__dirname, 'assets');
  
  // التأكد من وجود المجلد
  if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
  }
  
  console.log('🎨 Creating icons...');
  
  // إنشاء الأيقونات
  const icon = createSimplePNG(1024, 1024);
  fs.writeFileSync(path.join(assetsDir, 'icon.png'), icon);
  console.log('✅ icon.png (1024x1024)');
  
  const adaptiveIcon = createSimplePNG(1024, 1024);
  fs.writeFileSync(path.join(assetsDir, 'adaptive-icon.png'), adaptiveIcon);
  console.log('✅ adaptive-icon.png (1024x1024)');
  
  const favicon = createSimplePNG(48, 48);
  fs.writeFileSync(path.join(assetsDir, 'favicon.png'), favicon);
  console.log('✅ favicon.png (48x48)');
  
  const notificationIcon = createNotificationIcon(96);
  fs.writeFileSync(path.join(assetsDir, 'notification-icon.png'), notificationIcon);
  console.log('✅ notification-icon.png (96x96)');
  
  const splash = createSplashScreen(1284, 2778);
  fs.writeFileSync(path.join(assetsDir, 'splash.png'), splash);
  console.log('✅ splash.png (1284x2778)');
  
  console.log('\n🎉 All icons created successfully!');
}

main().catch(console.error);
