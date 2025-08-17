import React from 'react';
import { Item } from '@swipecity/shared';
export interface CardProps {
    item: Item;
    onSwipe?: (direction: 'left' | 'right') => void;
    isDragging?: boolean;
    dragOffset?: {
        x: number;
        y: number;
    };
    style?: React.CSSProperties;
    className?: string;
}
export declare const Card: React.FC<CardProps>;
