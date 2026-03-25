import React from 'react';
import { StyleSheet, View, ScrollView, Dimensions, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const AnalyticsCard = ({ label, amount, trend, color }: { label: string, amount: string, trend: string, color: string }) => (
  <View style={styles.analyticsCard}>
    <ThemedText style={styles.cardLabel}>{label}</ThemedText>
    <ThemedText style={styles.cardAmount}>{amount}</ThemedText>
    <View style={styles.trendRow}>
      <Ionicons name="trending-up" size={14} color={color} />
      <ThemedText style={[styles.trendText, { color }]}>{trend}</ThemedText>
    </View>
  </View>
);

export default function AnalyticsScreen() {
  const chartWidth = SCREEN_WIDTH - 48;
  const chartHeight = 150;
  
  // Simple path for a line graph
  const pathData = `M 0 ${chartHeight * 0.7} L ${chartWidth * 0.2} ${chartHeight * 0.4} L ${chartWidth * 0.4} ${chartHeight * 0.6} L ${chartWidth * 0.6} ${chartHeight * 0.3} L ${chartWidth * 0.8} ${chartHeight * 0.5} L ${chartWidth} ${chartHeight * 0.2}`;

  const categories = [
    { name: 'Shopping', amount: '₦45,000', percentage: 40, icon: 'cart-outline', color: '#FF7A00' },
    { name: 'Food & Drinks', amount: '₦22,500', percentage: 20, icon: 'restaurant-outline', color: '#1E9F85' },
    { name: 'Entertainment', amount: '₦15,000', percentage: 15, icon: 'game-controller-outline', color: '#5856D6' },
  ];

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <ThemedText type="title" style={styles.title}>Analytics</ThemedText>
            <TouchableOpacity style={styles.calendarBtn}>
              <ThemedText style={styles.calendarText}>Mar 2024</ThemedText>
              <Ionicons name="chevron-down" size={16} color="#666" />
            </TouchableOpacity>
          </View>

          {/* Summary Cards */}
          <View style={styles.summaryRow}>
            <AnalyticsCard label="Total Spent" amount="₦82,500" trend="+12.5%" color="#FF3B30" />
            <AnalyticsCard label="Total Income" amount="₦150,000" trend="+8.2%" color="#1E9F85" />
          </View>

          {/* Graph Section */}
          <View style={styles.graphSection}>
            <View style={styles.graphHeader}>
              <ThemedText style={styles.graphTitle}>Spending Overview</ThemedText>
              <View style={styles.legend}>
                <View style={[styles.dot, { backgroundColor: '#FF7A00' }]} />
                <ThemedText style={styles.legendText}>This Month</ThemedText>
              </View>
            </View>
            
            <View style={styles.chartContainer}>
              <Svg width={chartWidth} height={chartHeight}>
                <Defs>
                  <LinearGradient id="gradient" x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0" stopColor="#FF7A00" stopOpacity="0.2" />
                    <Stop offset="1" stopColor="#FF7A00" stopOpacity="0" />
                  </LinearGradient>
                </Defs>
                <Path
                  d={`${pathData} L ${chartWidth} ${chartHeight} L 0 ${chartHeight} Z`}
                  fill="url(#gradient)"
                />
                <Path
                  d={pathData}
                  fill="none"
                  stroke="#FF7A00"
                  strokeWidth="3"
                />
              </Svg>
            </View>
            
            <View style={styles.xAxis}>
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                <ThemedText key={day} style={styles.axisLabel}>{day}</ThemedText>
              ))}
            </View>
          </View>

          {/* Categories */}
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Spending Categories</ThemedText>
            {categories.map((cat, idx) => (
              <View key={idx} style={styles.categoryCard}>
                <View style={[styles.catIcon, { backgroundColor: `${cat.color}10` }]}>
                  <Ionicons name={cat.icon as any} size={20} color={cat.color} />
                </View>
                <View style={styles.catInfo}>
                  <View style={styles.catTopRow}>
                    <ThemedText style={styles.catName}>{cat.name}</ThemedText>
                    <ThemedText style={styles.catAmount}>{cat.amount}</ThemedText>
                  </View>
                  <View style={styles.progressBg}>
                    <View style={[styles.progressFill, { width: `${cat.percentage}%`, backgroundColor: cat.color }]} />
                  </View>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
  },
  calendarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9F9F9',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  calendarText: {
    fontSize: 14,
    color: '#000',
    marginRight: 4,
    fontWeight: '600',
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
  },
  analyticsCard: {
    flex: 1,
    backgroundColor: '#F9F9F9',
    borderRadius: 20,
    padding: 16,
  },
  cardLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  cardAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    marginBottom: 4,
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trendText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  graphSection: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    marginBottom: 32,
  },
  graphHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  graphTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  legendText: {
    fontSize: 12,
    color: '#666',
  },
  chartContainer: {
    height: 150,
    justifyContent: 'center',
  },
  xAxis: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  axisLabel: {
    fontSize: 11,
    color: '#999',
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
    marginBottom: 16,
  },
  categoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  catIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  catInfo: {
    flex: 1,
  },
  catTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  catName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  catAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000',
  },
  progressBg: {
    height: 6,
    backgroundColor: '#F5F5F5',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
});
