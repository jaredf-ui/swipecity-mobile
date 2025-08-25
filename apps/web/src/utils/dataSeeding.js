/**
 * SwipeCity Data Seeding Utility
 * Generates realistic marketplace data for pre-production testing
 */

import { DataService } from './dataIntegration';

// Sample data pools for realistic listings
const categories = [
  'Electronics', 'Fashion', 'Home & Garden', 'Sports & Outdoors', 
  'Books & Media', 'Automotive', 'Collectibles', 'Art & Crafts',
  'Musical Instruments', 'Baby & Kids', 'Health & Beauty', 'Tools & Hardware'
];

const conditions = ['New', 'Like New', 'Good', 'Fair'];

const sampleListings = {
  'Electronics': [
    {
      title: 'iPhone 13 Pro Max - Unlocked',
      basePrice: 650,
      descriptions: [
        'Excellent condition iPhone 13 Pro Max in Pacific Blue. Always kept in case with screen protector. Battery health at 92%. Includes original charger and box.',
        'Mint condition iPhone 13 Pro Max. Upgraded to iPhone 15 so no longer needed. No scratches or dents. Works perfectly.',
        'iPhone 13 Pro Max 256GB unlocked. Used for 1 year, very well maintained. Minor wear on corners but screen is perfect.'
      ]
    },
    {
      title: 'MacBook Air M1',
      basePrice: 750,
      descriptions: [
        '2021 MacBook Air with M1 chip, 8GB RAM, 256GB storage. Perfect for students or professionals. Includes charger and original box.',
        'MacBook Air M1 in space gray. Barely used, purchased for college but ended up using desktop instead. Like new condition.',
        'MacBook Air M1 - excellent performance, long battery life. Moving and need to sell quickly. Small dent on corner but works perfectly.'
      ]
    },
    {
      title: 'iPad Pro 11" with Apple Pencil',
      basePrice: 450,
      descriptions: [
        'iPad Pro 11" (3rd gen) with Apple Pencil 2nd gen. Great for digital art and note-taking. Screen is flawless.',
        '2021 iPad Pro 11" 128GB Wi-Fi. Includes Apple Pencil and Logitech keyboard case. Perfect for work or creative projects.',
        'iPad Pro 11" space gray. Used for graphic design work. Excellent condition with minimal wear. Apple Pencil included.'
      ]
    },
    {
      title: 'Sony WH-1000XM4 Headphones',
      basePrice: 200,
      descriptions: [
        'Sony WH-1000XM4 noise cancelling headphones in black. Amazing sound quality and battery life. Includes carrying case.',
        'Barely used Sony WH-1000XM4 headphones. Received as gift but prefer earbuds. Original packaging and accessories included.',
        'Sony WH-1000XM4 wireless headphones. Great condition, foam ear pads recently replaced. Perfect for travel or work.'
      ]
    },
    {
      title: 'Nintendo Switch OLED',
      basePrice: 280,
      descriptions: [
        'Nintendo Switch OLED model with neon red/blue Joy-Cons. Includes dock, controllers, and 5 games. Excellent condition.',
        'Switch OLED barely used, purchased during pandemic but didn\'t have time to play. Comes with Pro Controller and carrying case.',
        'Nintendo Switch OLED white model. Screen is perfect, Joy-Cons work great. Includes original accessories and 3 game cartridges.'
      ]
    }
  ],
  'Fashion': [
    {
      title: 'Levi\'s 501 Original Jeans',
      basePrice: 45,
      descriptions: [
        'Classic Levi\'s 501 jeans in dark wash, size 32x32. Worn only a few times, still have that perfect fit and feel.',
        'Vintage-style 501s in excellent condition. Size 30x34. Moving and clearing out closet. These retail for $70+.',
        'Levi\'s 501 Original jeans, size 34x30. Great condition with minimal fading. Perfect everyday jeans.'
      ]
    },
    {
      title: 'Nike Air Max 270 Sneakers',
      basePrice: 85,
      descriptions: [
        'Nike Air Max 270 in white/black colorway, size 10. Clean condition with minimal creasing. Very comfortable.',
        'Air Max 270s size 9.5. Worn less than 10 times. Still have box and extra laces. Great for casual wear or light workouts.',
        'Nike Air Max 270 men\'s size 11. Good condition with normal wear. Cleaned and ready for new owner.'
      ]
    },
    {
      title: 'Patagonia Fleece Jacket',
      basePrice: 65,
      descriptions: [
        'Patagonia Better Sweater fleece jacket in classic navy. Size medium. Perfect for layering in fall/winter.',
        'Women\'s Patagonia fleece jacket size small. Excellent condition, barely worn. Great for hiking or casual wear.',
        'Patagonia fleece pullover in gray, size large. Warm and comfortable. Small snag on sleeve but otherwise great condition.'
      ]
    }
  ],
  'Home & Garden': [
    {
      title: 'KitchenAid Stand Mixer',
      basePrice: 180,
      descriptions: [
        'KitchenAid Artisan 5-qt stand mixer in red. Includes dough hook, paddle, and whisk. Works perfectly, just don\'t bake much.',
        'Classic white KitchenAid mixer. Used for holidays but otherwise sits in cabinet. Excellent condition with original box.',
        'KitchenAid stand mixer in black. Some wear on finish but motor runs great. Perfect for serious bakers.'
      ]
    },
    {
      title: 'IKEA BILLY Bookshelf',
      basePrice: 35,
      descriptions: [
        'IKEA BILLY bookshelf in white, 6 feet tall. Assembled and in good condition. Must pick up, won\'t fit in car.',
        'Billy bookshelf with glass doors. Oak veneer finish. Some minor scratches but sturdy and functional.',
        'Two matching BILLY bookshelves in black-brown. Perfect for home office or living room. Selling as set.'
      ]
    },
    {
      title: 'Dyson V8 Cordless Vacuum',
      basePrice: 220,
      descriptions: [
        'Dyson V8 Animal cordless vacuum. Excellent for pet hair and general cleaning. Includes all attachments and wall mount.',
        'Dyson V8 Absolute with extra tools. Battery still holds good charge. Minor cosmetic wear but works like new.',
        'Cordless Dyson V8 vacuum cleaner. Great suction power, easy to maneuver. Comes with charging dock and accessories.'
      ]
    }
  ],
  'Sports & Outdoors': [
    {
      title: 'Trek Mountain Bike',
      basePrice: 320,
      descriptions: [
        'Trek 3500 mountain bike in excellent condition. 21-speed, aluminum frame. Recently tuned up with new tires.',
        '26" Trek mountain bike, perfect for trails or commuting. Well-maintained with regular tune-ups. Ready to ride.',
        'Trek mountain bike with front suspension. Some wear but mechanically sound. Great entry-level bike for outdoor adventures.'
      ]
    },
    {
      title: 'Yeti Rambler Tumbler Set',
      basePrice: 40,
      descriptions: [
        'Set of 4 Yeti Rambler 20oz tumblers in assorted colors. Great for camping or everyday use. Keeps drinks cold all day.',
        'Yeti tumbler collection - 6 different sizes and colors. Perfect for outdoor enthusiasts. Retail value over $150.',
        'Yeti Rambler 30oz tumbler in navy blue. Excellent condition, no dents or scratches. Includes MagSlider lid.'
      ]
    }
  ],
  'Books & Media': [
    {
      title: 'Harry Potter Complete Book Set',
      basePrice: 55,
      descriptions: [
        'Complete Harry Potter series in hardcover. Books 1-7 in excellent condition. Perfect for collectors or new readers.',
        'Harry Potter hardcover set with dust jackets. Some shelf wear but pages are crisp. Great addition to any library.',
        'Full set of Harry Potter books in paperback. Well-loved but complete. Perfect for re-reading or gifting.'
      ]
    },
    {
      title: 'Vinyl Record Collection',
      basePrice: 120,
      descriptions: [
        'Collection of 50+ classic rock vinyl records. Beatles, Led Zeppelin, Pink Floyd, and more. Various conditions.',
        'Curated vinyl collection - jazz, blues, and soul records. Most in VG+ condition. Perfect for serious collectors.',
        'Vintage vinyl lot with rare finds. Mostly 70s and 80s albums. Some wear but all playable. Great starter collection.'
      ]
    }
  ]
};

