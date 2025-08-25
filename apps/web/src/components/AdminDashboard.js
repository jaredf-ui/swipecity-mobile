/**
 * SwipeCity Admin Dashboard
 * Pre-production data management and monitoring
 */

import React, { useState, useEffect } from 'react';
import { DataService, clearSeededData } from '../utils/dataIntegration';
import { 
  seedQuickDemo, 
  seedFullPreProduction, 
  generateSampleListings, 
  generateSampleUsers 
} from '../utils/dataSeeding';
import { runFirebaseTests } from '../utils/firebaseTest';

const AdminDashboard = ({ onClose }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState({
    users: 0,
    listings: 0,
    interests: 0,
    reports: 0
  });
  const [seedingProgress, setSeedingProgress] = useState('');
  const [recentActivity, setRecentActivity] = useState([]);
  const [firebaseTestResults, setFirebaseTestResults] = useState(null);
  
  // Load dashboard stats
  useEffect(() => {
    loadDashboardStats();
    loadRecentActivity();
  }, []);
  
  const loadDashboardStats = async () => {
    try {
      // Get counts from DataService (will return seeded data counts)
      const [usersCount, listingsCount, interestsCount, reportsCount] = await Promise.all([
        DataService.getUserCount(),
        DataService.getListingCount(), 
        DataService.getInterestCount(),
        DataService.getReportCount()
      ]);
      
      console.log('📊 Loading dashboard stats:', { usersCount, listingsCount, interestsCount, reportsCount });
      
      setStats({
        users: usersCount,
        listings: listingsCount,
        interests: interestsCount,
        reports: reportsCount
      });
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };
  
  const loadRecentActivity = async () => {
    try {
      // Get recent activity (implement this method in DataService)
      const activity = await DataService.getRecentActivity?.() || [];
      setRecentActivity(activity.slice(0, 10)); // Last 10 activities
    } catch (error) {
      console.error('Failed to load activity:', error);
    }
  };
  
  const handleQuickSeed = async () => {
    setIsLoading(true);
    setSeedingProgress('Starting quick demo seeding...');
    
    try {
      const result = await seedQuickDemo();
      
      // Debug logging
      console.log('🐛 Seeding result:', result);
      
      if (result.success) {
        setSeedingProgress(`✅ Created ${result.stats.users} users and ${result.stats.listings} listings successfully!`);
        
        // Debug current stats before update
        console.log('🐛 Current stats before update:', stats);
        console.log('🐛 Adding:', result.stats);
        
        // Update stats immediately with the seeded data
        setStats(prevStats => {
          const newStats = {
            users: prevStats.users + (result.stats.users || 0),
            listings: prevStats.listings + (result.stats.listings || 0),
            interests: prevStats.interests + (result.stats.interests || 0),
            reports: prevStats.reports
          };
          console.log('🐛 New stats after update:', newStats);
          return newStats;
        });
        
        // Don't call loadDashboardStats() here as it resets to 0 - we're using local tracking
      } else {
        setSeedingProgress(`❌ Seeding failed: ${result.error}`);
      }
    } catch (error) {
      console.error('🐛 Seeding error:', error);
      setSeedingProgress(`❌ Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleFullSeed = async () => {
    setIsLoading(true);
    setSeedingProgress('Starting full pre-production seeding...');
    
    try {
      const result = await seedFullPreProduction();
      if (result.success) {
        setSeedingProgress(`✅ Created ${result.stats.users} users, ${result.stats.listings} listings, ${result.stats.interests} interests!`);
        
        // Update stats immediately with the seeded data
        setStats(prevStats => ({
          users: prevStats.users + (result.stats.users || 0),
          listings: prevStats.listings + (result.stats.listings || 0),
          interests: prevStats.interests + (result.stats.interests || 0),
          reports: prevStats.reports
        }));
        
        // Don't call loadDashboardStats() here as it resets to 0 - we're using local tracking
      } else {
        setSeedingProgress(`❌ Seeding failed: ${result.error}`);
      }
    } catch (error) {
      setSeedingProgress(`❌ Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleFirebaseTest = async () => {
    setIsLoading(true);
    setSeedingProgress('🧪 Running Firebase integration tests...');
    setFirebaseTestResults(null);
    
    try {
      console.log('🧪 Starting Firebase test from Admin Dashboard...');
      
      // Add a timeout to prevent hanging
      const testPromise = runFirebaseTests();
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Tests timed out after 30 seconds')), 30000);
      });
      
      const testResults = await Promise.race([testPromise, timeoutPromise]);
      console.log('🧪 Test results received:', testResults);
      
      setFirebaseTestResults(testResults);
      
      if (testResults.summary.failed > 0) {
        setSeedingProgress(`❌ Firebase tests completed with ${testResults.summary.failed} failures. Check console for details.`);
      } else {
        setSeedingProgress(`✅ All Firebase tests passed! (${testResults.summary.passed}/${testResults.summary.total})`);
      }
    } catch (error) {
      console.error('Firebase test suite error:', error);
      setSeedingProgress(`❌ Firebase test suite failed: ${error.message}. Check console for details.`);
      setFirebaseTestResults({
        summary: { total: 3, passed: 0, failed: 3, pending: 0 },
        details: {
          initialization: { status: 'error', message: error.message },
          firestore: { status: 'error', message: 'Not tested due to initialization failure' },
          storage: { status: 'error', message: 'Not tested due to initialization failure' }
        }
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearData = async () => {
    if (!window.confirm('⚠️ This will delete ALL data. Are you sure?')) return;
    
    setIsLoading(true);
    setSeedingProgress('Clearing all data...');
    
    try {
      // Clear all seeded data properly
      clearSeededData();
      
      setSeedingProgress('✅ All data cleared successfully!');
      
      // Reset stats to zero
      setStats({
        users: 0,
        listings: 0,
        interests: 0,
        reports: 0
      });
      
      // Reload stats
      await loadDashboardStats();
      
    } catch (error) {
      setSeedingProgress(`❌ Failed to clear data: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleDebugData = async () => {
    setIsLoading(true);
    setSeedingProgress('Checking current data...');
    
    try {
      const seededItems = localStorage.getItem('swipecity_seeded_items');
      const seededUsers = localStorage.getItem('swipecity_seeded_users');
      
      let debugInfo = '🔍 Debug Info:\n';
      
      if (seededItems) {
        const items = JSON.parse(seededItems);
        debugInfo += `📦 Found ${items.length} items in localStorage\n`;
        
        if (items.length > 0) {
          const firstItem = items[0];
          debugInfo += `First item: "${firstItem.title}" by ${firstItem.seller_name || 'NO NAME'}\n`;
          debugInfo += `  - Rating: ${firstItem.seller_rating || 'NO RATING'} (${firstItem.seller_reviews || 'NO REVIEWS'} reviews)\n`;
          debugInfo += `  - Distance: ${firstItem.distance || 'NO DISTANCE'}\n`;
          debugInfo += `  - Verified: ${firstItem.verified || 'NO VERIFICATION'}\n`;
        }
      } else {
        debugInfo += '📦 No items in localStorage\n';
      }
      
      if (seededUsers) {
        const users = JSON.parse(seededUsers);
        debugInfo += `👥 Found ${users.length} users in localStorage\n`;
      } else {
        debugInfo += '👥 No users in localStorage\n';
      }
      
      setSeedingProgress(debugInfo);
    } catch (error) {
      setSeedingProgress(`❌ Debug failed: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ 
      position: 'fixed', 
      top: 0, 
      left: 0, 
      right: 0, 
      bottom: 0, 
      background: 'white', 
      zIndex: 10000,
      overflow: 'auto',
      padding: '20px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '30px', borderBottom: '2px solid #e5e7eb', paddingBottom: '20px', position: 'relative' }}>
          <h1 style={{ 
            margin: 0, 
            color: '#1f2937', 
            fontSize: '28px', 
            fontWeight: 'bold' 
          }}>
            🛠️ SwipeCity Admin Dashboard
          </h1>
          <p style={{ 
            margin: '5px 0 0 0', 
            color: '#6b7280', 
            fontSize: '16px' 
          }}>
            Pre-production data management and monitoring
          </p>
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              top: '0',
              right: '0',
              background: '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              padding: '8px 16px',
              fontSize: '14px',
              cursor: 'pointer',
              fontWeight: '500'
            }}
          >
            Close Dashboard
          </button>
        </div>

        {/* Stats Cards */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: '20px', 
          marginBottom: '30px' 
        }}>
          <StatCard title="Users" value={stats.users} icon="👥" color="#3b82f6" />
          <StatCard title="Listings" value={stats.listings} icon="📦" color="#10b981" />
          <StatCard title="Interests" value={stats.interests} icon="💝" color="#f59e0b" />
          <StatCard title="Reports" value={stats.reports} icon="🚨" color="#ef4444" />
        </div>

        {/* Data Seeding Section */}
        <div style={{ 
          background: '#f9fafb', 
          border: '1px solid #e5e7eb', 
          borderRadius: '8px', 
          padding: '25px', 
          marginBottom: '30px' 
        }}>
          <h2 style={{ 
            margin: '0 0 15px 0', 
            color: '#1f2937', 
            fontSize: '20px', 
            fontWeight: '600' 
          }}>
            🌱 Data Seeding
          </h2>
          
          <div style={{ display: 'flex', gap: '15px', marginBottom: '20px', flexWrap: 'wrap' }}>
            <button
              onClick={handleQuickSeed}
              disabled={isLoading}
              style={{
                padding: '12px 24px',
                background: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                opacity: isLoading ? 0.6 : 1
              }}
            >
              Quick Demo (20 listings)
            </button>
            
            <button
              onClick={handleFullSeed}
              disabled={isLoading}
              style={{
                padding: '12px 24px',
                background: '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                opacity: isLoading ? 0.6 : 1
              }}
            >
              Full Pre-Production (200 listings)
            </button>
            
            <button
              onClick={handleDebugData}
              disabled={isLoading}
              style={{
                padding: '12px 24px',
                background: '#6b7280',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                opacity: isLoading ? 0.6 : 1
              }}
            >
              Debug Data
            </button>
            
            <button
              onClick={handleFirebaseTest}
              disabled={isLoading}
              style={{
                padding: '12px 24px',
                background: '#8b5cf6',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                opacity: isLoading ? 0.6 : 1
              }}
            >
              🧪 Test Firebase
            </button>
            
            <button
              onClick={async () => {
                setIsLoading(true);
                setSeedingProgress('🔍 Running simple diagnostic...');
                
                try {
                  // Simple test that just checks if Firebase imports work
                  setSeedingProgress('1/4: Importing Firebase...');
                  const { initializeFirebaseServices } = await import('../services/firebase');
                  
                  setSeedingProgress('2/4: Initializing services...');
                  initializeFirebaseServices();
                  
                  setSeedingProgress('3/4: Testing basic functions...');
                  const currentTime = new Date().toISOString();
                  
                  setSeedingProgress('4/4: Complete!');
                  setSeedingProgress(`✅ Diagnostic passed! Firebase imports working at ${currentTime}`);
                } catch (error) {
                  setSeedingProgress(`❌ Diagnostic failed: ${error.message}`);
                  console.error('Simple diagnostic error:', error);
                }
                
                setIsLoading(false);
              }}
              disabled={isLoading}
              style={{
                padding: '12px 24px',
                background: '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                opacity: isLoading ? 0.6 : 1
              }}
            >
              🔍 Quick Diagnostic
            </button>

            <button
              onClick={async () => {
                setIsLoading(true);
                setSeedingProgress('🧪 Testing direct Firebase upload...');
                
                try {
                  // Import Firebase directly instead of our wrapper
                  const { storage } = await import('../services/firebase');
                  const { ref, uploadBytes, getDownloadURL } = await import('firebase/storage');
                  
                  setSeedingProgress('🔄 Creating test file and uploading...');
                  
                  // Create a tiny test file
                  const testFile = new Blob(['test'], { type: 'text/plain' });
                  const testPath = `direct-test/test-${Date.now()}.txt`;
                  
                  // Upload directly using Firebase SDK
                  const storageRef = ref(storage, testPath);
                  
                  const uploadPromise = uploadBytes(storageRef, testFile).then(snapshot => {
                    return getDownloadURL(snapshot.ref);
                  });
                  
                  const timeoutPromise = new Promise((_, reject) => {
                    setTimeout(() => reject(new Error('Direct upload timed out after 15 seconds')), 15000);
                  });
                  
                  const downloadURL = await Promise.race([uploadPromise, timeoutPromise]);
                  
                  setSeedingProgress(`✅ Direct upload successful! URL: ${downloadURL}`);
                  
                } catch (error) {
                  setSeedingProgress(`❌ Direct upload error: ${error.message}`);
                  console.error('Direct upload detailed error:', error);
                }
                
                setIsLoading(false);
              }}
              disabled={isLoading}
              style={{
                padding: '12px 24px',
                background: '#f59e0b',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                opacity: isLoading ? 0.6 : 1
              }}
            >
              🧪 Test Upload
            </button>
            
            <button
              onClick={handleClearData}
              disabled={isLoading}
              style={{
                padding: '12px 24px',
                background: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                opacity: isLoading ? 0.6 : 1
              }}
            >
              Clear All Data
            </button>
          </div>
          
          {seedingProgress && (
            <div style={{
              padding: '15px',
              background: seedingProgress.includes('❌') ? '#fef2f2' : '#f0f9ff',
              border: `1px solid ${seedingProgress.includes('❌') ? '#fecaca' : '#bfdbfe'}`,
              borderRadius: '6px',
              color: seedingProgress.includes('❌') ? '#dc2626' : '#1e40af',
              fontSize: '14px',
              fontFamily: 'monospace'
            }}>
              {seedingProgress}
            </div>
          )}

          {/* Firebase Test Results */}
          {firebaseTestResults && (
            <div style={{
              padding: '15px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
              marginTop: '15px'
            }}>
              <h4 style={{ margin: '0 0 10px 0', fontSize: '16px', fontWeight: '600' }}>
                🧪 Firebase Test Results
              </h4>
              <div style={{ fontSize: '14px', marginBottom: '10px' }}>
                <strong>Summary:</strong> {firebaseTestResults.summary.passed}/{firebaseTestResults.summary.total} tests passed
              </div>
              
              {/* Test Details */}
              {Object.entries(firebaseTestResults.details).map(([testName, result]) => (
                <div key={testName} style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '8px',
                  margin: '4px 0',
                  background: result.status === 'success' ? '#ecfdf5' : result.status === 'error' ? '#fef2f2' : '#f1f5f9',
                  border: `1px solid ${result.status === 'success' ? '#d1fae5' : result.status === 'error' ? '#fecaca' : '#e2e8f0'}`,
                  borderRadius: '4px',
                  fontSize: '13px'
                }}>
                  <span style={{ marginRight: '8px' }}>
                    {result.status === 'success' ? '✅' : result.status === 'error' ? '❌' : '⏳'}
                  </span>
                  <span style={{ fontWeight: '500', marginRight: '8px', textTransform: 'capitalize' }}>
                    {testName}:
                  </span>
                  <span style={{ color: result.status === 'error' ? '#dc2626' : '#374151' }}>
                    {result.message}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div style={{ 
          background: 'white', 
          border: '1px solid #e5e7eb', 
          borderRadius: '8px', 
          padding: '25px' 
        }}>
          <h2 style={{ 
            margin: '0 0 20px 0', 
            color: '#1f2937', 
            fontSize: '20px', 
            fontWeight: '600' 
          }}>
            📊 Recent Activity
          </h2>
          
          {recentActivity.length > 0 ? (
            <div style={{ space: '10px' }}>
              {recentActivity.map((activity, index) => (
                <div key={index} style={{
                  padding: '12px',
                  background: '#f9fafb',
                  border: '1px solid #f3f4f6',
                  borderRadius: '6px',
                  marginBottom: '8px',
                  fontSize: '14px',
                  color: '#374151'
                }}>
                  <span style={{ fontWeight: '500' }}>{activity.type}</span>
                  {' - '}
                  <span>{activity.description}</span>
                  <span style={{ 
                    float: 'right', 
                    color: '#9ca3af', 
                    fontSize: '12px' 
                  }}>
                    {activity.timestamp}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ 
              textAlign: 'center', 
              color: '#9ca3af', 
              fontSize: '14px', 
              padding: '40px' 
            }}>
              No recent activity to display
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div style={{ 
          marginTop: '30px', 
          padding: '20px', 
          background: '#f8fafc', 
          borderRadius: '8px', 
          border: '1px solid #e2e8f0' 
        }}>
          <h3 style={{ margin: '0 0 15px 0', color: '#1e293b', fontSize: '16px' }}>
            ⚡ Quick Actions
          </h3>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <QuickActionButton 
              label="Refresh Stats" 
              onClick={async () => {
                setSeedingProgress('🔄 Refreshing stats...');
                await loadDashboardStats();
                setSeedingProgress('✅ Stats refreshed successfully!');
              }}
              disabled={isLoading}
            />
            <QuickActionButton 
              label="Export Data" 
              onClick={() => alert('Export functionality coming soon!')}
              disabled={isLoading}
            />
            <QuickActionButton 
              label="View Logs" 
              onClick={() => alert('Log viewer coming soon!')}
              disabled={isLoading}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper Components
const StatCard = ({ title, value, icon, color }) => (
  <div style={{
    background: 'white',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '20px',
    textAlign: 'center'
  }}>
    <div style={{ fontSize: '24px', marginBottom: '8px' }}>{icon}</div>
    <div style={{ 
      fontSize: '28px', 
      fontWeight: 'bold', 
      color: color, 
      marginBottom: '4px' 
    }}>
      {value.toLocaleString()}
    </div>
    <div style={{ fontSize: '14px', color: '#6b7280' }}>{title}</div>
  </div>
);

const QuickActionButton = ({ label, onClick, disabled }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    style={{
      padding: '8px 16px',
      background: '#f1f5f9',
      color: '#475569',
      border: '1px solid #cbd5e1',
      borderRadius: '4px',
      fontSize: '13px',
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.6 : 1
    }}
  >
    {label}
  </button>
);

export default AdminDashboard;