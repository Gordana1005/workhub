# Deel UI Design System (Dark Mode Focus)

## Color Palette

### Surfaces
- **Background Primary**: `#15171A` (Deepest Charcoal - Page Background)
- **Surface**: `#1C1E23` (Card Background)
- **Surface Hover**: `#252830`
- **Sidebar**: `#0F1114` (Darker than content)

### Typography
- **Text Primary**: `#FFFFFF` (High Contrast)
- **Text Secondary**: `#A3A7B0` (Subtle Gray)
- **Text Muted**: `#6B7280`

### Interactive
- **Primary Blue**: `#2C5AF6` (Action Buttons, Links)
- **Primary Hover**: `#1E40C8`
- **Secondary**: `#F7F8F9` (Light mode base) -> Mapped for Dark Mode
- **Danger**: `#E11D48`
- **Success**: `#02B075` (Deel Green)
- **Warning**: `#F59F0B`

### Borders
- **Border Default**: `#2D313A`
- **Border Active**: `#3F4451`

## Token Mapping (CSS Variables)

```css
:root {
  --bg-primary: #15171A;  /* Page background */
  --bg-secondary: #0F1114; /* Sidebar background */
  --surface: #1C1E23;      /* Cards */
  --surface-hover: #252830;
  
  --border: #2D313A;
  --border-light: #2D313A;
  
  --text-primary: #FFFFFF;
  --text-secondary: #A3A7B0;
  
  --brand-blue: #2C5AF6;
  --brand-green: #02B075;
  --brand-orange: #F59F0B;
}
```

## Typography (Inter)
- **H1**: 24px/32px Bold
- **H2**: 20px/28px Medium
- **Body**: 14px/20px Regular
- **Label**: 12px/16px Medium

## Layout
- **Containers**: White/Surface backgrounds with `1px` subtle border.
- **Radius**: `0.75rem` (12px) for Cards, `0.5rem` (8px) for inputs.
- **Spacing**: Grid-heavy, dense data displays (4px/8px basic units).