const userProfiles = [
  {
    username: 'MikeTheCollector',
    bio: 'Long-time collector of vintage items and tech gadgets. Always looking for unique finds!',
    verified: true,
    joinedMonths: 8,
    location: 'San Francisco, CA'
  },
  {
    username: 'SarahStylesLiving',
    bio: 'Interior designer selling carefully curated home pieces. All items from smoke-free, pet-free home.',
    verified: true,
    joinedMonths: 12,
    location: 'Los Angeles, CA'
  },
  {
    username: 'TechEnthusiast92',
    bio: 'Software engineer who loves trying new tech. Always upgrading, so selling previous generation items.',
    verified: true,
    joinedMonths: 6,
    location: 'Austin, TX'
  },
  {
    username: 'OutdoorAdventurer',
    bio: 'Hiking and camping gear enthusiast. Selling quality outdoor equipment that\'s been well cared for.',
    verified: true,
    joinedMonths: 15,
    location: 'Denver, CO'
  },
  {
    username: 'MinimalistMom',
    bio: 'Decluttering family home. Selling kids items, household goods, and more. Everything clean and well-maintained.',
    verified: true,
    joinedMonths: 4,
    location: 'Portland, OR'
  },
  {
    username: 'VintageVinylVibe',
    bio: 'Record collector for 20+ years. Selling duplicates and items that need new homes. All records tested.',
    verified: true,
    joinedMonths: 24,
    location: 'Nashville, TN'
  },
  {
    username: 'CollegeGradSale',
    bio: 'Recent graduate selling furniture and electronics before moving. Everything priced to sell quickly!',
    verified: false,
    joinedMonths: 1,
    location: 'Boston, MA'
  },
  {
    username: 'FashionistaFinds',
    bio: 'Fashion lover with too many clothes! Selling designer and contemporary pieces in excellent condition.',
    verified: true,
    joinedMonths: 9,
    location: 'New York, NY'
  }
];

