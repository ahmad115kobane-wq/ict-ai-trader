# AI Analysis System Documentation

## Overview

This repository contains a sophisticated AI-powered trading analysis system for XAUUSD (Gold) using ICT (Inner Circle Trader) methodology combined with Vision AI.

## Documentation Files

### Arabic Documentation (Primary)
1. **`شرح_نظام_التحليل_AI.md`** - Complete system explanation in Arabic
   - 17,000+ words comprehensive guide
   - Covers all 7 conditions for trade generation
   - Step-by-step analysis flow
   - Real-world examples
   
2. **`مخطط_تدفق_التحليل.md`** - Visual flowcharts in Arabic
   - System architecture diagrams
   - Data flow charts
   - Error handling flows
   - Subscription and permissions model

## Quick Summary

### How the System Works

1. **Data Collection** (Every 5 minutes on M5 candle close)
   - Fetches H1 candles (100)
   - Fetches M5 candles (140)
   - Gets current price from OANDA API

2. **Chart Rendering**
   - Converts candle data to visual charts using Puppeteer
   - Generates PNG images for H1 and M5 timeframes

3. **AI Analysis**
   - Vision AI model analyzes chart images
   - Applies ICT methodology rules
   - Checks 7 mandatory conditions

4. **Trade Generation** (Only if ALL conditions met)
   - Calculates entry, stop loss, and 3 take profit levels
   - Validates risk/reward ratio (minimum 1.8:1)
   - Assigns score (0-10) and confidence (0-100)

5. **Storage & Notifications**
   - Saves analysis to PostgreSQL database
   - Sends Telegram notifications
   - Sends push notifications to mobile app

### The 7 Mandatory Conditions

#### Condition 0: H1 Alignment
- Trade direction MUST align with H1 trend
- Bullish H1 → Only BUY trades
- Bearish H1 → Only SELL trades

#### Condition 1: Liquidity Sweep
- **MANDATORY** - No trade without sweep
- BSL Sweep (Buy Side Liquidity) → allows SELL
- SSL Sweep (Sell Side Liquidity) → allows BUY

#### Condition 2: Market Structure Shift (MSS/CHoCH)
- Must occur AFTER liquidity sweep
- Confirms trend change
- Entry only after confirmation

#### Condition 3: Displacement
- STRONG or MODERATE price movement required
- WEAK displacement = NO TRADE
- Creates Fair Value Gaps (FVG)

#### Condition 4: Entry Zone (PD Array)
- Order Block (OB) - preferred
- Fair Value Gap (FVG)
- FVG inside OB - best setup
- Fresh (untested) zones preferred

#### Condition 5: Price Location
- BUY only in Discount zone (< 50%)
- SELL only in Premium zone (> 50%)
- MID zone reduces score

#### Condition 6: Killzone/Session
- HIGH quality: London (7-10 UTC), NY AM (12-15 UTC)
- MEDIUM quality: Asia (0-3 UTC), NY PM (15-18 UTC)
- LOW quality: Off-hours (warning, not rejection)

#### Condition 7: Entry Price Validation
- BUY_LIMIT: Entry < Current Price (mandatory)
- SELL_LIMIT: Entry > Current Price (mandatory)
- Any violation = immediate rejection

### Scoring System

**Score (0-10):**
- OB Strength: +2
- Displacement: +2
- H1 Alignment: +1
- Killzone Quality: +1
- RR Ratio: +1
- Confluences: +1
- FVG in OB: +1

**Confidence (0-100):**
- Base: Score × 10
- Strong Sweep: +10%
- Strong MSS: +10%
- OB Quality: +10%
- Deductions as needed

### Minimum Requirements

```javascript
{
  minScore: 6.0,           // Minimum 6/10
  minConfidence: 65,       // Minimum 65%
  minRR: 1.8,              // Minimum 1.8:1 risk/reward
  maxDistance: 1.2%,       // Maximum entry distance
  minConfluences: 2        // Minimum confluences
}
```

## Key Files

### Analysis Services
- `server/src/services/aiService.ts` - Main AI analysis (2500+ lines)
- `server/src/services/oandaService.ts` - Data fetching from OANDA
- `server/src/services/chartService.ts` - Chart rendering
- `server/src/services/screenshotService.ts` - Screenshot capture

### Routes
- `server/src/routes/analysis.ts` - API endpoints

### Database
- `server/src/db/postgresOperations.ts` - PostgreSQL operations
- `server/src/db/database.ts` - SQLite setup (development)

### Main Server
- `server/src/index.ts` - Main server + auto-analysis scheduler

## Auto-Analysis

The system runs automatically:
- **Frequency:** Every 5 minutes (M5 candle close)
- **Recipients:** Paid subscribers with auto-analysis enabled
- **Retry Logic:** 3 attempts with exponential backoff
- **Notifications:** Telegram + Push (only for valid trades)

## Example Trade Output

```json
{
  "decision": "PLACE_PENDING",
  "score": 8.5,
  "confidence": 85,
  "sentiment": "BULLISH",
  "suggestedTrade": {
    "type": "BUY_LIMIT",
    "entry": 2645.50,
    "sl": 2640.00,
    "tp1": 2650.00,
    "tp2": 2655.00,
    "tp3": 2660.00,
    "rrRatio": 2.5,
    "expiryMinutes": 60
  },
  "confluences": [
    "SSL Sweep on H1 with strong rejection",
    "Bullish MSS after sweep on M5",
    "Strong displacement creating FVG",
    "Fresh Bullish OB in discount zone",
    "London session - high quality",
    "Full H1 alignment"
  ]
}
```

## Performance Metrics

- **Score 9-10:** ~85-90% success rate
- **Score 7-8:** ~70-80% success rate
- **Score 6-7:** ~60-70% success rate
- **Score < 6:** Rejected automatically

## Version

- **Current Version:** v2.3.0
- **ICT Methodology:** Full implementation
- **AI Model:** llama3.2-vision or custom
- **Last Updated:** January 2024

## Support

For questions or issues:
- Email: support@ict-ai-trader.com
- Telegram: @ICTAITrader_Support

---

**Note:** For detailed Arabic documentation with examples and diagrams, please refer to:
- `شرح_نظام_التحليل_AI.md` (Main documentation)
- `مخطط_تدفق_التحليل.md` (Flowcharts)
