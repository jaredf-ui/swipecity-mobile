import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { ItemUtils } from '@swipecity/shared';
export const Card = ({ item, onSwipe, isDragging = false, dragOffset = { x: 0, y: 0 }, style = {}, className = '', }) => {
    const cardStyles = {
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
    const imageStyles = {
        width: '100%',
        height: '60%',
        objectFit: 'cover',
        backgroundColor: '#f5f5f5',
    };
    const contentStyles = {
        padding: '20px',
        height: '40%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
    };
    const titleStyles = {
        fontSize: '20px',
        fontWeight: 'bold',
        color: '#333',
        marginBottom: '8px',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
    };
    const priceStyles = {
        fontSize: '24px',
        fontWeight: 'bold',
        color: '#4CAF50',
        marginBottom: '10px',
    };
    const metaStyles = {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: '14px',
        color: '#666',
    };
    const conditionStyles = {
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
        if (!isDragging || Math.abs(dragOffset.x) < 50)
            return null;
        const isRight = dragOffset.x > 0;
        const opacity = Math.min(Math.abs(dragOffset.x) / 100, 1);
        return (_jsx("div", { style: {
                position: 'absolute',
                top: '50%',
                left: isRight ? '20px' : 'auto',
                right: isRight ? 'auto' : '20px',
                transform: 'translateY(-50%)',
                zIndex: 10,
                opacity,
                transition: 'opacity 0.1s ease',
            }, children: _jsx("div", { style: {
                    padding: '10px 20px',
                    borderRadius: '20px',
                    fontSize: '18px',
                    fontWeight: 'bold',
                    color: 'white',
                    backgroundColor: isRight ? '#4CAF50' : '#ff4444',
                    transform: `rotate(${isRight ? -15 : 15}deg)`,
                }, children: isRight ? '💚 INTERESTED' : '👋 PASS' }) }));
    };
    return (_jsxs("div", { style: cardStyles, className: className, children: [getSwipeIndicator(), _jsx("img", { src: item.image_url, alt: item.title, style: imageStyles, onError: (e) => {
                    e.currentTarget.src = 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=350&h=300&fit=crop';
                } }), _jsxs("div", { style: contentStyles, children: [_jsxs("div", { children: [_jsx("h3", { style: titleStyles, children: item.title }), _jsx("div", { style: priceStyles, children: ItemUtils.formatPrice(item.price) })] }), _jsxs("div", { style: metaStyles, children: [_jsxs("div", { children: [_jsx("div", { style: { marginBottom: '4px' }, children: _jsx("strong", { children: item.seller_name }) }), _jsxs("div", { children: ["\uD83D\uDCCD ", item.distance] })] }), _jsx("div", { style: conditionStyles, children: item.condition })] })] })] }));
};