// Utility functions
const getRandomElement = (array) => array[Math.floor(Math.random() * array.length)];

const getRandomPrice = (basePrice, condition) => {
  const conditionMultipliers = {
    'New': 1.0,
    'Like New': 0.85,
    'Good': 0.70,
    'Fair': 0.50
  };
  
  const multiplier = conditionMultipliers[condition] || 0.70;
  const variance = 0.15; // ±15% price variance
  const randomFactor = 1 + (Math.random() - 0.5) * 2 * variance;
  
  return Math.round(basePrice * multiplier * randomFactor);
};

const generateImagePlaceholders = (category, itemTitle) => {
  // Real images for performance testing - organized by category
  const imagesByCategory = {
    'electronics': [
      'https://images.unsplash.com/photo-1556906781-9a412961c28c?w=400&h=400&fit=crop', // iPhone
      'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=400&h=400&fit=crop', // MacBook
      'https://images.unsplash.com/photo-1572569511254-d8f925fe2cbb?w=400&h=400&fit=crop', // iPad
      'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop', // Headphones
      'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=400&fit=crop', // Nintendo Switch
      'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=400&h=400&fit=crop', // Laptop
      'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=400&h=400&fit=crop', // Camera
      'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400&h=400&fit=crop'  // Phone
    ],
    'fashion': [
      'https://images.unsplash.com/photo-1544966503-7cc5ac882d5d?w=400&h=400&fit=crop', // Denim jacket
      'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=400&h=400&fit=crop', // Sneakers
      'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=400&h=400&fit=crop', // Shoes
      'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=400&fit=crop', // Clothing
      'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=400&h=400&fit=crop', // Clothing rack
      'https://images.unsplash.com/photo-1551803091-e20673f15770?w=400&h=400&fit=crop', // Jacket
      'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=400&h=400&fit=crop', // Dress
      'https://images.unsplash.com/photo-1516762689617-e1cfddf819d1?w=400&h=400&fit=crop'  // Bag
    ],
    'home & garden': [
      'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&h=400&fit=crop', // Mixer
      'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&h=400&fit=crop', // Sofa
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400&h=400&fit=crop', // Plant
      'https://images.unsplash.com/photo-1554995207-c18c203602cb?w=400&h=400&fit=crop', // Furniture
      'https://images.unsplash.com/photo-1493663284031-b7e3aaa4cab7?w=400&h=400&fit=crop', // Home decor
      'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=400&h=400&fit=crop', // Bookshelf
      'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&h=400&fit=crop', // Kitchen
      'https://images.unsplash.com/photo-1565814329452-e1efa11c5b89?w=400&h=400&fit=crop'  // Vacuum
    ],
    'books & media': [
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop', // Books
      'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400&h=400&fit=crop', // Library
      'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=400&h=400&fit=crop', // Book stack
      'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&h=400&fit=crop', // Books
      'https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=400&h=400&fit=crop', // Open book
      'https://images.unsplash.com/photo-1553729459-efe14ef6055d?w=400&h=400&fit=crop', // Vinyl records
      'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop', // Records
      'https://images.unsplash.com/photo-1614149162883-504ce4d13909?w=400&h=400&fit=crop'  // Books on shelf
    ],
    'sports & outdoors': [
      'https://images.unsplash.com/photo-1544191696-15693072c144?w=400&h=400&fit=crop', // Bike
      'https://images.unsplash.com/photo-1571068316344-75bc76f77890?w=400&h=400&fit=crop', // Hiking gear
      'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=400&fit=crop', // Mountain bike
      'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=400&fit=crop', // Sports equipment
      'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=400&h=400&fit=crop', // Water bottle
      'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=400&h=400&fit=crop', // Tumbler
      'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=400&fit=crop', // Camping
      'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=400&fit=crop'  // Outdoor gear
    ]
  };
  
  const categoryKey = category.toLowerCase();
  const categoryImages = imagesByCategory[categoryKey] || imagesByCategory['electronics'];
  
  // Generate 1-3 images per item for realistic variety
  const imageCount = Math.floor(Math.random() * 3) + 1;
  const images = [];
  
  for (let i = 0; i < imageCount; i++) {
    const imageIndex = (itemTitle.length + i) % categoryImages.length; // Consistent selection based on title
    images.push({
      url: categoryImages[imageIndex],
      isPrimary: i === 0
    });
  }
  
  return images;
};

