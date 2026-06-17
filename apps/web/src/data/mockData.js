export const mockItems = [
  {
    id: '1',
    title: "Nike Air Jordans",
    price: 250,
    image_url: "https://images.unsplash.com/photo-1556906781-9a412961c28c?w=400&h=400&fit=crop",
    seller_name: "Mike Chen",
    seller_rating: 4.8,
    seller_reviews: 127,
    city: "Raleigh, NC",
    description: "Barely worn, size 10.5. Original box included.",
    condition: "Like New",
    likes_count: 47,
    category: "sneakers",
    seller_id: "seller1",
    verified: true,
    seller_interested: true,
    algorithmScore: 0.95
  },
  {
    id: '2',
    title: "Vintage Denim Jacket",
    price: 85,
    image_url: "https://images.unsplash.com/photo-1544966503-7cc5ac882d5d?w=400&h=400&fit=crop",
    seller_name: "Sarah Johnson",
    seller_rating: 4.6,
    seller_reviews: 89,
    city: "Durham, NC",
    description: "Classic 90s style, perfect condition.",
    condition: "Good",
    likes_count: 12,
    category: "vintage",
    seller_id: "seller2",
    verified: true,
    seller_interested: false,
    algorithmScore: 0.88
  },
  {
    id: '3',
    title: "MacBook Pro 13-inch",
    price: 1200,
    image_url: "https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=400&h=400&fit=crop",
    seller_name: "Tech Guru",
    seller_rating: 4.9,
    seller_reviews: 203,
    city: "Raleigh, NC",
    description: "2020 model, excellent condition, includes charger.",
    condition: "Excellent",
    likes_count: 89,
    category: "electronics",
    seller_id: "seller3",
    verified: false,
    seller_interested: true,
    algorithmScore: 0.92
  }
];

export const mockChats = [
  {
    id: 'demo_chat',
    seller_name: 'Demo Seller',
    item_title: 'Demo Item',
    item_image: 'https://images.unsplash.com/photo-1556906781-9a412961c28c?w=400&h=400&fit=crop',
    seller_id: 'demo_seller',
    item_id: 'demo_item',
    last_message: 'Hi! Interested in this item?',
    timestamp: '2:30 PM',
    unread: false,
    messages: [
      {
        id: 'm1',
        sender_id: 'demo_seller',
        sender_name: 'Demo Seller',
        text: 'Hi! Thanks for your interest!',
        timestamp: '2:30 PM'
      },
      {
        id: 'm2',
        sender_id: 'user123',
        sender_name: 'You',
        text: 'Is this still available?',
        timestamp: '2:32 PM'
      }
    ]
  }
];

export const categories = [
  '👟 Sneakers',
  '👕 Vintage',
  '📱 Electronics',
  '🏠 Home',
  '📚 Books',
  '💪 Fitness'
];

// Security utilities (fallback for offline use)
export const SecurityUtils = {
  sanitizeInput: (input) => {
    if (typeof input !== 'string') return '';
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .trim();
  },
  
  validateEmail: (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && email.length <= 254;
  },
  
  checkRateLimit: (lastAction, cooldown = 300) => {
    return Date.now() - lastAction >= cooldown;
  },
  
  validateMessage: (message) => {
    if (!message || typeof message !== 'string') return false;
    return message.trim().length > 0 && message.length <= 1000;
  }
};