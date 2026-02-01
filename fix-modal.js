const fs = require('fs');

// Read the file
let content = fs.readFileSync('mobile/src/screens/EconomicCalendarScreen.tsx', 'utf8');

// Find the start of the modal overlay section
const startMarker = '<View style={styles.modalOverlay}>';
const endMarker = '</Modal>';

const startIndex = content.indexOf(startMarker);
const endIndex = content.indexOf(endMarker, startIndex) + endMarker.length;

if (startIndex !== -1 && endIndex !== -1) {
  const before = content.substring(0, startIndex);
  const after = content.substring(endIndex);
  
  const replacement = `{selectedEventAnalysis && (
          <>
            <View style={styles.analysisSection}>
              <Text style={styles.analysisSectionTitle}>📊 التحليل</Text>
              <Text style={styles.analysisText}>
                {selectedEventAnalysis.analysis}
              </Text>
            </View>

            <View style={styles.analysisSection}>
              <Text style={styles.analysisSectionTitle}>🎯 التأثير المتوقع</Text>
              <Text style={styles.analysisText}>
                {selectedEventAnalysis.impact}
              </Text>
            </View>

            <View style={styles.analysisSection}>
              <Text style={styles.analysisSectionTitle}>📈 توقعات السوق</Text>
              <Text style={styles.analysisText}>
                {selectedEventAnalysis.marketExpectation}
              </Text>
            </View>
          </>
        )}
      </CustomModal>`;
  
  content = before + replacement + after;
  
  // Write back
  fs.writeFileSync('mobile/src/screens/EconomicCalendarScreen.tsx', content, 'utf8');
  console.log('✅ Fixed modal section successfully!');
} else {
  console.log('❌ Could not find modal section');
}