// Main data generation functions
export const generateSampleListings = (count = 100) => {
  const listings = [];
  
  for (let i = 0; i < count; i++) {
    const category = getRandomElement(categories);
    const categoryItems = sampleListings[category] || [];
    
    if (categoryItems.length === 0) continue;
    
    const item = getRandomElement(categoryItems);
    const condition = getRandomElement(conditions);
    const seller = getRandomElement(userProfiles);
    const description = getRandomElement(item.descriptions);
    
    const images = generateImagePlaceholders(category, item.title);
    const primaryImage = images.find(img => img.isPrimary) || images[0];
    
    
    // Calculate consistent rating and review count from user profile
    const rating = (4.2 + Math.random() * 0.8); // 4.2-5.0 rating
    const reviewCount = Math.floor(Math.random() * 200) + 10;
    
    const listing = {
      id: `listing_${i + 1}`,
      title: item.title,
      price: getRandomPrice(item.basePrice, condition),
      condition: condition,
      description: description,
      category: category.toLowerCase(), // Match format expected by main app
      image_url: primaryImage?.url || 'https://via.placeholder.com/400x400/4F46E5/white?text=Image',
      images: images, // Keep full images array for detail view
      seller_id: seller.username,
      seller_name: seller.username, // Required by UI
      seller_rating: parseFloat(rating.toFixed(1)), // Required by UI - ensure it's a number with 1 decimal
      seller_reviews: reviewCount, // Required by UI - ensure it's a number
      seller_verified: seller.verified,
      verified: seller.verified, // Required by UI - duplicate for compatibility  
      distance: `${(Math.random() * 8 + 0.5).toFixed(1)} miles`, // Required by UI - ensure formatted string
      location: seller.location,
      likes_count: Math.floor(Math.random() * 50),
      view_count: Math.floor(Math.random() * 100),
      seller_interested: Math.random() > 0.7, // 30% chance seller is interested in trades
      algorithmScore: parseFloat((0.7 + Math.random() * 0.3).toFixed(2)), // 0.7-1.0 score, ensure it's a number
      created_at: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000), // Random date within last 30 days
      updated_at: new Date(),
      is_available: Math.random() > 0.1, // 90% available
      status: 'active'
    };
    
    listings.push(listing);
  }
  
  return listings.sort((a, b) => b.created_at - a.created_at); // Sort by newest first
};

