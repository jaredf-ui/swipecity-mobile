#!/bin/bash

# SwipeCity App Store Screenshot Script
# This script helps capture screenshots for App Store submission

echo "📱 SwipeCity App Store Screenshot Generator"
echo "==========================================="
echo ""
echo "This script will help you take screenshots for different iPhone sizes."
echo "Make sure SwipeCity is running in the iOS Simulator first!"
echo ""

# Function to take screenshot
take_screenshot() {
    local device="$1"
    local name="$2"
    local timestamp=$(date +%Y%m%d_%H%M%S)
    
    echo "📸 Taking screenshot: ${name} on ${device}"
    
    # Create screenshots directory if it doesn't exist
    mkdir -p ~/Desktop/swipecity-mobile/app_store_screenshots/"${device}"
    
    # Take the screenshot
    xcrun simctl io booted screenshot ~/Desktop/swipecity-mobile/app_store_screenshots/"${device}"/"${name}_${timestamp}".png
    
    echo "✅ Saved to app_store_screenshots/${device}/${name}_${timestamp}.png"
    echo ""
}

# Instructions for each screen
show_instructions() {
    local screen="$1"
    
    case "$screen" in
        "welcome")
            echo "🎯 Navigate to: Welcome/Login screen"
            echo "   Make sure the welcome screen looks perfect!"
            ;;
        "swipe")
            echo "🎯 Navigate to: Main swipe interface"
            echo "   Show an attractive item with good photo"
            ;;
        "chat")
            echo "🎯 Navigate to: Chat screen"
            echo "   Open a conversation with sample messages"
            ;;
        "categories")
            echo "🎯 Navigate to: Categories browse screen"
            echo "   Show the category grid with icons"
            ;;
        "seller")
            echo "🎯 Navigate to: Seller dashboard"
            echo "   Show active listings in seller mode"
            ;;
        "details")
            echo "🎯 Navigate to: Item details view"
            echo "   Show a detailed item page"
            ;;
        "profile")
            echo "🎯 Navigate to: Profile/Settings"
            echo "   Show user profile or settings screen"
            ;;
        "saved")
            echo "🎯 Navigate to: Saved items"
            echo "   Show saved/liked items screen"
            ;;
    esac
}

# Main screenshot flow
echo "📱 Current Simulator Devices:"
xcrun simctl list devices | grep -E "iPhone|iPad" | grep "Booted"
echo ""

echo "Make sure you have one of these simulators running:"
echo "- iPhone 16 Pro Max (6.9\")"
echo "- iPhone 15 Plus (6.7\")"
echo "- iPhone 11 Pro Max (6.5\")"
echo "- iPhone 8 Plus (5.5\")"
echo ""

read -p "Enter device name (e.g., 'iPhone_16_Pro_Max'): " device_name

echo ""
echo "📸 Let's capture all required screenshots!"
echo "=========================================="
echo ""

# Screenshot sequence
screens=("welcome" "swipe" "chat" "categories" "seller" "details" "profile" "saved")

for screen in "${screens[@]}"; do
    show_instructions "$screen"
    read -p "Press Enter when ready to capture '${screen}' screenshot..."
    take_screenshot "$device_name" "$screen"
done

echo "✨ Screenshot session complete!"
echo ""
echo "📁 Screenshots saved to: ~/Desktop/swipecity-mobile/app_store_screenshots/${device_name}/"
echo ""
echo "Next steps:"
echo "1. Review all screenshots in the folder"
echo "2. Edit if needed (add device frames, annotations)"
echo "3. Repeat for other device sizes"
echo "4. Upload to App Store Connect"
echo ""
echo "💡 Tip: Use tools like:"
echo "   - Figma or Sketch for adding device frames"
echo "   - Screenshot.app for quick edits"
echo "   - Previewed.app for professional mockups"