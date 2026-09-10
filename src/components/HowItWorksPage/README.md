# Reusing the How It Works page

This folder is self-contained. It includes the React component, its stylesheet, and the four illustration assets it uses.

## Copy it

Copy the entire `HowItWorksPage` folder into the `components` directory of another React and TypeScript project.

Import and render it with:

```tsx
import HowItWorksPage from './components/HowItWorksPage/HowItWorksPage'

export default function App() {
  return <HowItWorksPage />
}
```

No additional packages are required.

## Change the colours

The component includes fallback colours and works without the Listen Mental Health global stylesheet. To customise it, define any of these variables on a parent element or in `:root`:

```css
:root {
  --how-color-cream: #f8fafc;
  --how-color-sage-light: #e6f0fa;
  --how-color-sage: #e6f0e8;
  --how-color-sage-strong: #9ec1a3;
  --how-color-primary: #065143;
  --how-color-accent: #5c97d9;
  --how-color-ink: #001c55;
  --how-color-muted: #4e6575;
}
```

The page uses browser scroll and resize events for the animated path. Its cleanup is already handled when the component unmounts.
