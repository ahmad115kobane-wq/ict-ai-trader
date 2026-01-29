// اختبار API التحليل
const fetch = require('node-fetch');

async function testAnalysis() {
  try {
    console.log('🧪 Testing analysis API...');
    
    const response = await fetch('http://localhost:3001/api/analysis/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        symbol: 'XAUUSD'
      })
    });

    const result = await response.json();
    
    console.log('✅ Response received:');
    console.log('Status:', response.status);
    console.log('Success:', result.success);
    
    if (result.success) {
      console.log('📊 Analysis Result:');
      console.log('- Decision:', result.analysis.decision);
      console.log('- Score:', result.analysis.score);
      console.log('- Confidence:', result.analysis.confidence);
      console.log('- Current Price:', result.currentPrice);
      console.log('- Timestamp:', result.timestamp);
      
      if (result.analysis.suggestedTrade) {
        console.log('💰 Suggested Trade:');
        console.log('- Type:', result.analysis.suggestedTrade.type);
        console.log('- Entry:', result.analysis.suggestedTrade.entry);
        console.log('- SL:', result.analysis.suggestedTrade.sl);
        console.log('- TP:', result.analysis.suggestedTrade.tp);
      }
    } else {
      console.log('❌ Error:', result.error);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testAnalysis();