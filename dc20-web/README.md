# DC20 Hub - Web Version

A web-based TTRPG companion tool for running DC20 campaigns, built with React, TypeScript, and Vite. Designed to replace the macOS Swift UI version with a cross-platform web application.

## 🎮 Features

- **Campaign Management**: Create and manage multiple campaigns with custom notes
- **Character Sheets**: Build and track player characters with abilities, skills, and equipment
- **Dice Roller**: Roll standard and D20 rolls with advantage/disadvantage support
- **Combat Tracker**: Manage combat encounters with initiative tracking and round management
- **Rules & References**: Access DC20 game rules, spells, maneuvers, and equipment
- **Monster Reference**: Browse and create custom monsters for encounters
- **Local Data Persistence**: All data saved to browser localStorage automatically
- **Dark Mode**: Eye-friendly dark theme optimized for tabletop gaming

## 🚀 Getting Started

### Prerequisites

- Node.js 18.0 or higher
- npm 9.0 or higher

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:5173`

### Building for Production

```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

## 📁 Project Structure

```
dc20-web/
├── src/
│   ├── components/
│   │   ├── layout/           # Header, Sidebar, Layout components
│   │   ├── views/            # Page views for each section
│   │   └── ui/               # Reusable UI components
│   ├── store/                # Zustand state management
│   ├── types/                # TypeScript interfaces and types
│   ├── utils/                # Utility functions (dice rolling, calculations)
│   ├── App.tsx               # Root app component
│   ├── App.css               # Global styles with Tailwind
│   ├── index.css             # Tailwind directives
│   └── main.tsx              # Entry point
├── public/
│   └── data/                 # JSON data files (spells, maneuvers, etc.)
├── tailwind.config.js        # Tailwind CSS configuration
├── postcss.config.js         # PostCSS configuration
├── vite.config.ts            # Vite configuration
├── netlify.toml              # Netlify deployment configuration
├── tsconfig.json             # TypeScript configuration
└── package.json              # Project dependencies and scripts
```

## 🏗️ Architecture

### State Management (Zustand)

The app uses Zustand for centralized state management with localStorage persistence:

```typescript
const { 
  currentSection, 
  campaignData, 
  characters, 
  addCharacter, 
  saveCampaign 
} = useCampaignStore();
```

### Data Models

All TypeScript interfaces are defined in `src/types/models.ts`, ported from the original Swift models:

- `CampaignData`: Campaign metadata and references
- `Character`: Player character with abilities, skills, equipment
- `Combatant`: Combat participant tracking
- `Monster`: NPC/Monster statistics
- `Spell`, `Maneuver`, `Equipment`: Game objects

### Utility Functions

Game mechanics in `src/utils/gameUtils.ts`:

- Dice rolling with advantage/disadvantage
- Ability modifier calculations
- Rarity and difficulty color coding

## 🎨 Styling

- **Tailwind CSS**: Utility-first styling framework
- **Dark Theme**: Custom color palette with purple accents
- **Responsive Design**: Mobile-friendly layout
- **Custom Components**: Reusable component utilities (buttons, cards, etc.)

## 📱 Views

Each view is a full-screen section accessible via the sidebar:

1. **Dashboard**: Campaign overview and quick stats
2. **Rules**: DC20 rule reference (extensible)
3. **Spells & Maneuvers**: Power library
4. **Dice Roller**: Interactive dice rolling with D&D mechanics
5. **Characters**: Create and manage player characters
6. **Equipment**: Item reference and catalog
7. **Monsters**: Monster reference and builder
8. **Combat**: Real-time combat tracker
9. **Campaign**: Campaign notes and settings

## 💾 Data Persistence

Data is automatically persisted to browser localStorage:

- Auto-saves every 30 seconds during gameplay
- Manual save button in header
- All data stored in `campaign-store` key
- Survives browser restarts and tab refreshes

### Exporting Data

```typescript
// Export campaign data
const state = useCampaignStore.getState();
const jsonData = JSON.stringify(state.campaignData);
```

## 🌐 Netlify Deployment

This project is configured for automatic deployment to Netlify:

### Prerequisites

1. Connect your GitHub repository to Netlify
2. Configure build settings in `netlify.toml`

### Deployment Steps

1. Push code to GitHub
2. Netlify automatically builds and deploys
3. Production site available at your custom domain

### Environment Variables

No environment variables required for basic functionality. To set them:

1. Go to Netlify Dashboard → Site Settings → Environment
2. Add variables as needed

### Build Configuration

The `netlify.toml` file specifies:

- Build command: `npm run build`
- Publish directory: `dist/`
- SPA redirect: All routes redirect to `index.html`
- Cache headers for data files

## 🔧 Development

### Adding New Features

1. **Create a new view**: Add component in `src/components/views/`
2. **Update state**: Modify `src/store/campaignStore.ts`
3. **Add types**: Define interfaces in `src/types/models.ts`
4. **Style with Tailwind**: Use utility classes in JSX

### Example: Adding a New View

```typescript
// 1. Create the component
// src/components/views/MyNewView.tsx
export const MyNewView = () => {
  const { data } = useCampaignStore();
  return <div>My new view</div>;
};

// 2. Update HubSection enum
// src/types/models.ts
export enum HubSection {
  MY_NEW_VIEW = "My New View",
  // ...
}

// 3. Add navigation in App.tsx
case HubSection.MY_NEW_VIEW:
  return <MyNewView />;
```

### Debugging

- **React DevTools**: Browser extension for React component inspection
- **Zustand DevTools**: Redux DevTools support for state debugging
- **Console**: Standard browser console for logging

## 📦 Dependencies

### Runtime

- **react**: UI framework
- **react-dom**: DOM rendering
- **zustand**: State management library

### Development

- **typescript**: Type safety
- **vite**: Fast build tool and dev server
- **tailwindcss**: Utility CSS framework
- **postcss**: CSS processing
- **autoprefixer**: CSS vendor prefixing
- **@types/react**: TypeScript definitions

## 🐛 Known Limitations

- localStorage has ~5-10MB limit per domain
- No built-in server backend (uses localStorage only)
- No real-time multiplayer (local only)
- No offline-first service workers yet

## 🚀 Future Enhancements

- [ ] Backend API integration for cloud sync
- [ ] Real-time collaboration features
- [ ] Advanced character sheet builder
- [ ] Full spell/maneuver database integration
- [ ] Mobile app version with PWA
- [ ] PDF export for character sheets
- [ ] Custom theme support
- [ ] Image upload for character portraits

## 📄 License

This project is a web conversion of the DC20 TTRPG Hub. All DC20 TTRPG content is owned by Level Up Publishing.

## 🤝 Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📞 Support

For issues, questions, or feature requests:

1. Check existing GitHub issues
2. Create a new issue with detailed description
3. Include browser/OS information and steps to reproduce

## 🎓 Resources

- [React Documentation](https://react.dev)
- [Vite Documentation](https://vitejs.dev)
- [Tailwind CSS Documentation](https://tailwindcss.com)
- [Zustand Documentation](https://github.com/pmndrs/zustand)
- [TypeScript Documentation](https://www.typescriptlang.org)
- [DC20 TTRPG](https://www.levelupgaming.org)

---

Built with ❤️ for TTRPG enthusiasts by Copilot CLI
