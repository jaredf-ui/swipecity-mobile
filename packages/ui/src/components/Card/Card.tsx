import React from 'react';
import { Item, ItemUtils } from '@swipecity/shared';

export interface CardProps {
  item: Item;
  onSwipe?: (direction: 'left' | 'right') => void;
  isDragging?: boolean;
  dragOffset?: { x: number; y: number };
  style?: React.CSSProperties;
  className?: string;
}

export const Card: React.FC<CardProps> = ({
  item,
  onSwipe,
  isDragging = false,
  dragOffset = { x: 0, y: 0 },
  style = {},
  className = '',
}) => {
  const cardStyles: React.CSSProperties = {
    position: 'relative',
    width: '100%',
    maxWidth: '350px',
    height: '500px',
    backgroundColor: 'white',
    borderRadius: '20px',
    boxShadow: isDragging 
      ? '0 20px 40px rgba(0,0,0,0.3)' 
      : '0 10px 30px rgba(0,0,0,0.2)',
    overflow: 'hidden',
    transform: `translate(${dragOffset.x}px, ${dragOffset.y}px) rotate(${dragOffset.x * 0.1}deg)`,
    transition: isDragging ? 'none' : 'transform 0.3s ease, box-shadow 0.3s ease',
    cursor: isDragging ? 'grabbing' : 'grab',
    ...style,
  };

  const imageStyles: React.CSSProperties = {
    width: '100%',
    height: '60%',
    objectFit: 'cover',
    backgroundColor: '#f5f5f5',
  };

  const contentStyles: React.CSSProperties = {
    padding: '20px',
    height: '40%',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
  };

  const titleStyles: React.CSSProperties = {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#333',
    marginBottom: '8px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  };

  const priceStyles: React.CSSProperties = {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: '10px',
  };

  const metaStyles: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '14px',
    color: '#666',
  };

  const conditionStyles: React.CSSProperties = {
    padding: '4px 8px',
    borderRadius: '8px',
    fontSize: '12px',
    fontWeight: 'bold',
    backgroundColor: item.condition === 'New' ? '#4CAF50' : 
                    item.condition === 'Like New' ? '#2196F3' :
                    item.condition === 'Good' ? '#FF9800' : '#9E9E9E',
    color: 'white',
  };

  // Swipe indicators
  const getSwipeIndicator = () => {
    if (!isDragging || Math.abs(dragOffset.x) < 50) return null;

    const isRight = dragOffset.x > 0;
    const opacity = Math.min(Math.abs(dragOffset.x) / 100, 1);

    return (
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: isRight ? '20px' : 'auto',
          right: isRight ? 'auto' : '20px',
          transform: 'translateY(-50%)',
          zIndex: 10,
          opacity,
          transition: 'opacity 0.1s ease',
        }}
      >
        <div
          style={{
            padding: '10px 20px',
            borderRadius: '20px',
            fontSize: '18px',
            fontWeight: 'bold',
            color: 'white',
            backgroundColor: isRight ? '#4CAF50' : '#ff4444',
            transform: `rotate(${isRight ? -15 : 15}deg)`,
          }}
        >
          {isRight ? '💚 INTERESTED' : '👋 PASS'}
        </div>
      </div>
    );
  };

  return (
    <div style={cardStyles} className={className}>
      {getSwipeIndicator()}
      
      <img
        src={item.image_url}
        alt={item.title}
        style={imageStyles}
        onError={(e) => {
          e.currentTarget.src = 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=350&h=300&fit=crop';
        }}
      />
      
      <div style={contentStyles}>
        <div>
          <h3 style={titleStyles}>{item.title}</h3>
          <div style={priceStyles}>
            {ItemUtils.formatPrice(item.price)}
          </div>
        </div>
        
        <div style={metaStyles}>
          <div>
            <div style={{ marginBottom: '4px' }}>
              <strong>{item.seller_name}</strong>
            </div>
            <div>📍 {item.distance}</div>
          </div>
          <div style={conditionStyles}>
            {item.condition}
          </div>
        </div>
      </div>
    </div>
  );
};