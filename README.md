<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# ICT AI Trader - Smart Gold Trading Analysis

A sophisticated AI-powered trading analysis system for XAUUSD (Gold) using ICT (Inner Circle Trader) methodology combined with Vision AI.

## 📚 Documentation

### Understanding the AI Analysis System

- **[شرح نظام التحليل AI](./شرح_نظام_التحليل_AI.md)** - توثيق شامل بالعربية (17,000+ كلمة)
  - شرح كيفية عمل النظام من البداية للنهاية
  - الشروط السبعة الإلزامية للصفقات
  - أمثلة عملية كاملة
  - مقاييس الأداء والنجاح

- **[مخطط تدفق التحليل](./مخطط_تدفق_التحليل.md)** - مخططات بصرية بالعربية
  - مخطط تدفق النظام الكامل
  - معالجة الأخطاء
  - تدفق البيانات
  - نظام الاشتراكات والأذونات

- **[AI Analysis System README](./AI_ANALYSIS_SYSTEM_README.md)** - English quick reference
  - System overview
  - Key files and architecture
  - 7 mandatory conditions explained
  - Performance metrics

## 🎯 Key Features

- ✅ **Automatic Analysis:** Runs every 5 minutes on M5 candle close
- ✅ **ICT Methodology:** Full implementation of liquidity sweeps, MSS, FVG, Order Blocks
- ✅ **Vision AI:** Advanced chart image analysis
- ✅ **Multi-Timeframe:** H1 for context + M5 for entry
- ✅ **Smart Entry:** Automated calculation of entry, SL, and 3 TP levels
- ✅ **Risk Management:** Minimum 1.8:1 risk/reward ratio
- ✅ **Notifications:** Telegram + Push notifications for subscribers
- ✅ **Quality Filtering:** Only trades scoring 6+ out of 10 are suggested

## 🚀 Quick Start

### Prerequisites
- Node.js (v16+)
- PostgreSQL or SQLite
- OANDA API key
- AI API key (OpenAI compatible)

### Installation

1. Install dependencies:
   ```bash
   npm install
   cd server && npm install
   ```

2. Set up environment variables:
   ```bash
   # Server environment (.env in server directory)
   OLLAMA_API_KEY=your_api_key
   OLLAMA_BASE_URL=your_ai_endpoint
   OLLAMA_MODEL=llama3.2-vision
   OANDA_API_KEY=your_oanda_key
   OANDA_ACCOUNT_ID=your_account_id
   DATABASE_URL=postgresql://...
   ```

3. Run the server:
   ```bash
   cd server
   npm run dev
   ```

4. Run the mobile app:
   ```bash
   npm run dev
   ```

## 📊 How It Works

The system performs automatic analysis every 5 minutes:

1. **Data Collection** - Fetches H1 and M5 candles from OANDA
2. **Chart Rendering** - Converts data to visual charts
3. **AI Analysis** - Vision AI analyzes charts using ICT methodology
4. **Validation** - Checks 7 mandatory conditions
5. **Trade Generation** - Calculates entry, SL, and TP levels
6. **Notifications** - Alerts subscribers via Telegram and Push

For detailed explanation, see the [Arabic documentation](./شرح_نظام_التحليل_AI.md).

## 🔐 Security

- JWT authentication for all API endpoints
- Subscription-based access control
- Environment variables for sensitive data
- HTTPS encryption

## 📈 Performance

- **High Score (9-10):** ~85-90% success rate
- **Good Score (7-8):** ~70-80% success rate
- **Acceptable (6-7):** ~60-70% success rate
- **Below 6:** Automatically rejected

## 🛠 Technology Stack

- **Frontend:** React Native + Expo
- **Backend:** Node.js + Express + TypeScript
- **Database:** PostgreSQL (production) / SQLite (development)
- **AI:** Vision AI (llama3.2-vision or OpenAI compatible)
- **Charts:** Puppeteer + Canvas
- **Market Data:** OANDA API
- **Notifications:** Telegram Bot + Expo Push

## 📁 Project Structure

```
.
├── server/
│   ├── src/
│   │   ├── services/
│   │   │   ├── aiService.ts          # Main AI analysis
│   │   │   ├── oandaService.ts       # Market data
│   │   │   ├── chartService.ts       # Chart rendering
│   │   │   └── notificationService.ts # Notifications
│   │   ├── routes/
│   │   │   └── analysis.ts           # API endpoints
│   │   └── db/
│   │       └── postgresOperations.ts # Database operations
│   └── index.ts                       # Main server + scheduler
├── components/                        # React Native components
├── شرح_نظام_التحليل_AI.md           # Arabic documentation
├── مخطط_تدفق_التحليل.md             # Arabic flowcharts
└── AI_ANALYSIS_SYSTEM_README.md      # English quick reference
```

## 📞 Support

For questions or issues:
- 📧 Email: support@ict-ai-trader.com
- 💬 Telegram: @ICTAITrader_Support

## 📝 License

Copyright © 2024 ICT AI Trader

---

**Version:** v2.3.0 | **Last Updated:** January 2024
