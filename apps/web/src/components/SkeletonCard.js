import React from 'react';

const SkeletonCard = () => {
  return (
    <div style={{
      width: '350px',
      height: '600px',
      background: 'white',
      borderRadius: '20px',
      boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
      padding: '20px',
      margin: '0 auto',
      animation: 'pulse 1.5s ease-in-out infinite'
    }}>
      {/* Skeleton Image */}
      <div style={{
        width: '100%',
        height: '350px',
        background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
        backgroundSize: '200% 100%',
        animation: 'loading 1.5s infinite',
        borderRadius: '15px',
        marginBottom: '20px'
      }} />
      
      {/* Skeleton Title */}
      <div style={{
        width: '80%',
        height: '24px',
        background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
        backgroundSize: '200% 100%',
        animation: 'loading 1.5s infinite',
        borderRadius: '4px',
        marginBottom: '10px'
      }} />
      
      {/* Skeleton Price */}
      <div style={{
        width: '30%',
        height: '32px',
        background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
        backgroundSize: '200% 100%',
        animation: 'loading 1.5s infinite',
        borderRadius: '4px',
        marginBottom: '10px'
      }} />
      
      {/* Skeleton Seller Info */}
      <div style={{
        width: '50%',
        height: '16px',
        background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
        backgroundSize: '200% 100%',
        animation: 'loading 1.5s infinite',
        borderRadius: '4px'
      }} />
      
      <style>{`
        @keyframes loading {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.8; }
          100% { opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default SkeletonCard;