#!/bin/bash

# SwipeCity App Icon Generator - Enlarged Logo Version
# Generates all required iOS app icon sizes with LARGER logo

SOURCE_IMAGE="/Users/jaredf/Downloads/SwipeCity Screenshots/SwipeCity Icon FINAL.png"
ICON_PATH="/Users/jaredf/Desktop/swipecity-mobile/ios/App/App/Assets.xcassets/AppIcon.appiconset"

echo "🎨 SwipeCity App Icon Generator - FINAL VERSION"
echo "==============================================="
echo ""

# Check if source image exists
if [ ! -f "$SOURCE_IMAGE" ]; then
    echo "❌ Error: Source image not found at $SOURCE_IMAGE"
    exit 1
fi

# Check if ImageMagick is installed
if ! command -v magick &> /dev/null; then
    echo "📦 ImageMagick not found. Installing via Homebrew..."
    if ! command -v brew &> /dev/null; then
        echo "❌ Error: Homebrew is not installed. Please install Homebrew first."
        echo "Visit: https://brew.sh"
        exit 1
    fi
    brew install imagemagick
fi

echo "📱 Generating ENLARGED iOS app icons..."
echo ""

# Backup existing icons
BACKUP_DIR="${ICON_PATH}_backup_$(date +%Y%m%d_%H%M%S)"
echo "📁 Backing up existing icons to: $BACKUP_DIR"
cp -r "$ICON_PATH" "$BACKUP_DIR"

# Function to generate LARGER icon with minimal padding
generate_large_icon() {
    local size=$1
    local filename=$2
    # Use 90% of the canvas size for the logo (much larger than default)
    local logo_size=$((size * 90 / 100))
    
    echo "  ✨ Generating LARGE ${filename} (logo: ${logo_size}x${logo_size}px in ${size}x${size}px canvas)"
    
    # Create a larger logo with minimal padding
    magick "$SOURCE_IMAGE" \
        -resize ${logo_size}x${logo_size} \
        -gravity center \
        -background white \
        -extent ${size}x${size} \
        -alpha remove \
        -alpha off \
        "$ICON_PATH/$filename"
}

# Generate all required iOS app icon sizes with LARGER logos
echo ""
echo "🔨 Creating ENLARGED app icons..."

# iPhone Notification - 20pt (use 90% of space)
generate_large_icon 40 "AppIcon-20@2x.png"
generate_large_icon 60 "AppIcon-20@3x.png"

# iPhone Settings - 29pt (use 90% of space)
generate_large_icon 58 "AppIcon-29@2x.png"
generate_large_icon 87 "AppIcon-29@3x.png"

# iPhone Spotlight - 40pt (use 90% of space)
generate_large_icon 80 "AppIcon-40@2x.png"
generate_large_icon 120 "AppIcon-40@3x.png"

# iPhone App - 60pt (use 90% of space)
generate_large_icon 120 "AppIcon-60@2x.png"
generate_large_icon 180 "AppIcon-60@3x.png"

# App Store (Marketing Icon) - 1024pt (use 90% of space)
generate_large_icon 1024 "AppIcon-1024.png"
generate_large_icon 1024 "AppIcon-512@2x.png"

# iPad icons if needed (use 90% of space)
generate_large_icon 20 "AppIcon-20.png"
generate_large_icon 29 "AppIcon-29.png"
generate_large_icon 40 "AppIcon-40.png"
generate_large_icon 76 "AppIcon-76.png"
generate_large_icon 152 "AppIcon-76@2x.png"
generate_large_icon 167 "AppIcon-83.5@2x.png"

echo ""
echo "✅ ENLARGED App icons generated successfully!"
echo "   📈 Logo now uses 90% of icon space (much larger!)"
echo ""

# Update Contents.json for the app icon set
cat > "$ICON_PATH/Contents.json" << 'EOF'
{
  "images" : [
    {
      "filename" : "AppIcon-20@2x.png",
      "idiom" : "iphone",
      "scale" : "2x",
      "size" : "20x20"
    },
    {
      "filename" : "AppIcon-20@3x.png",
      "idiom" : "iphone",
      "scale" : "3x",
      "size" : "20x20"
    },
    {
      "filename" : "AppIcon-29@2x.png",
      "idiom" : "iphone",
      "scale" : "2x",
      "size" : "29x29"
    },
    {
      "filename" : "AppIcon-29@3x.png",
      "idiom" : "iphone",
      "scale" : "3x",
      "size" : "29x29"
    },
    {
      "filename" : "AppIcon-40@2x.png",
      "idiom" : "iphone",
      "scale" : "2x",
      "size" : "40x40"
    },
    {
      "filename" : "AppIcon-40@3x.png",
      "idiom" : "iphone",
      "scale" : "3x",
      "size" : "40x40"
    },
    {
      "filename" : "AppIcon-60@2x.png",
      "idiom" : "iphone",
      "scale" : "2x",
      "size" : "60x60"
    },
    {
      "filename" : "AppIcon-60@3x.png",
      "idiom" : "iphone",
      "scale" : "3x",
      "size" : "60x60"
    },
    {
      "filename" : "AppIcon-20.png",
      "idiom" : "ipad",
      "scale" : "1x",
      "size" : "20x20"
    },
    {
      "filename" : "AppIcon-20@2x.png",
      "idiom" : "ipad",
      "scale" : "2x",
      "size" : "20x20"
    },
    {
      "filename" : "AppIcon-29.png",
      "idiom" : "ipad",
      "scale" : "1x",
      "size" : "29x29"
    },
    {
      "filename" : "AppIcon-29@2x.png",
      "idiom" : "ipad",
      "scale" : "2x",
      "size" : "29x29"
    },
    {
      "filename" : "AppIcon-40.png",
      "idiom" : "ipad",
      "scale" : "1x",
      "size" : "40x40"
    },
    {
      "filename" : "AppIcon-40@2x.png",
      "idiom" : "ipad",
      "scale" : "2x",
      "size" : "40x40"
    },
    {
      "filename" : "AppIcon-76.png",
      "idiom" : "ipad",
      "scale" : "1x",
      "size" : "76x76"
    },
    {
      "filename" : "AppIcon-76@2x.png",
      "idiom" : "ipad",
      "scale" : "2x",
      "size" : "76x76"
    },
    {
      "filename" : "AppIcon-83.5@2x.png",
      "idiom" : "ipad",
      "scale" : "2x",
      "size" : "83.5x83.5"
    },
    {
      "filename" : "AppIcon-1024.png",
      "idiom" : "ios-marketing",
      "scale" : "1x",
      "size" : "1024x1024"
    }
  ],
  "info" : {
    "author" : "xcode",
    "version" : 1
  }
}
EOF

echo "📝 Updated Contents.json"
echo ""
echo "🎯 Next steps:"
echo "1. Open Xcode to verify the ENLARGED app icon"
echo "2. Clean build folder (Shift+Cmd+K)"
echo "3. Build and run to test the larger icon"
echo ""
echo "💡 Backup saved to: $BACKUP_DIR"
echo ""
echo "🔍 COMPARISON:"
echo "   Before: Logo used ~70% of icon space"
echo "   After:  Logo uses 90% of icon space (MUCH BIGGER!)"
echo ""
echo "✨ Done!"