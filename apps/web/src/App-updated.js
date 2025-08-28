import React, { useState, useEffect } from 'react';
import { useAuth } from './contexts/AuthContext';
import AuthModal from './components/AuthModal';
import AdminDashboard from './components/AdminDashboard';
import { MessageCircle, User, LogOut, Settings, Bookmark, Heart } from 'lucide-react';
import { initializeFirebaseServices } from './services/firebase';

function App() {
  const { 
    user, 
    userProfile, 
    loading: authLoading, 
    isAuthenticated, 
    needsOnboarding, 
    signOut,
    saveItem,
    likeItem,
    savePreferences
  } = useAuth();
  
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showAdminDashboard, setShowAdminDashboard] = useState(false);
  const [currentView, setCurrentView] = useState('swipe'); // swipe, saved, profile, settings
  const [items, setItems] = useState([]);
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(1);

  // Initialize Firebase on mount
  useEffect(() => {
    initializeFirebaseServices();
  }, []);

  // Show auth modal if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      setShowAuthModal(true);
    } else if (isAuthenticated) {
      setShowAuthModal(false);
    }
  }, [authLoading, isAuthenticated]);

  // Load items from Firebase
  useEffect(() => {
    if (isAuthenticated && !needsOnboarding) {
      loadItems();
    }
  }, [isAuthenticated, needsOnboarding]);

  const loadItems = async () => {
    setLoading(true);
    try {
      const { getFirestoreService } = await import('./services/firebase');
      const firestoreService = getFirestoreService();
      const result = await firestoreService.getItems(userProfile?.preferences?.categories || [], 50);
      
      if (result.success) {
        setItems(result.data);
      }
    } catch (error) {
      console.error('Error loading items:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSwipe = async (direction) => {
    const currentItem = items[currentItemIndex];
    if (!currentItem) return;

    if (direction === 'right') {
      // Like the item
      await likeItem(currentItem);
    } else if (direction === 'up') {
      // Save the item
      await saveItem(currentItem);
    }

    // Move to next item
    setCurrentItemIndex(prev => prev < items.length - 1 ? prev + 1 : 0);
  };

  const handleSignOut = async () => {
    await signOut();
    setCurrentView('swipe');
    setCurrentItemIndex(0);
  };

  const handleOnboardingComplete = async (preferences) => {
    await savePreferences(preferences);
    setOnboardingStep(1);
  };

  // Loading state
  if (authLoading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      }}>
        <div style={{ textAlign: 'center', color: 'white' }}>
          <div style={{
            width: '60px',
            height: '60px',
            border: '3px solid rgba(255,255,255,0.3)',
            borderTopColor: 'white',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 20px'
          }} />
          <h2>Loading SwipeCity...</h2>
        </div>
      </div>
    );
  }

  // Onboarding flow
  if (isAuthenticated && needsOnboarding) {
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '20px',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      }}>
        <div style={{
          background: 'white',
          borderRadius: '20px',
          padding: '40px',
          maxWidth: '500px',
          width: '100%',
          boxShadow: '0 20px 40px rgba(0,0,0,0.1)'
        }}>
          <h2 style={{ marginBottom: '20px' }}>Welcome to SwipeCity!</h2>
          
          {onboardingStep === 1 && (
            <div>
              <p style={{ marginBottom: '20px' }}>
                Let's personalize your experience. Select your interests:
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginBottom: '20px' }}>
                {['Sneakers', 'Electronics', 'Vintage', 'Books', 'Home', 'Fitness'].map(category => (
                  <label key={category} style={{
                    padding: '10px',
                    border: '2px solid #ddd',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    textAlign: 'center'
                  }}>
                    <input type="checkbox" style={{ marginRight: '5px' }} />
                    {category}
                  </label>
                ))}
              </div>
              <button
                onClick={() => setOnboardingStep(2)}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: '#007AFF',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  cursor: 'pointer'
                }}
              >
                Continue
              </button>
            </div>
          )}
          
          {onboardingStep === 2 && (
            <div>
              <p style={{ marginBottom: '20px' }}>
                What's your preferred price range?
              </p>
              <select style={{
                width: '100%',
                padding: '12px',
                marginBottom: '20px',
                border: '1px solid #ddd',
                borderRadius: '8px',
                fontSize: '16px'
              }}>
                <option>Under $50</option>
                <option>$50 - $200</option>
                <option>$200 - $500</option>
                <option>$500+</option>
                <option>No preference</option>
              </select>
              <button
                onClick={() => handleOnboardingComplete({
                  categories: [0, 1, 2], // Example categories
                  priceRange: '50-200',
                  shoppingStyle: 'casual'
                })}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: '#007AFF',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  cursor: 'pointer'
                }}
              >
                Start Swiping!
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Admin dashboard
  if (showAdminDashboard) {
    return (
      <AdminDashboard onClose={() => setShowAdminDashboard(false)} />
    );
  }

  // Main app
  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      background: '#f8f9fa'
    }}>
      {/* Auth Modal */}
      <AuthModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)} 
      />
      
      {/* Header */}
      <div style={{
        padding: '15px 20px',
        background: 'white',
        borderBottom: '1px solid #e0e0e0',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <h1 style={{ 
          margin: 0, 
          fontSize: '24px',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          SwipeCity
        </h1>
        
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          {isAuthenticated && (
            <>
              <span style={{ fontSize: '14px', color: '#666' }}>
                {userProfile?.displayName || user?.email}
              </span>
              <button
                onClick={() => setCurrentView('saved')}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '8px',
                  color: currentView === 'saved' ? '#667eea' : '#666'
                }}
              >
                <Bookmark size={20} />
              </button>
              <button
                onClick={() => setCurrentView('profile')}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '8px',
                  color: currentView === 'profile' ? '#667eea' : '#666'
                }}
              >
                <User size={20} />
              </button>
              <button
                onClick={handleSignOut}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '8px',
                  color: '#666'
                }}
              >
                <LogOut size={20} />
              </button>
            </>
          )}
        </div>
      </div>
      
      {/* Main Content */}
      <div style={{
        flex: 1,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '20px'
      }}>
        {currentView === 'swipe' && (
          <div style={{ textAlign: 'center' }}>
            {loading ? (
              <div>Loading items...</div>
            ) : items.length > 0 && items[currentItemIndex] ? (
              <div style={{
                background: 'white',
                borderRadius: '20px',
                padding: '20px',
                maxWidth: '400px',
                boxShadow: '0 10px 30px rgba(0,0,0,0.1)'
              }}>
                <img 
                  src={items[currentItemIndex].image_url} 
                  alt={items[currentItemIndex].title}
                  style={{
                    width: '100%',
                    height: '300px',
                    objectFit: 'cover',
                    borderRadius: '12px',
                    marginBottom: '15px'
                  }}
                />
                <h3>{items[currentItemIndex].title}</h3>
                <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#667eea' }}>
                  ${items[currentItemIndex].price}
                </p>
                <p style={{ color: '#666' }}>{items[currentItemIndex].description}</p>
                
                <div style={{
                  display: 'flex',
                  gap: '10px',
                  marginTop: '20px'
                }}>
                  <button
                    onClick={() => handleSwipe('left')}
                    style={{
                      flex: 1,
                      padding: '12px',
                      background: '#ff4458',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer'
                    }}
                  >
                    Pass
                  </button>
                  <button
                    onClick={() => handleSwipe('up')}
                    style={{
                      flex: 1,
                      padding: '12px',
                      background: '#007AFF',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer'
                    }}
                  >
                    Save
                  </button>
                  <button
                    onClick={() => handleSwipe('right')}
                    style={{
                      flex: 1,
                      padding: '12px',
                      background: '#44d362',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer'
                    }}
                  >
                    Like
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <p>No items available</p>
                <button
                  onClick={loadItems}
                  style={{
                    marginTop: '20px',
                    padding: '12px 24px',
                    background: '#007AFF',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer'
                  }}
                >
                  Load Items
                </button>
              </div>
            )}
          </div>
        )}
        
        {currentView === 'saved' && (
          <div style={{ width: '100%', maxWidth: '800px' }}>
            <h2>Saved Items</h2>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: '20px',
              marginTop: '20px'
            }}>
              {userProfile?.savedItems?.map(item => (
                <div key={item.id} style={{
                  background: 'white',
                  borderRadius: '12px',
                  padding: '15px',
                  boxShadow: '0 5px 15px rgba(0,0,0,0.1)'
                }}>
                  <img 
                    src={item.image_url} 
                    alt={item.title}
                    style={{
                      width: '100%',
                      height: '150px',
                      objectFit: 'cover',
                      borderRadius: '8px',
                      marginBottom: '10px'
                    }}
                  />
                  <h4 style={{ margin: '0 0 5px 0' }}>{item.title}</h4>
                  <p style={{ margin: 0, fontWeight: 'bold', color: '#667eea' }}>
                    ${item.price}
                  </p>
                </div>
              ))}
            </div>
            {(!userProfile?.savedItems || userProfile.savedItems.length === 0) && (
              <p style={{ textAlign: 'center', color: '#666', marginTop: '40px' }}>
                No saved items yet. Start swiping to save items!
              </p>
            )}
          </div>
        )}
        
        {currentView === 'profile' && (
          <div style={{
            background: 'white',
            borderRadius: '20px',
            padding: '40px',
            maxWidth: '500px',
            width: '100%',
            boxShadow: '0 10px 30px rgba(0,0,0,0.1)'
          }}>
            <h2>Profile</h2>
            <div style={{ marginTop: '20px' }}>
              <p><strong>Name:</strong> {userProfile?.displayName || 'Not set'}</p>
              <p><strong>Email:</strong> {user?.email}</p>
              <p><strong>Member Since:</strong> {new Date(userProfile?.createdAt || Date.now()).toLocaleDateString()}</p>
              <p><strong>Saved Items:</strong> {userProfile?.savedItems?.length || 0}</p>
              <p><strong>Liked Items:</strong> {userProfile?.likedItems?.length || 0}</p>
            </div>
            
            <button
              onClick={() => setShowAdminDashboard(true)}
              style={{
                marginTop: '20px',
                padding: '10px 20px',
                background: '#f0f0f0',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
            >
              Admin Dashboard
            </button>
          </div>
        )}
      </div>
      
      {/* Bottom Navigation */}
      <div style={{
        padding: '10px 20px',
        background: 'white',
        borderTop: '1px solid #e0e0e0',
        display: 'flex',
        justifyContent: 'space-around'
      }}>
        <button
          onClick={() => setCurrentView('swipe')}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '10px',
            color: currentView === 'swipe' ? '#667eea' : '#999'
          }}
        >
          <Heart size={24} />
          <div style={{ fontSize: '12px', marginTop: '4px' }}>Swipe</div>
        </button>
        <button
          onClick={() => setCurrentView('saved')}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '10px',
            color: currentView === 'saved' ? '#667eea' : '#999'
          }}
        >
          <Bookmark size={24} />
          <div style={{ fontSize: '12px', marginTop: '4px' }}>Saved</div>
        </button>
        <button
          onClick={() => setCurrentView('profile')}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '10px',
            color: currentView === 'profile' ? '#667eea' : '#999'
          }}
        >
          <User size={24} />
          <div style={{ fontSize: '12px', marginTop: '4px' }}>Profile</div>
        </button>
      </div>
      
      {/* Add spin animation */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default App;