export const generateSampleUsers = () => {
  return userProfiles.map((profile, index) => ({
    id: `user_${index + 1}`,
    username: profile.username,
    email: `${profile.username.toLowerCase()}@example.com`,
    bio: profile.bio,
    location: profile.location,
    verified: profile.verified,
    joined_date: new Date(Date.now() - profile.joinedMonths * 30 * 24 * 60 * 60 * 1000),
    avatar_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.username)}&background=4F46E5&color=fff&size=200`,
    listing_count: Math.floor(Math.random() * 15) + 1,
    rating: (4.2 + Math.random() * 0.8).toFixed(1), // 4.2-5.0 rating
    transaction_count: Math.floor(Math.random() * 50) + 5
  }));
};

export const generateInterestData = (listings, users) => {
  const interests = [];
  
  // Generate realistic interest/match data
  for (let i = 0; i < 50; i++) {
    const listing = getRandomElement(listings);
    const buyer = getRandomElement(users);
    
    // Don't let users be interested in their own items
    if (listing.seller_id === buyer.username) continue;
    
    interests.push({
      id: `interest_${i + 1}`,
      listing_id: listing.id,
      buyer_id: buyer.id,
      buyer_name: buyer.username,
      seller_id: listing.seller_id,
      status: getRandomElement(['pending', 'accepted', 'declined', 'expired']),
      created_at: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000), // Within last week
      message: Math.random() > 0.5 ? 'Hi! Is this item still available?' : null
    });
  }
  
  return interests;
};

// Seeding functions for Firebase
export const seedFirebaseData = async (options = {}) => {
  const {
    listingCount = 100,
    skipUsers = false,
    skipListings = false,
    skipInterests = false
  } = options;
  
  console.log('🌱 Starting data seeding process...');
  
  try {
    let users = [];
    let listings = [];
    let interests = [];
    
    // Generate sample users
    if (!skipUsers) {
      console.log('👥 Generating sample users...');
      users = generateSampleUsers();
      
      for (const user of users) {
        await DataService.createUser(user);
      }
      
      console.log(`✅ Created ${users.length} sample users`);
    }
    
    // Generate sample listings
    if (!skipListings) {
      console.log('📦 Generating sample listings...');
      listings = generateSampleListings(listingCount);
      
      for (const listing of listings) {
        await DataService.createItem(listing);
        
        // Add small delay to avoid rate limiting
        if (listings.indexOf(listing) % 10 === 0) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      console.log(`✅ Created ${listings.length} sample listings`);
    }
    
    // Generate interest/match data
    if (!skipInterests && users.length > 0 && listings.length > 0) {
      console.log('💝 Generating interest data...');
      interests = generateInterestData(listings, users);
      
      for (const interest of interests) {
        await DataService.createInterest(interest);
      }
      
      console.log(`✅ Created ${interests.length} sample interests`);
    }
    
    console.log('🎉 Data seeding completed successfully!');
    
    return {
      success: true,
      stats: {
        users: users.length,
        listings: listings.length,
        interests: interests.length
      }
    };
    
  } catch (error) {
    console.error('❌ Data seeding failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Quick seeding functions for development
export const seedQuickDemo = async () => {
  console.log('🚀 Quick demo seeding (20 listings) with real images...');
  return await seedFirebaseData({
    listingCount: 20,
    skipInterests: true
  });
};

export const seedFullPreProduction = async () => {
  console.log('🏗️ Full pre-production seeding (200 listings)...');
  return await seedFirebaseData({
    listingCount: 200
  });
};

// Export sample data for testing
export const sampleData = {
  categories,
  conditions,
  sampleListings,
  userProfiles
};

// Test function to verify image generation - can be called from browser console
export const testImageGeneration = () => {
  console.log('🧪 Testing image generation...');
  const testItems = ['iPhone 13 Pro Max - Unlocked', 'MacBook Air M1', 'Nike Air Max 270 Sneakers'];
  const testCategories = ['Electronics', 'Electronics', 'Fashion'];
  
  testItems.forEach((title, index) => {
    const images = generateImagePlaceholders(testCategories[index], title);
    console.log(`📱 ${title} (${testCategories[index]}):`, images[0]?.url);
  });
  
  return 'Image generation test complete - check console above';
};

// Make test function globally available for browser console
window.testImageGeneration = testImageGeneration;