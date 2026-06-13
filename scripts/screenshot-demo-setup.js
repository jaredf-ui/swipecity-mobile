// SwipeCity Screenshot Demo Data Setup
// Run this in browser console to load perfect demo content for screenshots
// This doesn't affect your production code - just temporary demo data

const screenshotDemoSetup = {
  
  // Perfect demo items for swiping screenshots
  demoItems: [
    {
      id: 'demo_vintage_chair',
      title: 'Vintage Mid-Century Chair',
      description: 'Beautiful vintage chair in excellent condition. Perfect for any modern home.',
      price: 180,
      image_url: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&h=400&fit=crop',
      seller_name: 'Sarah M.',
      seller_location: 'Downtown',
      category: 'furniture',
      condition: 'excellent'
    },
    {
      id: 'demo_macbook',
      title: 'MacBook Air M2 - Like New',
      description: 'Barely used MacBook Air, perfect for students or professionals. Includes original box.',
      price: 1200,
      image_url: 'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=400&h=400&fit=crop',
      seller_name: 'Alex Chen',
      seller_location: 'University Area',
      category: 'electronics',
      condition: 'like-new'
    },
    {
      id: 'demo_designer_dress',
      title: 'Designer Summer Dress',
      description: 'Gorgeous designer dress, worn only once. Perfect for special occasions.',
      price: 95,
      image_url: 'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=400&h=400&fit=crop',
      seller_name: 'Emma Rodriguez',
      seller_location: 'Midtown',
      category: 'clothing',
      condition: 'excellent'
    },
    {
      id: 'demo_guitar',
      title: 'Acoustic Guitar - Yamaha',
      description: 'Professional quality acoustic guitar. Great sound, well maintained.',
      price: 350,
      image_url: 'https://images.unsplash.com/photo-1510915361894-db8b60106cb1?w=400&h=400&fit=crop',
      seller_name: 'Mike Johnson',
      seller_location: 'Arts District',
      category: 'instruments',
      condition: 'good'
    }
  ],

  // Perfect demo chat conversations
  demoChats: [
    {
      id: 'chat_vintage_chair',
      item_id: 'demo_vintage_chair',
      item_title: 'Vintage Mid-Century Chair',
      item_image: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&h=400&fit=crop',
      seller_name: 'Sarah M.',
      seller_id: 'seller_sarah',
      last_message: "Yes, it's still available! Would you like to see more photos?",
      timestamp: '2:34 PM',
      unread: false,
      messages: [
        {
          id: 'msg1',
          text: 'Hi! Is this chair still available?',
          sender_id: 'user_demo',
          sender_name: 'You',
          timestamp: '2:30 PM'
        },
        {
          id: 'msg2', 
          text: "Yes, it's still available! Would you like to see more photos?",
          sender_id: 'seller_sarah',
          sender_name: 'Sarah M.',
          timestamp: '2:34 PM'
        },
        {
          id: 'msg3',
          text: 'That would be great! Also, is the price negotiable?',
          sender_id: 'user_demo',
          sender_name: 'You', 
          timestamp: '2:35 PM'
        }
      ]
    },
    {
      id: 'chat_macbook',
      item_id: 'demo_macbook',
      item_title: 'MacBook Air M2',
      item_image: 'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=400&h=400&fit=crop',
      seller_name: 'Alex Chen',
      seller_id: 'seller_alex',
      last_message: 'Perfect! I can meet tomorrow at 3pm',
      timestamp: '1:45 PM',
      unread: true,
      messages: [
        {
          id: 'msg4',
          text: 'Does this come with the original charger?',
          sender_id: 'user_demo',
          sender_name: 'You',
          timestamp: '1:42 PM'
        },
        {
          id: 'msg5',
          text: 'Yes! Charger, box, and all original accessories included.',
          sender_id: 'seller_alex',
          sender_name: 'Alex Chen',
          timestamp: '1:43 PM'
        },
        {
          id: 'msg6',
          text: 'Great! When would be a good time to meet?',
          sender_id: 'user_demo',
          sender_name: 'You',
          timestamp: '1:44 PM'
        },
        {
          id: 'msg7',
          text: 'Perfect! I can meet tomorrow at 3pm at the campus coffee shop.',
          sender_id: 'seller_alex',
          sender_name: 'Alex Chen',
          timestamp: '1:45 PM'
        }
      ]
    }
  ],

  // Perfect demo profile data
  demoProfile: {
    name: 'Jordan Smith',
    bio: 'Local marketplace enthusiast 🌟 Love finding unique items and connecting with neighbors. Always happy to negotiate!',
    photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face',
    location: 'Downtown District',
    memberSince: 'March 2024',
    rating: 4.9,
    reviewCount: 23
  },

  // Perfect demo stats
  demoStats: {
    dailySwipeCount: 47,
    dailyLikeCount: 12,
    dailySaveCount: 3,
    totalSwipes: 1247,
    totalLikes: 89,
    totalSaves: 23,
    totalMatches: 18,
    activeDeal: 'MacBook Air M2',
    savedItems: 23
  },

  // Load demo data into app
  loadDemoData: function() {
    console.log('🎬 Loading SwipeCity Demo Data for Screenshots...');
    
    // Update app state with demo items
    if (window.updateState) {
      window.updateState({
        items: this.demoItems,
        currentItem: this.demoItems[0],
        chats: this.demoChats
      });
    }
    
    // Update user profile with demo data  
    if (window.setUser) {
      window.setUser(this.demoProfile);
    }
    
    // Load demo stats
    localStorage.setItem('swipeCity_dailyStats', JSON.stringify(this.demoStats));
    
    console.log('✅ Demo data loaded! Perfect for screenshots.');
    console.log('📸 Ready to capture:');
    console.log('- Beautiful swipe cards with high-quality images');
    console.log('- Active chat conversations');  
    console.log('- Complete profile setup');
    console.log('- Impressive stats and activity');
  },

  // Clean up demo data when done
  cleanupDemoData: function() {
    console.log('🧹 Cleaning up demo data...');
    localStorage.removeItem('swipeCity_dailyStats');
    console.log('✅ Demo data cleaned up. Ready for production!');
  }
};

// Instructions for use:
console.log(`
🎬 SwipeCity Screenshot Demo Setup Ready!

TO LOAD DEMO DATA:
screenshotDemoSetup.loadDemoData();

TO CLEAN UP WHEN DONE:
screenshotDemoSetup.cleanupDemoData();

SCREENSHOT SEQUENCE:
1. Main swipe interface (beautiful vintage chair)
2. Chat conversation (active MacBook discussion)  
3. Profile setup (complete with photo & bio)
4. Stats/dashboard (impressive numbers)
5. Seller mode (add item interface)
`);

// Export for use
window.screenshotDemoSetup = screenshotDemoSetup;