import re

# Read the file
with open('mobile/src/screens/EconomicCalendarScreen.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Find and replace the modal section
# Pattern to match from <View style={styles.modalOverlay}> to </Modal>
pattern = r'<View style=\{styles\.modalOverlay\}>.*?</Modal>'

replacement = '''{selectedEventAnalysis && (
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
      </CustomModal>'''

# Replace with DOTALL flag to match across newlines
content = re.sub(pattern, replacement, content, flags=re.DOTALL)

# Write back
with open('mobile/src/screens/EconomicCalendarScreen.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Fixed modal section successfully!")
