// Test script for economic calendar APIs
import axios from 'axios';

async function testMyfxbook() {
  console.log('\n🔄 Testing Myfxbook API...');
  try {
    const response = await axios.get('https://www.myfxbook.com/api/get-economic-calendar.json', {
      params: {
        countries: 'US,EU,GB',
        impacts: 'high,medium'
      },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 15000
    });
    
    console.log('✅ Myfxbook Response:', response.status);
    console.log('📊 Data sample:', JSON.stringify(response.data).substring(0, 500));
    
    if (Array.isArray(response.data)) {
      const withActual = response.data.filter(e => e.actual || e.result);
      console.log(`📈 Events with actual results: ${withActual.length}/${response.data.length}`);
      if (withActual.length > 0) {
        console.log('Sample event with actual:', withActual[0]);
      }
    }
  } catch (error) {
    console.error('❌ Myfxbook failed:', error.message);
  }
}

async function testFXStreet() {
  console.log('\n🔄 Testing FXStreet API...');
  try {
    const response = await axios.get('https://calendar-api.fxstreet.com/en/api/v1/eventDates', {
      params: {
        timezone: 'GMT',
        rows: 100,
        volatilities: 'high,medium',
        countries: 'US,EU,GB'
      },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 15000
    });
    
    console.log('✅ FXStreet Response:', response.status);
    console.log('📊 Data sample:', JSON.stringify(response.data).substring(0, 500));
    
    if (Array.isArray(response.data)) {
      const withActual = response.data.filter(e => e.actual);
      console.log(`📈 Events with actual results: ${withActual.length}/${response.data.length}`);
      if (withActual.length > 0) {
        console.log('Sample event with actual:', withActual[0]);
      }
    }
  } catch (error) {
    console.error('❌ FXStreet failed:', error.message);
  }
}

async function testForexFactory() {
  console.log('\n🔄 Testing Forex Factory API...');
  try {
    const response = await axios.get('https://nfs.faireconomy.media/ff_calendar_thisweek.json', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 10000
    });
    
    console.log('✅ Forex Factory Response:', response.status);
    console.log('📊 Total events:', Array.isArray(response.data) ? response.data.length : 0);
    
    if (Array.isArray(response.data) && response.data.length > 0) {
      const withActual = response.data.filter(e => e.actual || e.result || e.value);
      console.log(`📈 Events with actual results: ${withActual.length}/${response.data.length}`);
      if (withActual.length > 0) {
        console.log('Sample event with actual:', withActual[0]);
      }
      console.log('Sample event:', response.data[0]);
    }
  } catch (error) {
    console.error('❌ Forex Factory failed:', error.message);
  }
}

async function runTests() {
  console.log('🧪 Testing Economic Calendar APIs...\n');
  
  await testMyfxbook();
  await testFXStreet();
  await testForexFactory();
  
  console.log('\n✅ Tests completed!');
}

runTests();
